//! # Fiapo Staking Contract
//! 
//! Sistema de staking para o ecossistema Don Fiapo.
//! Três pools de staking:
//! - Don Burn: APY 10-300%, pagamento diário
//! - Don Lunes: APY 6-37%, pagamento semanal
//! - Don Fiapo: APY 7-70%, pagamento mensal
//!
//! Integrações:
//! - Core: Transferência de tokens (PSP22)
//! - Affiliate: Boost de APY e registro de atividade
//! - Rewards: Distribuição de taxas para o fundo de recompensas
//! - Oracle: Stake em nome de terceiros

#![cfg_attr(not(feature = "std"), no_std, no_main)]


#[ink::contract]
mod fiapo_staking {
    use ink::prelude::{vec::Vec, string::String};
    use ink::storage::Mapping;
    
    // Cross-contract references (pure ink!, no OpenBrush)
    use fiapo_logics::traits::rewards::RewardsCall;
    use fiapo_logics::traits::affiliate::AffiliateCall;
    use fiapo_logics::traits::psp22::{PSP22, PSP22Ref};
    use fiapo_logics::traits::staking::Staking;


    /// Constantes
    pub const SECONDS_PER_DAY: u64 = 86400;
    pub const SCALE: u128 = 100_000_000;
    pub const LUSDT_SCALE: u128 = 1_000_000;

    /// Resultado do cálculo de taxa de entrada
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub struct EntryFeeResult {
        pub fiapo_amount: Balance,
        pub fee_lusdt: Balance,
        pub fee_bps: u16,
    }

    /// Erros do sistema de staking
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum StakingError {
        InvalidAmount,
        PositionNotFound,
        NotPositionOwner,
        PositionNotActive,
        TransferFailed,
        MintFailed,
        NoRewardsToClaim,
        EarlyWithdrawal,
        Unauthorized,
        StakingPaused,
        PoolNotActive,
        AffiliateCallFailed,
        RewardsCallFailed,
    }

    /// Tipo de pool de staking
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub enum PoolType {
        DonBurn = 0,   
        DonLunes = 1,  
        DonFiapo = 2,  
    }

