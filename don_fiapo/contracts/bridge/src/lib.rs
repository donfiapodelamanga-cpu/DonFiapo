//! # Fiapo Bridge Contract
//!
//! Bridge para Solana SPL tokens com sistema Multi-Oracle.
//! Requer M de N confirmações para processar pagamentos.

#![cfg_attr(not(feature = "std"), no_std, no_main)]

use fiapo_traits::{AccountId, Balance};

#[ink::contract]
mod fiapo_bridge {
    use super::*;
    use ink::prelude::{string::String, vec::Vec};
    use ink::storage::Mapping;

    /// Constantes
    pub const MAX_ORACLES: usize = 5;
    pub const MIN_CONFIRMATIONS: u8 = 2;
    pub const CONFIRMATION_TIMEOUT_MS: u64 = 3600 * 1000; // 1 hora

    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum BridgeError {
        Unauthorized,
        RequestNotFound,
        AlreadyCompleted,
        BridgePaused,
        InvalidDestination,
        UnauthorizedOracle,
        AlreadyConfirmed,
        PaymentNotFound,
        PaymentAlreadyProcessed,
        PaymentExpired,
        PaymentDataMismatch,
        MaxOraclesReached,
        OracleAlreadyExists,
        MinimumOraclesRequired,
        InsufficientConfirmations,
        MintFailed,
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
        /// Hash da transação Solana
        pub tx_hash: String,
        /// Endereço do pagador (Solana)
        pub sender_address: String,
        /// Valor em USDT (6 decimais)
        pub amount: Balance,
        /// Beneficiário no contrato Lunes
        pub beneficiary: AccountId,
        /// Tipo de pagamento
        pub payment_type: String,
        /// Oracles que já confirmaram
        pub confirmations: Vec<AccountId>,
        /// Timestamp da primeira confirmação
        pub created_at: u64,
        /// Status do pagamento
        pub status: PaymentStatus,
    }

    /// Configuração do sistema Multi-Oracle
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct OracleConfig {
        pub oracles: Vec<AccountId>,
        pub required_confirmations: u8,
        pub confirmation_timeout_ms: u64,
        pub is_active: bool,
    }

    impl Default for OracleConfig {
        fn default() -> Self {
            Self {
                oracles: Vec::new(),
                required_confirmations: MIN_CONFIRMATIONS,
                confirmation_timeout_ms: CONFIRMATION_TIMEOUT_MS,
                is_active: true,
            }
        }
    }

    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct BridgeRequest {
        pub id: u64,
        pub user: AccountId,
        pub amount: Balance,
        pub destination: String, // Solana address
        pub status: u8, // 0=pending, 1=completed, 2=failed
        pub timestamp: u64,
    }

    #[ink(event)]
    pub struct BridgeInitiated {
        #[ink(topic)]
        request_id: u64,
        user: AccountId,
        amount: Balance,
        destination: String,
    }

    #[ink(event)]
    pub struct BridgeCompleted {
        #[ink(topic)]
        request_id: u64,
    }

    /// Evento de confirmação de pagamento
    #[ink(event)]
    pub struct PaymentConfirmationSubmitted {
        #[ink(topic)]
        tx_hash: String,
        oracle: AccountId,
        current_confirmations: u8,
    }

    /// Evento de consenso atingido
    #[ink(event)]
    pub struct PaymentConsensusReached {
        #[ink(topic)]
        tx_hash: String,
        amount: Balance,
        beneficiary: AccountId,
    }

    #[ink(storage)]
    pub struct FiapoBridge {
        core_contract: AccountId,
        owner: AccountId,
        /// Configuração multi-oracle
        oracle_config: OracleConfig,
        /// Pagamentos pendentes por tx_hash
        pending_payments: Mapping<String, PendingPayment>,
        /// Requests de bridge outbound
        requests: Mapping<u64, BridgeRequest>,
        next_request_id: u64,
        paused: bool,
        total_bridged: Balance,
        /// Contador de pagamentos processados
        processed_payments: u64,
        fee_bps: u16,
    }

    impl FiapoBridge {
        #[ink(constructor)]
        pub fn new(core_contract: AccountId, initial_oracles: Vec<AccountId>) -> Self {
            let mut oracle_config = OracleConfig::default();
            oracle_config.oracles = initial_oracles;
            
            Self {
                core_contract,
                owner: Self::env().caller(),
                oracle_config,
                pending_payments: Mapping::default(),
                requests: Mapping::default(),
                next_request_id: 1,
                paused: false,
                total_bridged: 0,
                processed_payments: 0,
                fee_bps: 100, // 1% fee
            }
        }

        #[ink(message)]
        pub fn core_contract(&self) -> AccountId {
            self.core_contract
        }

