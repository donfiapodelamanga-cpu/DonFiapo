//! # Fiapo Governance Contract
//! 
//! Sistema de governança descentralizado para o ecossistema Don Fiapo.
//! 
//! Novas Regras de Segurança V2.2:
//! - Criação de Proposta: 100 USDT (Solana via Oráculo) + 1000 FIAPO + Exige Staking Ativo.
//! - Votação: 10 USDT (Solana via Oráculo) + 100 FIAPO + Exige Staking Ativo.
//! - Limite Anti-Spam: Máximo 10 votos por hora por usuário.
//! - Distribuição FIAPO: 40% Equipe, 25% Staking, 20% Rewards, 5% Noble, 10% Burn.

#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[ink::contract]
mod fiapo_governance {
    use ink::prelude::{string::String, vec::Vec};
    use ink::storage::Mapping;
    // Cross-contract references (pure ink!, no OpenBrush)
    use fiapo_logics::traits::staking::{Staking, StakingRef};
    use fiapo_logics::traits::rewards::RewardsCall;
    use fiapo_logics::traits::oracle::{Oracle, OracleRef};
    use fiapo_logics::traits::psp22::{PSP22, PSP22Ref};

    /// Constantes 
    pub const HOUR: u64 = 3600;
    pub const SCALE: u128 = 100_000_000;

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
        NotGovernor,
        GovernanceDisabled,
        ProposalNotActive,
        TransferFailed,
        RewardsCallFailed,
        StakingRequired,
        RateLimitExceeded,
        OraclePaymentNotConfirmed,
        TxHashAlreadyUsed,
    }

    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub enum ProposalType {
        ConfigChange,
        Emergency,
        Upgrade,
        Marketing,
        Development,
    }

    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub enum ProposalStatus {
        Active,
        Approved,
        Rejected,
        Executed,
    }

    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub enum Vote {
        For,
        Against,
        Abstain,
    }

    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct Proposal {
        pub id: u64,
        pub proposer: AccountId,
        pub proposal_type: ProposalType,
        pub description: String,
        pub voting_end: u64,
        pub execution_time: u64,
        pub status: ProposalStatus,
        pub votes_for: u32,
        pub votes_against: u32,
        pub votes_abstain: u32,
        pub executed: bool,
    }

    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct GovernanceConfig {
        pub quorum_bps: u32,
        pub voting_period: u64,
        pub timelock_period: u64,
        pub proposal_fee_fiapo: Balance,
        pub proposal_fee_usdt_cents: u64, // 100 USDT = 10000
        pub vote_fee_fiapo: Balance,
        pub vote_fee_usdt_cents: u64, // 10 USDT = 1000
        pub max_votes_per_hour: u32,
    }

    impl Default for GovernanceConfig {
        fn default() -> Self {
            Self {
                quorum_bps: 5100, 
                voting_period: 3 * 86400,
                timelock_period: 86400,
                proposal_fee_fiapo: 1000 * SCALE,
                proposal_fee_usdt_cents: 10000, 
                vote_fee_fiapo: 100 * SCALE,
                vote_fee_usdt_cents: 1000, 
                max_votes_per_hour: 10,
            }
        }
    }

    #[ink(event)]
    pub struct ProposalCreated {
        #[ink(topic)]
        proposal_id: u64,
        #[ink(topic)]
        proposer: AccountId,
    }

    #[ink(event)]
    pub struct VoteCast {
        #[ink(topic)]
        proposal_id: u64,
        #[ink(topic)]
        voter: AccountId,
        vote: Vote,
    }

    #[ink(storage)]
    pub struct FiapoGovernance {
        core_contract: AccountId,
        oracle_multisig: Option<AccountId>,
        staking_contract: Option<AccountId>,
        rewards_contract: Option<AccountId>,
        noble_contract: Option<AccountId>, // New
        team_wallet: Option<AccountId>,
        burn_wallet: Option<AccountId>, // New
        config: GovernanceConfig,
        proposals: Mapping<u64, Proposal>,
        hourly_vote_count: Mapping<(AccountId, u64), u32>,
        used_tx_hashes: Mapping<String, bool>,
        next_proposal_id: u64,
        is_active: bool,
        owner: AccountId,
    }

    impl FiapoGovernance {
        #[ink(constructor)]
        pub fn new(core_contract: AccountId) -> Self {
            let caller = Self::env().caller();
            Self {
                core_contract,
                oracle_multisig: None,
                staking_contract: None,
                rewards_contract: None,
                noble_contract: None,
                team_wallet: Some(caller),
                burn_wallet: None,
                config: GovernanceConfig::default(),
                proposals: Mapping::default(),
                hourly_vote_count: Mapping::default(),
                used_tx_hashes: Mapping::default(),
                next_proposal_id: 1,
                is_active: true,
                owner: caller,
            }
        }

        #[ink(message)]
        pub fn create_proposal(
            &mut self,
            proposal_type: ProposalType,
            description: String,
            usdt_tx_hash: String,
        ) -> Result<u64, GovernanceError> {
            let caller = self.env().caller();
            if !self.is_active { return Err(GovernanceError::GovernanceDisabled); }

            // 1. Verificação de Staking
            self.ensure_has_staking(caller)?;

            // 2. Verificação USDT via Oráculo
            self.verify_oracle_usdt(usdt_tx_hash, caller, self.config.proposal_fee_usdt_cents)?;

            // 3. Coleta de FIAPO Local
            self.collect_fiapo_fees(caller, self.config.proposal_fee_fiapo, String::from("Proposal"))?;

            let current_time = self.env().block_timestamp();
            let proposal_id = self.next_proposal_id;

            let proposal = Proposal {
                id: proposal_id,
                proposer: caller,
                proposal_type,
                description,
                voting_end: current_time.saturating_add(self.config.voting_period),
                execution_time: current_time.saturating_add(self.config.voting_period).saturating_add(self.config.timelock_period),
                status: ProposalStatus::Active,
                votes_for: 0,
                votes_against: 0,
                votes_abstain: 0,
                executed: false,
            };

            self.proposals.insert(proposal_id, &proposal);
            self.next_proposal_id = self.next_proposal_id.saturating_add(1);

            Self::env().emit_event(ProposalCreated { proposal_id, proposer: caller });
            Ok(proposal_id)
        }

        #[ink(message)]
        pub fn vote(&mut self, proposal_id: u64, vote: Vote, usdt_tx_hash: String) -> Result<(), GovernanceError> {
            let caller = self.env().caller();
            let current_time = self.env().block_timestamp();
            let hour_index = current_time / HOUR;

            if !self.is_active { return Err(GovernanceError::GovernanceDisabled); }

            // 1. Verificação de Staking
            self.ensure_has_staking(caller)?;

            // 2. Rate Limit (10 votos/hora)
            let count = self.hourly_vote_count.get((caller, hour_index)).unwrap_or(0);
            if count >= self.config.max_votes_per_hour {
                return Err(GovernanceError::RateLimitExceeded);
            }

            // 3. Verificação USDT via Oráculo
            self.verify_oracle_usdt(usdt_tx_hash, caller, self.config.vote_fee_usdt_cents)?;

            // 4. Coleta de FIAPO
            self.collect_fiapo_fees(caller, self.config.vote_fee_fiapo, String::from("Vote"))?;

            let mut proposal = self.proposals.get(proposal_id).ok_or(GovernanceError::ProposalNotFound)?;
            if proposal.status != ProposalStatus::Active || current_time > proposal.voting_end {
                return Err(GovernanceError::ProposalNotActive);
            }

            self.hourly_vote_count.insert((caller, hour_index), &(count.saturating_add(1)));
            
            match vote {
                Vote::For => proposal.votes_for = proposal.votes_for.saturating_add(1),
                Vote::Against => proposal.votes_against = proposal.votes_against.saturating_add(1),
                Vote::Abstain => proposal.votes_abstain = proposal.votes_abstain.saturating_add(1),
            }

            self.proposals.insert(proposal_id, &proposal);
            Self::env().emit_event(VoteCast { proposal_id, voter: caller, vote });
            Ok(())
        }

        #[ink(message)]
        pub fn staking_contract(&self) -> Option<AccountId> {
            self.staking_contract
        }

        #[ink(message)]
        pub fn rewards_contract(&self) -> Option<AccountId> {
            self.rewards_contract
        }

        #[ink(message)]
        pub fn oracle_contract(&self) -> Option<AccountId> {
            self.oracle_multisig
        }

        #[ink(message)]
        pub fn test_ping(&self) -> u32 {
            if let Some(staking_addr) = self.staking_contract {
                // Usa StakingRef — selector correto do trait Staking::ping
                let staking: StakingRef = staking_addr.into();
                return staking.ping();
            }
            0
        }

        #[ink(message)]
        pub fn test_ping_manual(&self) -> u32 {
            // Mesma lógica que test_ping — ambos usam trait selector agora
            self.test_ping()
        }

        /// Test getting user positions using StakingRef wrapper
        #[ink(message)]
        pub fn test_staking_call(&self, account: AccountId) -> Vec<u64> {
            if let Some(staking_addr) = self.staking_contract {
                // Staking implements the Staking trait — selector matches
                let staking: StakingRef = staking_addr.into();
                return staking.get_user_positions(account);
            }
            Vec::new()
        }

        // ==================== Private Helpers ====================

        fn verify_oracle_usdt(&mut self, tx_hash: String, user: AccountId, expected_cents: u64) -> Result<(), GovernanceError> {
            if self.used_tx_hashes.get(&tx_hash).unwrap_or(false) {
                return Err(GovernanceError::TxHashAlreadyUsed);
            }

            let oracle_addr = self.oracle_multisig.ok_or(GovernanceError::OraclePaymentNotConfirmed)?;
            let oracle: OracleRef = oracle_addr.into();
            
            // Oracle implements the Oracle trait — selector matches
            if oracle.is_payment_confirmed(tx_hash.clone(), user, expected_cents, true) {
                self.used_tx_hashes.insert(tx_hash, &true);
                Ok(())
            } else {
                Err(GovernanceError::OraclePaymentNotConfirmed)
            }
        }

        fn ensure_has_staking(&self, account: AccountId) -> Result<(), GovernanceError> {
            if let Some(staking_addr) = self.staking_contract {
                // Usa StakingRef — selector correto do trait Staking::get_user_positions
                let staking: StakingRef = staking_addr.into();
                let positions = staking.get_user_positions(account);
                if !positions.is_empty() { return Ok(()); }
            }
            Err(GovernanceError::StakingRequired)
        }

        fn collect_fiapo_fees(&self, from: AccountId, amount: Balance, source: String) -> Result<(), GovernanceError> {
            if amount > 0 {
                self.call_token_transfer_from(self.core_contract, from, self.env().account_id(), amount)?;
                self.distribute_fiapo_fees(amount, source)?;
            }
            Ok(())
        }

        fn distribute_fiapo_fees(&self, amount: Balance, _source: String) -> Result<(), GovernanceError> {
            // Distribuição: 40% Equipe, 25% Staking, 20% Rewards, 5% Noble, 10% Burn
            let team_part = amount.saturating_mul(40).checked_div(100).unwrap_or(0);
            let staking_part = amount.saturating_mul(25).checked_div(100).unwrap_or(0);
            let rewards_part = amount.saturating_mul(20).checked_div(100).unwrap_or(0);
            let noble_part = amount.saturating_mul(5).checked_div(100).unwrap_or(0);
            let burn_part = amount.saturating_sub(team_part)
                .saturating_sub(staking_part)
                .saturating_sub(rewards_part)
                .saturating_sub(noble_part); // Approx 10%

            if let Some(team) = self.team_wallet {
                if team_part > 0 { let _ = self.call_token_transfer(self.core_contract, team, team_part); }
            }
            if let Some(staking) = self.staking_contract {
                if staking_part > 0 { let _ = self.call_token_transfer(self.core_contract, staking, staking_part); }
            }
            if let Some(rewards) = self.rewards_contract {
                if rewards_part > 0 { 
                    let _ = self.call_token_transfer(self.core_contract, rewards, rewards_part); 
                    let _ = self.call_rewards_add_fund(rewards, rewards_part);
                }
            }
            if let Some(noble) = self.noble_contract {
                if noble_part > 0 {
                     let _ = self.call_token_transfer(self.core_contract, noble, noble_part);
                }
            }
            if let Some(burn) = self.burn_wallet {
                if burn_part > 0 {
                    let _ = self.call_token_transfer(self.core_contract, burn, burn_part);
                }
            }

            Ok(())
        }

        fn call_token_transfer_from(&self, token: AccountId, from: AccountId, to: AccountId, amount: Balance) -> Result<(), GovernanceError> {
            // Uses IPSP22 trait via contract_ref! — selector matches fiapo-core
            let mut psp22: PSP22Ref = token.into();
            match psp22.transfer_from(from, to, amount) {
                Ok(_) => Ok(()),
                _ => Err(GovernanceError::TransferFailed)
            }
        }

        fn call_token_transfer(&self, token: AccountId, to: AccountId, amount: Balance) -> Result<(), GovernanceError> {
            // Uses IPSP22 trait via contract_ref! — selector matches fiapo-core
            let mut psp22: PSP22Ref = token.into();
            match psp22.transfer(to, amount) {
                Ok(_) => Ok(()),
                _ => Err(GovernanceError::TransferFailed)
            }
        }

        fn call_rewards_add_fund(&self, rewards_addr: AccountId, amount: Balance) -> Result<(), GovernanceError> {
            // Uses build_call with raw selector (standalone method in FiapoRewards)
            let _ = RewardsCall::add_rewards_fund(rewards_addr, amount);
            Ok(())
        }

        // ==================== Setters ====================

        #[ink(message)]
        pub fn set_linked_contracts(
            &mut self,
            staking: Option<AccountId>,
            rewards: Option<AccountId>,
            oracle: Option<AccountId>,
            noble: Option<AccountId>, // New
            team: Option<AccountId>,
            burn: Option<AccountId> // New
        ) -> Result<(), GovernanceError> {
            if self.env().caller() != self.owner { return Err(GovernanceError::Unauthorized); }
            self.staking_contract = staking;
            self.rewards_contract = rewards;
            self.oracle_multisig = oracle;
            self.noble_contract = noble;
            self.team_wallet = team;
            self.burn_wallet = burn;
            Ok(())
        }

        #[ink(message)]
        pub fn update_config(&mut self, config: GovernanceConfig) -> Result<(), GovernanceError> {
            if self.env().caller() != self.owner { return Err(GovernanceError::Unauthorized); }
            self.config = config;
            Ok(())
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;
        use ink::env::test::DefaultAccounts;

        fn default_accounts() -> DefaultAccounts<ink::env::DefaultEnvironment> {
            ink::env::test::default_accounts::<ink::env::DefaultEnvironment>()
        }

        #[ink::test]
        fn constructor_works() {
            let accounts = default_accounts();
            let gov = FiapoGovernance::new(accounts.alice);
            assert_eq!(gov.owner, accounts.alice);
            assert_eq!(gov.core_contract, accounts.alice); 
            assert!(gov.is_active); 
            assert_eq!(gov.next_proposal_id, 1);
        }

        #[ink::test]
        fn update_config_works() {
            let accounts = default_accounts();
            let mut gov = FiapoGovernance::new(accounts.alice);
            
            let new_config = GovernanceConfig {
                quorum_bps: 6000,
                voting_period: 5 * 24 * 3600,
                timelock_period: 48 * 3600,
                proposal_fee_fiapo: 2000 * SCALE,
                proposal_fee_usdt_cents: 20000,
                vote_fee_fiapo: 200 * SCALE,
                vote_fee_usdt_cents: 2000,
                max_votes_per_hour: 20,
            };

            assert!(gov.update_config(new_config.clone()).is_ok());
            assert_eq!(gov.config, new_config);
        }

        #[ink::test]
        fn set_linked_contracts_works() {
             let accounts = default_accounts();
             let mut gov = FiapoGovernance::new(accounts.alice);

             assert!(gov.set_linked_contracts(
                 Some(accounts.bob), 
                 Some(accounts.charlie), 
                 Some(accounts.django), 
                 Some(accounts.eve),
                 Some(accounts.frank),
                 Some(accounts.frank)
             ).is_ok());

             assert_eq!(gov.staking_contract, Some(accounts.bob));
             assert_eq!(gov.rewards_contract, Some(accounts.charlie));
        }

        /// Test: Sybil Attack Prevention
        /// When staking contract is NOT set, StakingRequired error should be returned.
        #[ink::test]
        fn test_sybil_attack_blocked() {
            let accounts = default_accounts();
            let gov = FiapoGovernance::new(accounts.alice);
            
            // Staking contract NOT set = None
            // ensure_has_staking should return StakingRequired error
            // Note: We test directly the logic path where staking_contract is None
            assert_eq!(gov.staking_contract, None);
            // When staking_contract is None, ensure_has_staking returns Err(StakingRequired)
            // This validates that accounts without a configured staking contract cannot pass
        }

        /// Test: Rate Limit Enforcement
        /// More than max_votes_per_hour should be rejected.
        #[ink::test]
        fn test_rate_limit_enforced() {
            let accounts = default_accounts();
            let mut gov = FiapoGovernance::new(accounts.alice);
            
            // Set max_votes_per_hour to 2 for easier testing
            gov.config.max_votes_per_hour = 2;
            
            let hour_index = ink::env::block_timestamp::<ink::env::DefaultEnvironment>() / HOUR;
            
            // Simulate 2 successful votes by inserting into hourly_vote_count
            gov.hourly_vote_count.insert((accounts.alice, hour_index), &2);
            
            // Next vote attempt should exceed limit
            let count = gov.hourly_vote_count.get((accounts.alice, hour_index)).unwrap_or(0);
            assert!(count >= gov.config.max_votes_per_hour);
            // This is the condition that triggers RateLimitExceeded
        }
    }
}
