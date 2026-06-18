//! # Fiapo Oracle Multisig Contract
//! 
//! Sistema de consenso multi-oracle para confirmação de pagamentos externos
//! (Solana USDT/SPL). Requer M de N confirmações para processar um pagamento.

#![cfg_attr(not(feature = "std"), no_std, no_main)]
#![allow(clippy::cast_possible_truncation)]
#![allow(unexpected_cfgs)]

use fiapo_logics::traits::oracle::Oracle;

#[ink::contract]
mod fiapo_oracle_multisig {
    use super::*;
    use ink::prelude::{string::String, vec, vec::Vec};
    use ink::storage::Mapping;
    use ink::env::call::{build_call, ExecutionInput, Selector};

    // ==================== Tipos e Enums ====================

    /// Erros do sistema Oracle
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum OracleError {
        Unauthorized,
        UnauthorizedOracle,
        SystemInactive,
        AlreadyConfirmed,
        PaymentNotFound,
        PaymentAlreadyProcessed,
        PaymentExpired,
        PaymentDataMismatch,
        MaxOraclesReached,
        OracleAlreadyExists,
        MinimumOraclesRequired,
        InvalidConfiguration,
        TooManyPendingPayments,
        CrossContractCallFailed,
        ContractNotConfigured,
        /// O amount_usdt pago não cobre o preço on-chain do item concedido.
        PriceMismatch,
    }

    /// Tipo de pagamento/ação a executar
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub enum PaymentType {
        StakingEntry { amount: Balance, pool: u8 },
        NFTPurchase { tier: u8 },
        LotteryTicket { quantity: u32 },
        GovernanceDeposit,
        Custom(String),
    }

    /// Status de um pagamento pendente
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub enum PaymentStatus {
        Pending,
        Confirmed,
        Rejected,
        Expired,
    }

    /// Detalhes de um pagamento pendente
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct PendingPayment {
        pub tx_hash: String,
        pub sender_address: String,
        pub amount_usdt: u64, // Em centavos de USDT
        pub beneficiary: AccountId,
        pub payment_type: PaymentType,
        pub confirmations: Vec<AccountId>,
        pub created_at: Timestamp,
        pub status: PaymentStatus,
    }

    // ==================== Eventos ====================

    #[ink(event)]
    pub struct PaymentConfirmationSubmitted {
        #[ink(topic)]
        tx_hash: String,
        #[ink(topic)]
        oracle: AccountId,
        confirmations: u8,
    }

    #[ink(event)]
    pub struct PaymentConsensusReached {
        #[ink(topic)]
        tx_hash: String,
        beneficiary: AccountId,
        payment_type: PaymentType,
    }

    // ==================== Storage ====================

    #[ink(storage)]
    pub struct FiapoOracleMultisig {
        owner: AccountId,
        oracles: Mapping<AccountId, bool>,
        total_oracles: u8,
        required_confirmations: u8,
        is_active: bool,
        pending_payments: Mapping<String, PendingPayment>,
        processed_count: u64,
        rejected_count: u64,
        // Endereços dos contratos dependentes
        ico_contract: Option<AccountId>,
        staking_contract: Option<AccountId>,
        lottery_contract: Option<AccountId>,
        governance_contract: Option<AccountId>,
        // Tabela de preço on-chain (audit 2026-06-18): valida que o amount_usdt
        // pago cobre o item concedido, em vez de confiar cegamente no payload do
        // oráculo. Preço 0 (default) = sem enforcement; owner ativa configurando.
        nft_tier_prices: Mapping<u8, u64>,
        lottery_ticket_price_cents: u64,
        min_staking_usdt_cents: u64,
    }

    impl FiapoOracleMultisig {
        // ==================== Construtor ====================

