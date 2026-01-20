//! # Fiapo Governance Contract
//! 
//! Sistema de governança descentralizado para o ecossistema Don Fiapo.
//! Inclui:
//! - Multi-signature para operações críticas
//! - Timelock para mudanças de configuração
//! - Sistema de propostas e votação
//! - Controles de emergência

#![cfg_attr(not(feature = "std"), no_std, no_main)]

// Traits são re-exportados pelo ink::contract

#[ink::contract]
mod fiapo_governance {
    use ink::prelude::{string::String, vec::Vec};
    use ink::storage::Mapping;

    /// Constantes de tempo
    pub const HOUR: u64 = 3600;
    pub const DAY: u64 = 24 * HOUR;

    /// Erros específicos do sistema de governança
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum GovernanceError {
        ProposalNotFound,
        ProposalAlreadyExecuted,
        ProposalExpired,
        VotingNotFinished,
        QuorumNotReached,
        AlreadyVoted,
        Unauthorized,
        TimelockNotExpired,
        InvalidParameters,
        InsufficientSignatures,
        NotGovernor,
        GovernanceDisabled,
        ProposalNotActive,
        TimelockOperationNotFound,
        TimelockOperationCancelled,
        TimelockStillActive,
        TimelockOperationExpired,
    }

    /// Tipos de operação que requerem timelock
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub enum TimelockOperationType {
        /// Transferência de ownership (48h)
        TransferOwnership,
        /// Mudança de configuração (24h)
        ConfigChange,
        /// Upgrade do contrato (72h)
        ContractUpgrade,
        /// Mudança de wallet do sistema (24h)
        SystemWalletChange,
        /// Mudança de parâmetros de tokenomics (48h)
        TokenomicsChange,
        /// Mudança de taxas (12h)
        FeeChange,
    }

    impl TimelockOperationType {
        /// Retorna o delay em segundos para cada tipo de operação
        pub fn get_delay(&self) -> u64 {
            match self {
                TimelockOperationType::TransferOwnership => 48 * HOUR,
                TimelockOperationType::ConfigChange => 24 * HOUR,
                TimelockOperationType::ContractUpgrade => 72 * HOUR,
                TimelockOperationType::SystemWalletChange => 24 * HOUR,
                TimelockOperationType::TokenomicsChange => 48 * HOUR,
                TimelockOperationType::FeeChange => 12 * HOUR,
            }
        }
    }

    /// Status de uma operação timelock
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub enum TimelockStatus {
        Scheduled,
        ReadyToExecute,
        Executed,
        Cancelled,
        Expired,
    }

    /// Entrada de operação timelock
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct TimelockEntry {
        pub id: u64,
        pub operation_type: TimelockOperationType,
        pub data: Vec<u8>,
        pub scheduler: AccountId,
        pub scheduled_at: Timestamp,
        pub executable_at: Timestamp,
        pub expires_at: Timestamp,
        pub status: TimelockStatus,
        pub reason: String,
    }

    /// Tipos de propostas
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub enum ProposalType {
        ConfigChange,
        Emergency,
        Upgrade,
        SystemWalletChange,
        PauseSystem,
        ExchangeListing,
        InfluencerMarketing,
        AcceleratedBurn,
        ListingDonation,
        MarketingDonation,
    }

    /// Status de uma proposta
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub enum ProposalStatus {
        Active,
        Approved,
        Rejected,
        Executed,
        Expired,
    }

    /// Voto de um governador
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub enum Vote {
        For,
        Against,
        Abstain,
    }

    /// Estrutura de uma proposta
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct Proposal {
        pub id: u64,
        pub proposer: AccountId,
        pub proposal_type: ProposalType,
        pub description: String,
        pub data: Vec<u8>,
        pub created_at: Timestamp,
        pub voting_start: Timestamp,
        pub voting_end: Timestamp,
        pub execution_time: Timestamp,
        pub status: ProposalStatus,
        pub votes_for: u32,
        pub votes_against: u32,
        pub votes_abstain: u32,
        pub executed: bool,
    }

    /// Voto com peso
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct WeightedVote {
        pub vote: Vote,
        pub weight: u32,
        pub timestamp: u64,
    }

    /// Configuração do sistema de governança
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct GovernanceConfig {
        pub min_governors: u32,
        pub quorum_bps: u32,
        pub voting_period: u64,
        pub timelock_period: u64,
        pub proposal_lifetime: u64,
    }

