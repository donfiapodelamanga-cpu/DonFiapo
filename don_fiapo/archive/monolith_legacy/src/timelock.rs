//! Sistema de Timelock para operações críticas
//!
//! Este módulo implementa um sistema de timelock que adiciona um delay obrigatório
//! para operações críticas, aumentando a segurança e permitindo que a comunidade
//! reaja a mudanças potencialmente maliciosas.

use ink::prelude::vec::Vec;
use ink::storage::Mapping;
use scale::{Decode, Encode};

/// Erros relacionados ao sistema de timelock
#[derive(Debug, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub enum TimelockError {
    /// Operação não encontrada
    OperationNotFound,
    /// Operação já executada
    OperationAlreadyExecuted,
    /// Operação cancelada
    OperationCancelled,
    /// Timelock ainda ativo
    TimelockStillActive,
    /// Operação expirada
    OperationExpired,
    /// Não autorizado
    Unauthorized,
    /// Delay inválido
    InvalidDelay,
    /// Operação já agendada
    OperationAlreadyScheduled,
}

/// Tipos de operações que requerem timelock
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub enum TimelockOperation {
    /// Transferência de ownership
    TransferOwnership { new_owner: AccountId },
    /// Mudança de configuração crítica
    ConfigChange { 
        config_type: String, 
        old_value: String, 
        new_value: String 
    },
    /// Upgrade do contrato
    ContractUpgrade { 
        new_implementation: AccountId,
        upgrade_data: Vec<u8>
    },
    /// Mudança de wallets do sistema
    SystemWalletChange { 
        wallet_type: String, 
        old_wallet: AccountId,
        new_wallet: AccountId 
    },
    /// Mudança de parâmetros de tokenomics
    TokenomicsChange {
        parameter: String,
        old_value: u128,
        new_value: u128
    },
    /// Mudança de taxas
    FeeChange {
        fee_type: String,
        old_fee_bps: u16,
        new_fee_bps: u16
    },
    /// Mudança de limites de supply
    SupplyLimitChange {
        limit_type: String,
        old_limit: u128,
        new_limit: u128
    },
}

/// Status de uma operação timelock
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub enum TimelockStatus {
    /// Operação agendada, aguardando timelock
    Scheduled,
    /// Operação pronta para execução
    ReadyToExecute,
    /// Operação executada
    Executed,
    /// Operação cancelada
    Cancelled,
    /// Operação expirada
    Expired,
}

/// Estrutura de uma operação timelock
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct TimelockEntry {
    /// ID único da operação
    pub id: u32,
    /// Operação a ser executada
    pub operation: TimelockOperation,
    /// Quem agendou a operação
    pub scheduler: AccountId,
    /// Timestamp quando foi agendada
    pub scheduled_at: u64,
    /// Timestamp quando pode ser executada
    pub executable_at: u64,
    /// Timestamp de expiração
    pub expires_at: u64,
    /// Status atual
    pub status: TimelockStatus,
    /// Delay aplicado (em segundos)
    pub delay: u64,
    /// Hash da operação para verificação
    pub operation_hash: [u8; 32],
    /// Razão/justificativa para a operação
    pub reason: String,
}

/// Configuração de delays por tipo de operação
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct DelayConfig {
    /// Delay para transferência de ownership (48 horas)
    pub ownership_transfer_delay: u64,
    /// Delay para mudanças de configuração (24 horas)
    pub config_change_delay: u64,
    /// Delay para upgrades (72 horas)
    pub upgrade_delay: u64,
    /// Delay para mudanças de wallets (24 horas)
    pub wallet_change_delay: u64,
    /// Delay para mudanças de tokenomics (48 horas)
    pub tokenomics_change_delay: u64,
    /// Delay para mudanças de taxas (12 horas)
    pub fee_change_delay: u64,
    /// Delay para mudanças de supply (48 horas)
    pub supply_change_delay: u64,
    /// Tempo de expiração padrão após executável (7 dias)
    pub default_expiration_time: u64,
}

impl Default for DelayConfig {
    fn default() -> Self {
        Self {
            ownership_transfer_delay: 48 * 3600,  // 48 horas
            config_change_delay: 24 * 3600,       // 24 horas
            upgrade_delay: 72 * 3600,             // 72 horas
            wallet_change_delay: 24 * 3600,       // 24 horas
            tokenomics_change_delay: 48 * 3600,   // 48 horas
            fee_change_delay: 12 * 3600,          // 12 horas
            supply_change_delay: 48 * 3600,       // 48 horas
            default_expiration_time: 7 * 24 * 3600, // 7 dias
        }
    }
}