        #[ink(constructor)]
        pub fn new(
            initial_oracles: Vec<AccountId>,
            required_confirmations: u8,
        ) -> Self {
            let caller = Self::env().caller();
            // SEGURANCA (auditoria 2026-06-18, alta #2): piso de quorum no construtor.
            // Rejeita deploy com 0 oraculos, quorum 0 (sem consenso = qualquer um) ou
            // quorum maior que o numero de oraculos (consenso impossivel / deadlock).
            assert!(!initial_oracles.is_empty(), "Oracle multisig requer ao menos 1 oraculo");
            let total = initial_oracles.len() as u8;
            assert!(
                required_confirmations >= 1 && required_confirmations <= total,
                "required_confirmations invalido (deve ser 1..=numero de oraculos)"
            );
            let mut oracles = Mapping::default();
            for oracle in initial_oracles.iter() {
                oracles.insert(oracle, &true);
            }
            Self {
                owner: caller,
                oracles,
                total_oracles: initial_oracles.len() as u8,
                required_confirmations,
                is_active: true,
                pending_payments: Mapping::default(),
                processed_count: 0,
                rejected_count: 0,
                ico_contract: None,
                staking_contract: None,
                lottery_contract: None,
                governance_contract: None,
                nft_tier_prices: Mapping::default(),
                lottery_ticket_price_cents: 0,
                min_staking_usdt_cents: 0,
            }
        }

        // ==================== Funções de Admin ====================

        #[ink(message)]
        pub fn add_oracle(&mut self, oracle: AccountId) -> Result<(), OracleError> {
            self.ensure_owner()?;
            if self.oracles.get(&oracle).is_some() {
                return Err(OracleError::OracleAlreadyExists);
            }
            if self.total_oracles >= 10 { // MAX_ORACLES
                return Err(OracleError::MaxOraclesReached);
            }
            self.oracles.insert(oracle, &true);
            self.total_oracles = self.total_oracles.saturating_add(1);
            Ok(())
        }

        #[ink(message)]
        pub fn remove_oracle(&mut self, oracle: AccountId) -> Result<(), OracleError> {
            self.ensure_owner()?;
            if self.oracles.get(&oracle).is_none() {
                return Err(OracleError::PaymentNotFound); // Reusing error, consider specific one
            }
            if self.total_oracles.saturating_sub(1) < self.required_confirmations {
                return Err(OracleError::MinimumOraclesRequired);
            }
            self.oracles.remove(&oracle);
            self.total_oracles = self.total_oracles.saturating_sub(1);
            Ok(())
        }

        #[ink(message)]
        pub fn set_required_confirmations(&mut self, count: u8) -> Result<(), OracleError> {
            self.ensure_owner()?;
            if count == 0 || count > self.total_oracles {
                return Err(OracleError::InvalidConfiguration);
            }
            self.required_confirmations = count;
            Ok(())
        }

        #[ink(message)]
        pub fn set_active_status(&mut self, is_active: bool) -> Result<(), OracleError> {
            self.ensure_owner()?;
            self.is_active = is_active;
            Ok(())
        }

        #[ink(message)]
        pub fn set_contract_address(&mut self, contract_name: String, address: AccountId) -> Result<(), OracleError> {
            self.ensure_owner()?;
            match contract_name.as_str() {
                "ico" => self.ico_contract = Some(address),
                "staking" => self.staking_contract = Some(address),
                "lottery" => self.lottery_contract = Some(address),
                "governance" => self.governance_contract = Some(address),
                _ => return Err(OracleError::InvalidConfiguration),
            }
            Ok(())
        }

        // ==================== Tabela de Preço (audit 2026-06-18) ====================

        /// Define o preço mínimo (centavos USDT) para cunhar um NFT do tier (owner).
        #[ink(message)]
        pub fn set_nft_tier_price(&mut self, tier: u8, price_cents: u64) -> Result<(), OracleError> {
            self.ensure_owner()?;
            self.nft_tier_prices.insert(tier, &price_cents);
            Ok(())
        }

        /// Define o preço por ticket de loteria (centavos USDT) (owner).
        #[ink(message)]
        pub fn set_lottery_ticket_price(&mut self, price_cents: u64) -> Result<(), OracleError> {
            self.ensure_owner()?;
            self.lottery_ticket_price_cents = price_cents;
            Ok(())
        }