        #[ink(message)]
        pub fn get_request(&self, id: u64) -> Option<BridgeRequest> {
            self.requests.get(id)
        }

        #[ink(message)]
        pub fn total_bridged(&self) -> Balance {
            self.total_bridged
        }

        #[ink(message)]
        pub fn is_paused(&self) -> bool {
            self.paused
        }

        #[ink(message)]
        pub fn initiate_bridge(&mut self, amount: Balance, destination: String) -> Result<u64, BridgeError> {
            if self.paused {
                return Err(BridgeError::BridgePaused);
            }

            if destination.len() != 44 {
                return Err(BridgeError::InvalidDestination);
            }

            let caller = self.env().caller();
            let request_id = self.next_request_id;

            let request = BridgeRequest {
                id: request_id,
                user: caller,
                amount,
                destination: destination.clone(),
                status: 0,
                timestamp: self.env().block_timestamp(),
            };

            self.requests.insert(request_id, &request);
            self.next_request_id += 1;

            Self::env().emit_event(BridgeInitiated {
                request_id,
                user: caller,
                amount,
                destination,
            });

            Ok(request_id)
        }

        #[ink(message)]
        pub fn complete_bridge(&mut self, request_id: u64) -> Result<(), BridgeError> {
            let caller = self.env().caller();
            // Apenas oracles autorizados ou owner podem completar
            if !self.is_oracle(caller) && caller != self.owner {
                return Err(BridgeError::Unauthorized);
            }

            let mut request = self.requests.get(request_id)
                .ok_or(BridgeError::RequestNotFound)?;

            if request.status != 0 {
                return Err(BridgeError::AlreadyCompleted);
            }

            request.status = 1;
            self.requests.insert(request_id, &request);
            self.total_bridged = self.total_bridged.saturating_add(request.amount);

            Self::env().emit_event(BridgeCompleted { request_id });

            Ok(())
        }

        #[ink(message)]
        pub fn pause(&mut self) -> Result<(), BridgeError> {
            if self.env().caller() != self.owner {
                return Err(BridgeError::Unauthorized);
            }
            self.paused = true;
            Ok(())
        }

        #[ink(message)]
        pub fn unpause(&mut self) -> Result<(), BridgeError> {
            if self.env().caller() != self.owner {
                return Err(BridgeError::Unauthorized);
            }
            self.paused = false;
            Ok(())
        }

        // ==================== Multi-Oracle Functions ====================

        /// Verifica se um endereço é oracle autorizado
        #[ink(message)]
        pub fn is_oracle(&self, account: AccountId) -> bool {
            self.oracle_config.oracles.contains(&account)
        }

        /// Retorna configuração de oracles
        #[ink(message)]
        pub fn get_oracle_config(&self) -> OracleConfig {
            self.oracle_config.clone()
        }

        /// Retorna pagamento pendente
        #[ink(message)]
        pub fn get_pending_payment(&self, tx_hash: String) -> Option<PendingPayment> {
            self.pending_payments.get(&tx_hash)
        }

        /// Submete confirmação de pagamento (chamado pelos oracles)
        #[ink(message)]
        pub fn submit_payment_confirmation(
            &mut self,
            tx_hash: String,
            sender_address: String,
            amount: Balance,
            beneficiary: AccountId,
            payment_type: String,
        ) -> Result<bool, BridgeError> {
            let caller = self.env().caller();
            let current_time = self.env().block_timestamp();

            // Verifica se é oracle autorizado
            if !self.is_oracle(caller) {
                return Err(BridgeError::UnauthorizedOracle);
            }

            // Verifica se sistema está ativo
            if self.paused {
                return Err(BridgeError::BridgePaused);
            }

            // Busca ou cria pagamento pendente
            let mut payment = if let Some(existing) = self.pending_payments.get(&tx_hash) {
                // Verifica se já foi processado
                if existing.status != PaymentStatus::Pending {
                    return Err(BridgeError::PaymentAlreadyProcessed);
                }

                // Verifica timeout
                if current_time > existing.created_at + self.oracle_config.confirmation_timeout_ms {
                    let mut expired = existing.clone();
                    expired.status = PaymentStatus::Expired;
                    self.pending_payments.insert(tx_hash.clone(), &expired);
                    return Err(BridgeError::PaymentExpired);
                }

                // Verifica se dados coincidem
                if existing.amount != amount || existing.beneficiary != beneficiary {
                    return Err(BridgeError::PaymentDataMismatch);
                }

                // Verifica se já confirmou
                if existing.confirmations.contains(&caller) {
                    return Err(BridgeError::AlreadyConfirmed);
                }

                existing
            } else {
                // Cria novo pagamento pendente
                PendingPayment {
                    tx_hash: tx_hash.clone(),
                    sender_address,
                    amount,
                    beneficiary,
                    payment_type,
                    confirmations: Vec::new(),
                    created_at: current_time,
                    status: PaymentStatus::Pending,
                }
            };

            // Adiciona confirmação
            payment.confirmations.push(caller);
            let current_confirmations = payment.confirmations.len() as u8;

            Self::env().emit_event(PaymentConfirmationSubmitted {
                tx_hash: tx_hash.clone(),
                oracle: caller,
                current_confirmations,
            });

            // Verifica se atingiu consenso
            let consensus_reached = current_confirmations >= self.oracle_config.required_confirmations;

            if consensus_reached {
                payment.status = PaymentStatus::Confirmed;
                self.processed_payments += 1;

                Self::env().emit_event(PaymentConsensusReached {
                    tx_hash: tx_hash.clone(),
                    amount: payment.amount,
                    beneficiary: payment.beneficiary,
                });

                // Cross-contract call: minta tokens para o beneficiário
                self.call_core_mint_to(payment.beneficiary, payment.amount)?;
            }

            self.pending_payments.insert(tx_hash, &payment);
            Ok(consensus_reached)
        }

