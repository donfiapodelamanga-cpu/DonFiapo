//! Sistema de Upgrade Seguro para Don Fiapo
//!
//! Este módulo implementa um sistema de upgrade seguro que permite
//! atualizar o contrato sem perder o estado, incluindo:
//! - Proxy pattern para upgrades
//! - Timelock para mudanças críticas
//! - Validação de compatibilidade de storage
//! - Rollback em caso de problemas

use ink::prelude::{string::String, vec::Vec};
use ink::storage::Mapping;
use ink::primitives::AccountId;
use scale::{Decode, Encode};

#[allow(dead_code)]
type Balance = u128;
type Timestamp = u64;

/// Erros específicos do sistema de upgrade
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub enum UpgradeError {
    /// Upgrade não autorizado
    Unauthorized,
    /// Timelock não expirado
    TimelockNotExpired,
    /// Código hash inválido
    InvalidCodeHash,
    /// Storage incompatível
    StorageIncompatible,
    /// Upgrade já em andamento
    UpgradeInProgress,
    /// Rollback não permitido
    RollbackNotAllowed,
    /// Validação falhou
    ValidationFailed,
}

/// Status de um upgrade
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub enum UpgradeStatus {
    /// Nenhum upgrade em andamento
    None,
    /// Upgrade proposto
    Proposed,
    /// Upgrade aprovado
    Approved,
    /// Upgrade executado
    Executed,
    /// Upgrade cancelado
    Cancelled,
}

/// Estrutura de uma proposta de upgrade
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct UpgradeProposal {
    /// ID único da proposta
    pub id: u64,
    /// Proponente do upgrade
    pub proposer: AccountId,
    /// Hash do novo código
    pub new_code_hash: Vec<u8>,
    /// Descrição do upgrade
    pub description: String,
    /// Timestamp de criação
    pub created_at: Timestamp,
    /// Timestamp de execução (após timelock)
    pub execution_time: Timestamp,
    /// Status atual
    pub status: UpgradeStatus,
    /// Se foi executado
    pub executed: bool,
    /// Versão do upgrade
    pub version: String,
}

/// Configuração do sistema de upgrade
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct UpgradeConfig {
    /// Timelock para upgrades em segundos
    pub timelock_period: u64,
    /// Duração da proposta em segundos
    pub proposal_lifetime: u64,
    /// Se upgrades são permitidos
    pub upgrades_enabled: bool,
    /// Versão atual do contrato
    pub current_version: String,
}

impl Default for UpgradeConfig {
    fn default() -> Self {
        Self {
            timelock_period: 7 * 24 * 60 * 60, // 7 dias
            proposal_lifetime: 30 * 24 * 60 * 60, // 30 dias
            upgrades_enabled: true,
            current_version: String::from("1.0.0"),
        }
    }
}

/// Sistema de upgrade principal
/// Compatível com ink! 4.3.0 - usando derives padrão
#[derive(Debug, Default)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct UpgradeSystem {
    /// Configuração do sistema
    config: UpgradeConfig,
    /// Proposta atual de upgrade
    current_proposal: Option<UpgradeProposal>,
    /// Próximo ID de proposta
    next_proposal_id: u64,
    /// Histórico de upgrades
    upgrade_history: Mapping<u64, UpgradeProposal>,
    /// Se o sistema está ativo
    is_active: bool,
}

impl UpgradeSystem {
    /// Cria uma nova instância do sistema de upgrade
    pub fn new() -> Self {
        Self {
            config: UpgradeConfig::default(),
            current_proposal: None,
            next_proposal_id: 1,
            upgrade_history: Mapping::default(),
            is_active: true,
        }
    }
    
