//! Sistema de Recompensas e Ranking do Don Fiapo
//! 
//! Este módulo implementa:
//! - Ranking das top 12 carteiras (excluindo as 100 maiores)
//! - Distribuição mensal de recompensas do fundo
//! - Cálculo de prêmios baseado em posição no ranking
//! - Sistema de exclusão das maiores carteiras

use ink::prelude::vec::Vec;

use scale::{Decode, Encode};

/// Categorias de ranking para recompensas
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub enum RankingCategory {
    /// Maior saldo de tokens
    Balance,
    /// Maior volume de queima de tokens
    BurnVolume,
    /// Maior volume de transações
    TransactionVolume,
    /// Maior número de stakings ativos
    StakingCount,
    /// Maior número de afiliados diretos com staking ativo
    AffiliateCount,
}

/// Informações de uma carteira no ranking
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct WalletInfo {
    /// Endereço da carteira
    pub address: [u8; 32],
    /// Saldo atual da carteira
    pub balance: u128,
    /// Volume total de queima
    pub burn_volume: u128,
    /// Volume total de transações
    pub transaction_volume: u128,
    /// Número de stakings ativos
    pub staking_count: u32,
    /// Número de afiliados diretos
    pub affiliate_count: u32,
    /// Posição no ranking (1-12)
    pub rank: u8,
    /// Valor da recompensa calculada
    pub reward_amount: u128,
    /// Categoria do ranking
    pub category: RankingCategory,
}

/// Dados de ranking para uma carteira
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct WalletRankingData {
    /// Endereço da carteira
    pub address: [u8; 32],
    /// Saldo de tokens
    pub balance: u128,
    /// Volume de queima
    pub burn_volume: u128,
    /// Volume de transações
    pub transaction_volume: u128,
    /// Número de stakings ativos
    pub staking_count: u32,
    /// Número de afiliados diretos com staking ativo
    pub affiliate_count: u32,
    /// Se é elegível (não é whale)
    pub is_eligible: bool,
}

/// Configuração de distribuição de prêmios
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct RewardDistribution {
    /// Percentual para 1º lugar (em basis points - 10000 = 100%)
    pub first_place: u16,
    /// Percentual para 2º lugar
    pub second_place: u16,
    /// Percentual para 3º lugar
    pub third_place: u16,
    /// Percentual para 4º-6º lugares (cada um)
    pub fourth_to_sixth: u16,
    /// Percentual para 7º-12º lugares (cada um)
    pub seventh_to_twelfth: u16,
}

/// Resultado do cálculo de ranking
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct RankingResult {
    /// Top 12 carteiras ranqueadas
    pub top_wallets: Vec<WalletInfo>,
    /// Total do fundo disponível para distribuição
    pub total_fund: u128,
    /// Total distribuído
    pub total_distributed: u128,
    /// Timestamp do cálculo
    pub calculated_at: u64,
}

/// Gerenciador do sistema de recompensas
#[derive(Debug)]
pub struct RewardsManager {
    /// Configuração de distribuição de prêmios
    distribution: RewardDistribution,
    /// Número de carteiras a excluir (as maiores)
    excluded_wallets_count: u32,
    /// Número de carteiras no ranking
    ranking_size: u8,
}

impl Default for RewardDistribution {
    fn default() -> Self {
        Self {
            first_place: 600,       // 6% (30% de 20%)
            second_place: 400,      // 4% (20% de 20%)
            third_place: 278,       // 2.78% (ajustado para somar exatamente 2000)
            fourth_to_sixth: 160,   // 1.6% cada (4.8% total)
            seventh_to_twelfth: 40, // 0.40% cada (ajustado para somar 2000)
        }
    }
}

impl Default for RewardsManager {
    fn default() -> Self {
        Self::new()
    }
}

impl RewardsManager {
    /// Cria um novo gerenciador de recompensas
    pub fn new() -> Self {
        Self {
            distribution: RewardDistribution::default(),
            excluded_wallets_count: 100,
            ranking_size: 12,
        }
    }

