//! # Fiapo Timelock Contract
//!
//! Sistema de timelock para operações críticas no ecossistema Don Fiapo.
//! Adiciona delay obrigatório para mudanças importantes, permitindo
//! que a comunidade reaja a alterações potencialmente maliciosas.

#![cfg_attr(not(feature = "std"), no_std, no_main)]

use fiapo_traits::{AccountId, Balance};

#[ink::contract]
mod fiapo_timelock {
    use super::*;
    use ink::prelude::{string::String, vec::Vec};
    use ink::storage::Mapping;

    /// Constantes de tempo
    pub const HOUR: u64 = 3600 * 1000; // em ms
    pub const DAY: u64 = 24 * HOUR;

    /// Delays padrão por tipo de operação
    pub const OWNERSHIP_TRANSFER_DELAY: u64 = 48 * HOUR;
    pub const CONFIG_CHANGE_DELAY: u64 = 24 * HOUR;
    pub const UPGRADE_DELAY: u64 = 72 * HOUR;
    pub const WALLET_CHANGE_DELAY: u64 = 24 * HOUR;
    pub const TOKENOMICS_CHANGE_DELAY: u64 = 48 * HOUR;
    pub const FEE_CHANGE_DELAY: u64 = 12 * HOUR;
    pub const DEFAULT_EXPIRATION: u64 = 7 * DAY;

    /// Erros do sistema Timelock
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum TimelockError {
        OperationNotFound,
        OperationAlreadyExecuted,
        OperationCancelled,
        TimelockStillActive,
        OperationExpired,
        Unauthorized,
        InvalidDelay,
        OperationAlreadyScheduled,
        InvalidOperation,
    }

    /// Tipos de operação que requerem timelock
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub enum OperationType {
        TransferOwnership,
        ConfigChange,
        ContractUpgrade,
        SystemWalletChange,
        TokenomicsChange,
        FeeChange,
        EmergencyAction,
        Custom(String),
    }

    impl OperationType {
        pub fn get_default_delay(&self) -> u64 {
            match self {
                OperationType::TransferOwnership => OWNERSHIP_TRANSFER_DELAY,
                OperationType::ConfigChange => CONFIG_CHANGE_DELAY,
                OperationType::ContractUpgrade => UPGRADE_DELAY,
                OperationType::SystemWalletChange => WALLET_CHANGE_DELAY,
                OperationType::TokenomicsChange => TOKENOMICS_CHANGE_DELAY,
                OperationType::FeeChange => FEE_CHANGE_DELAY,
                OperationType::EmergencyAction => HOUR, // 1 hora para emergências
                OperationType::Custom(_) => CONFIG_CHANGE_DELAY,
            }
        }
    }