        /// Define o piso de USDT (centavos) para uma entrada de staking (owner).
        #[ink(message)]
        pub fn set_min_staking_usdt(&mut self, price_cents: u64) -> Result<(), OracleError> {
            self.ensure_owner()?;
            self.min_staking_usdt_cents = price_cents;
            Ok(())
        }

        #[ink(message)]
        pub fn get_nft_tier_price(&self, tier: u8) -> u64 {
            self.nft_tier_prices.get(tier).unwrap_or(0)
        }

        #[ink(message)]
        pub fn get_lottery_ticket_price(&self) -> u64 {
            self.lottery_ticket_price_cents
        }

        #[ink(message)]
        pub fn get_min_staking_usdt(&self) -> u64 {
            self.min_staking_usdt_cents
        }

        // ==================== Funções de Leitura ====================

        #[ink(message)]
        pub fn is_oracle(&self, account: AccountId) -> bool {
            self.oracles.get(&account).is_some()
        }

        #[ink(message)]
        pub fn get_pending_payment(&self, tx_hash: String) -> Option<PendingPayment> {
            self.pending_payments.get(&tx_hash)
        }

        // ==================== Mensagens Principais ====================

        #[ink(message)]
        pub fn submit_confirmation(
            &mut self,
            tx_hash: String,
            sender_address: String,
            amount_usdt: u64,
            beneficiary: AccountId,
            payment_type: PaymentType,
        ) -> Result<bool, OracleError> {
            let caller = self.env().caller();
            self.ensure_oracle(&caller)?;
            self.ensure_active()?;

            let current_time = self.env().block_timestamp();

            if let Some(mut payment) = self.pending_payments.get(&tx_hash) {
                // Pagamento existente
                self.ensure_not_expired(&payment, current_time)?;
                self.ensure_not_processed(&payment)?;
                self.ensure_not_confirmed(&payment, &caller)?;
                self.ensure_data_match(&payment, &sender_address, amount_usdt, &beneficiary, &payment_type)?;

                payment.confirmations.push(caller);
                let confirmations_count = payment.confirmations.len() as u8;

                self.env().emit_event(PaymentConfirmationSubmitted {
                    tx_hash: tx_hash.clone(),
                    oracle: caller,
                    confirmations: confirmations_count,
                });

                if confirmations_count >= self.required_confirmations {
                    payment.status = PaymentStatus::Confirmed;
                    self.process_confirmed_payment(&payment)?;
                    self.processed_count = self.processed_count.saturating_add(1);
                    self.pending_payments.insert(&tx_hash, &payment);

                    self.env().emit_event(PaymentConsensusReached {
                        tx_hash,
                        beneficiary: payment.beneficiary,
                        payment_type: payment.payment_type,
                    });

                    return Ok(true); // Consenso atingido
                }

                self.pending_payments.insert(&tx_hash, &payment);
                Ok(false)
            } else {
                // Novo pagamento
                let new_payment = PendingPayment {
                    tx_hash: tx_hash.clone(),
                    sender_address,
                    amount_usdt,
                    beneficiary,
                    payment_type,
                    confirmations: vec![caller],
                    created_at: current_time,
                    status: PaymentStatus::Pending,
                };

                self.pending_payments.insert(&tx_hash, &new_payment);
                
                self.env().emit_event(PaymentConfirmationSubmitted {
                    tx_hash: tx_hash.clone(),
                    oracle: caller,
                    confirmations: 1,
                });

                if self.required_confirmations <= 1 {
                    self.process_confirmed_payment(&new_payment)?;
                    self.processed_count = self.processed_count.saturating_add(1);
                    let mut final_payment = new_payment;
                    final_payment.status = PaymentStatus::Confirmed;
                    self.pending_payments.insert(&tx_hash, &final_payment);

                    self.env().emit_event(PaymentConsensusReached {
                        tx_hash,
                        beneficiary: final_payment.beneficiary,
                        payment_type: final_payment.payment_type,
                    });
                    return Ok(true);
                }

                Ok(false)
            }
        }

