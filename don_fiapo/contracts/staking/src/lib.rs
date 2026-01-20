//! # Fiapo Staking Contract
//! 
//! Sistema de staking para o ecossistema Don Fiapo.
//! Três pools de staking:
//! - Don Burn: APY 10-300%, pagamento diário
//! - Don Lunes: APY 6-37%, pagamento semanal
//! - Don Fiapo: APY 7-70%, pagamento mensal

#![cfg_attr(not(feature = "std"), no_std, no_main)]

use fiapo_traits::{AccountId, Balance, PSP22Error, PSP22Result, StakingPoolType, IPSP22, IPSP22Mintable};

#[ink::contract]
mod fiapo_staking {
    use super::*;
    use ink::prelude::{string::String, vec::Vec, vec};
    use ink::storage::Mapping;

    /// Constantes
    pub const SECONDS_PER_DAY: u64 = 86400;
    pub const DECIMALS: u8 = 8;
    pub const SCALE: u128 = 100_000_000;
    pub const LUSDT_SCALE: u128 = 1_000_000; // 10^6 para LUSDT

    /// Resultado do cálculo de taxa de entrada
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub struct EntryFeeResult {
        /// Valor original em FIAPO
        pub fiapo_amount: Balance,
        /// Taxa em LUSDT (6 decimais)
        pub fee_lusdt: Balance,
        /// Percentual aplicado em basis points
        pub fee_bps: u16,
    }