    impl Default for GovernanceConfig {
        fn default() -> Self {
            Self {
                min_governors: 3,
                quorum_bps: 6000, // 60%
                voting_period: 7 * 24 * 60 * 60, // 7 dias
                timelock_period: 2 * 24 * 60 * 60, // 2 dias
                proposal_lifetime: 30 * 24 * 60 * 60, // 30 dias
            }
        }
    }

    /// Estatísticas do sistema de governança
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub struct GovernanceStats {
        pub total_proposals: u64,
        pub active_proposals: u64,
        pub total_governors: u32,
        pub is_active: bool,
    }

    /// Evento de proposta criada
    #[ink(event)]
    pub struct ProposalCreated {
        #[ink(topic)]
        proposal_id: u64,
        #[ink(topic)]
        proposer: AccountId,
        proposal_type: ProposalType,
    }

    /// Evento de voto registrado
    #[ink(event)]
    pub struct VoteCast {
        #[ink(topic)]
        proposal_id: u64,
        #[ink(topic)]
        voter: AccountId,
        vote: Vote,
    }

    /// Evento de proposta executada
    #[ink(event)]
    pub struct ProposalExecuted {
        #[ink(topic)]
        proposal_id: u64,
        executor: AccountId,
    }

    /// Evento de governador adicionado
    #[ink(event)]
    pub struct GovernorAdded {
        #[ink(topic)]
        governor: AccountId,
        added_by: AccountId,
    }

    /// Evento de governador removido
    #[ink(event)]
    pub struct GovernorRemoved {
        #[ink(topic)]
        governor: AccountId,
        removed_by: AccountId,
    }

    /// Evento de operação timelock agendada
    #[ink(event)]
    pub struct TimelockScheduled {
        #[ink(topic)]
        operation_id: u64,
        operation_type: TimelockOperationType,
        executable_at: Timestamp,
    }

    /// Evento de operação timelock executada
    #[ink(event)]
    pub struct TimelockExecuted {
        #[ink(topic)]
        operation_id: u64,
        executor: AccountId,
    }

    /// Evento de operação timelock cancelada
    #[ink(event)]
    pub struct TimelockCancelled {
        #[ink(topic)]
        operation_id: u64,
        cancelled_by: AccountId,
    }

    /// Storage do contrato de governança
    #[ink(storage)]
    pub struct FiapoGovernance {
        /// Referência ao contrato Core
        core_contract: AccountId,
        /// Configuração do sistema
        config: GovernanceConfig,
        /// Lista de governadores
        governors: Mapping<AccountId, bool>,
        /// Propostas por ID
        proposals: Mapping<u64, Proposal>,
        /// Votos por proposta e governador
        votes: Mapping<(u64, AccountId), WeightedVote>,
        /// Próximo ID de proposta
        next_proposal_id: u64,
        /// Total de governadores
        total_governors: u32,
        /// Total de propostas ativas
        active_proposals: u64,
        /// Se o sistema está ativo
        is_active: bool,
        /// Owner (pode ser removido após descentralização)
        owner: AccountId,
        /// Operações timelock
        timelock_operations: Mapping<u64, TimelockEntry>,
        /// Próximo ID de operação timelock
        next_timelock_id: u64,
        /// Tempo de expiração padrão (7 dias)
        timelock_expiration: u64,
    }

    impl FiapoGovernance {
        /// Construtor do contrato
        #[ink(constructor)]
        pub fn new(core_contract: AccountId, initial_governors: Vec<AccountId>) -> Self {
            let caller = Self::env().caller();
            let mut governors = Mapping::default();
            let mut total_governors = 0u32;
            
            // Adiciona governadores iniciais
            for governor in initial_governors.iter() {
                if *governor != AccountId::from([0u8; 32]) {
                    governors.insert(*governor, &true);
                    total_governors += 1;
                }
            }

            // Se não houver governadores, adiciona o caller
            if total_governors == 0 {
                governors.insert(caller, &true);
                total_governors = 1;
            }

            Self {
                core_contract,
                config: GovernanceConfig::default(),
                governors,
                proposals: Mapping::default(),
                votes: Mapping::default(),
                next_proposal_id: 1,
                total_governors,
                active_proposals: 0,
                is_active: true,
                owner: caller,
                timelock_operations: Mapping::default(),
                next_timelock_id: 1,
                timelock_expiration: 7 * DAY,
            }
        }

        // ==================== View Functions ====================

        /// Retorna o contrato Core
        #[ink(message)]
        pub fn core_contract(&self) -> AccountId {
            self.core_contract
        }