    impl PoolType {
        pub fn from_u8(value: u8) -> Option<Self> {
            match value {
                0 => Some(PoolType::DonBurn),
                1 => Some(PoolType::DonLunes),
                2 => Some(PoolType::DonFiapo),
                _ => None,
            }
        }
        pub fn to_u8(&self) -> u8 {
            match self {
                PoolType::DonBurn => 0,
                PoolType::DonLunes => 1,
                PoolType::DonFiapo => 2,
            }
        }
    }

    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub enum PositionStatus {
        Active,
        Cancelled,
        Completed,
    }

    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct PoolConfig {
        pub apy_bps: u16,
        pub min_period_days: u32,
        pub early_withdrawal_penalty_bps: u16,
        pub cancellation_penalty_bps: u16,
        pub payment_frequency_days: u32,
        pub active: bool,
    }

    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct StakingPosition {
        pub id: u64,
        pub user: AccountId,
        pub pool_type: PoolType,
        pub amount: Balance,
        pub entry_fee: Balance,
        pub start_time: u64,
        pub last_reward_time: u64,
        pub accumulated_rewards: Balance,
        pub status: PositionStatus,
    }

    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode, Default)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub struct StakingStats {
        pub total_staked: Balance,
        pub total_stakers: u32,
        pub total_rewards_distributed: Balance,
        pub active_positions: u64,
    }

    #[ink(event)]
    pub struct Staked {
        #[ink(topic)]
        position_id: u64,
        #[ink(topic)]
        user: AccountId,
        pool: u8,
        amount: Balance,
        fee_deducted: Balance,
    }

    #[ink(event)]
    pub struct RewardsClaimed {
        #[ink(topic)]
        position_id: u64,
        #[ink(topic)]
        user: AccountId,
        amount_net: Balance,
        fee_amount: Balance,
        boost_bps: u32,
    }

    #[ink(event)]
    pub struct Unstaked {
        #[ink(topic)]
        position_id: u64,
        #[ink(topic)]
        user: AccountId,
        amount: Balance,
        penalty: Balance,
    }

    #[ink(event)]
    pub struct FeeDistributed {
        #[ink(topic)]
        reason: String,
        amount: Balance,
        staking_part: Balance,
        rewards_part: Balance,
        team_part: Balance,
        burn_part: Balance,
        noble_part: Balance, // Added Noble Part
    }

    #[ink(event)]
    pub struct PingReceived {
        #[ink(topic)]
        caller: AccountId,
    }

    #[ink(storage)]
    pub struct FiapoStaking {
        core_contract: AccountId,
        oracle_contract: Option<AccountId>,
        affiliate_contract: Option<AccountId>, // Old Affiliate
        rewards_contract: Option<AccountId>,
        noble_contract: Option<AccountId>, // New Noble Affiliate
        team_wallet: Option<AccountId>,
        burn_wallet: Option<AccountId>,
        owner: AccountId,
        pool_configs: Mapping<u8, PoolConfig>,
        positions: Mapping<u64, StakingPosition>,
        user_positions: Mapping<AccountId, Vec<u64>>,
        next_position_id: u64,
        total_staked_per_pool: [Balance; 3],
        stakers_per_pool: [u32; 3],
        active_positions: u64,
        total_rewards_distributed: Balance,
        paused: bool,
    }

    impl FiapoStaking {
        #[ink(constructor)]
        pub fn new(core_contract: AccountId) -> Self {
            let caller = Self::env().caller();
            
            let mut contract = Self {
                core_contract,
                oracle_contract: None,
                affiliate_contract: None,
                rewards_contract: None,
                noble_contract: None,
                team_wallet: Some(caller), 
                burn_wallet: None,
                owner: caller,
                pool_configs: Mapping::default(),
                positions: Mapping::default(),
                user_positions: Mapping::default(),
                next_position_id: 1,
                total_staked_per_pool: [0; 3],
                stakers_per_pool: [0; 3],
                active_positions: 0,
                total_rewards_distributed: 0,
                paused: false,
            };

            contract.initialize_pool_configs();
            contract
        }

        fn initialize_pool_configs(&mut self) {
            self.pool_configs.insert(0, &PoolConfig {
                apy_bps: 1000, 
                min_period_days: 30,
                early_withdrawal_penalty_bps: 1000, 
                cancellation_penalty_bps: 2000,
                payment_frequency_days: 1,
                active: true,
            });
            self.pool_configs.insert(1, &PoolConfig {
                apy_bps: 600, 
                min_period_days: 60,
                early_withdrawal_penalty_bps: 800, 
                cancellation_penalty_bps: 250, // 2.5%
                payment_frequency_days: 7,
                active: true,
            });
            self.pool_configs.insert(2, &PoolConfig {
                apy_bps: 700, 
                min_period_days: 90,
                early_withdrawal_penalty_bps: 600, 
                cancellation_penalty_bps: 1000, 
                payment_frequency_days: 30,
                active: true,
            });
        }

        // ==================== View Functions ====================

        #[ink(message)]
        pub fn get_stats(&self) -> StakingStats {
            let total_staked: Balance = self.total_staked_per_pool.iter().fold(0, |acc, &x| acc.saturating_add(x));
            let total_stakers: u32 = self.stakers_per_pool.iter().fold(0, |acc, &x| acc.saturating_add(x));

            StakingStats {
                total_staked,
                total_stakers,
                total_rewards_distributed: self.total_rewards_distributed,
                active_positions: self.active_positions,
            }
        }

        #[ink(message)]
        pub fn pending_rewards(&self, position_id: u64) -> Balance {
            if let Some(position) = self.positions.get(position_id) {
                if position.status != PositionStatus::Active {
                    return 0;
                }
                if let Some(config) = self.pool_configs.get(position.pool_type.to_u8()) {
                    let boost = self.fetch_user_boost(position.user);
                    return self.calculate_rewards_with_boost(&position, &config, boost);
                }
            }
            0
        }



        #[ink(message)]
        pub fn transfer_ownership(&mut self, new_owner: AccountId) -> Result<(), StakingError> {
            if self.env().caller() != self.owner {
                return Err(StakingError::Unauthorized);
            }
            self.owner = new_owner;
            Ok(())
        }

        // ==================== Staking Functions ====================

        #[ink(message)]
        pub fn stake(&mut self, pool: u8, amount: Balance) -> Result<u64, StakingError> {
            self.stake_internal(self.env().caller(), pool, amount, false, None)
        }

        #[ink(message)]
        pub fn stake_with_code(&mut self, pool: u8, amount: Balance, affiliate_code: Hash) -> Result<u64, StakingError> {
            self.stake_internal(self.env().caller(), pool, amount, false, Some(affiliate_code))
        }

        #[ink(message)]
        pub fn stake_for(&mut self, user: AccountId, amount: Balance, pool: u8) -> Result<u64, StakingError> {
            if Some(self.env().caller()) != self.oracle_contract {
                return Err(StakingError::Unauthorized);
            }
            self.stake_internal(user, pool, amount, true, None)
        }

        fn stake_internal(&mut self, user: AccountId, pool: u8, amount: Balance, is_for: bool, affiliate_code: Option<Hash>) -> Result<u64, StakingError> {
            let current_time = self.env().block_timestamp();

            if self.paused {
                return Err(StakingError::StakingPaused);
            }
            if amount == 0 {
                return Err(StakingError::InvalidAmount);
            }

            let pool_type = PoolType::from_u8(pool).ok_or(StakingError::PoolNotActive)?;
            let config = self.pool_configs.get(pool).ok_or(StakingError::PoolNotActive)?;

            if !config.active {
                return Err(StakingError::PoolNotActive);
            }

            if !is_for {
                self.call_core_transfer_from(user, self.env().account_id(), amount)?;
            }

            // Fee Calculation
            let fee_result = self.calculate_entry_fee(amount);
            let fee_deducted = amount.saturating_mul(fee_result.fee_bps as u128).saturating_div(10000);
            let net_amount = amount.saturating_sub(fee_deducted);

            // Distribution Rule: 50% Team, 40% Staking (kept), 5% Rewards, 5% Noble
            if fee_deducted > 0 {
                let team_part = fee_deducted.saturating_mul(50).saturating_div(100);
                let rewards_part = fee_deducted.saturating_mul(5).saturating_div(100);
                let noble_part = fee_deducted.saturating_mul(5).saturating_div(100);
                let staking_part = fee_deducted
                    .saturating_sub(team_part)
                    .saturating_sub(rewards_part)
                    .saturating_sub(noble_part);

                self.distribute_funds(
                    fee_deducted, 
                    team_part, 
                    rewards_part, 
                    0, 
                    staking_part, 
                    noble_part, 
                    affiliate_code,
                    user,
                    String::from("EntryFee")
                )?;
            }

            let position_id = self.next_position_id;
            let position = StakingPosition {
                id: position_id,
                user,
                pool_type,
                amount: net_amount,
                entry_fee: fee_deducted,
                start_time: current_time,
                last_reward_time: current_time,
                accumulated_rewards: 0,
                status: PositionStatus::Active,
            };

            self.positions.insert(position_id, &position);

            let mut user_positions = self.user_positions.get(user).unwrap_or_default();
            let is_new = user_positions.is_empty();
            user_positions.push(position_id);
            self.user_positions.insert(user, &user_positions);

            self.next_position_id = self.next_position_id.saturating_add(1);
            self.total_staked_per_pool[pool as usize] = self.total_staked_per_pool[pool as usize].saturating_add(net_amount);
            self.active_positions = self.active_positions.saturating_add(1);

            if is_new {
                self.stakers_per_pool[pool as usize] = self.stakers_per_pool[pool as usize].saturating_add(1);
            }

            // Old Affiliate Logic (Boosts)
            if let Some(affiliate_addr) = self.affiliate_contract {
                let _ = self.call_affiliate_update_activity(affiliate_addr, user, amount);
            }

            Self::env().emit_event(Staked {
                position_id,
                user,
                pool,
                amount: net_amount,
                fee_deducted,
            });

            Ok(position_id)
        }

        #[ink(message)]
        pub fn claim_rewards(&mut self, position_id: u64) -> Result<Balance, StakingError> {
            let caller = self.env().caller();
            let current_time = self.env().block_timestamp();

            let mut position = self.positions.get(position_id)
                .ok_or(StakingError::PositionNotFound)?;

            if position.user != caller {
                return Err(StakingError::NotPositionOwner);
            }
            if position.status != PositionStatus::Active {
                return Err(StakingError::PositionNotActive);
            }

            let config = self.pool_configs.get(position.pool_type.to_u8())
                .ok_or(StakingError::PoolNotActive)?;

            let apy_boost = self.fetch_user_boost(caller);
            let rewards = self.calculate_rewards_with_boost(&position, &config, apy_boost);

            if rewards == 0 {
                return Err(StakingError::NoRewardsToClaim);
            }

            // Interest Withdrawal Fee Rule: 1% 
            // Distribution: 20% Burn, 50% Staking (kept), 30% Rewards
            let fee_amount = rewards.saturating_mul(1).saturating_div(100);
            let net_rewards = rewards.saturating_sub(fee_amount);

            if fee_amount > 0 {
                let burn_part = fee_amount.saturating_mul(20).saturating_div(100);
                let rewards_part = fee_amount.saturating_mul(30).saturating_div(100);
                let staking_part = fee_amount.saturating_sub(burn_part).saturating_sub(rewards_part);

                self.distribute_funds(fee_amount, 0, rewards_part, burn_part, staking_part, 0, None, caller, String::from("InterestFee"))?;
            }

            position.accumulated_rewards = position.accumulated_rewards.saturating_add(net_rewards);
            position.last_reward_time = current_time;
            self.positions.insert(position_id, &position);

            self.total_rewards_distributed = self.total_rewards_distributed.saturating_add(net_rewards);
            self.call_core_transfer(caller, net_rewards)?;

            Self::env().emit_event(RewardsClaimed {
                position_id,
                user: caller,
                amount_net: net_rewards,
                fee_amount,
                boost_bps: apy_boost,
            });

            Ok(net_rewards)
        }

        #[ink(message)]
        pub fn unstake(&mut self, position_id: u64) -> Result<Balance, StakingError> {
            let caller = self.env().caller();
            let current_time = self.env().block_timestamp();

            let mut position = self.positions.get(position_id)
                .ok_or(StakingError::PositionNotFound)?;

            if position.user != caller {
                return Err(StakingError::NotPositionOwner);
            }
            if position.status != PositionStatus::Active {
                return Err(StakingError::PositionNotActive);
            }

            let config = self.pool_configs.get(position.pool_type.to_u8())
                .ok_or(StakingError::PoolNotActive)?;

            let boost = self.fetch_user_boost(caller);
            let pending = self.calculate_rewards_with_boost(&position, &config, boost);
            let total_rewards = position.accumulated_rewards.saturating_add(pending);

            let days_staked = (current_time.saturating_sub(position.start_time)) / SECONDS_PER_DAY;
            let is_early = days_staked < config.min_period_days as u64;

            let (penalty, rewards_penalty) = if is_early {
                match position.pool_type {
                    PoolType::DonBurn => {
                        // 10 USDT + 50% capital + 80% interest
                        let capital_penalty = position.amount.saturating_div(2); 
                        let interest_penalty = total_rewards.saturating_mul(80).saturating_div(100); 
                        // Note: 10 USDT fixed part is ignored for simplicity in FIAPO-only version
                        (capital_penalty, interest_penalty)
                    }
                    PoolType::DonLunes | PoolType::DonFiapo => {
                        let penalty = position.amount
                            .saturating_mul(config.early_withdrawal_penalty_bps as u128)
                            .saturating_div(10000);
                        (penalty, 0)
                    }
                }
            } else {
                (0, 0)
            };

            // Distribution logic for Penalties
            if penalty > 0 || rewards_penalty > 0 {
                let total_p = penalty.saturating_add(rewards_penalty);
                match position.pool_type {
                    PoolType::DonBurn => {
                        // 20% Burn, 50% Staking, 30% Rewards
                        let burn_part = total_p.saturating_mul(20).saturating_div(100);
                        let rewards_part = total_p.saturating_mul(30).saturating_div(100);
                        let staking_part = total_p.saturating_sub(burn_part).saturating_sub(rewards_part);
                        self.distribute_funds(total_p, 0, rewards_part, burn_part, staking_part, 0, None, caller, String::from("BurnPenalty"))?;
                    }
                    PoolType::DonLunes | PoolType::DonFiapo => {
                        // 10% Team, 50% Staking, 40% Rewards
                        let team_part = total_p.saturating_mul(10).saturating_div(100);
                        let rewards_part = total_p.saturating_mul(40).saturating_div(100);
                        let staking_part = total_p.saturating_sub(team_part).saturating_sub(rewards_part);
                        self.distribute_funds(total_p, team_part, rewards_part, 0, staking_part, 0, None, caller, String::from("UnstakePenalty"))?;
                    }
                }
            }

            let net_rewards = total_rewards.saturating_sub(rewards_penalty);
            let net_principal = position.amount.saturating_sub(penalty);
            let net_amount = net_principal.saturating_add(net_rewards);

            position.status = PositionStatus::Completed;
            position.accumulated_rewards = 0;
            self.positions.insert(position_id, &position);

            let pool = position.pool_type.to_u8() as usize;
            self.total_staked_per_pool[pool] = self.total_staked_per_pool[pool].saturating_sub(position.amount);
            self.active_positions = self.active_positions.saturating_sub(1);

            self.call_core_transfer(caller, net_amount)?;

            Self::env().emit_event(Unstaked {
                position_id,
                user: caller,
                amount: net_amount,
                penalty: penalty.saturating_add(rewards_penalty),
            });

            Ok(net_amount)
        }

        // ==================== Distribution Logic ====================

        fn distribute_funds(
            &self, 
            total: Balance, 
            mut team_part: Balance, 
            rewards_part: Balance, 
            burn_part: Balance, 
            staking_part: Balance,
            noble_part: Balance,
            affiliate_code: Option<Hash>,
            payer: AccountId, // Added payer argument
            reason: String
        ) -> Result<(), StakingError> {
            
            // Handle Noble Part
            if noble_part > 0 {
                let mut distributed = false;
                if let Some(noble) = self.noble_contract {
                    if let Some(code) = affiliate_code {
                        // Transfer to Noble
                        let _ = self.call_core_transfer(noble, noble_part);
                        // Register revenue with payer
                        let _ = self.call_noble_register(noble, code, noble_part, payer);
                        distributed = true;
                    }
                }
                if !distributed {
                     // Fallback to Team
                     team_part = team_part.saturating_add(noble_part);
                }
            }

            if team_part > 0 {
                if let Some(team) = self.team_wallet {
                    let _ = self.call_core_transfer(team, team_part);
                }
            }

            if rewards_part > 0 {
                if let Some(rewards_addr) = self.rewards_contract {
                    let _ = self.call_core_transfer(rewards_addr, rewards_part);
                    let _ = self.call_rewards_add_fund(rewards_addr, rewards_part);
                }
            }

            if burn_part > 0 {
                if let Some(burn_addr) = self.burn_wallet {
                    let _ = self.call_core_transfer(burn_addr, burn_part);
                }
            }

            // Staking part remains in contract (implicitly added to balance for backing APY coverage)
            
            Self::env().emit_event(FeeDistributed {
                reason,
                amount: total,
                team_part,
                rewards_part,
                burn_part,
                staking_part,
                noble_part,
            });

            Ok(())
        }

        // ==================== Admin / Setters ====================

        #[ink(message)]
        pub fn set_linked_contracts(
            &mut self,
            oracle: Option<AccountId>,
            affiliate: Option<AccountId>,
            rewards: Option<AccountId>,
            noble: Option<AccountId>, // New
            team: Option<AccountId>,
            burn: Option<AccountId>
        ) -> Result<(), StakingError> {
            if self.env().caller() != self.owner {
                return Err(StakingError::Unauthorized);
            }
            self.oracle_contract = oracle;
            self.affiliate_contract = affiliate;
            self.rewards_contract = rewards;
            self.noble_contract = noble;
            self.team_wallet = team;
            self.burn_wallet = burn;
            Ok(())
        }

        // ==================== Helper Calls ====================

        fn fetch_user_boost(&self, user: AccountId) -> u32 {
            if let Some(affiliate_addr) = self.affiliate_contract {
                // Uses build_call with raw selector (standalone method in FiapoAffiliate)
                return AffiliateCall::calculate_apy_boost(affiliate_addr, user);
            }
            0
        }

        fn call_affiliate_update_activity(&self, affiliate_addr: AccountId, user: AccountId, amount: Balance) -> Result<(), StakingError> {
            // Uses build_call with raw selector (standalone method in FiapoAffiliate)
            match AffiliateCall::update_referral_activity(affiliate_addr, user, amount) {
                Ok(_) => Ok(()),
                _ => Err(StakingError::AffiliateCallFailed)
            }
        }

        fn call_rewards_add_fund(&self, rewards_addr: AccountId, amount: Balance) -> Result<(), StakingError> {
            // Uses build_call with raw selector (standalone method in FiapoRewards)
            match RewardsCall::add_rewards_fund(rewards_addr, amount) {
                Ok(_) => Ok(()),
                _ => Err(StakingError::RewardsCallFailed)
            }
        }

        fn call_noble_register(
            &self,
            noble_contract: AccountId,
            code: Hash,
            amount: Balance,
            payer: AccountId,
        ) -> Result<(), StakingError> {
             use ink::env::call::{build_call, ExecutionInput, Selector};
             
             let selector = ink::selector_bytes!("register_revenue");
             
             // call register_revenue(code, source=StakingEntry(2), amount)
             let _ = build_call::<ink::env::DefaultEnvironment>()
                .call(noble_contract)
                .gas_limit(0)
                .transferred_value(0)
                .exec_input(
                    ExecutionInput::new(Selector::new(selector))
                        .push_arg(code)
                        .push_arg(2u8) // RevenueSource::StakingEntry = 2
                        .push_arg(amount) 
                        .push_arg(payer)
                )
                .returns::<Result<(), ()>>() 
                .try_invoke();
            
            Ok(())
        }

        fn call_core_transfer_from(&self, from: AccountId, to: AccountId, amount: Balance) -> Result<(), StakingError> {
             // Uses IPSP22 trait via contract_ref! — selector matches fiapo-core
             let mut psp22: PSP22Ref = self.core_contract.into();
             match psp22.transfer_from(from, to, amount) {
                 Ok(_) => Ok(()),
                 _ => Err(StakingError::TransferFailed)
             }
        }

        fn call_core_transfer(&self, to: AccountId, amount: Balance) -> Result<(), StakingError> {
            // Uses IPSP22 trait via contract_ref! — selector matches fiapo-core
            let mut psp22: PSP22Ref = self.core_contract.into();
            match psp22.transfer(to, amount) {
                Ok(_) => Ok(()),
                _ => Err(StakingError::TransferFailed)
            }
        }

        // ==================== Math ====================

        fn calculate_rewards_with_boost(&self, position: &StakingPosition, config: &PoolConfig, boost_bps: u32) -> Balance {
            let current_time = self.env().block_timestamp();
            let seconds_elapsed = current_time.saturating_sub(position.last_reward_time);
            let days_elapsed = seconds_elapsed.saturating_div(SECONDS_PER_DAY);
            
            let frequency = config.payment_frequency_days as u64;
            if frequency == 0 || days_elapsed < frequency { return 0; }
            
            let periods = days_elapsed.checked_div(frequency).unwrap_or(0);
            let total_days = periods.saturating_mul(frequency);
            let total_apy = (config.apy_bps as u128).saturating_add(boost_bps as u128);
            
            position.amount.saturating_mul(total_apy)
                .saturating_mul(total_days as u128)
                .checked_div(365).unwrap_or(0)
                .checked_div(10000).unwrap_or(0)
        }
        
        #[ink(message)]
        pub fn calculate_entry_fee(&self, fiapo_amount: Balance) -> EntryFeeResult {
            let amount_no_decimals = fiapo_amount.checked_div(SCALE).unwrap_or(0);
            let fee_bps: u16 = if amount_no_decimals <= 1_000 { 1000 } 
                                else if amount_no_decimals <= 10_000 { 500 } 
                                else if amount_no_decimals <= 100_000 { 250 } 
                                else if amount_no_decimals <= 500_000 { 100 } 
                                else { 50 };
            let fee_lusdt = amount_no_decimals.saturating_mul(fee_bps as u128).checked_div(10000).unwrap_or(0).saturating_mul(LUSDT_SCALE);
            EntryFeeResult { fiapo_amount, fee_lusdt, fee_bps }
        }

        #[ink(message)]
        pub fn pause(&mut self) -> Result<(), StakingError> {
            if self.env().caller() != self.owner { return Err(StakingError::Unauthorized); }
            self.paused = true; Ok(())
        }
    }

    impl Staking for FiapoStaking {
        #[ink(message)]
        fn ping(&self) -> u32 {
            123
        }

        #[ink(message)]
        fn get_user_positions(&self, user: AccountId) -> Vec<u64> {
            self.user_positions.get(user).unwrap_or_default()
        }

        #[ink(message)]
        fn core_contract(&self) -> AccountId {
            self.core_contract
        }
    }
}

#[cfg(feature = "ink-as-dependency")]
pub use self::fiapo_staking::*;
