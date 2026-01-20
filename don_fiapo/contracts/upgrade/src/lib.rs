//! # Fiapo Upgrade Contract
//!
//! Sistema de upgrade seguro para contratos do ecossistema Don Fiapo.
//! Implementa proxy pattern com timelock e validação de upgrades.

#![cfg_attr(not(feature = "std"), no_std, no_main)]

use fiapo_traits::AccountId;

#[ink::contract]
mod fiapo_upgrade {
    use super::*;
    use ink::prelude::{string::String, vec::Vec};
    use ink::storage::Mapping;

    /// Constantes
    pub const MIN_UPGRADE_DELAY: u64 = 72 * 3600 * 1000; // 72 horas em ms
    pub const UPGRADE_EXPIRATION: u64 = 7 * 24 * 3600 * 1000; // 7 dias
    pub const MIN_APPROVALS: u32 = 2;

    /// Erros do sistema de upgrade
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum UpgradeError {
        Unauthorized,
        UpgradeNotFound,
        UpgradeAlreadyExists,
        UpgradeNotApproved,
        UpgradeExpired,
        UpgradeTimelockActive,
        UpgradeAlreadyExecuted,
        UpgradeCancelled,
        InsufficientApprovals,
        AlreadyApproved,
        InvalidImplementation,
        RollbackNotAllowed,
    }