    /// Resultado da distribuição de taxas
    /// Ordem: (burn, staking, rewards, team)
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode, Default)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub struct FeeDistribution {
        pub burn_amount: Balance,
        pub staking_amount: Balance,
        pub rewards_amount: Balance,
        pub team_amount: Balance,
    }

    impl FeeDistribution {
        pub fn total(&self) -> Balance {
            self.burn_amount
                .saturating_add(self.staking_amount)
                .saturating_add(self.rewards_amount)
                .saturating_add(self.team_amount)
        }
    }

    /// Tipo de taxa para distribuição
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum FeeType {
        /// Taxa de transação: 30% burn, 50% staking, 20% rewards
        Transaction,
        /// Taxa de entrada staking: 10% team, 40% staking, 50% rewards
        StakingEntry,
        /// Taxa de saque de juros: 20% burn, 50% staking, 30% rewards
        InterestWithdrawal,
        /// Penalidade saque antecipado: 20% burn, 50% staking, 30% rewards
        EarlyWithdrawal,
        /// Taxa de cancelamento: 10% team, 50% staking, 40% rewards
        Cancellation,
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
    }

    /// Tipo de pool de staking
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub enum PoolType {
        DonBurn = 0,   // APY 10%, diário
        DonLunes = 1,  // APY 6%, semanal  
        DonFiapo = 2,  // APY 7%, mensal
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

    /// Status de uma posição
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub enum PositionStatus {
        Active,
        Cancelled,
        Completed,
    }

    /// Configuração de um pool
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct PoolConfig {
        /// APY em basis points (1000 = 10%)
        pub apy_bps: u16,
        /// Período mínimo em dias
        pub min_period_days: u32,
        /// Penalidade por saque antecipado (bps)
        pub early_withdrawal_penalty_bps: u16,
        /// Penalidade por cancelamento (bps)
        pub cancellation_penalty_bps: u16,
        /// Frequência de pagamento em dias
        pub payment_frequency_days: u32,
        /// Pool ativo
        pub active: bool,
    }

    /// Posição de staking
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

    /// Estatísticas globais
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode, Default)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub struct StakingStats {
        pub total_staked: Balance,
        pub total_stakers: u32,
        pub total_rewards_distributed: Balance,
        pub active_positions: u64,
    }

    /// Evento de stake criado
    #[ink(event)]
    pub struct Staked {
        #[ink(topic)]
        position_id: u64,
        #[ink(topic)]
        user: AccountId,
        pool: u8,
        amount: Balance,
    }

    /// Evento de rewards claimed
    #[ink(event)]
    pub struct RewardsClaimed {
        #[ink(topic)]
        position_id: u64,
        #[ink(topic)]
        user: AccountId,
        amount: Balance,
    }

    /// Evento de unstake
    #[ink(event)]
    pub struct Unstaked {
        #[ink(topic)]
        position_id: u64,
        #[ink(topic)]
        user: AccountId,
        amount: Balance,
        penalty: Balance,
    }

    /// Storage do contrato
    #[ink(storage)]
    pub struct FiapoStaking {
        /// Contrato Core
        core_contract: AccountId,
        /// Owner
        owner: AccountId,
        /// Configurações dos pools
        pool_configs: Mapping<u8, PoolConfig>,
        /// Posições de staking
        positions: Mapping<u64, StakingPosition>,
        /// Posições por usuário
        user_positions: Mapping<AccountId, Vec<u64>>,
        /// Próximo ID de posição
        next_position_id: u64,
        /// Total staked por pool
        total_staked_per_pool: [Balance; 3],
        /// Total de stakers por pool
        stakers_per_pool: [u32; 3],
        /// Total de posições ativas
        active_positions: u64,
        /// Total de rewards distribuídas
        total_rewards_distributed: Balance,
        /// Sistema pausado
        paused: bool,
    }

    impl FiapoStaking {
        /// Construtor
        #[ink(constructor)]
        pub fn new(core_contract: AccountId) -> Self {
            let caller = Self::env().caller();
            
            let mut contract = Self {
                core_contract,
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

        /// Inicializa configurações padrão dos pools
        fn initialize_pool_configs(&mut self) {
            // Don Burn: APY 10%, mínimo 30 dias, pagamento diário
            self.pool_configs.insert(0, &PoolConfig {
                apy_bps: 1000, // 10%
                min_period_days: 30,
                early_withdrawal_penalty_bps: 1000, // 10%
                cancellation_penalty_bps: 2000, // 20%
                payment_frequency_days: 1,
                active: true,
            });
            // Don Lunes: APY 6%, mínimo 60 dias, pagamento semanal
            self.pool_configs.insert(1, &PoolConfig {
                apy_bps: 600, // 6%
                min_period_days: 60,
                early_withdrawal_penalty_bps: 800, // 8%
                cancellation_penalty_bps: 1500, // 15%
                payment_frequency_days: 7,
                active: true,
            });
            // Don Fiapo: APY 7%, mínimo 90 dias, pagamento mensal
            self.pool_configs.insert(2, &PoolConfig {
                apy_bps: 700, // 7%
                min_period_days: 90,
                early_withdrawal_penalty_bps: 600, // 6%
                cancellation_penalty_bps: 1000, // 10%
                payment_frequency_days: 30,
                active: true,
            });
        }

        // ==================== View Functions ====================

        /// Retorna contrato Core
        #[ink(message)]
        pub fn core_contract(&self) -> AccountId {
            self.core_contract
        }

        /// Retorna estatísticas globais
        #[ink(message)]
        pub fn get_stats(&self) -> StakingStats {
            let total_staked: Balance = self.total_staked_per_pool.iter().sum();
            let total_stakers: u32 = self.stakers_per_pool.iter().sum();

            StakingStats {
                total_staked,
                total_stakers,
                total_rewards_distributed: self.total_rewards_distributed,
                active_positions: self.active_positions,
            }
        }

        /// Retorna configuração de um pool
        #[ink(message)]
        pub fn get_pool_config(&self, pool: u8) -> Option<PoolConfig> {
            self.pool_configs.get(pool)
        }

        /// Retorna uma posição
        #[ink(message)]
        pub fn get_position(&self, position_id: u64) -> Option<StakingPosition> {
            self.positions.get(position_id)
        }

        /// Retorna posições de um usuário
        #[ink(message)]
        pub fn get_user_positions(&self, user: AccountId) -> Vec<u64> {
            self.user_positions.get(user).unwrap_or_default()
        }

        /// Calcula rewards pendentes
        #[ink(message)]
        pub fn pending_rewards(&self, position_id: u64) -> Balance {
            if let Some(position) = self.positions.get(position_id) {
                if position.status != PositionStatus::Active {
                    return 0;
                }
                if let Some(config) = self.pool_configs.get(position.pool_type.to_u8()) {
                    return self.calculate_rewards(&position, &config);
                }
            }
            0
        }

        /// Total staked
        #[ink(message)]
        pub fn total_staked(&self) -> Balance {
            self.total_staked_per_pool.iter().sum()
        }

        // ==================== Staking Functions ====================

        /// Cria uma posição de staking
        #[ink(message)]
        pub fn stake(&mut self, pool: u8, amount: Balance) -> Result<u64, StakingError> {
            let caller = self.env().caller();
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

            // Cross-contract call: transfere tokens do usuário para este contrato
            self.call_core_transfer_from(caller, self.env().account_id(), amount)?;

            // Calcula taxa de entrada tiered
            let fee_result = self.calculate_entry_fee(amount);
            let entry_fee = fee_result.fee_lusdt;

            let position_id = self.next_position_id;
            let position = StakingPosition {
                id: position_id,
                user: caller,
                pool_type,
                amount,
                entry_fee,
                start_time: current_time,
                last_reward_time: current_time,
                accumulated_rewards: 0,
                status: PositionStatus::Active,
            };

            // Salva posição
            self.positions.insert(position_id, &position);

            // Adiciona ao usuário
            let mut user_positions = self.user_positions.get(caller).unwrap_or_default();
            let is_new = user_positions.is_empty();
            user_positions.push(position_id);
            self.user_positions.insert(caller, &user_positions);

            // Atualiza contadores
            self.next_position_id += 1;
            self.total_staked_per_pool[pool as usize] = 
                self.total_staked_per_pool[pool as usize].saturating_add(amount);
            self.active_positions += 1;

            if is_new {
                self.stakers_per_pool[pool as usize] += 1;
            }

            Self::env().emit_event(Staked {
                position_id,
                user: caller,
                pool,
                amount,
            });

            Ok(position_id)
        }

        /// Claim rewards de uma posição
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

            let rewards = self.calculate_rewards(&position, &config);

            if rewards == 0 {
                return Err(StakingError::NoRewardsToClaim);
            }

            // Atualiza posição
            position.accumulated_rewards = position.accumulated_rewards.saturating_add(rewards);
            position.last_reward_time = current_time;
            self.positions.insert(position_id, &position);

            // Atualiza totais
            self.total_rewards_distributed = self.total_rewards_distributed.saturating_add(rewards);

            // Cross-contract call: minta rewards para o usuário
            self.call_core_mint_rewards(caller, rewards)?;

            Self::env().emit_event(RewardsClaimed {
                position_id,
                user: caller,
                amount: rewards,
            });

            Ok(rewards)
        }

        /// Unstake (saca posição completa)
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

            // Calcula dias em staking
            let days_staked = (current_time.saturating_sub(position.start_time)) / SECONDS_PER_DAY;
            let is_early = days_staked < config.min_period_days as u64;

            // Calcula penalidade se for saque antecipado
            let penalty = if is_early {
                position.amount
                    .saturating_mul(config.early_withdrawal_penalty_bps as u128)
                    .saturating_div(10000)
            } else {
                0
            };

            let net_amount = position.amount.saturating_sub(penalty);

            // Atualiza posição
            position.status = PositionStatus::Completed;
            self.positions.insert(position_id, &position);

            // Atualiza contadores
            let pool = position.pool_type.to_u8() as usize;
            self.total_staked_per_pool[pool] = 
                self.total_staked_per_pool[pool].saturating_sub(position.amount);
            self.active_positions = self.active_positions.saturating_sub(1);

            // Cross-contract call: transfere tokens de volta para o usuário
            self.call_core_transfer(caller, net_amount)?;

            Self::env().emit_event(Unstaked {
                position_id,
                user: caller,
                amount: net_amount,
                penalty,
            });

            Ok(net_amount)
        }

        /// Calcula taxa de entrada tiered baseada no valor de FIAPO
        /// Retorna o valor da taxa em LUSDT (6 decimais)
        /// 
        /// Faixas:
        /// - <= 1,000 FIAPO: 2%
        /// - 1,001 - 10,000 FIAPO: 1%
        /// - 10,001 - 100,000 FIAPO: 0.5%
        /// - 100,001 - 500,000 FIAPO: 0.25%
        /// - > 500,000 FIAPO: 0.1%
        #[ink(message)]
        pub fn calculate_entry_fee(&self, fiapo_amount: Balance) -> EntryFeeResult {
            let amount_no_decimals = fiapo_amount.saturating_div(SCALE);

            let fee_bps: u16 = if amount_no_decimals <= 1_000 {
                200 // 2%
            } else if amount_no_decimals <= 10_000 {
                100 // 1%
            } else if amount_no_decimals <= 100_000 {
                50 // 0.5%
            } else if amount_no_decimals <= 500_000 {
                25 // 0.25%
            } else {
                10 // 0.1%
            };

            // Taxa = valor_numerico_fiapo * porcentagem, resultado em LUSDT (6 decimais)
            let fee_lusdt = amount_no_decimals
                .saturating_mul(fee_bps as u128)
                .saturating_div(10000)
                .saturating_mul(LUSDT_SCALE);

            EntryFeeResult {
                fiapo_amount,
                fee_lusdt,
                fee_bps,
            }
        }

        /// Distribui uma taxa conforme o tipo especificado
        /// Retorna a distribuição para cada fundo
        #[ink(message)]
        pub fn distribute_fee(&self, total_fee: Balance, fee_type: FeeType) -> FeeDistribution {
            if total_fee == 0 {
                return FeeDistribution::default();
            }

            match fee_type {
                FeeType::Transaction => {
                    // 30% burn, 50% staking, 20% rewards
                    let burn_amount = total_fee.saturating_mul(30).saturating_div(100);
                    let staking_amount = total_fee.saturating_mul(50).saturating_div(100);
                    let rewards_amount = total_fee.saturating_sub(burn_amount).saturating_sub(staking_amount);
                    FeeDistribution {
                        burn_amount,
                        staking_amount,
                        rewards_amount,
                        team_amount: 0,
                    }
                }
                FeeType::StakingEntry => {
                    // 10% team, 40% staking, 50% rewards
                    let team_amount = total_fee.saturating_mul(10).saturating_div(100);
                    let staking_amount = total_fee.saturating_mul(40).saturating_div(100);
                    let rewards_amount = total_fee.saturating_sub(team_amount).saturating_sub(staking_amount);
                    FeeDistribution {
                        burn_amount: 0,
                        staking_amount,
                        rewards_amount,
                        team_amount,
                    }
                }
                FeeType::InterestWithdrawal | FeeType::EarlyWithdrawal => {
                    // 20% burn, 50% staking, 30% rewards
                    let burn_amount = total_fee.saturating_mul(20).saturating_div(100);
                    let staking_amount = total_fee.saturating_mul(50).saturating_div(100);
                    let rewards_amount = total_fee.saturating_sub(burn_amount).saturating_sub(staking_amount);
                    FeeDistribution {
                        burn_amount,
                        staking_amount,
                        rewards_amount,
                        team_amount: 0,
                    }
                }
                FeeType::Cancellation => {
                    // 10% team, 50% staking, 40% rewards
                    let team_amount = total_fee.saturating_mul(10).saturating_div(100);
                    let staking_amount = total_fee.saturating_mul(50).saturating_div(100);
                    let rewards_amount = total_fee.saturating_sub(team_amount).saturating_sub(staking_amount);
                    FeeDistribution {
                        burn_amount: 0,
                        staking_amount,
                        rewards_amount,
                        team_amount,
                    }
                }
            }
        }

        // ==================== Cross-Contract Calls ====================

        /// Chama Core.transfer_from para transferir tokens
        fn call_core_transfer_from(
            &self,
            from: AccountId,
            to: AccountId,
            amount: Balance,
        ) -> Result<(), StakingError> {
            use ink::env::call::{build_call, ExecutionInput, Selector};

            let result = build_call::<ink::env::DefaultEnvironment>()
                .call(self.core_contract)
                .gas_limit(0)
                .transferred_value(0)
                .exec_input(
                    ExecutionInput::new(Selector::new(ink::selector_bytes!("transfer_from")))
                        .push_arg(from)
                        .push_arg(to)
                        .push_arg(amount),
                )
                .returns::<Result<(), PSP22Error>>()
                .try_invoke();

            match result {
                Ok(Ok(Ok(()))) => Ok(()),
                _ => Err(StakingError::TransferFailed),
            }
        }

        /// Chama Core.transfer para enviar tokens
        fn call_core_transfer(
            &self,
            to: AccountId,
            amount: Balance,
        ) -> Result<(), StakingError> {
            use ink::env::call::{build_call, ExecutionInput, Selector};

            let result = build_call::<ink::env::DefaultEnvironment>()
                .call(self.core_contract)
                .gas_limit(0)
                .transferred_value(0)
                .exec_input(
                    ExecutionInput::new(Selector::new(ink::selector_bytes!("transfer")))
                        .push_arg(to)
                        .push_arg(amount),
                )
                .returns::<Result<(), PSP22Error>>()
                .try_invoke();

            match result {
                Ok(Ok(Ok(()))) => Ok(()),
                _ => Err(StakingError::TransferFailed),
            }
        }

        /// Chama Core.mint_to para mintar rewards
        fn call_core_mint_rewards(
            &self,
            to: AccountId,
            amount: Balance,
        ) -> Result<(), StakingError> {
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
                _ => Err(StakingError::MintFailed),
            }
        }

        /// Calcula rewards baseado em APY e tempo
        fn calculate_rewards(&self, position: &StakingPosition, config: &PoolConfig) -> Balance {
            let current_time = self.env().block_timestamp();
            
            let seconds_elapsed = current_time.saturating_sub(position.last_reward_time);
            let days_elapsed = seconds_elapsed / SECONDS_PER_DAY;

            if days_elapsed < config.payment_frequency_days as u64 {
                return 0;
            }

            // Calcula períodos completos
            let periods = days_elapsed / config.payment_frequency_days as u64;
            let total_days = periods * config.payment_frequency_days as u64;

            // Fórmula: amount * APY * days / 365 / 10000
            let rewards = position.amount
                .saturating_mul(config.apy_bps as u128)
                .saturating_mul(total_days as u128)
                .saturating_div(365)
                .saturating_div(10000);

            rewards
        }

        // ==================== Admin Functions ====================

        /// Pausa o sistema
        #[ink(message)]
        pub fn pause(&mut self) -> Result<(), StakingError> {
            if self.env().caller() != self.owner {
                return Err(StakingError::Unauthorized);
            }
            self.paused = true;
            Ok(())
        }

        /// Despausa o sistema
        #[ink(message)]
        pub fn unpause(&mut self) -> Result<(), StakingError> {
            if self.env().caller() != self.owner {
                return Err(StakingError::Unauthorized);
            }
            self.paused = false;
            Ok(())
        }

        /// Atualiza APY de um pool
        #[ink(message)]
        pub fn update_apy(&mut self, pool: u8, new_apy_bps: u16) -> Result<(), StakingError> {
            if self.env().caller() != self.owner {
                return Err(StakingError::Unauthorized);
            }
            
            if let Some(mut config) = self.pool_configs.get(pool) {
                config.apy_bps = new_apy_bps;
                self.pool_configs.insert(pool, &config);
                Ok(())
            } else {
                Err(StakingError::PoolNotActive)
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

        fn create_contract() -> FiapoStaking {
            let accounts = default_accounts();
            FiapoStaking::new(accounts.charlie)
        }

        #[ink::test]
        fn constructor_works() {
            let contract = create_contract();
            assert!(!contract.paused);
            assert_eq!(contract.total_staked(), 0);
        }

        #[ink::test]
        fn pool_configs_initialized() {
            let contract = create_contract();
            
            let don_burn = contract.get_pool_config(0).unwrap();
            assert_eq!(don_burn.apy_bps, 1000);
            assert_eq!(don_burn.min_period_days, 30);
            assert_eq!(don_burn.payment_frequency_days, 1);

            let don_fiapo = contract.get_pool_config(2).unwrap();
            assert_eq!(don_fiapo.apy_bps, 700);
            assert_eq!(don_fiapo.min_period_days, 90);
            assert_eq!(don_fiapo.payment_frequency_days, 30);
        }

        #[ink::test]
        fn stake_works() {
            let accounts = default_accounts();
            let mut contract = create_contract();

            let amount = 1000 * SCALE;
            let result = contract.stake(0, amount);
            
            assert!(result.is_ok());
            let position_id = result.unwrap();
            
            let position = contract.get_position(position_id).unwrap();
            assert_eq!(position.user, accounts.alice);
            assert_eq!(position.amount, amount);
            assert_eq!(position.status, PositionStatus::Active);
        }

        #[ink::test]
        fn stake_zero_fails() {
            let mut contract = create_contract();
            
            let result = contract.stake(0, 0);
            assert_eq!(result, Err(StakingError::InvalidAmount));
        }

        #[ink::test]
        fn stats_updated_after_stake() {
            let mut contract = create_contract();

            let amount = 1000 * SCALE;
            let _ = contract.stake(0, amount);

            let stats = contract.get_stats();
            assert_eq!(stats.total_staked, amount);
            assert_eq!(stats.active_positions, 1);
        }

        #[ink::test]
        fn entry_fee_tiered_calculation() {
            let contract = create_contract();

            // Faixa 1: <= 1,000 FIAPO -> 2%
            let result1 = contract.calculate_entry_fee(1_000 * SCALE);
            assert_eq!(result1.fee_bps, 200);
            assert_eq!(result1.fee_lusdt, 20 * LUSDT_SCALE); // 2% de 1000 = 20

            // Faixa 2: 1,001 - 10,000 FIAPO -> 1%
            let result2 = contract.calculate_entry_fee(10_000 * SCALE);
            assert_eq!(result2.fee_bps, 100);
            assert_eq!(result2.fee_lusdt, 100 * LUSDT_SCALE); // 1% de 10000 = 100

            // Faixa 3: 10,001 - 100,000 FIAPO -> 0.5%
            let result3 = contract.calculate_entry_fee(100_000 * SCALE);
            assert_eq!(result3.fee_bps, 50);
            assert_eq!(result3.fee_lusdt, 500 * LUSDT_SCALE); // 0.5% de 100000 = 500

            // Faixa 4: 100,001 - 500,000 FIAPO -> 0.25%
            let result4 = contract.calculate_entry_fee(500_000 * SCALE);
            assert_eq!(result4.fee_bps, 25);
            assert_eq!(result4.fee_lusdt, 1_250 * LUSDT_SCALE); // 0.25% de 500000 = 1250

            // Faixa 5: > 500,000 FIAPO -> 0.1%
            let result5 = contract.calculate_entry_fee(1_000_000 * SCALE);
            assert_eq!(result5.fee_bps, 10);
            assert_eq!(result5.fee_lusdt, 1_000 * LUSDT_SCALE); // 0.1% de 1000000 = 1000
        }

        #[ink::test]
        fn entry_fee_zero_amount() {
            let contract = create_contract();
            let result = contract.calculate_entry_fee(0);
            assert_eq!(result.fee_lusdt, 0);
            assert_eq!(result.fee_bps, 200); // Faixa mais baixa
        }

        #[ink::test]
        fn fee_distribution_transaction() {
            let contract = create_contract();
            let dist = contract.distribute_fee(1000, FeeType::Transaction);
            assert_eq!(dist.burn_amount, 300);    // 30%
            assert_eq!(dist.staking_amount, 500); // 50%
            assert_eq!(dist.rewards_amount, 200); // 20%
            assert_eq!(dist.team_amount, 0);
            assert_eq!(dist.total(), 1000);
        }

        #[ink::test]
        fn fee_distribution_staking_entry() {
            let contract = create_contract();
            let dist = contract.distribute_fee(1000, FeeType::StakingEntry);
            assert_eq!(dist.burn_amount, 0);
            assert_eq!(dist.staking_amount, 400); // 40%
            assert_eq!(dist.rewards_amount, 500); // 50%
            assert_eq!(dist.team_amount, 100);    // 10%
            assert_eq!(dist.total(), 1000);
        }

        #[ink::test]
        fn fee_distribution_early_withdrawal() {
            let contract = create_contract();
            let dist = contract.distribute_fee(1000, FeeType::EarlyWithdrawal);
            assert_eq!(dist.burn_amount, 200);    // 20%
            assert_eq!(dist.staking_amount, 500); // 50%
            assert_eq!(dist.rewards_amount, 300); // 30%
            assert_eq!(dist.team_amount, 0);
            assert_eq!(dist.total(), 1000);
        }

        #[ink::test]
        fn fee_distribution_cancellation() {
            let contract = create_contract();
            let dist = contract.distribute_fee(1000, FeeType::Cancellation);
            assert_eq!(dist.burn_amount, 0);
            assert_eq!(dist.staking_amount, 500); // 50%
            assert_eq!(dist.rewards_amount, 400); // 40%
            assert_eq!(dist.team_amount, 100);    // 10%
            assert_eq!(dist.total(), 1000);
        }

        #[ink::test]
        fn fee_distribution_zero() {
            let contract = create_contract();
            let dist = contract.distribute_fee(0, FeeType::Transaction);
            assert_eq!(dist.total(), 0);
        }
    }
}