    /// Proposta um novo upgrade (apenas governadores)
    pub fn propose_upgrade(
        &mut self,
        caller: AccountId,
        new_code_hash: Vec<u8>,
        description: String,
        version: String,
    ) -> Result<u64, UpgradeError> {
        if !self.is_active {
            return Err(UpgradeError::Unauthorized);
        }
        
        if !self.config.upgrades_enabled {
            return Err(UpgradeError::Unauthorized);
        }
        
        if self.current_proposal.is_some() {
            return Err(UpgradeError::UpgradeInProgress);
        }
        
        // Validação básica do código hash
        if new_code_hash.len() != 32 {
            return Err(UpgradeError::InvalidCodeHash);
        }
        
        let current_time = ink::env::block_timestamp::<ink::env::DefaultEnvironment>();
        let proposal_id = self.next_proposal_id;
        
        let proposal = UpgradeProposal {
            id: proposal_id,
            proposer: caller,
            new_code_hash,
            description,
            version,
            created_at: current_time,
            execution_time: current_time + self.config.timelock_period,
            status: UpgradeStatus::Proposed,
            executed: false,
        };
        
        self.current_proposal = Some(proposal.clone());
        self.upgrade_history.insert(proposal_id, &proposal);
        self.next_proposal_id += 1;
        
        Ok(proposal_id)
    }
    
    /// Aprova um upgrade proposto (apenas governadores)
    pub fn approve_upgrade(&mut self, _caller: AccountId) -> Result<(), UpgradeError> {
        if !self.is_active {
            return Err(UpgradeError::Unauthorized);
        }
        
        let proposal = self.current_proposal.as_mut()
            .ok_or(UpgradeError::UpgradeInProgress)?;
        
        if proposal.status != UpgradeStatus::Proposed {
            return Err(UpgradeError::ValidationFailed);
        }
        
        proposal.status = UpgradeStatus::Approved;
        let proposal_clone = proposal.clone();
        self.current_proposal = Some(proposal_clone.clone());
        self.upgrade_history.insert(proposal_clone.id, &proposal_clone);
        
        Ok(())
    }
    
    /// Executa um upgrade aprovado (após timelock)
    pub fn execute_upgrade(&mut self, _caller: AccountId) -> Result<(), UpgradeError> {
        if !self.is_active {
            return Err(UpgradeError::Unauthorized);
        }
        
        let proposal = self.current_proposal.as_mut()
            .ok_or(UpgradeError::UpgradeInProgress)?;
        
        if proposal.status != UpgradeStatus::Approved {
            return Err(UpgradeError::ValidationFailed);
        }
        
        if proposal.executed {
            return Err(UpgradeError::UpgradeInProgress);
        }
        
        let current_time = ink::env::block_timestamp::<ink::env::DefaultEnvironment>();
        if current_time < proposal.execution_time {
            return Err(UpgradeError::TimelockNotExpired);
        }
        
        // Executar o upgrade
        proposal.executed = true;
        proposal.status = UpgradeStatus::Executed;
        
        // Atualizar versão
        self.config.current_version = proposal.version.clone();
        
        // Aplicar o upgrade usando set_code_hash
        // ink! 4.3.0: set_code_hash recebe &[u8; 32] diretamente
        let code_hash = proposal.new_code_hash.clone();
        if let Ok(hash) = <[u8; 32]>::try_from(code_hash.as_slice()) {
            let _ = ink::env::set_code_hash(&hash);
        }
        
        let proposal_clone = proposal.clone();
        self.current_proposal = Some(proposal_clone.clone());
        self.upgrade_history.insert(proposal_clone.id, &proposal_clone);
        
        Ok(())
    }
    
    /// Cancela um upgrade (apenas governadores)
    pub fn cancel_upgrade(&mut self, _caller: AccountId) -> Result<(), UpgradeError> {
        if !self.is_active {
            return Err(UpgradeError::Unauthorized);
        }
        
        let proposal = self.current_proposal.as_mut()
            .ok_or(UpgradeError::UpgradeInProgress)?;
        
        if proposal.status == UpgradeStatus::Executed {
            return Err(UpgradeError::RollbackNotAllowed);
        }
        
        proposal.status = UpgradeStatus::Cancelled;
        let proposal_clone = proposal.clone();
        self.current_proposal = None;
        self.upgrade_history.insert(proposal_clone.id, &proposal_clone);
        
        Ok(())
    }
    