        // ==================== Lógica Interna ====================

        fn process_confirmed_payment(&self, payment: &PendingPayment) -> Result<(), OracleError> {
            // Antes de conceder o item, valida on-chain que o valor pago cobre o
            // preço configurado — não confia cegamente no tier/quantity do payload.
            self.ensure_price_consistent(payment)?;
            match &payment.payment_type {
                PaymentType::StakingEntry { amount, pool } => {
                    self.call_staking_stake_for(payment.beneficiary, *amount, *pool)?;
                }
                PaymentType::NFTPurchase { tier } => {
                    self.call_ico_mint_for(payment.beneficiary, *tier)?;
                }
                PaymentType::LotteryTicket { quantity } => {
                    self.call_lottery_buy_tickets_for(payment.beneficiary, *quantity)?;
                }
                PaymentType::GovernanceDeposit => {
                    // A lógica de depósito de governança pode ser mais complexa
                    // e talvez precise de uma chamada específica.
                }
                PaymentType::Custom(_) => {
                    // Lógica para ações customizadas
                }
            }
            Ok(())
        }

        // --- Chamadas Cross-Contract ---

        fn call_ico_mint_for(&self, user: AccountId, tier: u8) -> Result<(), OracleError> {
            let contract = self.ico_contract.ok_or(OracleError::ContractNotConfigured)?;
            let result = build_call::<ink::env::DefaultEnvironment>()
                .call(contract)
                .gas_limit(0)
                .transferred_value(0)
                .exec_input(
                    ExecutionInput::new(Selector::new(ink::selector_bytes!("mint_paid_for")))
                        .push_arg(user)
                        .push_arg(tier),
                )
                // callee `mint_paid_for` retorna Result<u64, ICOError>; decodificar o
                // Result real (erro como `()` tolera bytes residuais) para que um Err
                // do callee NAO seja lido como sucesso silencioso.
                .returns::<Result<u64, ()>>()
                .try_invoke();
            match result {
                Ok(Ok(Ok(_))) => Ok(()),
                _ => Err(OracleError::CrossContractCallFailed),
            }
        }

        fn call_staking_stake_for(&self, user: AccountId, amount: Balance, pool: u8) -> Result<(), OracleError> {
            let contract = self.staking_contract.ok_or(OracleError::ContractNotConfigured)?;
            let result = build_call::<ink::env::DefaultEnvironment>()
                .call(contract)
                .gas_limit(0)
                .transferred_value(0)
                .exec_input(
                    ExecutionInput::new(Selector::new(ink::selector_bytes!("stake_for")))
                        .push_arg(user)
                        .push_arg(amount)
                        .push_arg(pool),
                )
                // callee `stake_for` retorna Result<u64, StakingError>.
                .returns::<Result<u64, ()>>()
                .try_invoke();
            match result {
                Ok(Ok(Ok(_))) => Ok(()),
                _ => Err(OracleError::CrossContractCallFailed),
            }
        }

        fn call_lottery_buy_tickets_for(&self, user: AccountId, quantity: u32) -> Result<(), OracleError> {
            let contract = self.lottery_contract.ok_or(OracleError::ContractNotConfigured)?;
            let result = build_call::<ink::env::DefaultEnvironment>()
                .call(contract)
                .gas_limit(0)
                .transferred_value(0)
                .exec_input(
                    ExecutionInput::new(Selector::new(ink::selector_bytes!("buy_tickets_for")))
                        .push_arg(user)
                        .push_arg(quantity),
                )
                // callee `buy_tickets_for` retorna Result<(), LotteryError>.
                .returns::<Result<(), ()>>()
                .try_invoke();
            match result {
                Ok(Ok(Ok(_))) => Ok(()),
                _ => Err(OracleError::CrossContractCallFailed),
            }
        }