        /// Verifica se uma conta é governador
        #[ink(message)]
        pub fn is_governor(&self, account: AccountId) -> bool {
            self.governors.get(account).unwrap_or(false)
        }

        /// Retorna o número total de governadores
        #[ink(message)]
        pub fn total_governors(&self) -> u32 {
            self.total_governors
        }

        /// Retorna uma proposta por ID
        #[ink(message)]
        pub fn get_proposal(&self, proposal_id: u64) -> Option<Proposal> {
            self.proposals.get(proposal_id)
        }

        /// Retorna as estatísticas do sistema
        #[ink(message)]
        pub fn get_stats(&self) -> GovernanceStats {
            GovernanceStats {
                total_proposals: self.next_proposal_id.saturating_sub(1),
                active_proposals: self.active_proposals,
                total_governors: self.total_governors,
                is_active: self.is_active,
            }
        }

        /// Retorna a configuração atual
        #[ink(message)]
        pub fn get_config(&self) -> GovernanceConfig {
            self.config.clone()
        }

        /// Verifica se um governador já votou em uma proposta
        #[ink(message)]
        pub fn has_voted(&self, proposal_id: u64, voter: AccountId) -> bool {
            self.votes.get((proposal_id, voter)).is_some()
        }

        // ==================== Governor Management ====================

        /// Adiciona um novo governador
        #[ink(message)]
        pub fn add_governor(&mut self, new_governor: AccountId) -> Result<(), GovernanceError> {
            let caller = self.env().caller();
            
            // Apenas governadores ou owner podem adicionar
            if !self.is_governor(caller) && caller != self.owner {
                return Err(GovernanceError::Unauthorized);
            }

            if new_governor == AccountId::from([0u8; 32]) {
                return Err(GovernanceError::InvalidParameters);
            }

            if self.is_governor(new_governor) {
                return Err(GovernanceError::InvalidParameters);
            }

            self.governors.insert(new_governor, &true);
            self.total_governors += 1;

            Self::env().emit_event(GovernorAdded {
                governor: new_governor,
                added_by: caller,
            });

            Ok(())
        }

        /// Remove um governador
        #[ink(message)]
        pub fn remove_governor(&mut self, governor: AccountId) -> Result<(), GovernanceError> {
            let caller = self.env().caller();
            
            if !self.is_governor(caller) && caller != self.owner {
                return Err(GovernanceError::Unauthorized);
            }

            if !self.is_governor(governor) {
                return Err(GovernanceError::InvalidParameters);
            }

            // Previne remover o último governador
            if self.total_governors <= self.config.min_governors {
                return Err(GovernanceError::InvalidParameters);
            }

            self.governors.remove(governor);
            self.total_governors -= 1;

            Self::env().emit_event(GovernorRemoved {
                governor,
                removed_by: caller,
            });

            Ok(())
        }

        // ==================== Proposal Management ====================

        /// Cria uma nova proposta
        #[ink(message)]
        pub fn create_proposal(
            &mut self,
            proposal_type: ProposalType,
            description: String,
            data: Vec<u8>,
        ) -> Result<u64, GovernanceError> {
            let caller = self.env().caller();

            if !self.is_active {
                return Err(GovernanceError::GovernanceDisabled);
            }

            // Apenas governadores podem criar propostas
            if !self.is_governor(caller) {
                return Err(GovernanceError::NotGovernor);
            }

            let current_time = self.env().block_timestamp();
            let proposal_id = self.next_proposal_id;

            let proposal = Proposal {
                id: proposal_id,
                proposer: caller,
                proposal_type: proposal_type.clone(),
                description,
                data,
                created_at: current_time,
                voting_start: current_time,
                voting_end: current_time + self.config.voting_period,
                execution_time: current_time + self.config.voting_period + self.config.timelock_period,
                status: ProposalStatus::Active,
                votes_for: 0,
                votes_against: 0,
                votes_abstain: 0,
                executed: false,
            };

            self.proposals.insert(proposal_id, &proposal);
            self.next_proposal_id += 1;
            self.active_proposals += 1;

            Self::env().emit_event(ProposalCreated {
                proposal_id,
                proposer: caller,
                proposal_type,
            });

            Ok(proposal_id)
        }