/// Sistema de Timelock
#[derive(Debug, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct TimelockSystem {
    /// Operações agendadas
    pub operations: Mapping<u32, TimelockEntry>,
    /// Próximo ID de operação
    pub next_operation_id: u32,
    /// Configuração de delays
    pub delay_config: DelayConfig,
    /// Administradores autorizados
    pub authorized_admins: Vec<AccountId>,
    /// Delay mínimo absoluto (1 hora)
    pub minimum_delay: u64,
    /// Delay máximo absoluto (30 dias)
    pub maximum_delay: u64,
}

impl TimelockSystem {
    /// Cria um novo sistema de timelock
    pub fn new(
        initial_admins: Vec<AccountId>,
        custom_config: Option<DelayConfig>,
    ) -> Self {
        Self {
            operations: Mapping::default(),
            next_operation_id: 1,
            delay_config: custom_config.unwrap_or_default(),
            authorized_admins: initial_admins,
            minimum_delay: 3600,        // 1 hora
            maximum_delay: 30 * 24 * 3600, // 30 dias
        }
    }

    /// Agenda uma nova operação
    pub fn schedule_operation(
        &mut self,
        scheduler: AccountId,
        operation: TimelockOperation,
        current_time: u64,
        reason: String,
        custom_delay: Option<u64>,
    ) -> Result<u32, TimelockError> {
        // Verificar autorização
        if !self.is_authorized_admin(&scheduler) {
            return Err(TimelockError::Unauthorized);
        }

        // Determinar delay apropriado
        let delay = if let Some(custom) = custom_delay {
            if custom < self.minimum_delay || custom > self.maximum_delay {
                return Err(TimelockError::InvalidDelay);
            }
            custom
        } else {
            self.get_default_delay(&operation)
        };

        let operation_id = self.next_operation_id;
        let executable_at = current_time + delay;
        let expires_at = executable_at + self.delay_config.default_expiration_time;
        let operation_hash = self.calculate_operation_hash(&operation);

        let entry = TimelockEntry {
            id: operation_id,
            operation,
            scheduler,
            scheduled_at: current_time,
            executable_at,
            expires_at,
            status: TimelockStatus::Scheduled,
            delay,
            operation_hash,
            reason,
        };

        self.operations.insert(operation_id, &entry);
        self.next_operation_id += 1;

        Ok(operation_id)
    }

    /// Executa uma operação se o timelock expirou
    pub fn execute_operation(
        &mut self,
        operation_id: u32,
        executor: AccountId,
        current_time: u64,
    ) -> Result<TimelockOperation, TimelockError> {
        // Verificar autorização
        if !self.is_authorized_admin(&executor) {
            return Err(TimelockError::Unauthorized);
        }

        let mut entry = self.operations.get(operation_id)
            .ok_or(TimelockError::OperationNotFound)?;

        // Verificar status
        match entry.status {
            TimelockStatus::Executed => return Err(TimelockError::OperationAlreadyExecuted),
            TimelockStatus::Cancelled => return Err(TimelockError::OperationCancelled),
            TimelockStatus::Expired => return Err(TimelockError::OperationExpired),
            _ => {}
        }

        // Verificar se expirou
        if current_time > entry.expires_at {
            entry.status = TimelockStatus::Expired;
            self.operations.insert(operation_id, &entry);
            return Err(TimelockError::OperationExpired);
        }

        // Verificar se timelock ainda está ativo
        if current_time < entry.executable_at {
            return Err(TimelockError::TimelockStillActive);
        }

        // Marcar como executada
        entry.status = TimelockStatus::Executed;
        self.operations.insert(operation_id, &entry);

        Ok(entry.operation)
    }

    /// Cancela uma operação agendada
    pub fn cancel_operation(
        &mut self,
        operation_id: u32,
        canceller: AccountId,
    ) -> Result<(), TimelockError> {
        // Verificar autorização
        if !self.is_authorized_admin(&canceller) {
            return Err(TimelockError::Unauthorized);
        }

        let mut entry = self.operations.get(operation_id)
            .ok_or(TimelockError::OperationNotFound)?;

        // Verificar se pode ser cancelada
        match entry.status {
            TimelockStatus::Scheduled | TimelockStatus::ReadyToExecute => {
                entry.status = TimelockStatus::Cancelled;
                self.operations.insert(operation_id, &entry);
                Ok(())
            }
            TimelockStatus::Executed => Err(TimelockError::OperationAlreadyExecuted),
            TimelockStatus::Cancelled => Ok(()), // Já cancelada
            TimelockStatus::Expired => Err(TimelockError::OperationExpired),
        }
    }

    /// Verifica se uma conta é admin autorizado
    pub fn is_authorized_admin(&self, account: &AccountId) -> bool {
        self.authorized_admins.contains(account)
    }