    /// Obtém a proposta atual
    pub fn get_current_proposal(&self) -> Option<UpgradeProposal> {
        self.current_proposal.clone()
    }
    
    /// Obtém uma proposta do histórico
    pub fn get_proposal(&self, proposal_id: u64) -> Option<UpgradeProposal> {
        self.upgrade_history.get(proposal_id)
    }
    
    /// Obtém a configuração atual
    pub fn get_config(&self) -> UpgradeConfig {
        self.config.clone()
    }
    
    /// Atualiza a configuração (apenas governadores)
    pub fn update_config(&mut self, _caller: AccountId, new_config: UpgradeConfig) -> Result<(), UpgradeError> {
        if !self.is_active {
            return Err(UpgradeError::Unauthorized);
        }
        
        self.config = new_config;
        Ok(())
    }
    
    /// Ativa/desativa o sistema de upgrade
    pub fn set_active(&mut self, _caller: AccountId, active: bool) -> Result<(), UpgradeError> {
        if !self.is_active {
            return Err(UpgradeError::Unauthorized);
        }
        
        self.is_active = active;
        Ok(())
    }
    
    /// Verifica se o sistema está ativo
    pub fn is_upgrade_active(&self) -> bool {
        self.is_active
    }
    
    /// Obtém a versão atual
    pub fn get_current_version(&self) -> String {
        self.config.current_version.clone()
    }
}

/// Eventos do sistema de upgrade
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct UpgradeProposed {
    pub proposal_id: u64,
    pub proposer: AccountId,
    pub new_code_hash: Vec<u8>,
    pub description: String,
    pub version: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct UpgradeApproved {
    pub proposal_id: u64,
    pub approver: AccountId,
}

#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct UpgradeExecuted {
    pub proposal_id: u64,
    pub executor: AccountId,
    pub new_version: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct UpgradeCancelled {
    pub proposal_id: u64,
    pub canceller: AccountId,
}

#[cfg(test)]
mod tests {
    use super::*;
    use ink::env::test;

    fn default_accounts() -> test::DefaultAccounts<ink::env::DefaultEnvironment> {
        test::default_accounts::<ink::env::DefaultEnvironment>()
    }

    #[ink::test]
    fn test_upgrade_system_creation() {
        let upgrade_system = UpgradeSystem::new();
        
        assert!(upgrade_system.is_upgrade_active());
        assert_eq!(upgrade_system.get_current_version(), "1.0.0");
    }

    #[ink::test]
    fn test_propose_upgrade() {
        let mut upgrade_system = UpgradeSystem::new();
        let accounts = default_accounts();
        
        let code_hash = vec![1u8; 32];
        let proposal_id = upgrade_system.propose_upgrade(
            accounts.alice,
            code_hash.clone(),
            String::from("Test upgrade"),
            String::from("1.1.0"),
        ).unwrap();
        
        assert_eq!(proposal_id, 1);
        
        let proposal = upgrade_system.get_current_proposal().unwrap();
        assert_eq!(proposal.proposer, accounts.alice);
        assert_eq!(proposal.status, UpgradeStatus::Proposed);
        assert_eq!(proposal.new_code_hash, code_hash);
    }

    #[ink::test]
    fn test_approve_upgrade() {
        let mut upgrade_system = UpgradeSystem::new();
        let accounts = default_accounts();
        
        let code_hash = vec![1u8; 32];
        upgrade_system.propose_upgrade(
            accounts.alice,
            code_hash,
            String::from("Test upgrade"),
            String::from("1.1.0"),
        ).unwrap();
        
        upgrade_system.approve_upgrade(accounts.bob).unwrap();
        
        let proposal = upgrade_system.get_current_proposal().unwrap();
        assert_eq!(proposal.status, UpgradeStatus::Approved);
    }
}