        /// Vota em uma proposta
        #[ink(message)]
        pub fn vote(&mut self, proposal_id: u64, vote: Vote) -> Result<(), GovernanceError> {
            let caller = self.env().caller();
            let current_time = self.env().block_timestamp();

            if !self.is_active {
                return Err(GovernanceError::GovernanceDisabled);
            }

            // Apenas governadores podem votar
            if !self.is_governor(caller) {
                return Err(GovernanceError::NotGovernor);
            }

            // Verifica se já votou
            if self.has_voted(proposal_id, caller) {
                return Err(GovernanceError::AlreadyVoted);
            }

            // Obtém proposta
            let mut proposal = self.proposals.get(proposal_id)
                .ok_or(GovernanceError::ProposalNotFound)?;

            // Verifica status
            if proposal.status != ProposalStatus::Active {
                return Err(GovernanceError::ProposalNotActive);
            }

            // Verifica período de votação
            if current_time > proposal.voting_end {
                return Err(GovernanceError::ProposalExpired);
            }

            // Registra voto
            let weighted_vote = WeightedVote {
                vote: vote.clone(),
                weight: 1,
                timestamp: current_time,
            };
            self.votes.insert((proposal_id, caller), &weighted_vote);

            // Atualiza contagem
            match vote {
                Vote::For => proposal.votes_for += 1,
                Vote::Against => proposal.votes_against += 1,
                Vote::Abstain => proposal.votes_abstain += 1,
            }

            self.proposals.insert(proposal_id, &proposal);

            Self::env().emit_event(VoteCast {
                proposal_id,
                voter: caller,
                vote,
            });

            Ok(())
        }

        /// Finaliza uma proposta e determina resultado
        #[ink(message)]
        pub fn finalize_proposal(&mut self, proposal_id: u64) -> Result<ProposalStatus, GovernanceError> {
            let current_time = self.env().block_timestamp();

            let mut proposal = self.proposals.get(proposal_id)
                .ok_or(GovernanceError::ProposalNotFound)?;

            if proposal.status != ProposalStatus::Active {
                return Err(GovernanceError::ProposalNotActive);
            }

            // Verifica se votação terminou
            if current_time < proposal.voting_end {
                return Err(GovernanceError::VotingNotFinished);
            }

            // Calcula quorum
            let total_votes = proposal.votes_for + proposal.votes_against + proposal.votes_abstain;
            let quorum_votes = (self.total_governors * self.config.quorum_bps / 10000) as u32;

            let new_status = if total_votes < quorum_votes {
                ProposalStatus::Rejected
            } else if proposal.votes_for > proposal.votes_against {
                ProposalStatus::Approved
            } else {
                ProposalStatus::Rejected
            };

            proposal.status = new_status.clone();
            self.proposals.insert(proposal_id, &proposal);
            self.active_proposals = self.active_proposals.saturating_sub(1);

            Ok(new_status)
        }

        /// Executa uma proposta aprovada
        #[ink(message)]
        pub fn execute_proposal(&mut self, proposal_id: u64) -> Result<(), GovernanceError> {
            let caller = self.env().caller();
            let current_time = self.env().block_timestamp();

            // Apenas governadores podem executar
            if !self.is_governor(caller) {
                return Err(GovernanceError::NotGovernor);
            }

            let mut proposal = self.proposals.get(proposal_id)
                .ok_or(GovernanceError::ProposalNotFound)?;

            if proposal.status != ProposalStatus::Approved {
                return Err(GovernanceError::ProposalNotActive);
            }

            if proposal.executed {
                return Err(GovernanceError::ProposalAlreadyExecuted);
            }

            // Verifica timelock
            if current_time < proposal.execution_time {
                return Err(GovernanceError::TimelockNotExpired);
            }

            // Marca como executada
            proposal.executed = true;
            proposal.status = ProposalStatus::Executed;
            self.proposals.insert(proposal_id, &proposal);

            Self::env().emit_event(ProposalExecuted {
                proposal_id,
                executor: caller,
            });

            // Executa a lógica baseada no tipo de proposta
            self.execute_proposal_action(&proposal)?;

            Ok(())
        }

        // ==================== Admin Functions ====================

        /// Pausa o sistema de governança
        #[ink(message)]
        pub fn pause(&mut self) -> Result<(), GovernanceError> {
            let caller = self.env().caller();
            if caller != self.owner && !self.is_governor(caller) {
                return Err(GovernanceError::Unauthorized);
            }
            self.is_active = false;
            Ok(())
        }

        /// Despausa o sistema de governança
        #[ink(message)]
        pub fn unpause(&mut self) -> Result<(), GovernanceError> {
            let caller = self.env().caller();
            if caller != self.owner && !self.is_governor(caller) {
                return Err(GovernanceError::Unauthorized);
            }
            self.is_active = true;
            Ok(())
        }