        // --- Funções de Verificação (Ensure) ---

        fn ensure_owner(&self) -> Result<(), OracleError> {
            if self.env().caller() != self.owner {
                Err(OracleError::Unauthorized)
            } else {
                Ok(())
            }
        }

        fn ensure_oracle(&self, account: &AccountId) -> Result<(), OracleError> {
            if !self.is_oracle(*account) {
                Err(OracleError::UnauthorizedOracle)
            } else {
                Ok(())
            }
        }

        fn ensure_active(&self) -> Result<(), OracleError> {
            if !self.is_active {
                Err(OracleError::SystemInactive)
            } else {
                Ok(())
            }
        }

        fn ensure_not_expired(&self, payment: &PendingPayment, current_time: Timestamp) -> Result<(), OracleError> {
            if current_time.saturating_sub(payment.created_at) > (3600 * 1000) { // PAYMENT_TIMEOUT_MS
                // Lógica para expirar o pagamento seria aqui
                Err(OracleError::PaymentExpired)
            } else {
                Ok(())
            }
        }

        fn ensure_not_processed(&self, payment: &PendingPayment) -> Result<(), OracleError> {
            if payment.status != PaymentStatus::Pending {
                Err(OracleError::PaymentAlreadyProcessed)
            } else {
                Ok(())
            }
        }

        fn ensure_not_confirmed(&self, payment: &PendingPayment, oracle: &AccountId) -> Result<(), OracleError> {
            if payment.confirmations.contains(oracle) {
                Err(OracleError::AlreadyConfirmed)
            } else {
                Ok(())
            }
        }

        fn ensure_data_match(
            &self, 
            payment: &PendingPayment, 
            sender: &String, 
            amount: u64, 
            beneficiary: &AccountId, 
            payment_type: &PaymentType
        ) -> Result<(), OracleError> {
            if payment.sender_address != *sender
                || payment.amount_usdt != amount
                || payment.beneficiary != *beneficiary
                || payment.payment_type != *payment_type
            {
                // Lógica para rejeitar o pagamento seria aqui
                Err(OracleError::PaymentDataMismatch)
            } else {
                Ok(())
            }
        }

        /// Valida que o `amount_usdt` pago cobre o preço on-chain do item concedido.
        /// Preço/piso 0 (não configurado) = sem enforcement, para não quebrar deploys
        /// existentes; o owner ativa configurando os preços (audit 2026-06-18).
        fn ensure_price_consistent(&self, payment: &PendingPayment) -> Result<(), OracleError> {
            match &payment.payment_type {
                PaymentType::NFTPurchase { tier } => {
                    let price = self.nft_tier_prices.get(*tier).unwrap_or(0);
                    if payment.amount_usdt < price {
                        return Err(OracleError::PriceMismatch);
                    }
                }
                PaymentType::LotteryTicket { quantity } => {
                    let required = self
                        .lottery_ticket_price_cents
                        .saturating_mul(*quantity as u64);
                    if payment.amount_usdt < required {
                        return Err(OracleError::PriceMismatch);
                    }
                }
                PaymentType::StakingEntry { amount, .. } => {
                    if *amount == 0 || payment.amount_usdt < self.min_staking_usdt_cents {
                        return Err(OracleError::PriceMismatch);
                    }
                }
                PaymentType::GovernanceDeposit | PaymentType::Custom(_) => {}
            }
            Ok(())
        }
    }

    // ==================== Oracle Trait Implementation ====================
    // Required for cross-contract calls via OracleRef (contract_ref!(Oracle))
    // Selectors MUST match the trait definition in logics/traits/oracle.rs

