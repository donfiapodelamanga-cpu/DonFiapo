//! # Fiapo Rewards Contract
//!
//! Sistema de recompensas e ranking para o ecossistema Don Fiapo.
//! 
//! Inclui:
//! - Sistema de ranking com múltiplos tipos
//! - Distribuição de recompensas mensais
//! - Proteção contra whales (exclusão top 100 carteiras)
//! - Histórico de rankings

#![cfg_attr(not(feature = "std"), no_std, no_main)]

use fiapo_traits::{AccountId, Balance};

#[ink::contract]
mod fiapo_rewards {
    use super::*;
    use ink::prelude::vec::Vec;
    use ink::storage::Mapping;

    /// Constantes
    pub const MAX_RANKING_SIZE: u8 = 12;
    pub const EXCLUDE_TOP_WALLETS: u16 = 100;
    pub const SCALE: u128 = 100_000_000;

    /// Tipos de ranking disponíveis
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub enum RankingType {
        /// Ranking mensal por saldo (top 12)
        MonthlyBalance,
        /// Ranking por volume de staking
        Staking,
        /// Ranking por volume queimado
        Burn,
        /// Ranking por afiliados
        Affiliates,
        /// Ranking geral (combinação ponderada)
        General,
    }

    impl RankingType {
        pub fn to_u8(&self) -> u8 {
            match self {
                RankingType::MonthlyBalance => 0,
                RankingType::Staking => 1,
                RankingType::Burn => 2,
                RankingType::Affiliates => 3,
                RankingType::General => 4,
            }
        }
    }

    /// Pesos para cálculo do ranking geral
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct ScoringWeights {
        /// Peso do saldo (25%)
        pub balance_weight: u8,
        /// Peso do staking (30%)
        pub staking_weight: u8,
        /// Peso do burn (20%)
        pub burn_weight: u8,
        /// Peso de transações (10%)
        pub transaction_weight: u8,
        /// Peso de afiliados (10%)
        pub affiliate_weight: u8,
        /// Peso de governança (5%)
        pub governance_weight: u8,
    }

    impl Default for ScoringWeights {
        fn default() -> Self {
            Self {
                balance_weight: 25,
                staking_weight: 30,
                burn_weight: 20,
                transaction_weight: 10,
                affiliate_weight: 10,
                governance_weight: 5,
            }
        }
    }