    /// Status de uma operação
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode, Default)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub enum OperationStatus {
        #[default]
        Scheduled,
        ReadyToExecute,
        Executed,
        Cancelled,
        Expired,
    }

    /// Estrutura de uma operação timelock
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct TimelockOperation {
        pub id: u64,
        pub operation_type: OperationType,
        pub target_contract: AccountId,
        pub call_data: Vec<u8>,
        pub value: Balance,
        pub scheduler: AccountId,
        pub scheduled_at: u64,
        pub executable_at: u64,
        pub expires_at: u64,
        pub status: OperationStatus,
        pub description: String,
        pub executed_by: Option<AccountId>,
        pub executed_at: Option<u64>,
    }

    /// Configuração de delays customizados
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct DelayConfig {
        pub ownership_transfer: u64,
        pub config_change: u64,
        pub upgrade: u64,
        pub wallet_change: u64,
        pub tokenomics_change: u64,
        pub fee_change: u64,
        pub expiration_time: u64,
        pub min_delay: u64,
    }

    impl Default for DelayConfig {
        fn default() -> Self {
            Self {
                ownership_transfer: OWNERSHIP_TRANSFER_DELAY,
                config_change: CONFIG_CHANGE_DELAY,
                upgrade: UPGRADE_DELAY,
                wallet_change: WALLET_CHANGE_DELAY,
                tokenomics_change: TOKENOMICS_CHANGE_DELAY,
                fee_change: FEE_CHANGE_DELAY,
                expiration_time: DEFAULT_EXPIRATION,
                min_delay: HOUR,
            }
        }
    }

    /// Evento de operação agendada
    #[ink(event)]
    pub struct OperationScheduled {
        #[ink(topic)]
        operation_id: u64,
        operation_type: OperationType,
        target_contract: AccountId,
        executable_at: u64,
        scheduler: AccountId,
    }

    /// Evento de operação executada
    #[ink(event)]
    pub struct OperationExecuted {
        #[ink(topic)]
        operation_id: u64,
        executor: AccountId,
    }

    /// Evento de operação cancelada
    #[ink(event)]
    pub struct OperationCancelled {
        #[ink(topic)]
        operation_id: u64,
        cancelled_by: AccountId,
    }

    #[ink(storage)]
    pub struct FiapoTimelock {
        owner: AccountId,
        /// Administradores autorizados
        admins: Mapping<AccountId, bool>,
        /// Operações por ID
        operations: Mapping<u64, TimelockOperation>,
        /// Próximo ID de operação
        next_operation_id: u64,
        /// Configuração de delays
        delay_config: DelayConfig,
        /// Total de operações agendadas
        total_scheduled: u64,
        /// Total de operações executadas
        total_executed: u64,
        /// Total de operações canceladas
        total_cancelled: u64,
        /// Se o sistema está ativo
        is_active: bool,
    }

    impl FiapoTimelock {
        #[ink(constructor)]
        pub fn new(initial_admins: Vec<AccountId>) -> Self {
            let caller = Self::env().caller();
            let mut admins = Mapping::default();
            admins.insert(caller, &true);
            
            for admin in initial_admins {
                admins.insert(admin, &true);
            }

            Self {
                owner: caller,
                admins,
                operations: Mapping::default(),
                next_operation_id: 1,
                delay_config: DelayConfig::default(),
                total_scheduled: 0,
                total_executed: 0,
                total_cancelled: 0,
                is_active: true,
            }
        }

        // ==================== View Functions ====================

        #[ink(message)]
        pub fn owner(&self) -> AccountId {
            self.owner
        }

        #[ink(message)]
        pub fn is_admin(&self, account: AccountId) -> bool {
            self.admins.get(account).unwrap_or(false)
        }

        #[ink(message)]
        pub fn get_operation(&self, operation_id: u64) -> Option<TimelockOperation> {
            self.operations.get(operation_id)
        }

        #[ink(message)]
        pub fn get_delay_config(&self) -> DelayConfig {
            self.delay_config.clone()
        }

        #[ink(message)]
        pub fn is_operation_ready(&self, operation_id: u64) -> bool {
            if let Some(op) = self.operations.get(operation_id) {
                let current_time = self.env().block_timestamp();
                op.status == OperationStatus::Scheduled
                    && current_time >= op.executable_at
                    && current_time < op.expires_at
            } else {
                false
            }
        }

        #[ink(message)]
        pub fn get_stats(&self) -> (u64, u64, u64) {
            (self.total_scheduled, self.total_executed, self.total_cancelled)
        }

        // ==================== Core Functions ====================

        /// Agenda uma nova operação com timelock
        #[ink(message)]
        pub fn schedule(
            &mut self,
            operation_type: OperationType,
            target_contract: AccountId,
            call_data: Vec<u8>,
            value: Balance,
            description: String,
            custom_delay: Option<u64>,
        ) -> Result<u64, TimelockError> {
            let caller = self.env().caller();
            
            if !self.is_admin(caller) && caller != self.owner {
                return Err(TimelockError::Unauthorized);
            }

            let current_time = self.env().block_timestamp();
            let delay = custom_delay.unwrap_or_else(|| self.get_delay_for_type(&operation_type));
            
            // Validar delay mínimo
            if delay < self.delay_config.min_delay {
                return Err(TimelockError::InvalidDelay);
            }

            let operation_id = self.next_operation_id;
            let operation = TimelockOperation {
                id: operation_id,
                operation_type: operation_type.clone(),
                target_contract,
                call_data,
                value,
                scheduler: caller,
                scheduled_at: current_time,
                executable_at: current_time.saturating_add(delay),
                expires_at: current_time.saturating_add(delay).saturating_add(self.delay_config.expiration_time),
                status: OperationStatus::Scheduled,
                description,
                executed_by: None,
                executed_at: None,
            };

            self.operations.insert(operation_id, &operation);
            self.next_operation_id = self.next_operation_id.saturating_add(1);
            self.total_scheduled = self.total_scheduled.saturating_add(1);

            Self::env().emit_event(OperationScheduled {
                operation_id,
                operation_type,
                target_contract,
                executable_at: operation.executable_at,
                scheduler: caller,
            });

            Ok(operation_id)
        }

        /// Executa uma operação após o timelock
        #[ink(message)]
        pub fn execute(&mut self, operation_id: u64) -> Result<(), TimelockError> {
            let caller = self.env().caller();
            let current_time = self.env().block_timestamp();

            if !self.is_admin(caller) && caller != self.owner {
                return Err(TimelockError::Unauthorized);
            }

            let mut operation = self.operations.get(operation_id)
                .ok_or(TimelockError::OperationNotFound)?;

            match operation.status {
                OperationStatus::Cancelled => return Err(TimelockError::OperationCancelled),
                OperationStatus::Executed => return Err(TimelockError::OperationAlreadyExecuted),
                OperationStatus::Expired => return Err(TimelockError::OperationExpired),
                _ => {}
            }

            if current_time < operation.executable_at {
                return Err(TimelockError::TimelockStillActive);
            }

            if current_time >= operation.expires_at {
                operation.status = OperationStatus::Expired;
                self.operations.insert(operation_id, &operation);
                return Err(TimelockError::OperationExpired);
            }

            // Marca como executada
            operation.status = OperationStatus::Executed;
            operation.executed_by = Some(caller);
            operation.executed_at = Some(current_time);
            self.operations.insert(operation_id, &operation);
            self.total_executed = self.total_executed.saturating_add(1);

            Self::env().emit_event(OperationExecuted {
                operation_id,
                executor: caller,
            });

            // A execução real seria feita via cross-contract call
            // usando operation.target_contract, operation.call_data, operation.value

            Ok(())
        }

        /// Cancela uma operação agendada
        #[ink(message)]
        pub fn cancel(&mut self, operation_id: u64) -> Result<(), TimelockError> {
            let caller = self.env().caller();

            let mut operation = self.operations.get(operation_id)
                .ok_or(TimelockError::OperationNotFound)?;

            // Apenas owner, scheduler original ou admin podem cancelar
            if caller != self.owner && caller != operation.scheduler && !self.is_admin(caller) {
                return Err(TimelockError::Unauthorized);
            }

            if operation.status != OperationStatus::Scheduled {
                return Err(TimelockError::InvalidOperation);
            }

            operation.status = OperationStatus::Cancelled;
            self.operations.insert(operation_id, &operation);
            self.total_cancelled = self.total_cancelled.saturating_add(1);

            Self::env().emit_event(OperationCancelled {
                operation_id,
                cancelled_by: caller,
            });

            Ok(())
        }

        // ==================== Admin Functions ====================

        #[ink(message)]
        pub fn add_admin(&mut self, admin: AccountId) -> Result<(), TimelockError> {
            if self.env().caller() != self.owner {
                return Err(TimelockError::Unauthorized);
            }
            self.admins.insert(admin, &true);
            Ok(())
        }

        #[ink(message)]
        pub fn remove_admin(&mut self, admin: AccountId) -> Result<(), TimelockError> {
            if self.env().caller() != self.owner {
                return Err(TimelockError::Unauthorized);
            }
            self.admins.insert(admin, &false);
            Ok(())
        }

        #[ink(message)]
        pub fn update_delay_config(&mut self, config: DelayConfig) -> Result<(), TimelockError> {
            if self.env().caller() != self.owner {
                return Err(TimelockError::Unauthorized);
            }
            self.delay_config = config;
            Ok(())
        }

        // ==================== Internal Functions ====================

        fn get_delay_for_type(&self, op_type: &OperationType) -> u64 {
            match op_type {
                OperationType::TransferOwnership => self.delay_config.ownership_transfer,
                OperationType::ConfigChange => self.delay_config.config_change,
                OperationType::ContractUpgrade => self.delay_config.upgrade,
                OperationType::SystemWalletChange => self.delay_config.wallet_change,
                OperationType::TokenomicsChange => self.delay_config.tokenomics_change,
                OperationType::FeeChange => self.delay_config.fee_change,
                OperationType::EmergencyAction => HOUR,
                OperationType::Custom(_) => self.delay_config.config_change,
            }
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;
        use ink::prelude::vec;

        #[ink::test]
        fn constructor_works() {
            let contract = FiapoTimelock::new(vec![]);
            let (scheduled, executed, cancelled) = contract.get_stats();
            assert_eq!(scheduled, 0);
            assert_eq!(executed, 0);
            assert_eq!(cancelled, 0);
        }

        #[ink::test]
        fn schedule_works() {
            let mut contract = FiapoTimelock::new(vec![]);
            let target = AccountId::from([1u8; 32]);

            let result = contract.schedule(
                OperationType::ConfigChange,
                target,
                vec![1, 2, 3],
                0,
                String::from("Test operation"),
                None,
            );

            assert!(result.is_ok());
            assert_eq!(result.unwrap(), 1);

            let op = contract.get_operation(1).unwrap();
            assert_eq!(op.status, OperationStatus::Scheduled);
        }

        #[ink::test]
        fn cancel_works() {
            let mut contract = FiapoTimelock::new(vec![]);
            let target = AccountId::from([1u8; 32]);

            let op_id = contract.schedule(
                OperationType::ConfigChange,
                target,
                vec![],
                0,
                String::from("Test"),
                None,
            ).unwrap();

            assert!(contract.cancel(op_id).is_ok());

            let op = contract.get_operation(op_id).unwrap();
            assert_eq!(op.status, OperationStatus::Cancelled);
        }
    }
}