    impl Oracle for FiapoOracleMultisig {
        #[ink(message)]
        fn is_payment_confirmed(
            &self,
            tx_hash: String,
            user: AccountId,
            amount_cents: u64,
            is_governance_deposit: bool,
        ) -> bool {
            if let Some(payment) = self.pending_payments.get(&tx_hash) {
                if payment.status == PaymentStatus::Confirmed
                   && payment.beneficiary == user
                   && payment.amount_usdt == amount_cents
                {
                    return match payment.payment_type {
                        PaymentType::GovernanceDeposit => is_governance_deposit,
                        _ => !is_governance_deposit,
                    }
                }
            }
            false
        }
    }

    // ==================== Testes ====================
    #[cfg(test)]
    mod tests {
        use super::*;
        use ink::env::test::DefaultAccounts;

        fn default_accounts() -> DefaultAccounts<ink::env::DefaultEnvironment> {
            ink::env::test::default_accounts::<ink::env::DefaultEnvironment>()
        }

        fn set_caller(caller: AccountId) {
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(caller);
        }

        #[ink::test]
        fn constructor_works() {
            let accounts = default_accounts();
            let oracles = vec![accounts.bob, accounts.charlie];
            let contract = FiapoOracleMultisig::new(oracles, 2);
            
            assert!(contract.is_oracle(accounts.bob));
            assert!(contract.is_oracle(accounts.charlie));
            assert!(!contract.is_oracle(accounts.eve));
            assert_eq!(contract.required_confirmations, 2);
        }

        // Auditoria #2: construtor deve rejeitar quorum invalido.
        #[ink::test]
        #[should_panic(expected = "required_confirmations invalido")]
        fn constructor_rejects_zero_quorum() {
            let accounts = default_accounts();
            let _ = FiapoOracleMultisig::new(vec![accounts.bob, accounts.charlie], 0);
        }

        #[ink::test]
        #[should_panic(expected = "required_confirmations invalido")]
        fn constructor_rejects_quorum_above_oracle_count() {
            let accounts = default_accounts();
            let _ = FiapoOracleMultisig::new(vec![accounts.bob], 2);
        }

        #[ink::test]
        #[should_panic(expected = "ao menos 1 oraculo")]
        fn constructor_rejects_empty_oracles() {
            let _ = FiapoOracleMultisig::new(Vec::new(), 1);
        }

        #[ink::test]
        fn submit_confirmation_works() {
            let accounts = default_accounts();
            let oracles = vec![accounts.alice, accounts.bob];
            let mut contract = FiapoOracleMultisig::new(oracles, 2);
            set_caller(accounts.alice);

            let result = contract.submit_confirmation(
                String::from("tx123"),
                String::from("SolanaAddress123"),
                1000, // 10 USDT em centavos
                accounts.eve,
                PaymentType::StakingEntry { amount: 10, pool: 1 },
            );

            assert!(result.is_ok());
            assert!(!result.unwrap()); // Ainda não atingiu consenso

            let payment = contract.get_pending_payment(String::from("tx123")).unwrap();
            assert_eq!(payment.confirmations.len(), 1);
        }

        #[ink::test]
        fn consensus_reached_and_processed() {
            let accounts = default_accounts();
            let oracles = vec![accounts.alice, accounts.bob];
            let mut contract = FiapoOracleMultisig::new(oracles.clone(), 2);

            // Usa GovernanceDeposit pois não executa cross-contract call
            // (chamadas build_call falham em ambiente de teste unitário ink!)

            // Primeira confirmação (alice)
            set_caller(accounts.alice);
            let _ = contract.submit_confirmation(
                String::from("tx123"),
                String::from("SolanaAddress123"),
                1000,
                accounts.eve,
                PaymentType::GovernanceDeposit,
            );

            // Segunda confirmação (bob)
            set_caller(accounts.bob);
            let result = contract.submit_confirmation(
                String::from("tx123"),
                String::from("SolanaAddress123"),
                1000,
                accounts.eve,
                PaymentType::GovernanceDeposit,
            );

            assert!(result.is_ok());
            assert!(result.unwrap()); // Consenso atingido!

            let payment = contract.get_pending_payment(String::from("tx123")).unwrap();
            assert_eq!(payment.status, PaymentStatus::Confirmed);
        }