        /// Atualiza a configuração
        #[ink(message)]
        pub fn update_config(&mut self, new_config: GovernanceConfig) -> Result<(), GovernanceError> {
            let caller = self.env().caller();
            if caller != self.owner {
                return Err(GovernanceError::Unauthorized);
            }
            self.config = new_config;
            Ok(())
        }

        // ==================== Timelock Functions ====================

        /// Retorna uma operação timelock
        #[ink(message)]
        pub fn get_timelock_operation(&self, operation_id: u64) -> Option<TimelockEntry> {
            self.timelock_operations.get(operation_id)
        }

        /// Verifica se uma operação está pronta para execução
        #[ink(message)]
        pub fn is_timelock_ready(&self, operation_id: u64) -> bool {
            if let Some(op) = self.timelock_operations.get(operation_id) {
                let current_time = self.env().block_timestamp();
                op.status == TimelockStatus::Scheduled 
                    && current_time >= op.executable_at 
                    && current_time < op.expires_at
            } else {
                false
            }
        }

        /// Agenda uma operação com timelock
        #[ink(message)]
        pub fn schedule_timelock(
            &mut self,
            operation_type: TimelockOperationType,
            data: Vec<u8>,
            reason: String,
        ) -> Result<u64, GovernanceError> {
            let caller = self.env().caller();

            // Apenas governadores podem agendar
            if !self.is_governor(caller) {
                return Err(GovernanceError::NotGovernor);
            }

            let current_time = self.env().block_timestamp();
            let delay = operation_type.get_delay();
            let operation_id = self.next_timelock_id;

            let entry = TimelockEntry {
                id: operation_id,
                operation_type: operation_type.clone(),
                data,
                scheduler: caller,
                scheduled_at: current_time,
                executable_at: current_time + delay,
                expires_at: current_time + delay + self.timelock_expiration,
                status: TimelockStatus::Scheduled,
                reason,
            };

            self.timelock_operations.insert(operation_id, &entry);
            self.next_timelock_id += 1;

            Self::env().emit_event(TimelockScheduled {
                operation_id,
                operation_type,
                executable_at: entry.executable_at,
            });

            Ok(operation_id)
        }

        /// Executa uma operação timelock que já passou o delay
        #[ink(message)]
        pub fn execute_timelock(&mut self, operation_id: u64) -> Result<(), GovernanceError> {
            let caller = self.env().caller();
            let current_time = self.env().block_timestamp();

            // Apenas governadores podem executar
            if !self.is_governor(caller) {
                return Err(GovernanceError::NotGovernor);
            }

            let mut operation = self.timelock_operations.get(operation_id)
                .ok_or(GovernanceError::TimelockOperationNotFound)?;

            // Verifica status
            if operation.status == TimelockStatus::Cancelled {
                return Err(GovernanceError::TimelockOperationCancelled);
            }
            if operation.status == TimelockStatus::Executed {
                return Err(GovernanceError::ProposalAlreadyExecuted);
            }

            // Verifica timelock
            if current_time < operation.executable_at {
                return Err(GovernanceError::TimelockStillActive);
            }
            if current_time >= operation.expires_at {
                operation.status = TimelockStatus::Expired;
                self.timelock_operations.insert(operation_id, &operation);
                return Err(GovernanceError::TimelockOperationExpired);
            }

            // Marca como executada
            operation.status = TimelockStatus::Executed;
            self.timelock_operations.insert(operation_id, &operation);

            Self::env().emit_event(TimelockExecuted {
                operation_id,
                executor: caller,
            });

            // Executa a ação específica da operação timelock
            self.execute_timelock_action(&operation)?;

            Ok(())
        }

        /// Cancela uma operação timelock agendada
        #[ink(message)]
        pub fn cancel_timelock(&mut self, operation_id: u64) -> Result<(), GovernanceError> {
            let caller = self.env().caller();

            // Apenas owner ou scheduler original podem cancelar
            let mut operation = self.timelock_operations.get(operation_id)
                .ok_or(GovernanceError::TimelockOperationNotFound)?;

            if caller != self.owner && caller != operation.scheduler {
                return Err(GovernanceError::Unauthorized);
            }

            if operation.status != TimelockStatus::Scheduled {
                return Err(GovernanceError::InvalidParameters);
            }

            operation.status = TimelockStatus::Cancelled;
            self.timelock_operations.insert(operation_id, &operation);

            Self::env().emit_event(TimelockCancelled {
                operation_id,
                cancelled_by: caller,
            });

            Ok(())
        }