    /// Adiciona um novo admin
    pub fn add_admin(&mut self, new_admin: AccountId) {
        if !self.authorized_admins.contains(&new_admin) {
            self.authorized_admins.push(new_admin);
        }
    }

    /// Remove um admin
    pub fn remove_admin(&mut self, admin: AccountId) {
        if let Some(pos) = self.authorized_admins.iter().position(|x| *x == admin) {
            self.authorized_admins.remove(pos);
        }
    }

    /// Obtém informações de uma operação
    pub fn get_operation(&self, operation_id: u32) -> Option<TimelockEntry> {
        self.operations.get(operation_id)
    }

    /// Lista operações por status
    pub fn get_operations_by_status(&self, status: TimelockStatus, current_time: u64) -> Vec<u32> {
        let mut operations = Vec::new();
        
        for id in 1..self.next_operation_id {
            if let Some(mut entry) = self.operations.get(id) {
                // Atualizar status se necessário
                let updated_status = self.update_operation_status(&mut entry, current_time);
                
                if updated_status == status {
                    operations.push(id);
                }
            }
        }
        
        operations
    }

    /// Obtém operações prontas para execução
    pub fn get_executable_operations(&self, current_time: u64) -> Vec<u32> {
        let mut executable = Vec::new();
        
        for id in 1..self.next_operation_id {
            if let Some(entry) = self.operations.get(id) {
                if entry.status == TimelockStatus::Scheduled 
                    && current_time >= entry.executable_at 
                    && current_time <= entry.expires_at {
                    executable.push(id);
                }
            }
        }
        
        executable
    }

    /// Obtém tempo restante para execução
    pub fn get_time_until_executable(&self, operation_id: u32, current_time: u64) -> Option<u64> {
        if let Some(entry) = self.operations.get(operation_id) {
            if current_time < entry.executable_at {
                Some(entry.executable_at - current_time)
            } else {
                Some(0)
            }
        } else {
            None
        }
    }

    /// Atualiza configuração de delays
    pub fn update_delay_config(&mut self, new_config: DelayConfig) {
        self.delay_config = new_config;
    }

    /// Obtém delay padrão para um tipo de operação
    fn get_default_delay(&self, operation: &TimelockOperation) -> u64 {
        match operation {
            TimelockOperation::TransferOwnership { .. } => self.delay_config.ownership_transfer_delay,
            TimelockOperation::ConfigChange { .. } => self.delay_config.config_change_delay,
            TimelockOperation::ContractUpgrade { .. } => self.delay_config.upgrade_delay,
            TimelockOperation::SystemWalletChange { .. } => self.delay_config.wallet_change_delay,
            TimelockOperation::TokenomicsChange { .. } => self.delay_config.tokenomics_change_delay,
            TimelockOperation::FeeChange { .. } => self.delay_config.fee_change_delay,
            TimelockOperation::SupplyLimitChange { .. } => self.delay_config.supply_change_delay,
        }
    }

    /// Atualiza status de uma operação baseado no tempo atual
    fn update_operation_status(&self, entry: &mut TimelockEntry, current_time: u64) -> TimelockStatus {
        match entry.status {
            TimelockStatus::Scheduled => {
                if current_time > entry.expires_at {
                    entry.status = TimelockStatus::Expired;
                } else if current_time >= entry.executable_at {
                    entry.status = TimelockStatus::ReadyToExecute;
                }
            }
            TimelockStatus::ReadyToExecute => {
                if current_time > entry.expires_at {
                    entry.status = TimelockStatus::Expired;
                }
            }
            _ => {} // Status finais não mudam
        }
        
        entry.status.clone()
    }

    /// Calcula hash da operação para verificação
    fn calculate_operation_hash(&self, operation: &TimelockOperation) -> [u8; 32] {
        use ink::env::hash::{Blake2x256, HashOutput};
        
        let encoded = scale::Encode::encode(operation);
        let mut output = <Blake2x256 as HashOutput>::Type::default();
        ink::env::hash_encoded::<Blake2x256, _>(&encoded, &mut output);
        output
    }

    /// Limpa operações expiradas (função de manutenção)
    pub fn cleanup_expired_operations(&mut self, current_time: u64) -> u32 {
        let mut cleaned = 0;
        
        for id in 1..self.next_operation_id {
            if let Some(mut entry) = self.operations.get(id) {
                if entry.status != TimelockStatus::Executed 
                    && entry.status != TimelockStatus::Cancelled 
                    && current_time > entry.expires_at {
                    entry.status = TimelockStatus::Expired;
                    self.operations.insert(id, &entry);
                    cleaned += 1;
                }
            }
        }
        
        cleaned
    }