    /// Cria um gerenciador com configuração customizada
    pub fn new_with_config(
        distribution: RewardDistribution,
        excluded_count: u32,
        ranking_size: u8,
    ) -> Self {
        Self {
            distribution,
            excluded_wallets_count: excluded_count,
            ranking_size,
        }
    }

    /// Calcula o ranking e distribui recompensas
    pub fn calculate_ranking(
        &self,
        all_wallets: Vec<([u8; 32], u128)>, // (address, balance)
        fund_amount: u128,
        current_time: u64,
    ) -> Result<RankingResult, &'static str> {
        if all_wallets.is_empty() {
            return Err("No wallets provided");
        }

        if fund_amount == 0 {
            return Err("Fund amount cannot be zero");
        }

        // Ordena carteiras por saldo (maior para menor)
        let mut sorted_wallets = all_wallets;
        sorted_wallets.sort_by(|a, b| b.1.cmp(&a.1));

        // Remove as maiores carteiras (excluídas)
        let eligible_wallets: Vec<_> = sorted_wallets
            .into_iter()
            .skip(self.excluded_wallets_count as usize)
            .collect();

        if eligible_wallets.len() < self.ranking_size as usize {
            return Err("Not enough eligible wallets for ranking");
        }

        // Pega as top 12 carteiras elegíveis
        let top_wallets: Vec<_> = eligible_wallets
            .into_iter()
            .take(self.ranking_size as usize)
            .enumerate()
            .map(|(index, (address, balance))| {
                let rank = u8::try_from(index.saturating_add(1)).unwrap_or(255);
                let reward_amount = self.calculate_reward_for_rank(rank, fund_amount);
                
                WalletInfo {
                    address,
                    balance,
                    // Nota: Para dados completos, use calculate_ranking_by_category
                    // que recebe WalletRankingData com todos os campos preenchidos
                    burn_volume: 0,
                    transaction_volume: 0,
                    staking_count: 0,
                    affiliate_count: 0,
                    rank,
                    reward_amount,
                    category: RankingCategory::Balance,
                }
            })
            .collect();

        let total_distributed = top_wallets
            .iter()
            .map(|w| w.reward_amount)
            .sum();