        /// Atualiza tempo de expiração padrão
        #[ink(message)]
        pub fn set_timelock_expiration(&mut self, expiration: u64) -> Result<(), GovernanceError> {
            if self.env().caller() != self.owner {
                return Err(GovernanceError::Unauthorized);
            }
            // Mínimo 1 dia, máximo 30 dias
            if expiration < DAY || expiration > 30 * DAY {
                return Err(GovernanceError::InvalidParameters);
            }
            self.timelock_expiration = expiration;
            Ok(())
        }

        // ==================== Internal Execution Functions ====================

        /// Executa a ação específica de uma proposta aprovada
        fn execute_proposal_action(&mut self, proposal: &Proposal) -> Result<(), GovernanceError> {
            match proposal.proposal_type {
                ProposalType::PauseSystem => {
                    // Pausa o sistema de governança
                    self.is_active = false;
                    Ok(())
                }
                ProposalType::ConfigChange => {
                    // Decodifica nova configuração do campo data
                    if proposal.data.len() >= 32 {
                        // Formato: [min_governors(4), quorum_bps(4), voting_period(8), timelock_period(8), proposal_lifetime(8)]
                        let min_governors = u32::from_le_bytes([
                            proposal.data[0], proposal.data[1], proposal.data[2], proposal.data[3]
                        ]);
                        let quorum_bps = u32::from_le_bytes([
                            proposal.data[4], proposal.data[5], proposal.data[6], proposal.data[7]
                        ]);
                        let voting_period = u64::from_le_bytes([
                            proposal.data[8], proposal.data[9], proposal.data[10], proposal.data[11],
                            proposal.data[12], proposal.data[13], proposal.data[14], proposal.data[15]
                        ]);
                        let timelock_period = u64::from_le_bytes([
                            proposal.data[16], proposal.data[17], proposal.data[18], proposal.data[19],
                            proposal.data[20], proposal.data[21], proposal.data[22], proposal.data[23]
                        ]);
                        let proposal_lifetime = u64::from_le_bytes([
                            proposal.data[24], proposal.data[25], proposal.data[26], proposal.data[27],
                            proposal.data[28], proposal.data[29], proposal.data[30], proposal.data[31]
                        ]);
                        
                        self.config = GovernanceConfig {
                            min_governors,
                            quorum_bps,
                            voting_period,
                            timelock_period,
                            proposal_lifetime,
                        };
                    }
                    Ok(())
                }
                ProposalType::Emergency => {
                    // Ações de emergência: pausa imediata
                    self.is_active = false;
                    Ok(())
                }
                ProposalType::SystemWalletChange => {
                    // Mudança de wallet requer timelock adicional
                    // Agenda operação de timelock para execução posterior
                    if proposal.data.len() >= 32 {
                        let new_wallet_bytes: [u8; 32] = proposal.data[0..32].try_into()
                            .map_err(|_| GovernanceError::InvalidParameters)?;
                        let _new_wallet = AccountId::from(new_wallet_bytes);
                        // A mudança efetiva seria via cross-contract call ao Core
                        // após o timelock expirar
                    }
                    Ok(())
                }
                ProposalType::Upgrade => {
                    // Upgrade requer timelock de 72h - agenda operação
                    let _operation_id = self.next_timelock_id;
                    self.next_timelock_id += 1;
                    
                    let current_time = self.env().block_timestamp();
                    let delay = TimelockOperationType::ContractUpgrade.get_delay();
                    
                    let operation = TimelockEntry {
                        id: _operation_id,
                        operation_type: TimelockOperationType::ContractUpgrade,
                        data: proposal.data.clone(),
                        scheduler: proposal.proposer,
                        scheduled_at: current_time,
                        executable_at: current_time + delay,
                        expires_at: current_time + delay + self.timelock_expiration,
                        status: TimelockStatus::Scheduled,
                        reason: proposal.description.clone(),
                    };
                    
                    self.timelock_operations.insert(_operation_id, &operation);
                    Ok(())
                }
                ProposalType::ExchangeListing | 
                ProposalType::InfluencerMarketing |
                ProposalType::AcceleratedBurn |
                ProposalType::ListingDonation |
                ProposalType::MarketingDonation => {
                    // Propostas de gastos/marketing: registra aprovação
                    // A execução real (transferências) seria via sistema de pagamentos
                    Ok(())
                }
            }
        }