        /// Adiciona oracle (apenas owner)
        #[ink(message)]
        pub fn add_oracle(&mut self, oracle: AccountId) -> Result<(), BridgeError> {
            if self.env().caller() != self.owner {
                return Err(BridgeError::Unauthorized);
            }
            if self.oracle_config.oracles.len() >= MAX_ORACLES {
                return Err(BridgeError::MaxOraclesReached);
            }
            if self.oracle_config.oracles.contains(&oracle) {
                return Err(BridgeError::OracleAlreadyExists);
            }
            self.oracle_config.oracles.push(oracle);
            Ok(())
        }

        /// Remove oracle (apenas owner)
        #[ink(message)]
        pub fn remove_oracle(&mut self, oracle: AccountId) -> Result<(), BridgeError> {
            if self.env().caller() != self.owner {
                return Err(BridgeError::Unauthorized);
            }
            if self.oracle_config.oracles.len() <= self.oracle_config.required_confirmations as usize {
                return Err(BridgeError::MinimumOraclesRequired);
            }
            self.oracle_config.oracles.retain(|o| *o != oracle);
            Ok(())
        }

        /// Atualiza número de confirmações necessárias
        #[ink(message)]
        pub fn set_required_confirmations(&mut self, required: u8) -> Result<(), BridgeError> {
            if self.env().caller() != self.owner {
                return Err(BridgeError::Unauthorized);
            }
            if required < 1 || required as usize > self.oracle_config.oracles.len() {
                return Err(BridgeError::InsufficientConfirmations);
            }
            self.oracle_config.required_confirmations = required;
            Ok(())
        }

        // ==================== Cross-Contract Calls ====================

        /// Chama Core.mint_to para mintar tokens
        fn call_core_mint_to(
            &self,
            to: AccountId,
            amount: Balance,
        ) -> Result<(), BridgeError> {
            use ink::env::call::{build_call, ExecutionInput, Selector};

            let result = build_call::<ink::env::DefaultEnvironment>()
                .call(self.core_contract)
                .gas_limit(0)
                .transferred_value(0)
                .exec_input(
                    ExecutionInput::new(Selector::new(ink::selector_bytes!("mint_to")))
                        .push_arg(to)
                        .push_arg(amount),
                )
                .returns::<Result<(), PSP22Error>>()
                .try_invoke();

            match result {
                Ok(Ok(Ok(()))) => Ok(()),
                _ => Err(BridgeError::MintFailed),
            }
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;
        use ink::prelude::vec;

        #[ink::test]
        fn constructor_works() {
            let accounts = ink::env::test::default_accounts::<ink::env::DefaultEnvironment>();
            let oracles = vec![accounts.django, accounts.eve];
            let contract = FiapoBridge::new(accounts.charlie, oracles);
            assert!(!contract.is_paused());
            assert_eq!(contract.total_bridged(), 0);
        }

        #[ink::test]
        fn oracle_management_works() {
            let accounts = ink::env::test::default_accounts::<ink::env::DefaultEnvironment>();
            let oracles = vec![accounts.django, accounts.eve];
            let mut contract = FiapoBridge::new(accounts.charlie, oracles);
            
            assert!(contract.is_oracle(accounts.django));
            assert!(contract.is_oracle(accounts.eve));
            assert!(!contract.is_oracle(accounts.frank));

            // Add new oracle
            let result = contract.add_oracle(accounts.frank);
            assert!(result.is_ok());
            assert!(contract.is_oracle(accounts.frank));
        }
    }
}