        Ok(RankingResult {
            top_wallets,
            total_fund: fund_amount,
            total_distributed,
            calculated_at: current_time,
        })
    }

    /// Calcula ranking por categoria específica
    pub fn calculate_ranking_by_category(
        &self,
        wallet_data: Vec<WalletRankingData>,
        category: RankingCategory,
        fund_amount: u128,
        current_time: u64,
    ) -> Result<RankingResult, &'static str> {
        if wallet_data.is_empty() {
            return Err("Lista de carteiras não pode estar vazia");
        }

        if fund_amount == 0 {
            return Err("Fundo deve ser maior que zero");
        }

        // Ordena carteiras por categoria específica
        let mut sorted_wallets = wallet_data;
        match category {
            RankingCategory::Balance => {
                sorted_wallets.sort_by(|a, b| b.balance.cmp(&a.balance));
            }
            RankingCategory::BurnVolume => {
                sorted_wallets.sort_by(|a, b| b.burn_volume.cmp(&a.burn_volume));
            }
            RankingCategory::TransactionVolume => {
                sorted_wallets.sort_by(|a, b| b.transaction_volume.cmp(&a.transaction_volume));
            }
            RankingCategory::StakingCount => {
                sorted_wallets.sort_by(|a, b| b.staking_count.cmp(&a.staking_count));
            }
            RankingCategory::AffiliateCount => {
                sorted_wallets.sort_by(|a, b| b.affiliate_count.cmp(&a.affiliate_count));
            }
        }

        // Remove as maiores carteiras (top 100 por saldo)
        let mut eligible_wallets = sorted_wallets;
        eligible_wallets.sort_by(|a, b| b.balance.cmp(&a.balance));
        
        if eligible_wallets.len() > self.excluded_wallets_count as usize {
            eligible_wallets.drain(0..self.excluded_wallets_count as usize);
        }

        // Reordena por categoria após exclusão
        match category {
            RankingCategory::Balance => {
                eligible_wallets.sort_by(|a, b| b.balance.cmp(&a.balance));
            }
            RankingCategory::BurnVolume => {
                eligible_wallets.sort_by(|a, b| b.burn_volume.cmp(&a.burn_volume));
            }
            RankingCategory::TransactionVolume => {
                eligible_wallets.sort_by(|a, b| b.transaction_volume.cmp(&a.transaction_volume));
            }
            RankingCategory::StakingCount => {
                eligible_wallets.sort_by(|a, b| b.staking_count.cmp(&a.staking_count));
            }
            RankingCategory::AffiliateCount => {
                eligible_wallets.sort_by(|a, b| b.affiliate_count.cmp(&a.affiliate_count));
            }
        }

        if eligible_wallets.len() < self.ranking_size as usize {
            return Err("Carteiras insuficientes para ranking após exclusões");
        }

        // Pega as top 12 carteiras elegíveis
        let top_wallets: Vec<_> = eligible_wallets
            .into_iter()
            .take(self.ranking_size as usize)
            .enumerate()
            .map(|(index, wallet_data)| {
                let rank = u8::try_from(index.saturating_add(1)).unwrap_or(255);
                let reward_amount = self.calculate_reward_for_rank(rank, fund_amount);
                
                WalletInfo {
                    address: wallet_data.address,
                    balance: wallet_data.balance,
                    burn_volume: wallet_data.burn_volume,
                    transaction_volume: wallet_data.transaction_volume,
                    staking_count: wallet_data.staking_count,
                    affiliate_count: wallet_data.affiliate_count,
                    rank,
                    reward_amount,
                    category: category.clone(),
                }
            })
            .collect();

        let total_distributed = top_wallets
            .iter()
            .map(|w| w.reward_amount)
            .sum();

        Ok(RankingResult {
            top_wallets,
            total_fund: fund_amount,
            total_distributed,
            calculated_at: current_time,
        })
    }

    /// Calcula a recompensa para uma posição específica
    pub fn calculate_reward_for_rank(&self, rank: u8, total_fund: u128) -> u128 {
        let percentage = match rank {
            1 => self.distribution.first_place,
            2 => self.distribution.second_place,
            3 => self.distribution.third_place,
            4..=6 => self.distribution.fourth_to_sixth,
            7..=11 => self.distribution.seventh_to_twelfth,
            12 => self.distribution.seventh_to_twelfth.saturating_add(2), // Ajuste para somar 100%
            _ => 0,
        };

        total_fund.saturating_mul(percentage as u128).saturating_div(10000)
    }

    /// Calcula a distribuição total de recompensas para um conjunto de carteiras
    pub fn calculate_rewards_distribution(&self, wallets: &Vec<WalletInfo>, _total_fund: u128) -> u128 {
        wallets.iter().map(|wallet| wallet.reward_amount).sum()
    }

    /// Valida se a distribuição soma 100%
    pub fn validate_distribution(&self) -> bool {
        let total = self.distribution.first_place
            .saturating_add(self.distribution.second_place)
            .saturating_add(self.distribution.third_place)
            .saturating_add(self.distribution.fourth_to_sixth.saturating_mul(3)) // 4º, 5º, 6º
            .saturating_add(self.distribution.seventh_to_twelfth.saturating_mul(5)) // 7º ao 11º
            .saturating_add(self.distribution.seventh_to_twelfth.saturating_add(2)); // 12º (com ajuste)

        total == 2000 // 20%
    }

    /// Obtém a configuração atual
    pub fn get_distribution(&self) -> &RewardDistribution {
        &self.distribution
    }

    /// Obtém o número de carteiras excluídas
    pub fn get_excluded_count(&self) -> u32 {
        self.excluded_wallets_count
    }

    /// Obtém o tamanho do ranking
    pub fn get_ranking_size(&self) -> u8 {
        self.ranking_size
    }

    /// Calcula o ranking para uma categoria específica, excluindo whales
    pub fn calculate_category_ranking(
        &self,
        wallets: Vec<WalletRankingData>,
        category: RankingCategory,
        total_fund: u128,
        current_time: u64,
    ) -> Result<RankingResult, &'static str> {
        if wallets.is_empty() {
            return Err("No wallets provided");
        }
        
        if total_fund == 0 {
            return Err("No rewards fund available");
        }
        
        // Filtra apenas carteiras elegíveis (não whales)
        let eligible_wallets: Vec<WalletRankingData> = wallets
            .into_iter()
            .filter(|wallet| wallet.is_eligible)
            .collect();
            
        if eligible_wallets.len() < 12 {
            return Err("Insufficient eligible wallets for ranking");
        }
        
        // Ordena carteiras pela categoria específica
        let mut sorted_wallets = eligible_wallets;
        match category {
            RankingCategory::BurnVolume => {
                sorted_wallets.sort_by(|a, b| b.burn_volume.cmp(&a.burn_volume));
            },
            RankingCategory::TransactionVolume => {
                sorted_wallets.sort_by(|a, b| b.transaction_volume.cmp(&a.transaction_volume));
            },
            RankingCategory::Balance => {
                sorted_wallets.sort_by(|a, b| b.balance.cmp(&a.balance));
            },
            RankingCategory::StakingCount => {
                sorted_wallets.sort_by(|a, b| b.staking_count.cmp(&a.staking_count));
            },
            RankingCategory::AffiliateCount => {
                sorted_wallets.sort_by(|a, b| b.affiliate_count.cmp(&a.affiliate_count));
            },
        }
        
        // Pega as top 12 carteiras
        let top_wallets: Vec<WalletInfo> = sorted_wallets
            .into_iter()
            .take(12)
            .enumerate()
            .map(|(index, wallet_data)| {
                let rank = u8::try_from(index.saturating_add(1)).unwrap_or(255);
                let reward_amount = self.calculate_reward_for_rank(rank, total_fund);
                
                WalletInfo {
                    address: wallet_data.address,
                    balance: wallet_data.balance,
                    burn_volume: wallet_data.burn_volume,
                    transaction_volume: wallet_data.transaction_volume,
                    staking_count: wallet_data.staking_count,
                    affiliate_count: wallet_data.affiliate_count,
                    rank,
                    reward_amount,
                    category: category.clone(),
                }
            })
            .collect();
        
        // Calcula distribuição de recompensas
        let total_distributed = self.calculate_rewards_distribution(&top_wallets, total_fund);
        
        Ok(RankingResult {
            top_wallets,
            total_distributed,
            total_fund,
            calculated_at: current_time,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rewards_manager_creation_works() {
        let manager = RewardsManager::new();
        assert_eq!(manager.get_excluded_count(), 100);
        assert_eq!(manager.get_ranking_size(), 12);
        assert!(manager.validate_distribution());
    }

    #[test]
    fn custom_rewards_manager_works() {
        let distribution = RewardDistribution {
            first_place: 4000,
            second_place: 3000,
            third_place: 2000,
            fourth_to_sixth: 300,
            seventh_to_twelfth: 100,
        };
        
        let manager = RewardsManager::new_with_config(distribution.clone(), 50, 10);
        assert_eq!(manager.get_excluded_count(), 50);
        assert_eq!(manager.get_ranking_size(), 10);
        assert_eq!(manager.get_distribution(), &distribution);
    }

    #[test]
    fn calculate_reward_for_rank_works() {
        let manager = RewardsManager::new();
        let fund = 1_000_000u128;

        assert_eq!(manager.calculate_reward_for_rank(1, fund), 60_000);  // 6% (30% de 20%)
        assert_eq!(manager.calculate_reward_for_rank(2, fund), 40_000);  // 4% (20% de 20%)
        assert_eq!(manager.calculate_reward_for_rank(3, fund), 27_800);  // 2.78% (ajustado)
        assert_eq!(manager.calculate_reward_for_rank(4, fund), 16_000);  // 1.6% (8% de 20%)
        assert_eq!(manager.calculate_reward_for_rank(5, fund), 16_000);  // 1.6% (8% de 20%)
        assert_eq!(manager.calculate_reward_for_rank(6, fund), 16_000);  // 1.6% (8% de 20%)
        assert_eq!(manager.calculate_reward_for_rank(7, fund), 4_000);   // 0.40% (ajustado)
        assert_eq!(manager.calculate_reward_for_rank(12, fund), 4_200);  // 0.42% (40+2)
        assert_eq!(manager.calculate_reward_for_rank(13, fund), 0);      // Fora do ranking
    }

    #[test]
    fn validate_distribution_works() {
        let manager = RewardsManager::new();
        assert!(manager.validate_distribution());

        // Distribuição inválida
        let invalid_distribution = RewardDistribution {
            first_place: 5000,
            second_place: 3000,
            third_place: 2000,
            fourth_to_sixth: 500,
            seventh_to_twelfth: 100,
        };
        
        let invalid_manager = RewardsManager::new_with_config(invalid_distribution, 100, 12);
        assert!(!invalid_manager.validate_distribution());
    }

    #[test]
    fn calculate_ranking_works() {
        let manager = RewardsManager::new();
        
        // Cria 115 carteiras (100 serão excluídas + 15 elegíveis)
        let mut wallets = Vec::new();
        
        // 100 maiores carteiras (serão excluídas)
        for i in 0..100 {
            let address = [i as u8; 32];
            let balance = 1_000_000u128.saturating_add(i as u128); // Saldos altos
            wallets.push((address, balance));
        }
        
        // 15 carteiras elegíveis (12 entrarão no ranking)
        for i in 100..115 {
            let address = [i as u8; 32];
            let balance = 500_000 - (i - 100) as u128; // Saldos menores
            wallets.push((address, balance));
        }

        let fund = 1_000_000u128;
        let current_time = 1234567890u64;
        
        let result = manager.calculate_ranking(wallets, fund, current_time).unwrap();
        
        assert_eq!(result.top_wallets.len(), 12);
        assert_eq!(result.total_fund, fund);
        assert_eq!(result.calculated_at, current_time);
        
        // Verifica se as carteiras estão ordenadas por saldo
        for i in 1..result.top_wallets.len() {
            assert!(result.top_wallets[i-1].balance >= result.top_wallets[i].balance);
        }
        
        // Verifica se os ranks estão corretos
        for (index, wallet) in result.top_wallets.iter().enumerate() {
            assert_eq!(wallet.rank, (index + 1) as u8);
        }
        
        // Verifica se as recompensas estão corretas
        assert_eq!(result.top_wallets[0].reward_amount, 60_000);  // 1º lugar: 6% (30% de 20%)
        assert_eq!(result.top_wallets[1].reward_amount, 40_000);  // 2º lugar: 4% (20% de 20%)
        assert_eq!(result.top_wallets[2].reward_amount, 27_800);  // 3º lugar: 2.78% (ajustado)
    }

    #[test]
    fn calculate_ranking_empty_wallets_fails() {
        let manager = RewardsManager::new();
        let result = manager.calculate_ranking(Vec::new(), 1000, 123);
        assert_eq!(result.err(), Some("No wallets provided"));
    }

    #[test]
    fn calculate_ranking_zero_fund_fails() {
        let manager = RewardsManager::new();
        let wallets = vec![([1u8; 32], 1000u128)];
        let result = manager.calculate_ranking(wallets, 0, 123);
        assert_eq!(result.err(), Some("Fund amount cannot be zero"));
    }

    #[test]
    fn calculate_ranking_insufficient_wallets_fails() {
        let manager = RewardsManager::new();
        
        // Apenas 5 carteiras (menos que 100 excluídas + 12 ranking)
        let wallets = vec![
            ([1u8; 32], 1000u128),
            ([2u8; 32], 900u128),
            ([3u8; 32], 800u128),
            ([4u8; 32], 700u128),
            ([5u8; 32], 600u128),
        ];
        
        let result = manager.calculate_ranking(wallets, 1000, 123);
        assert_eq!(result.err(), Some("Not enough eligible wallets for ranking"));
    }

    #[test]
    fn total_distribution_calculation_works() {
        let manager = RewardsManager::new();
        let fund = 1_000_000u128;
        
        let mut total_calculated = 0u128;
        for rank in 1..=12 {
            total_calculated = total_calculated.saturating_add(manager.calculate_reward_for_rank(rank, fund));
        }
        
        // Deve somar exatamente 20% do fundo (200_400 de 1_000_000)
        let expected_total = fund / 5; // 20% do fundo
        assert_eq!(total_calculated, expected_total);
    }
}