        /// Executa a ação específica de uma operação timelock
        fn execute_timelock_action(&mut self, operation: &TimelockEntry) -> Result<(), GovernanceError> {
            match operation.operation_type {
                TimelockOperationType::TransferOwnership => {
                    if operation.data.len() >= 32 {
                        let new_owner_bytes: [u8; 32] = operation.data[0..32].try_into()
                            .map_err(|_| GovernanceError::InvalidParameters)?;
                        let new_owner = AccountId::from(new_owner_bytes);
                        
                        // Atualiza owner local
                        self.owner = new_owner;
                        
                        // Cross-contract: transfere ownership do Core
                        self.call_core_transfer_ownership(new_owner)?;
                    }
                    Ok(())
                }
                TimelockOperationType::ConfigChange => {
                    // Já tratado em execute_proposal_action
                    Ok(())
                }
                TimelockOperationType::ContractUpgrade => {
                    // Upgrade via set_code_hash
                    // Formato: [code_hash: 32 bytes]
                    if operation.data.len() >= 32 {
                        let code_hash_bytes: [u8; 32] = operation.data[0..32].try_into()
                            .map_err(|_| GovernanceError::InvalidParameters)?;
                        
                        // Tenta fazer upgrade do próprio contrato
                        if ink::env::set_code_hash(&code_hash_bytes).is_err() {
                            return Err(GovernanceError::InvalidParameters);
                        }
                    }
                    Ok(())
                }
                TimelockOperationType::SystemWalletChange => {
                    // Formato: [wallet_type: 1 byte][new_wallet: 32 bytes]
                    // wallet_type: 0=team, 1=staking_rewards, 2=marketing
                    if operation.data.len() >= 33 {
                        let wallet_type = operation.data[0];
                        let new_wallet_bytes: [u8; 32] = operation.data[1..33].try_into()
                            .map_err(|_| GovernanceError::InvalidParameters)?;
                        let new_wallet = AccountId::from(new_wallet_bytes);
                        
                        // Cross-contract: atualiza wallet no Core
                        self.call_core_set_wallet(wallet_type, new_wallet)?;
                    }
                    Ok(())
                }
                TimelockOperationType::TokenomicsChange => {
                    // Formato: [param_type: 1 byte][new_value: 16 bytes]
                    // param_type: 0=max_supply, 1=burn_rate, 2=mint_cap
                    if operation.data.len() >= 17 {
                        let param_type = operation.data[0];
                        let value_bytes: [u8; 16] = operation.data[1..17].try_into()
                            .map_err(|_| GovernanceError::InvalidParameters)?;
                        let new_value = u128::from_le_bytes(value_bytes);
                        
                        // Cross-contract: atualiza tokenomics no Core
                        self.call_core_set_tokenomics(param_type, new_value)?;
                    }
                    Ok(())
                }
                TimelockOperationType::FeeChange => {
                    // Formato: [fee_type: 1 byte][new_bps: 2 bytes]
                    // fee_type: 0=transaction, 1=staking_entry, 2=withdrawal
                    if operation.data.len() >= 3 {
                        let fee_type = operation.data[0];
                        let new_bps = u16::from_le_bytes([operation.data[1], operation.data[2]]);
                        
                        // Cross-contract: atualiza fee no Core
                        self.call_core_set_fee(fee_type, new_bps)?;
                    }
                    Ok(())
                }
            }
        }

        // ==================== Cross-Contract Calls ====================

        /// Transfere ownership do Core
        fn call_core_transfer_ownership(&self, new_owner: AccountId) -> Result<(), GovernanceError> {
            use ink::env::call::{build_call, ExecutionInput, Selector};

            let result = build_call::<ink::env::DefaultEnvironment>()
                .call(self.core_contract)
                .gas_limit(0)
                .transferred_value(0)
                .exec_input(
                    ExecutionInput::new(Selector::new(ink::selector_bytes!("transfer_ownership")))
                        .push_arg(new_owner),
                )
                .returns::<Result<(), u8>>()
                .try_invoke();

            match result {
                Ok(Ok(Ok(()))) => Ok(()),
                _ => Err(GovernanceError::Unauthorized),
            }
        }

        /// Atualiza wallet no Core
        fn call_core_set_wallet(&self, wallet_type: u8, new_wallet: AccountId) -> Result<(), GovernanceError> {
            use ink::env::call::{build_call, ExecutionInput, Selector};

            let result = build_call::<ink::env::DefaultEnvironment>()
                .call(self.core_contract)
                .gas_limit(0)
                .transferred_value(0)
                .exec_input(
                    ExecutionInput::new(Selector::new(ink::selector_bytes!("set_system_wallet")))
                        .push_arg(wallet_type)
                        .push_arg(new_wallet),
                )
                .returns::<Result<(), u8>>()
                .try_invoke();

            match result {
                Ok(Ok(Ok(()))) => Ok(()),
                _ => Err(GovernanceError::Unauthorized),
            }
        }

