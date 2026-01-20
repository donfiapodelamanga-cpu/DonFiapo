//! # Fiapo Oracle Multisig Contract
//!
//! Sistema de consenso multi-oracle para confirmação de pagamentos externos
//! (Solana USDT/SPL). Requer M de N confirmações para processar um pagamento.

#![cfg_attr(not(feature = "std"), no_std, no_main)]

use fiapo_traits::{AccountId, Balance};

#[ink::contract]
mod fiapo_oracle_multisig {
    use super::*;
    use ink::prelude::{string::String, vec::Vec};
    use ink::storage::Mapping;

    /// Constantes
    pub const MAX_ORACLES: usize = 10;
    pub const MIN_CONFIRMATIONS: u8 = 2;
    pub const PAYMENT_TIMEOUT_MS: u64 = 3600 * 1000; // 1 hora
    pub const MAX_PENDING_PAYMENTS: usize = 1000;

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
    }

    /// Tipo de pagamento
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub enum PaymentType {
        StakingEntry,
        NFTPurchase,
        GovernanceDeposit,
        BridgeDeposit,
        Custom(String),
    }

    /// Status de um pagamento
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode, Default)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub enum PaymentStatus {
        #[default]
        Pending,
        Confirmed,
        Rejected,
        Expired,
        Processed,
    }

    /// Detalhes de um pagamento pendente
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct PendingPayment {
        pub tx_hash: String,
        pub sender_address: String,
        pub amount_usdt: Balance,
        pub beneficiary: AccountId,
        pub payment_type: PaymentType,
        pub confirmations: Vec<AccountId>,
        pub rejections: Vec<AccountId>,
        pub created_at: u64,
        pub expires_at: u64,
        pub status: PaymentStatus,
        pub processed_at: Option<u64>,
        pub equivalent_fiapo: Balance,
    }

    /// Configuração do sistema
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct OracleConfig {
        pub oracles: Vec<AccountId>,
        pub required_confirmations: u8,
        pub payment_timeout_ms: u64,
        pub is_active: bool,
        pub usdt_to_fiapo_rate: Balance,
    }

    impl Default for OracleConfig {
        fn default() -> Self {
            Self {
                oracles: Vec::new(),
                required_confirmations: MIN_CONFIRMATIONS,
                payment_timeout_ms: PAYMENT_TIMEOUT_MS,
                is_active: true,
                usdt_to_fiapo_rate: 100_000_000, // 1:1 por padrão (8 decimais)
            }
        }
    }

    /// Evento de confirmação submetida
    #[ink(event)]
    pub struct ConfirmationSubmitted {
        #[ink(topic)]
        tx_hash: String,
        oracle: AccountId,
        current_confirmations: u8,
        required_confirmations: u8,
    }

    /// Evento de consenso atingido
    #[ink(event)]
    pub struct ConsensusReached {
        #[ink(topic)]
        tx_hash: String,
        amount_usdt: Balance,
        beneficiary: AccountId,
        payment_type: PaymentType,
    }

    /// Evento de pagamento rejeitado
    #[ink(event)]
    pub struct PaymentRejected {
        #[ink(topic)]
        tx_hash: String,
        reason: String,
    }

    /// Evento de pagamento processado
    #[ink(event)]
    pub struct PaymentProcessed {
        #[ink(topic)]
        tx_hash: String,
        beneficiary: AccountId,
        amount_fiapo: Balance,
    }

    #[ink(storage)]
    pub struct FiapoOracleMultisig {
        owner: AccountId,
        /// Configuração do sistema
        config: OracleConfig,
        /// Pagamentos pendentes por tx_hash
        pending_payments: Mapping<String, PendingPayment>,
        /// Lista de tx_hashes pendentes (para iteração)
        pending_tx_hashes: Vec<String>,
        /// Contrato Core para processar pagamentos
        core_contract: AccountId,
        /// Contrato de Staking
        staking_contract: Option<AccountId>,
        /// Contrato ICO
        ico_contract: Option<AccountId>,
        /// Total de pagamentos processados
        total_processed: u64,
        /// Total de USDT processado
        total_usdt_processed: Balance,
        /// Total de pagamentos rejeitados
        total_rejected: u64,
    }

    impl FiapoOracleMultisig {
        #[ink(constructor)]
        pub fn new(
            core_contract: AccountId,
            initial_oracles: Vec<AccountId>,
            required_confirmations: u8,
        ) -> Self {
            let mut config = OracleConfig::default();
            config.oracles = initial_oracles;
            config.required_confirmations = required_confirmations.max(MIN_CONFIRMATIONS);

            Self {
                owner: Self::env().caller(),
                config,
                pending_payments: Mapping::default(),
                pending_tx_hashes: Vec::new(),
                core_contract,
                staking_contract: None,
                ico_contract: None,
                total_processed: 0,
                total_usdt_processed: 0,
                total_rejected: 0,
            }
        }

        // ==================== View Functions ====================

        #[ink(message)]
        pub fn owner(&self) -> AccountId {
            self.owner
        }

        #[ink(message)]
        pub fn get_config(&self) -> OracleConfig {
            self.config.clone()
        }

        #[ink(message)]
        pub fn is_oracle(&self, account: AccountId) -> bool {
            self.config.oracles.contains(&account)
        }

        #[ink(message)]
        pub fn get_pending_payment(&self, tx_hash: String) -> Option<PendingPayment> {
            self.pending_payments.get(&tx_hash)
        }

        #[ink(message)]
        pub fn get_pending_count(&self) -> u32 {
            self.pending_tx_hashes.len() as u32
        }

        #[ink(message)]
        pub fn get_stats(&self) -> (u64, Balance, u64) {
            (self.total_processed, self.total_usdt_processed, self.total_rejected)
        }

        #[ink(message)]
        pub fn convert_usdt_to_fiapo(&self, usdt_amount: Balance) -> Balance {
            usdt_amount.saturating_mul(self.config.usdt_to_fiapo_rate) / 1_000_000
        }

        // ==================== Oracle Functions ====================

        /// Submete confirmação de um pagamento Solana
        #[ink(message)]
        pub fn submit_confirmation(
            &mut self,
            tx_hash: String,
            sender_address: String,
            amount_usdt: Balance,
            beneficiary: AccountId,
            payment_type: PaymentType,
        ) -> Result<bool, OracleError> {
            let caller = self.env().caller();
            let current_time = self.env().block_timestamp();

            // Verificações
            if !self.config.is_active {
                return Err(OracleError::SystemInactive);
            }
            if !self.is_oracle(caller) {
                return Err(OracleError::UnauthorizedOracle);
            }

            // Busca ou cria pagamento
            let mut payment = if let Some(existing) = self.pending_payments.get(&tx_hash) {
                // Validações para pagamento existente
                if existing.status != PaymentStatus::Pending {
                    return Err(OracleError::PaymentAlreadyProcessed);
                }
                if current_time > existing.expires_at {
                    return self.expire_payment(tx_hash);
                }
                if existing.amount_usdt != amount_usdt || existing.beneficiary != beneficiary {
                    return Err(OracleError::PaymentDataMismatch);
                }
                if existing.confirmations.contains(&caller) {
                    return Err(OracleError::AlreadyConfirmed);
                }
                existing
            } else {
                // Novo pagamento
                if self.pending_tx_hashes.len() >= MAX_PENDING_PAYMENTS {
                    return Err(OracleError::TooManyPendingPayments);
                }

                let equivalent_fiapo = self.convert_usdt_to_fiapo(amount_usdt);
                
                self.pending_tx_hashes.push(tx_hash.clone());
                
                PendingPayment {
                    tx_hash: tx_hash.clone(),
                    sender_address,
                    amount_usdt,
                    beneficiary,
                    payment_type: payment_type.clone(),
                    confirmations: Vec::new(),
                    rejections: Vec::new(),
                    created_at: current_time,
                    expires_at: current_time + self.config.payment_timeout_ms,
                    status: PaymentStatus::Pending,
                    processed_at: None,
                    equivalent_fiapo,
                }
            };

            // Adiciona confirmação
            payment.confirmations.push(caller);
            let current_confirmations = payment.confirmations.len() as u8;

            Self::env().emit_event(ConfirmationSubmitted {
                tx_hash: tx_hash.clone(),
                oracle: caller,
                current_confirmations,
                required_confirmations: self.config.required_confirmations,
            });

            // Verifica consenso
            let consensus_reached = current_confirmations >= self.config.required_confirmations;

            if consensus_reached {
                payment.status = PaymentStatus::Confirmed;

                Self::env().emit_event(ConsensusReached {
                    tx_hash: tx_hash.clone(),
                    amount_usdt: payment.amount_usdt,
                    beneficiary: payment.beneficiary,
                    payment_type: payment.payment_type.clone(),
                });

                // Processar pagamento via cross-contract call
                self.process_confirmed_payment(&mut payment)?;
            }

            self.pending_payments.insert(tx_hash, &payment);
            Ok(consensus_reached)
        }

        /// Submete rejeição de um pagamento
        #[ink(message)]
        pub fn submit_rejection(
            &mut self,
            tx_hash: String,
            reason: String,
        ) -> Result<(), OracleError> {
            let caller = self.env().caller();

            if !self.is_oracle(caller) {
                return Err(OracleError::UnauthorizedOracle);
            }

            let mut payment = self.pending_payments.get(&tx_hash)
                .ok_or(OracleError::PaymentNotFound)?;

            if payment.status != PaymentStatus::Pending {
                return Err(OracleError::PaymentAlreadyProcessed);
            }

            if !payment.rejections.contains(&caller) {
                payment.rejections.push(caller);
            }

            // Se maioria rejeita, marca como rejeitado
            let rejection_threshold = (self.config.oracles.len() as u8 + 1) / 2;
            if payment.rejections.len() as u8 >= rejection_threshold {
                payment.status = PaymentStatus::Rejected;
                self.total_rejected += 1;
                self.remove_from_pending(&tx_hash);

                Self::env().emit_event(PaymentRejected {
                    tx_hash: tx_hash.clone(),
                    reason,
                });
            }

            self.pending_payments.insert(tx_hash, &payment);
            Ok(())
        }

        // ==================== Admin Functions ====================

        #[ink(message)]
        pub fn add_oracle(&mut self, oracle: AccountId) -> Result<(), OracleError> {
            if self.env().caller() != self.owner {
                return Err(OracleError::Unauthorized);
            }
            if self.config.oracles.len() >= MAX_ORACLES {
                return Err(OracleError::MaxOraclesReached);
            }
            if self.config.oracles.contains(&oracle) {
                return Err(OracleError::OracleAlreadyExists);
            }
            self.config.oracles.push(oracle);
            Ok(())
        }

        #[ink(message)]
        pub fn remove_oracle(&mut self, oracle: AccountId) -> Result<(), OracleError> {
            if self.env().caller() != self.owner {
                return Err(OracleError::Unauthorized);
            }
            if self.config.oracles.len() <= self.config.required_confirmations as usize {
                return Err(OracleError::MinimumOraclesRequired);
            }
            self.config.oracles.retain(|o| *o != oracle);
            Ok(())
        }

        #[ink(message)]
        pub fn set_required_confirmations(&mut self, required: u8) -> Result<(), OracleError> {
            if self.env().caller() != self.owner {
                return Err(OracleError::Unauthorized);
            }
            if required < MIN_CONFIRMATIONS || required as usize > self.config.oracles.len() {
                return Err(OracleError::InvalidConfiguration);
            }
            self.config.required_confirmations = required;
            Ok(())
        }

        #[ink(message)]
        pub fn set_usdt_rate(&mut self, rate: Balance) -> Result<(), OracleError> {
            if self.env().caller() != self.owner {
                return Err(OracleError::Unauthorized);
            }
            self.config.usdt_to_fiapo_rate = rate;
            Ok(())
        }

        #[ink(message)]
        pub fn set_staking_contract(&mut self, contract: AccountId) -> Result<(), OracleError> {
            if self.env().caller() != self.owner {
                return Err(OracleError::Unauthorized);
            }
            self.staking_contract = Some(contract);
            Ok(())
        }

        #[ink(message)]
        pub fn set_ico_contract(&mut self, contract: AccountId) -> Result<(), OracleError> {
            if self.env().caller() != self.owner {
                return Err(OracleError::Unauthorized);
            }
            self.ico_contract = Some(contract);
            Ok(())
        }

        #[ink(message)]
        pub fn toggle_active(&mut self, active: bool) -> Result<(), OracleError> {
            if self.env().caller() != self.owner {
                return Err(OracleError::Unauthorized);
            }
            self.config.is_active = active;
            Ok(())
        }

        /// Limpa pagamentos expirados
        #[ink(message)]
        pub fn cleanup_expired(&mut self) -> u32 {
            let current_time = self.env().block_timestamp();
            let mut cleaned = 0u32;

            let tx_hashes: Vec<String> = self.pending_tx_hashes.clone();
            for tx_hash in tx_hashes {
                if let Some(payment) = self.pending_payments.get(&tx_hash) {
                    if payment.status == PaymentStatus::Pending && current_time > payment.expires_at {
                        let mut expired_payment = payment.clone();
                        expired_payment.status = PaymentStatus::Expired;
                        self.pending_payments.insert(tx_hash.clone(), &expired_payment);
                        self.remove_from_pending(&tx_hash);
                        cleaned += 1;
                    }
                }
            }

            cleaned
        }

        // ==================== Internal Functions ====================

        fn expire_payment(&mut self, tx_hash: String) -> Result<bool, OracleError> {
            if let Some(mut payment) = self.pending_payments.get(&tx_hash) {
                payment.status = PaymentStatus::Expired;
                self.pending_payments.insert(tx_hash.clone(), &payment);
                self.remove_from_pending(&tx_hash);
            }
            Err(OracleError::PaymentExpired)
        }

        fn remove_from_pending(&mut self, tx_hash: &String) {
            self.pending_tx_hashes.retain(|h| h != tx_hash);
        }

        fn process_confirmed_payment(&mut self, payment: &mut PendingPayment) -> Result<(), OracleError> {
            let current_time = self.env().block_timestamp();

            // Marcar como processado
            payment.status = PaymentStatus::Processed;
            payment.processed_at = Some(current_time);

            // Atualizar estatísticas
            self.total_processed += 1;
            self.total_usdt_processed = self.total_usdt_processed.saturating_add(payment.amount_usdt);

            // Remover da lista de pendentes
            self.remove_from_pending(&payment.tx_hash);

            Self::env().emit_event(PaymentProcessed {
                tx_hash: payment.tx_hash.clone(),
                beneficiary: payment.beneficiary,
                amount_fiapo: payment.equivalent_fiapo,
            });

            // Cross-contract call para Core.mint_to ou contrato específico
            // Implementação real usando ink::contract_ref! seria aqui
            // Por ora, apenas emitimos o evento e os contratos podem reagir

            Ok(())
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;
        use ink::prelude::vec;

        #[ink::test]
        fn constructor_works() {
            let accounts = ink::env::test::default_accounts::<ink::env::DefaultEnvironment>();
            let oracles = vec![accounts.bob, accounts.charlie];
            let contract = FiapoOracleMultisig::new(accounts.django, oracles, 2);
            
            assert!(contract.is_oracle(accounts.bob));
            assert!(contract.is_oracle(accounts.charlie));
            assert!(!contract.is_oracle(accounts.eve));
        }

        #[ink::test]
        fn submit_confirmation_works() {
            let accounts = ink::env::test::default_accounts::<ink::env::DefaultEnvironment>();
            let oracles = vec![accounts.alice, accounts.bob];
            let mut contract = FiapoOracleMultisig::new(accounts.django, oracles, 2);

            let result = contract.submit_confirmation(
                String::from("tx123"),
                String::from("SolanaAddress123"),
                1_000_000, // 1 USDT
                accounts.eve,
                PaymentType::StakingEntry,
            );

            assert!(result.is_ok());
            assert!(!result.unwrap()); // Ainda não atingiu consenso

            let payment = contract.get_pending_payment(String::from("tx123")).unwrap();
            assert_eq!(payment.confirmations.len(), 1);
        }

        #[ink::test]
        fn consensus_reached() {
            let accounts = ink::env::test::default_accounts::<ink::env::DefaultEnvironment>();
            let oracles = vec![accounts.alice, accounts.bob];
            let mut contract = FiapoOracleMultisig::new(accounts.django, oracles, 2);

            // Primeira confirmação (alice)
            let _ = contract.submit_confirmation(
                String::from("tx123"),
                String::from("SolanaAddress123"),
                1_000_000,
                accounts.eve,
                PaymentType::StakingEntry,
            );

            // Segunda confirmação (bob)
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(accounts.bob);
            let result = contract.submit_confirmation(
                String::from("tx123"),
                String::from("SolanaAddress123"),
                1_000_000,
                accounts.eve,
                PaymentType::StakingEntry,
            );

            assert!(result.is_ok());
            assert!(result.unwrap()); // Consenso atingido!
        }
    }
}