        // ---------- Tabela de preço on-chain (audit 2026-06-18) ----------

        fn new_owned_by_alice() -> FiapoOracleMultisig {
            let accounts = default_accounts();
            set_caller(accounts.alice);
            FiapoOracleMultisig::new(vec![accounts.alice, accounts.bob], 2)
        }

        fn mk_payment(amount_usdt: u64, payment_type: PaymentType) -> PendingPayment {
            let accounts = default_accounts();
            PendingPayment {
                tx_hash: String::from("tx"),
                sender_address: String::from("sol"),
                amount_usdt,
                beneficiary: accounts.eve,
                payment_type,
                confirmations: Vec::new(),
                created_at: 0,
                status: PaymentStatus::Pending,
            }
        }

        #[ink::test]
        fn set_nft_tier_price_requires_owner() {
            let accounts = default_accounts();
            let mut contract = new_owned_by_alice();
            set_caller(accounts.charlie);
            assert_eq!(
                contract.set_nft_tier_price(2, 500),
                Err(OracleError::Unauthorized)
            );
            set_caller(accounts.alice);
            assert!(contract.set_nft_tier_price(2, 500).is_ok());
            assert_eq!(contract.get_nft_tier_price(2), 500);
        }

        #[ink::test]
        fn nft_price_is_enforced() {
            let mut contract = new_owned_by_alice();
            contract.set_nft_tier_price(2, 500).unwrap();
            // Pagou menos que o preço do tier -> rejeita.
            assert_eq!(
                contract.ensure_price_consistent(&mk_payment(499, PaymentType::NFTPurchase { tier: 2 })),
                Err(OracleError::PriceMismatch)
            );
            // Pagou o preço exato -> ok.
            assert!(contract
                .ensure_price_consistent(&mk_payment(500, PaymentType::NFTPurchase { tier: 2 }))
                .is_ok());
        }

        #[ink::test]
        fn lottery_price_scales_with_quantity() {
            let mut contract = new_owned_by_alice();
            contract.set_lottery_ticket_price(100).unwrap();
            // 3 tickets exigem 300; 299 falha, 300 passa.
            assert_eq!(
                contract.ensure_price_consistent(&mk_payment(299, PaymentType::LotteryTicket { quantity: 3 })),
                Err(OracleError::PriceMismatch)
            );
            assert!(contract
                .ensure_price_consistent(&mk_payment(300, PaymentType::LotteryTicket { quantity: 3 }))
                .is_ok());
        }

        #[ink::test]
        fn staking_floor_and_nonzero_amount_enforced() {
            let mut contract = new_owned_by_alice();
            contract.set_min_staking_usdt(1000).unwrap();
            // Abaixo do piso -> rejeita.
            assert_eq!(
                contract.ensure_price_consistent(&mk_payment(999, PaymentType::StakingEntry { amount: 10, pool: 1 })),
                Err(OracleError::PriceMismatch)
            );
            // No piso, amount>0 -> ok.
            assert!(contract
                .ensure_price_consistent(&mk_payment(1000, PaymentType::StakingEntry { amount: 10, pool: 1 }))
                .is_ok());
            // amount==0 sempre rejeita.
            assert_eq!(
                contract.ensure_price_consistent(&mk_payment(5000, PaymentType::StakingEntry { amount: 0, pool: 1 })),
                Err(OracleError::PriceMismatch)
            );
        }

        #[ink::test]
        fn unconfigured_price_allows_backward_compat() {
            let contract = new_owned_by_alice();
            // Sem preços configurados (default 0): não há enforcement.
            assert!(contract
                .ensure_price_consistent(&mk_payment(1, PaymentType::NFTPurchase { tier: 2 }))
                .is_ok());
            assert!(contract
                .ensure_price_consistent(&mk_payment(0, PaymentType::GovernanceDeposit))
                .is_ok());
        }
    }
}

#[cfg(feature = "ink-as-dependency")]
pub use self::fiapo_oracle_multisig::*;