    /// Dados de uma carteira para ranking
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode, Default)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct WalletData {
        pub balance: Balance,
        pub staking_balance: Balance,
        pub burn_volume: Balance,
        pub affiliate_count: u32,
        pub governance_score: u32,
        pub total_score: u128,
        pub last_updated: u64,
    }

    /// Entrada no ranking
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct RankingEntry {
        pub wallet: AccountId,
        pub score: u128,
        pub rank: u8,
        pub reward_amount: Balance,
    }

    /// Resultado de um ranking executado
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct RankingResult {
        pub id: u64,
        pub ranking_type: RankingType,
        pub entries: Vec<RankingEntry>,
        pub total_rewards: Balance,
        pub executed_at: u64,
    }

    /// Configuração de ranking
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct RankingConfig {
        pub max_size: u8,
        pub exclude_top: u16,
        pub min_balance: Balance,
        pub max_balance: Balance,
        pub reward_percentages: [u8; 12], // % para cada posição
        pub is_active: bool,
    }

    impl Default for RankingConfig {
        fn default() -> Self {
            Self {
                max_size: 12,
                exclude_top: 100,
                min_balance: 1000 * SCALE,
                max_balance: 10_000_000 * SCALE,
                reward_percentages: [25, 18, 13, 10, 8, 7, 5, 4, 3, 3, 2, 2], // Total 100%
                is_active: true,
            }
        }
    }

    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum RewardsError {
        Unauthorized,
        NoRewardsAvailable,
        AlreadyClaimed,
        RankingNotActive,
        InsufficientParticipants,
        InvalidConfiguration,
    }

    #[ink(event)]
    pub struct RewardDistributed {
        #[ink(topic)]
        user: AccountId,
        amount: Balance,
        reason: u8,
    }

    /// Evento de ranking executado
    #[ink(event)]
    pub struct RankingExecuted {
        #[ink(topic)]
        ranking_id: u64,
        ranking_type: RankingType,
        total_rewards: Balance,
        participants: u8,
    }

    #[ink(storage)]
    pub struct FiapoRewards {
        core_contract: AccountId,
        owner: AccountId,
        /// Recompensas pendentes por usuário
        pending_rewards: Mapping<AccountId, Balance>,
        /// Dados das carteiras para ranking
        wallet_data: Mapping<AccountId, WalletData>,
        /// Configurações por tipo de ranking
        ranking_configs: Mapping<u8, RankingConfig>,
        /// Histórico de rankings (últimos 50)
        ranking_history: Vec<RankingResult>,
        /// Pesos para scoring
        scoring_weights: ScoringWeights,
        /// Próximo ID de ranking
        next_ranking_id: u64,
        /// Fundo de recompensas disponível
        rewards_fund: Balance,
        /// Total distribuído
        total_distributed: Balance,
        /// Último ranking mensal
        last_monthly_ranking: u64,
    }

    impl FiapoRewards {
        #[ink(constructor)]
        pub fn new(core_contract: AccountId) -> Self {
            let mut contract = Self {
                core_contract,
                owner: Self::env().caller(),
                pending_rewards: Mapping::default(),
                wallet_data: Mapping::default(),
                ranking_configs: Mapping::default(),
                ranking_history: Vec::new(),
                scoring_weights: ScoringWeights::default(),
                next_ranking_id: 1,
                rewards_fund: 0,
                total_distributed: 0,
                last_monthly_ranking: 0,
            };
            
            // Inicializa configurações padrão
            contract.ranking_configs.insert(0, &RankingConfig::default());
            contract
        }

        #[ink(message)]
        pub fn core_contract(&self) -> AccountId {
            self.core_contract
        }

        #[ink(message)]
        pub fn pending_reward(&self, user: AccountId) -> Balance {
            self.pending_rewards.get(user).unwrap_or(0)
        }

        #[ink(message)]
        pub fn total_distributed(&self) -> Balance {
            self.total_distributed
        }

        #[ink(message)]
        pub fn add_reward(&mut self, user: AccountId, amount: Balance) -> Result<(), RewardsError> {
            if self.env().caller() != self.owner {
                return Err(RewardsError::Unauthorized);
            }
            let current = self.pending_rewards.get(user).unwrap_or(0);
            self.pending_rewards.insert(user, &(current.saturating_add(amount)));
            Ok(())
        }

        #[ink(message)]
        pub fn claim(&mut self) -> Result<Balance, RewardsError> {
            let caller = self.env().caller();
            let amount = self.pending_rewards.get(caller).unwrap_or(0);
            
            if amount == 0 {
                return Err(RewardsError::NoRewardsAvailable);
            }

            self.pending_rewards.insert(caller, &0);
            self.total_distributed = self.total_distributed.saturating_add(amount);

            Self::env().emit_event(RewardDistributed {
                user: caller,
                amount,
                reason: 0,
            });

            Ok(amount)
        }

        // ==================== Ranking Functions ====================

        /// Retorna configuração de ranking
        #[ink(message)]
        pub fn get_ranking_config(&self, ranking_type: u8) -> Option<RankingConfig> {
            self.ranking_configs.get(ranking_type)
        }

        /// Retorna dados de uma carteira
        #[ink(message)]
        pub fn get_wallet_data(&self, wallet: AccountId) -> WalletData {
            self.wallet_data.get(wallet).unwrap_or_default()
        }

        /// Retorna pesos de scoring
        #[ink(message)]
        pub fn get_scoring_weights(&self) -> ScoringWeights {
            self.scoring_weights.clone()
        }

        /// Retorna fundo de recompensas
        #[ink(message)]
        pub fn get_rewards_fund(&self) -> Balance {
            self.rewards_fund
        }

        /// Retorna histórico de rankings
        #[ink(message)]
        pub fn get_ranking_history(&self) -> Vec<RankingResult> {
            self.ranking_history.clone()
        }

        /// Adiciona fundos ao pool de recompensas
        #[ink(message)]
        pub fn add_rewards_fund(&mut self, amount: Balance) -> Result<(), RewardsError> {
            if self.env().caller() != self.owner {
                return Err(RewardsError::Unauthorized);
            }
            self.rewards_fund = self.rewards_fund.saturating_add(amount);
            Ok(())
        }

        /// Atualiza dados de uma carteira (chamado por outros contratos)
        #[ink(message)]
        pub fn update_wallet_data(
            &mut self,
            wallet: AccountId,
            balance: Balance,
            staking_balance: Balance,
            burn_volume: Balance,
            affiliate_count: u32,
            governance_score: u32,
        ) -> Result<(), RewardsError> {
            // Apenas owner ou contratos autorizados podem atualizar
            if self.env().caller() != self.owner && self.env().caller() != self.core_contract {
                return Err(RewardsError::Unauthorized);
            }

            let current_time = self.env().block_timestamp();
            
            // Calcula score total baseado nos pesos
            let total_score = self.calculate_general_score(
                balance,
                staking_balance,
                burn_volume,
                affiliate_count,
                governance_score,
            );

            let data = WalletData {
                balance,
                staking_balance,
                burn_volume,
                affiliate_count,
                governance_score,
                total_score,
                last_updated: current_time,
            };

            self.wallet_data.insert(wallet, &data);
            Ok(())
        }

        /// Calcula score geral baseado nos pesos
        fn calculate_general_score(
            &self,
            balance: Balance,
            staking_balance: Balance,
            burn_volume: Balance,
            affiliate_count: u32,
            governance_score: u32,
        ) -> u128 {
            let w = &self.scoring_weights;
            
            // Normaliza valores para evitar overflow
            let balance_score = (balance / SCALE).saturating_mul(w.balance_weight as u128);
            let staking_score = (staking_balance / SCALE).saturating_mul(w.staking_weight as u128);
            let burn_score = (burn_volume / SCALE).saturating_mul(w.burn_weight as u128);
            let affiliate_score = (affiliate_count as u128).saturating_mul(w.affiliate_weight as u128);
            let gov_score = (governance_score as u128).saturating_mul(w.governance_weight as u128);

            balance_score
                .saturating_add(staking_score)
                .saturating_add(burn_score)
                .saturating_add(affiliate_score)
                .saturating_add(gov_score)
        }

        /// Executa ranking mensal com lista de carteiras elegíveis
        #[ink(message)]
        pub fn execute_monthly_ranking(
            &mut self,
            eligible_wallets: Vec<(AccountId, Balance)>,
        ) -> Result<RankingResult, RewardsError> {
            if self.env().caller() != self.owner {
                return Err(RewardsError::Unauthorized);
            }

            let config = self.ranking_configs.get(0).unwrap_or_default();
            if !config.is_active {
                return Err(RewardsError::RankingNotActive);
            }

            if self.rewards_fund == 0 {
                return Err(RewardsError::NoRewardsAvailable);
            }

            // Filtra elegíveis (exclui whales e aplica limites)
            let mut filtered: Vec<_> = eligible_wallets.into_iter()
                .filter(|(_, bal)| *bal >= config.min_balance && *bal <= config.max_balance)
                .collect();

            if filtered.len() < 3 {
                return Err(RewardsError::InsufficientParticipants);
            }

            // Ordena por saldo (decrescente)
            filtered.sort_by(|a, b| b.1.cmp(&a.1));

            // Remove top N (whales) e pega top 12
            let skip = config.exclude_top as usize;
            let winners: Vec<_> = filtered.into_iter()
                .skip(skip)
                .take(config.max_size as usize)
                .collect();

            // Calcula recompensas
            let current_time = self.env().block_timestamp();
            let ranking_id = self.next_ranking_id;
            let total_rewards = self.rewards_fund;
            
            let mut entries = Vec::new();
            for (i, (wallet, score)) in winners.iter().enumerate() {
                let percentage = config.reward_percentages.get(i).copied().unwrap_or(0);
                let reward = total_rewards.saturating_mul(percentage as u128).saturating_div(100);
                
                entries.push(RankingEntry {
                    wallet: *wallet,
                    score: *score,
                    rank: (i + 1) as u8,
                    reward_amount: reward,
                });

                // Adiciona às recompensas pendentes
                let current_pending = self.pending_rewards.get(*wallet).unwrap_or(0);
                self.pending_rewards.insert(*wallet, &current_pending.saturating_add(reward));
            }

            let result = RankingResult {
                id: ranking_id,
                ranking_type: RankingType::MonthlyBalance,
                entries: entries.clone(),
                total_rewards,
                executed_at: current_time,
            };

            // Atualiza estado
            self.next_ranking_id += 1;
            self.rewards_fund = 0;
            self.last_monthly_ranking = current_time;
            self.total_distributed = self.total_distributed.saturating_add(total_rewards);

            // Adiciona ao histórico (máx 50)
            if self.ranking_history.len() >= 50 {
                self.ranking_history.remove(0);
            }
            self.ranking_history.push(result.clone());

            Self::env().emit_event(RankingExecuted {
                ranking_id,
                ranking_type: RankingType::MonthlyBalance,
                total_rewards,
                participants: entries.len() as u8,
            });

            Ok(result)
        }

        /// Atualiza configuração de ranking
        #[ink(message)]
        pub fn update_ranking_config(
            &mut self,
            ranking_type: u8,
            config: RankingConfig,
        ) -> Result<(), RewardsError> {
            if self.env().caller() != self.owner {
                return Err(RewardsError::Unauthorized);
            }
            self.ranking_configs.insert(ranking_type, &config);
            Ok(())
        }

        /// Atualiza pesos de scoring
        #[ink(message)]
        pub fn update_scoring_weights(&mut self, weights: ScoringWeights) -> Result<(), RewardsError> {
            if self.env().caller() != self.owner {
                return Err(RewardsError::Unauthorized);
            }
            // Valida que soma dos pesos é 100
            let sum = weights.balance_weight as u16 + weights.staking_weight as u16 
                + weights.burn_weight as u16 + weights.transaction_weight as u16
                + weights.affiliate_weight as u16 + weights.governance_weight as u16;
            if sum != 100 {
                return Err(RewardsError::InvalidConfiguration);
            }
            self.scoring_weights = weights;
            Ok(())
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;

        #[ink::test]
        fn constructor_works() {
            let accounts = ink::env::test::default_accounts::<ink::env::DefaultEnvironment>();
            let contract = FiapoRewards::new(accounts.charlie);
            assert_eq!(contract.total_distributed(), 0);
        }
    }
}