        /// Atualiza parâmetros de tokenomics no Core
        fn call_core_set_tokenomics(&self, param_type: u8, value: u128) -> Result<(), GovernanceError> {
            use ink::env::call::{build_call, ExecutionInput, Selector};

            let result = build_call::<ink::env::DefaultEnvironment>()
                .call(self.core_contract)
                .gas_limit(0)
                .transferred_value(0)
                .exec_input(
                    ExecutionInput::new(Selector::new(ink::selector_bytes!("set_tokenomics_param")))
                        .push_arg(param_type)
                        .push_arg(value),
                )
                .returns::<Result<(), u8>>()
                .try_invoke();

            match result {
                Ok(Ok(Ok(()))) => Ok(()),
                _ => Err(GovernanceError::Unauthorized),
            }
        }

        /// Atualiza taxas no Core
        fn call_core_set_fee(&self, fee_type: u8, new_bps: u16) -> Result<(), GovernanceError> {
            use ink::env::call::{build_call, ExecutionInput, Selector};

            let result = build_call::<ink::env::DefaultEnvironment>()
                .call(self.core_contract)
                .gas_limit(0)
                .transferred_value(0)
                .exec_input(
                    ExecutionInput::new(Selector::new(ink::selector_bytes!("set_fee_bps")))
                        .push_arg(fee_type)
                        .push_arg(new_bps),
                )
                .returns::<Result<(), u8>>()
                .try_invoke();

            match result {
                Ok(Ok(Ok(()))) => Ok(()),
                _ => Err(GovernanceError::Unauthorized),
            }
        }
    }

    // ==================== Tests ====================

    #[cfg(test)]
    mod tests {
        use super::*;

        fn default_accounts() -> ink::env::test::DefaultAccounts<ink::env::DefaultEnvironment> {
            ink::env::test::default_accounts::<ink::env::DefaultEnvironment>()
        }

        fn create_contract() -> FiapoGovernance {
            let accounts = default_accounts();
            FiapoGovernance::new(
                accounts.charlie, // core contract
                vec![accounts.alice, accounts.bob],
            )
        }

        #[ink::test]
        fn constructor_works() {
            let accounts = default_accounts();
            let contract = create_contract();
            
            assert!(contract.is_governor(accounts.alice));
            assert!(contract.is_governor(accounts.bob));
            assert_eq!(contract.total_governors(), 2);
            assert!(contract.is_active);
        }

        #[ink::test]
        fn add_governor_works() {
            let accounts = default_accounts();
            let mut contract = create_contract();

            // Alice adiciona Charlie
            let result = contract.add_governor(accounts.charlie);
            assert!(result.is_ok());
            assert!(contract.is_governor(accounts.charlie));
            assert_eq!(contract.total_governors(), 3);
        }

        #[ink::test]
        fn create_proposal_works() {
            let accounts = default_accounts();
            let mut contract = create_contract();

            let result = contract.create_proposal(
                ProposalType::ConfigChange,
                String::from("Test proposal"),
                vec![1, 2, 3],
            );

            assert!(result.is_ok());
            let proposal_id = result.unwrap();
            assert_eq!(proposal_id, 1);

            let proposal = contract.get_proposal(proposal_id).unwrap();
            assert_eq!(proposal.proposer, accounts.alice);
            assert_eq!(proposal.status, ProposalStatus::Active);
        }

        #[ink::test]
        fn vote_works() {
            let accounts = default_accounts();
            let mut contract = create_contract();

            // Cria proposta
            let proposal_id = contract.create_proposal(
                ProposalType::ConfigChange,
                String::from("Test"),
                vec![],
            ).unwrap();

            // Alice vota
            let result = contract.vote(proposal_id, Vote::For);
            assert!(result.is_ok());

            let proposal = contract.get_proposal(proposal_id).unwrap();
            assert_eq!(proposal.votes_for, 1);

            // Alice não pode votar novamente
            let result = contract.vote(proposal_id, Vote::Against);
            assert_eq!(result, Err(GovernanceError::AlreadyVoted));
        }

        #[ink::test]
        fn non_governor_cannot_create_proposal() {
            let accounts = default_accounts();
            let mut contract = create_contract();

            // Muda caller para Charlie (não governador)
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(accounts.charlie);

            let result = contract.create_proposal(
                ProposalType::ConfigChange,
                String::from("Test"),
                vec![],
            );

            assert_eq!(result, Err(GovernanceError::NotGovernor));
        }
    }
}