    /// Obtém estatísticas do sistema
    pub fn get_statistics(&self, current_time: u64) -> (u32, u32, u32, u32, u32) {
        let mut scheduled = 0;
        let mut ready = 0;
        let mut executed = 0;
        let mut cancelled = 0;
        let mut expired = 0;
        
        for id in 1..self.next_operation_id {
            if let Some(entry) = self.operations.get(id) {
                match entry.status {
                    TimelockStatus::Scheduled => {
                        if current_time >= entry.executable_at {
                            ready += 1;
                        } else {
                            scheduled += 1;
                        }
                    }
                    TimelockStatus::ReadyToExecute => ready += 1,
                    TimelockStatus::Executed => executed += 1,
                    TimelockStatus::Cancelled => cancelled += 1,
                    TimelockStatus::Expired => expired += 1,
                }
            }
        }
        
        (scheduled, ready, executed, cancelled, expired)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    fn get_test_accounts() -> (AccountId, AccountId) {
        (
            AccountId::from([0x01; 32]),
            AccountId::from([0x02; 32]),
        )
    }

    #[test]
    fn test_timelock_creation() {
        let (admin1, admin2) = get_test_accounts();
        let admins = vec![admin1, admin2];
        
        let timelock = TimelockSystem::new(admins, None);
        
        assert_eq!(timelock.authorized_admins.len(), 2);
        assert!(timelock.is_authorized_admin(&admin1));
        assert_eq!(timelock.next_operation_id, 1);
    }

    #[test]
    fn test_schedule_and_execute_operation() {
        let (admin1, admin2) = get_test_accounts();
        let admins = vec![admin1];
        let mut timelock = TimelockSystem::new(admins, None);
        
        let operation = TimelockOperation::TransferOwnership { new_owner: admin2 };
        let current_time = 1000;
        
        // Agendar operação
        let op_id = timelock.schedule_operation(
            admin1,
            operation.clone(),
            current_time,
            "Test transfer".to_string(),
            Some(3600), // 1 hora
        ).unwrap();
        
        assert_eq!(op_id, 1);
        
        // Tentar executar antes do timelock
        let result = timelock.execute_operation(op_id, admin1, current_time + 1800);
        assert_eq!(result, Err(TimelockError::TimelockStillActive));
        
        // Executar após timelock
        let executed_op = timelock.execute_operation(op_id, admin1, current_time + 3700).unwrap();
        match executed_op {
            TimelockOperation::TransferOwnership { new_owner } => {
                assert_eq!(new_owner, admin2);
            }
            _ => panic!("Tipo de operação incorreto"),
        }
    }

    #[test]
    fn test_cancel_operation() {
        let (admin1, admin2) = get_test_accounts();
        let admins = vec![admin1];
        let mut timelock = TimelockSystem::new(admins, None);
        
        let operation = TimelockOperation::TransferOwnership { new_owner: admin2 };
        let current_time = 1000;
        
        let op_id = timelock.schedule_operation(
            admin1,
            operation,
            current_time,
            "Test transfer".to_string(),
            None,
        ).unwrap();
        
        // Cancelar operação
        timelock.cancel_operation(op_id, admin1).unwrap();
        
        // Tentar executar operação cancelada
        let result = timelock.execute_operation(op_id, admin1, current_time + 48 * 3600 + 100);
        assert_eq!(result, Err(TimelockError::OperationCancelled));
    }

    #[test]
    fn test_operation_expiration() {
        let (admin1, admin2) = get_test_accounts();
        let admins = vec![admin1];
        let mut timelock = TimelockSystem::new(admins, None);
        
        let operation = TimelockOperation::TransferOwnership { new_owner: admin2 };
        let current_time = 1000;
        
        let op_id = timelock.schedule_operation(
            admin1,
            operation,
            current_time,
            "Test transfer".to_string(),
            Some(3600),
        ).unwrap();
        
        // Tentar executar após expiração (7 dias + 1 hora após executável)
        let expiration_time = current_time + 3600 + 7 * 24 * 3600 + 100;
        let result = timelock.execute_operation(op_id, admin1, expiration_time);
        assert_eq!(result, Err(TimelockError::OperationExpired));
    }

    #[test]
    fn test_unauthorized_access() {
        let (admin1, admin2) = get_test_accounts();
        let admins = vec![admin1];
        let mut timelock = TimelockSystem::new(admins, None);
        
        let operation = TimelockOperation::TransferOwnership { new_owner: admin2 };
        let current_time = 1000;
        
        // admin2 não é autorizado
        let result = timelock.schedule_operation(
            admin2,
            operation,
            current_time,
            "Unauthorized test".to_string(),
            None,
        );
        assert_eq!(result, Err(TimelockError::Unauthorized));
    }
}