    /// Status de um upgrade
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode, Default)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub enum UpgradeStatus {
        #[default]
        Proposed,
        Approved,
        ReadyToExecute,
        Executed,
        Cancelled,
        Expired,
    }

    /// Proposta de upgrade
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct UpgradeProposal {
        pub id: u64,
        pub target_contract: AccountId,
        pub new_implementation: AccountId,
        pub proposer: AccountId,
        pub proposed_at: u64,
        pub executable_at: u64,
        pub expires_at: u64,
        pub status: UpgradeStatus,
        pub approvals: Vec<AccountId>,
        pub version: String,
        pub description: String,
        pub migration_data: Vec<u8>,
    }

    /// Histórico de versões de um contrato
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct VersionHistory {
        pub version: String,
        pub implementation: AccountId,
        pub upgraded_at: u64,
        pub upgraded_by: AccountId,
    }

    /// Evento de upgrade proposto
    #[ink(event)]
    pub struct UpgradeProposed {
        #[ink(topic)]
        proposal_id: u64,
        target_contract: AccountId,
        new_implementation: AccountId,
        proposer: AccountId,
    }

    /// Evento de upgrade aprovado
    #[ink(event)]
    pub struct UpgradeApproved {
        #[ink(topic)]
        proposal_id: u64,
        approver: AccountId,
        total_approvals: u32,
    }

    /// Evento de upgrade executado
    #[ink(event)]
    pub struct UpgradeExecuted {
        #[ink(topic)]
        proposal_id: u64,
        target_contract: AccountId,
        new_implementation: AccountId,
        executor: AccountId,
    }

    #[ink(storage)]
    pub struct FiapoUpgrade {
        owner: AccountId,
        /// Aprovadores autorizados
        approvers: Mapping<AccountId, bool>,
        /// Número de aprovadores
        approver_count: u32,
        /// Aprovações mínimas necessárias
        min_approvals: u32,
        /// Propostas de upgrade por ID
        proposals: Mapping<u64, UpgradeProposal>,
        /// Próximo ID de proposta
        next_proposal_id: u64,
        /// Implementação atual de cada contrato
        implementations: Mapping<AccountId, AccountId>,
        /// Histórico de versões
        version_history: Mapping<(AccountId, u64), VersionHistory>,
        /// Contador de versões por contrato
        version_count: Mapping<AccountId, u64>,
        /// Delay mínimo para upgrades
        upgrade_delay: u64,
        /// Se rollbacks são permitidos
        allow_rollback: bool,
    }

    impl FiapoUpgrade {
        #[ink(constructor)]
        pub fn new(initial_approvers: Vec<AccountId>, min_approvals: u32) -> Self {
            let caller = Self::env().caller();
            let mut approvers = Mapping::default();
            approvers.insert(caller, &true);
            
            let mut count = 1u32;
            for approver in initial_approvers {
                if approver != caller {
                    approvers.insert(approver, &true);
                    count += 1;
                }
            }

            Self {
                owner: caller,
                approvers,
                approver_count: count,
                min_approvals: min_approvals.max(MIN_APPROVALS),
                proposals: Mapping::default(),
                next_proposal_id: 1,
                implementations: Mapping::default(),
                version_history: Mapping::default(),
                version_count: Mapping::default(),
                upgrade_delay: MIN_UPGRADE_DELAY,
                allow_rollback: false,
            }
        }

        // ==================== View Functions ====================

        #[ink(message)]
        pub fn owner(&self) -> AccountId {
            self.owner
        }

        #[ink(message)]
        pub fn is_approver(&self, account: AccountId) -> bool {
            self.approvers.get(account).unwrap_or(false)
        }

        #[ink(message)]
        pub fn get_proposal(&self, proposal_id: u64) -> Option<UpgradeProposal> {
            self.proposals.get(proposal_id)
        }

        #[ink(message)]
        pub fn get_implementation(&self, contract: AccountId) -> Option<AccountId> {
            self.implementations.get(contract)
        }

        #[ink(message)]
        pub fn get_version_count(&self, contract: AccountId) -> u64 {
            self.version_count.get(contract).unwrap_or(0)
        }

        #[ink(message)]
        pub fn min_approvals(&self) -> u32 {
            self.min_approvals
        }

        // ==================== Core Functions ====================

        /// Propõe um upgrade de contrato
        #[ink(message)]
        pub fn propose_upgrade(
            &mut self,
            target_contract: AccountId,
            new_implementation: AccountId,
            version: String,
            description: String,
            migration_data: Vec<u8>,
        ) -> Result<u64, UpgradeError> {
            let caller = self.env().caller();
            
            if !self.is_approver(caller) {
                return Err(UpgradeError::Unauthorized);
            }

            // Validar implementação
            if new_implementation == AccountId::from([0u8; 32]) {
                return Err(UpgradeError::InvalidImplementation);
            }

            let current_time = self.env().block_timestamp();
            let proposal_id = self.next_proposal_id;

            let proposal = UpgradeProposal {
                id: proposal_id,
                target_contract,
                new_implementation,
                proposer: caller,
                proposed_at: current_time,
                executable_at: current_time + self.upgrade_delay,
                expires_at: current_time + self.upgrade_delay + UPGRADE_EXPIRATION,
                status: UpgradeStatus::Proposed,
                approvals: ink::prelude::vec![caller],
                version,
                description,
                migration_data,
            };

            self.proposals.insert(proposal_id, &proposal);
            self.next_proposal_id += 1;

            Self::env().emit_event(UpgradeProposed {
                proposal_id,
                target_contract,
                new_implementation,
                proposer: caller,
            });

            Ok(proposal_id)
        }

        /// Aprova uma proposta de upgrade
        #[ink(message)]
        pub fn approve_upgrade(&mut self, proposal_id: u64) -> Result<(), UpgradeError> {
            let caller = self.env().caller();
            
            if !self.is_approver(caller) {
                return Err(UpgradeError::Unauthorized);
            }

            let mut proposal = self.proposals.get(proposal_id)
                .ok_or(UpgradeError::UpgradeNotFound)?;

            if proposal.status != UpgradeStatus::Proposed && proposal.status != UpgradeStatus::Approved {
                return Err(UpgradeError::UpgradeNotFound);
            }

            // Verificar se já aprovou
            if proposal.approvals.contains(&caller) {
                return Err(UpgradeError::AlreadyApproved);
            }

            proposal.approvals.push(caller);
            let total_approvals = proposal.approvals.len() as u32;

            // Atualizar status se atingiu aprovações mínimas
            if total_approvals >= self.min_approvals {
                proposal.status = UpgradeStatus::Approved;
            }

            self.proposals.insert(proposal_id, &proposal);

            Self::env().emit_event(UpgradeApproved {
                proposal_id,
                approver: caller,
                total_approvals,
            });

            Ok(())
        }

        /// Executa um upgrade aprovado após o timelock
        #[ink(message)]
        pub fn execute_upgrade(&mut self, proposal_id: u64) -> Result<(), UpgradeError> {
            let caller = self.env().caller();
            let current_time = self.env().block_timestamp();

            if !self.is_approver(caller) {
                return Err(UpgradeError::Unauthorized);
            }

            let mut proposal = self.proposals.get(proposal_id)
                .ok_or(UpgradeError::UpgradeNotFound)?;

            // Validar status
            match proposal.status {
                UpgradeStatus::Cancelled => return Err(UpgradeError::UpgradeCancelled),
                UpgradeStatus::Executed => return Err(UpgradeError::UpgradeAlreadyExecuted),
                UpgradeStatus::Expired => return Err(UpgradeError::UpgradeExpired),
                UpgradeStatus::Proposed => return Err(UpgradeError::InsufficientApprovals),
                _ => {}
            }

            // Verificar timelock
            if current_time < proposal.executable_at {
                return Err(UpgradeError::UpgradeTimelockActive);
            }

            // Verificar expiração
            if current_time >= proposal.expires_at {
                proposal.status = UpgradeStatus::Expired;
                self.proposals.insert(proposal_id, &proposal);
                return Err(UpgradeError::UpgradeExpired);
            }

            // Verificar aprovações
            if (proposal.approvals.len() as u32) < self.min_approvals {
                return Err(UpgradeError::InsufficientApprovals);
            }

            // Registrar nova implementação
            self.implementations.insert(proposal.target_contract, &proposal.new_implementation);

            // Adicionar ao histórico
            let version_num = self.version_count.get(proposal.target_contract).unwrap_or(0) + 1;
            self.version_count.insert(proposal.target_contract, &version_num);
            
            let history = VersionHistory {
                version: proposal.version.clone(),
                implementation: proposal.new_implementation,
                upgraded_at: current_time,
                upgraded_by: caller,
            };
            self.version_history.insert((proposal.target_contract, version_num), &history);

            // Marcar como executado
            proposal.status = UpgradeStatus::Executed;
            self.proposals.insert(proposal_id, &proposal);

            Self::env().emit_event(UpgradeExecuted {
                proposal_id,
                target_contract: proposal.target_contract,
                new_implementation: proposal.new_implementation,
                executor: caller,
            });

            Ok(())
        }

        /// Cancela uma proposta de upgrade
        #[ink(message)]
        pub fn cancel_upgrade(&mut self, proposal_id: u64) -> Result<(), UpgradeError> {
            let caller = self.env().caller();

            let mut proposal = self.proposals.get(proposal_id)
                .ok_or(UpgradeError::UpgradeNotFound)?;

            // Apenas owner ou proposer podem cancelar
            if caller != self.owner && caller != proposal.proposer {
                return Err(UpgradeError::Unauthorized);
            }

            if proposal.status == UpgradeStatus::Executed {
                return Err(UpgradeError::UpgradeAlreadyExecuted);
            }

            proposal.status = UpgradeStatus::Cancelled;
            self.proposals.insert(proposal_id, &proposal);

            Ok(())
        }

        // ==================== Admin Functions ====================

        #[ink(message)]
        pub fn add_approver(&mut self, approver: AccountId) -> Result<(), UpgradeError> {
            if self.env().caller() != self.owner {
                return Err(UpgradeError::Unauthorized);
            }
            if !self.approvers.get(approver).unwrap_or(false) {
                self.approvers.insert(approver, &true);
                self.approver_count += 1;
            }
            Ok(())
        }

        #[ink(message)]
        pub fn remove_approver(&mut self, approver: AccountId) -> Result<(), UpgradeError> {
            if self.env().caller() != self.owner {
                return Err(UpgradeError::Unauthorized);
            }
            if self.approvers.get(approver).unwrap_or(false) {
                self.approvers.insert(approver, &false);
                self.approver_count = self.approver_count.saturating_sub(1);
            }
            Ok(())
        }

        #[ink(message)]
        pub fn set_min_approvals(&mut self, min: u32) -> Result<(), UpgradeError> {
            if self.env().caller() != self.owner {
                return Err(UpgradeError::Unauthorized);
            }
            self.min_approvals = min.max(MIN_APPROVALS);
            Ok(())
        }

        #[ink(message)]
        pub fn set_upgrade_delay(&mut self, delay: u64) -> Result<(), UpgradeError> {
            if self.env().caller() != self.owner {
                return Err(UpgradeError::Unauthorized);
            }
            self.upgrade_delay = delay.max(MIN_UPGRADE_DELAY);
            Ok(())
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;
        use ink::prelude::vec;

        #[ink::test]
        fn constructor_works() {
            let contract = FiapoUpgrade::new(vec![], 2);
            assert_eq!(contract.min_approvals(), 2);
            assert_eq!(contract.approver_count, 1);
        }

        #[ink::test]
        fn propose_upgrade_works() {
            let mut contract = FiapoUpgrade::new(vec![], 2);
            let target = AccountId::from([1u8; 32]);
            let new_impl = AccountId::from([2u8; 32]);

            let result = contract.propose_upgrade(
                target,
                new_impl,
                String::from("1.1.0"),
                String::from("Test upgrade"),
                vec![],
            );

            assert!(result.is_ok());
            let proposal = contract.get_proposal(1).unwrap();
            assert_eq!(proposal.status, UpgradeStatus::Proposed);
        }
    }
}
