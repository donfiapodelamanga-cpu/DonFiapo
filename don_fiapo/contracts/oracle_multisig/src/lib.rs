//! # Fiapo Oracle Multisig Contract
//! 
//! Sistema de consenso multi-oracle para confirmação de pagamentos externos
//! (Solana USDT/SPL). Requer M de N confirmações para processar um pagamento.

#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[ink::contract]
mod fiapo_oracle_multisig {
    use ink::prelude::{string::String, vec, vec::Vec};
    use ink::storage::Mapping;
    use ink::env::call::{build_call, ExecutionInput, Selector};

    // Tipos importados de `fiapo-traits`

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
    }

    /// Tipo de pagamento/ação a executar
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub enum PaymentType {
        StakingEntry { amount: Balance, pool: u8 },
        NFTPurchase { tier: u8 },
        LotteryTicket { quantity: u32 },
        SpinGameCredit { tier: u8, spins: u32 },
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
        spin_game_contract: Option<AccountId>,
        governance_contract: Option<AccountId>,
    }

    impl FiapoOracleMultisig {
        // ==================== Construtor ====================

        #[ink(constructor)]
        pub fn new(
            initial_oracles: Vec<AccountId>,
            required_confirmations: u8,
        ) -> Self {
            let caller = Self::env().caller();
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
                spin_game_contract: None,
                governance_contract: None,
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
                "spin_game" => self.spin_game_contract = Some(address),
                "governance" => self.governance_contract = Some(address),
                _ => return Err(OracleError::InvalidConfiguration),
            }
            Ok(())
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
                PaymentType::SpinGameCredit { tier, spins } => {
                    self.call_spin_game_credit(payment.beneficiary, *spins, *tier)?;
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
                .returns::<Result<u64, u8>>()
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
                .returns::<Result<u64, u8>>()
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
                .returns::<Result<(), u8>>()
                .try_invoke();
            match result {
                Ok(Ok(Ok(()))) => Ok(()),
                _ => Err(OracleError::CrossContractCallFailed),
            }
        }

        fn call_spin_game_credit(&self, user: AccountId, spins: u32, tier: u8) -> Result<(), OracleError> {
            let contract = self.spin_game_contract.ok_or(OracleError::ContractNotConfigured)?;
            let result = build_call::<ink::env::DefaultEnvironment>()
                .call(contract)
                .gas_limit(0)
                .transferred_value(0)
                .exec_input(
                    ExecutionInput::new(Selector::new(ink::selector_bytes!("credit_spins")))
                        .push_arg(user)
                        .push_arg(spins)
                        .push_arg(tier),
                )
                .returns::<Result<(), u8>>()
                .try_invoke();
            match result {
                Ok(Ok(Ok(()))) => Ok(()),
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

            // Configurar contratos mock
            contract.set_contract_address(String::from("staking"), accounts.django).unwrap();

            // Primeira confirmação (alice)
            set_caller(accounts.alice);
            let _ = contract.submit_confirmation(
                String::from("tx123"),
                String::from("SolanaAddress123"),
                1000,
                accounts.eve,
                PaymentType::StakingEntry { amount: 10, pool: 1 },
            );

            // Segunda confirmação (bob)
            set_caller(accounts.bob);
            let result = contract.submit_confirmation(
                String::from("tx123"),
                String::from("SolanaAddress123"),
                1000,
                accounts.eve,
                PaymentType::StakingEntry { amount: 10, pool: 1 },
            );

            assert!(result.is_ok());
            assert!(result.unwrap()); // Consenso atingido!

            let payment = contract.get_pending_payment(String::from("tx123")).unwrap();
            assert_eq!(payment.status, PaymentStatus::Confirmed);
        }
    }
}
