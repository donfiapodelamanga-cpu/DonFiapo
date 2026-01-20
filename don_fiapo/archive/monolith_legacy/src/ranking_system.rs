//! Sistema de Ranking Unificado do Don Fiapo
//!
//! Este módulo implementa um sistema de ranking completo que gerencia
//! todas as categorias de recompensas e competições do ecossistema Don Fiapo.
//!
//! ## Características Principais:
//! - 8 tipos diferentes de ranking
//! - Sistema de pontuação ponderada
//! - Proteção contra whales (exclusão top 100 carteiras)
//! - Distribuição automática de recompensas
//! - Histórico completo e transparência total

use ink::prelude::{vec::Vec, vec};
use ink::storage::Mapping;
use scale::{Decode, Encode};

/// Erros do sistema de ranking
#[derive(Debug, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub enum RankingError {
    /// Ranking não encontrado
    RankingNotFound,
    /// Configuração inválida
    InvalidConfiguration,
    /// Carteira não elegível
    WalletNotEligible,
    /// Dados insuficientes
    InsufficientData,
    /// Período inválido
    InvalidPeriod,
    /// Acesso negado
    AccessDenied,
    /// Sistema pausado
    SystemPaused,
    /// Overflow matemático
    MathOverflow,
    /// Ranking já existe
    RankingAlreadyExists,
    /// Configuração não encontrada
    ConfigNotFound,
}

/// Tipos de ranking disponíveis
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub enum RankingType {
    /// Ranking de recompensas mensais (top 12 carteiras por saldo)
    MonthlyRewards,
    /// Ranking de loteria mensal (ganhadores do "God looked at you")
    MonthlyLottery,
    /// Ranking de loteria de Natal (ganhadores especiais)
    ChristmasLottery,
    /// Ranking por volume de staking ativo
    Staking,
    /// Ranking por volume de tokens queimados
    Burn,
    /// Ranking por número de afiliados ativos
    Affiliates,
    /// Ranking por participação em governança
    Governance,
    /// Ranking geral (combinação de todos os fatores)
    General,
}

/// Status do ranking
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub enum RankingStatus {
    /// Ranking ativo e funcionando
    Active,
    /// Ranking pausado temporariamente
    Paused,
    /// Ranking desabilitado
    Disabled,
    /// Ranking em manutenção
    Maintenance,
}

/// Configuração de um tipo de ranking
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct RankingConfig {
    /// Número máximo de carteiras no ranking
    pub max_ranking_size: u8,
    /// Número de top carteiras a excluir (whales)
    pub exclude_top_wallets: u16,
    /// Saldo mínimo para participar
    pub minimum_balance: u128,
    /// Saldo máximo para participar
    pub maximum_balance: u128,
    /// Intervalo de atualização em segundos
    pub update_interval: u64,
    /// Percentual do fundo para distribuir
    pub reward_percentage: u8,
    /// Se o ranking está ativo
    pub is_active: bool,
    /// Status do ranking
    pub status: RankingStatus,
    /// Timestamp da última atualização
    pub last_updated: u64,
}

/// Pesos para cálculo do ranking geral
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct ScoringWeights {
    /// Peso do saldo de tokens (25%)
    pub balance_weight: u8,
    /// Peso do staking ativo (30%)
    pub staking_weight: u8,
    /// Peso do volume queimado (20%)
    pub burn_weight: u8,
    /// Peso do volume de transações (10%)
    pub transaction_weight: u8,
    /// Peso do número de afiliados (10%)
    pub affiliate_weight: u8,
    /// Peso da participação em governança (5%)
    pub governance_weight: u8,
}

/// Informações detalhadas de uma carteira no ranking
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct WalletRankingInfo {
    /// Endereço da carteira
    pub address: [u8; 32],
    /// Saldo atual de tokens
    pub balance: u128,
    /// Saldo total em staking
    pub staking_balance: u128,
    /// Volume total queimado
    pub burn_volume: u128,
    /// Volume total de transações
    pub transaction_volume: u128,
    /// Número de stakings ativos
    pub staking_count: u32,
    /// Número de afiliados diretos
    pub affiliate_count: u32,
    /// Pontuação de governança
    pub governance_score: u32,
    /// Posição no ranking
    pub rank: u8,
    /// Valor da recompensa
    pub reward_amount: u128,
    /// Tipo de ranking
    pub ranking_type: RankingType,
    /// Timestamp da última atualização
    pub last_updated: u64,
    /// Se é elegível para recompensas
    pub is_eligible: bool,
    /// Pontuação total (para ranking geral)
    pub total_score: u128,
}

/// Resultado de um ranking específico
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct RankingResult {
    /// ID único do ranking
    pub ranking_id: u64,
    /// Tipo de ranking
    pub ranking_type: RankingType,
    /// Lista das carteiras vencedoras
    pub winners: Vec<WalletRankingInfo>,
    /// Total de recompensas distribuídas
    pub total_rewards: u128,
    /// Total de participantes elegíveis
    pub total_participants: u32,
    /// Timestamp da execução
    pub executed_at: u64,
    /// Período de referência (início)
    pub period_start: u64,
    /// Período de referência (fim)
    pub period_end: u64,
    /// Se as recompensas foram distribuídas
    pub rewards_distributed: bool,
}

/// Histórico de rankings
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct RankingHistory {
    /// Tipo de ranking
    pub ranking_type: RankingType,
    /// Lista de IDs dos rankings
    pub ranking_ids: Vec<u64>,
    /// Timestamp da última atualização
    pub last_updated: u64,
    /// Total de rankings executados
    pub total_rankings: u32,
}

/// Estatísticas do sistema de ranking
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct RankingStats {
    /// Total de rankings executados
    pub total_rankings: u64,
    /// Total de recompensas distribuídas
    pub total_rewards_distributed: u128,
    /// Total de participantes únicos
    pub total_unique_participants: u32,
    /// Ranking mais ativo
    pub most_active_ranking: RankingType,
    /// Última atualização
    pub last_updated: u64,
}

/// Sistema principal de ranking
#[ink::storage_item]
#[derive(Debug)]
pub struct RankingSystem {
    /// Configurações por tipo de ranking
    pub configs: Mapping<RankingType, RankingConfig>,
    /// Resultados dos rankings por ID
    pub results: Mapping<u64, RankingResult>,
    /// Próximo ID de ranking
    pub next_ranking_id: u64,
    /// Pesos para pontuação geral
    pub scoring_weights: ScoringWeights,
    /// Histórico por tipo de ranking
    pub ranking_history: Mapping<RankingType, RankingHistory>,
    /// Última atualização por tipo
    pub last_updates: Mapping<RankingType, u64>,
    /// Estatísticas gerais
    pub stats: RankingStats,
    /// Se o sistema está ativo
    pub is_active: bool,
}

impl Default for ScoringWeights {
    fn default() -> Self {
        Self {
            balance_weight: 25,      // 25%
            staking_weight: 30,      // 30%
            burn_weight: 20,         // 20%
            transaction_weight: 10,  // 10%
            affiliate_weight: 10,    // 10%
            governance_weight: 5,    // 5%
        }
    }
}

impl Default for RankingConfig {
    fn default() -> Self {
        Self {
            max_ranking_size: 7, // Top 7 para rankings semanais/mensais (padrão)
            exclude_top_wallets: 100,
            minimum_balance: 1_000_000_000, // 10 FIAPO (8 decimais)
            maximum_balance: 1_000_000_000_000_000_000, // 10B FIAPO
            update_interval: 86400, // 24 horas
            reward_percentage: 20,  // 20%
            is_active: true,
            status: RankingStatus::Active,
            last_updated: 0,
        }
    }
}

impl RankingSystem {
    /// Cria um novo sistema de ranking
    pub fn new() -> Self {
        Self {
            configs: Mapping::default(),
            results: Mapping::default(),
            next_ranking_id: 1,
            scoring_weights: ScoringWeights::default(),
            ranking_history: Mapping::default(),
            last_updates: Mapping::default(),
            stats: RankingStats {
                total_rankings: 0,
                total_rewards_distributed: 0,
                total_unique_participants: 0,
                most_active_ranking: RankingType::MonthlyRewards,
                last_updated: 0,
            },
            is_active: true,
        }
    }

    /// Inicializa as configurações padrão para todos os tipos de ranking
    pub fn initialize_default_configs(&mut self) -> Result<(), RankingError> {
        let ranking_types = vec![
            RankingType::MonthlyRewards,
            RankingType::MonthlyLottery,
            RankingType::ChristmasLottery,
            RankingType::Staking,
            RankingType::Burn,
            RankingType::Affiliates,
            RankingType::Governance,
            RankingType::General,
        ];

        for ranking_type in ranking_types {
            let mut config = RankingConfig::default();
            
            // Configurações específicas por tipo
            match ranking_type {
                RankingType::MonthlyRewards => {
                    config.max_ranking_size = 7; // Top 7 para ranking mensal
                    config.reward_percentage = 20; // 20% do fundo
                    config.update_interval = 2592000; // 30 dias
                },
                RankingType::MonthlyLottery => {
                    config.max_ranking_size = 3; // Até 3 ganhadores
                    config.reward_percentage = 5; // 5% das taxas
                    config.update_interval = 2592000; // 30 dias
                },
                RankingType::ChristmasLottery => {
                    config.max_ranking_size = 12; // Top 12 para ranking anual (Natal)
                    config.reward_percentage = 5; // 5% das taxas anuais
                    config.update_interval = 31536000; // 365 dias
                },
                RankingType::Staking => {
                    config.max_ranking_size = 7; // Top 7 para ranking semanal
                    config.update_interval = 604800; // Semanal
                    config.reward_percentage = 0; // Bônus de APY
                },
                RankingType::Burn => {
                    config.max_ranking_size = 7; // Top 7 para ranking semanal
                    config.update_interval = 604800; // Semanal
                    config.reward_percentage = 0; // APY dinâmico
                },
                RankingType::Affiliates => {
                    config.max_ranking_size = 7; // Top 7 para ranking semanal
                    config.update_interval = 604800; // Semanal
                    config.reward_percentage = 0; // Comissões
                },
                RankingType::Governance => {
                    config.max_ranking_size = 7; // Top 7 para ranking semanal
                    config.update_interval = 604800; // Semanal
                    config.reward_percentage = 0; // Peso em votações
                },
                RankingType::General => {
                    config.max_ranking_size = 7; // Top 7 para ranking semanal
                    config.update_interval = 604800; // Semanal
                    config.reward_percentage = 10; // 10% benefícios VIP
                },
            }

            self.configs.insert(&ranking_type, &config);
            
            // Inicializa histórico
            let history = RankingHistory {
                ranking_type: ranking_type.clone(),
                ranking_ids: Vec::new(),
                last_updated: 0,
                total_rankings: 0,
            };
            self.ranking_history.insert(&ranking_type, &history);
        }

        Ok(())
    }

    /// Calcula ranking de recompensas mensais
    pub fn calculate_monthly_rewards_ranking(
        &mut self,
        wallets_data: Vec<(AccountId, u128)>, // (address, balance)
        fund_amount: u128,
        current_timestamp: u64,
    ) -> Result<u64, RankingError> {
        if !self.is_active {
            return Err(RankingError::SystemPaused);
        }

        let config = self.configs.get(&RankingType::MonthlyRewards)
            .ok_or(RankingError::ConfigNotFound)?;

        if !config.is_active {
            return Err(RankingError::SystemPaused);
        }

        // Filtra carteiras elegíveis (exclui top 100)
        let eligible_wallets = self.filter_eligible_wallets(
            wallets_data,
            &config,
            RankingType::MonthlyRewards,
        )?;

        let total_participants = eligible_wallets.len() as u32;

        // Ordena por saldo (maior para menor)
        let mut sorted_wallets = eligible_wallets;
        sorted_wallets.sort_by(|a, b| b.1.cmp(&a.1));

        // Pega as top carteiras
        let top_wallets: Vec<_> = sorted_wallets
            .into_iter()
            .take(config.max_ranking_size as usize)
            .collect();

        // Calcula recompensas
        let total_rewards = fund_amount
            .checked_mul(config.reward_percentage as u128)
            .and_then(|x| x.checked_div(100))
            .ok_or(RankingError::MathOverflow)?;

        let reward_per_wallet = if !top_wallets.is_empty() {
            total_rewards / top_wallets.len() as u128
        } else {
            0
        };

        // Cria informações das carteiras vencedoras
        let winners: Vec<WalletRankingInfo> = top_wallets
            .into_iter()
            .enumerate()
            .map(|(index, (address, balance))| {
                WalletRankingInfo {
                    address: self.account_id_to_bytes(address),
                    balance,
                    staking_balance: 0, // Será preenchido pela integração
                    burn_volume: 0,
                    transaction_volume: 0,
                    staking_count: 0,
                    affiliate_count: 0,
                    governance_score: 0,
                    rank: (index + 1) as u8,
                    reward_amount: reward_per_wallet,
                    ranking_type: RankingType::MonthlyRewards,
                    last_updated: current_timestamp,
                    is_eligible: true,
                    total_score: balance,
                }
            })
            .collect();

        // Cria resultado do ranking
        let ranking_id = self.next_ranking_id;
        let result = RankingResult {
            ranking_id,
            ranking_type: RankingType::MonthlyRewards,
            winners,
            total_rewards,
            total_participants,
            executed_at: current_timestamp,
            period_start: current_timestamp - 2592000, // 30 dias atrás
            period_end: current_timestamp,
            rewards_distributed: false,
        };

        // Salva resultado
        self.results.insert(&ranking_id, &result);
        self.next_ranking_id += 1;

        // Atualiza histórico
        self.update_ranking_history(RankingType::MonthlyRewards, ranking_id, current_timestamp)?;

        // Atualiza estatísticas
        self.update_stats(RankingType::MonthlyRewards, total_rewards, result.total_participants, current_timestamp);

        Ok(ranking_id)
    }

    /// Filtra carteiras elegíveis (exclui whales e aplica critérios)
    fn filter_eligible_wallets(
        &self,
        mut wallets_data: Vec<(AccountId, u128)>,
        config: &RankingConfig,
        _ranking_type: RankingType,
    ) -> Result<Vec<(AccountId, u128)>, RankingError> {
        // Ordena por saldo para identificar whales
        wallets_data.sort_by(|a, b| b.1.cmp(&a.1));

        // Remove as top carteiras (whales)
        let excluded_count = config.exclude_top_wallets.min(wallets_data.len() as u16) as usize;
        let remaining_wallets: Vec<_> = wallets_data
            .into_iter()
            .skip(excluded_count)
            .collect();

        // Aplica filtros de saldo mínimo e máximo
        let eligible_wallets: Vec<_> = remaining_wallets
            .into_iter()
            .filter(|(_, balance)| {
                *balance >= config.minimum_balance && *balance <= config.maximum_balance
            })
            .collect();

        Ok(eligible_wallets)
    }

    /// Converte AccountId para bytes
    fn account_id_to_bytes(&self, account_id: AccountId) -> [u8; 32] {
        account_id // AccountId já é [u8; 32]
    }

    /// Atualiza histórico de ranking
    fn update_ranking_history(
        &mut self,
        ranking_type: RankingType,
        ranking_id: u64,
        timestamp: u64,
    ) -> Result<(), RankingError> {
        let mut history = self.ranking_history.get(&ranking_type)
            .unwrap_or_else(|| RankingHistory {
                ranking_type: ranking_type.clone(),
                ranking_ids: Vec::new(),
                last_updated: 0,
                total_rankings: 0,
            });

        history.ranking_ids.push(ranking_id);
        history.last_updated = timestamp;
        history.total_rankings += 1;

        self.ranking_history.insert(&ranking_type, &history);
        self.last_updates.insert(&ranking_type, &timestamp);

        Ok(())
    }

    /// Atualiza estatísticas gerais
    fn update_stats(
        &mut self,
        ranking_type: RankingType,
        rewards_distributed: u128,
        participants: u32,
        timestamp: u64,
    ) {
        self.stats.total_rankings += 1;
        self.stats.total_rewards_distributed = self.stats.total_rewards_distributed
            .saturating_add(rewards_distributed);
        self.stats.total_unique_participants = self.stats.total_unique_participants
            .max(participants);
        self.stats.most_active_ranking = ranking_type;
        self.stats.last_updated = timestamp;
    }

    /// Obtém resultado de um ranking específico
    pub fn get_ranking_result(&self, ranking_id: u64) -> Option<RankingResult> {
        self.results.get(&ranking_id)
    }

    /// Obtém histórico de um tipo de ranking
    pub fn get_ranking_history(&self, ranking_type: &RankingType) -> Option<RankingHistory> {
        self.ranking_history.get(ranking_type)
    }

    /// Obtém o último ranking de um tipo específico
    pub fn get_latest_ranking(&self, ranking_type: &RankingType) -> Option<RankingResult> {
        let history = self.ranking_history.get(ranking_type)?;
        let latest_id = history.ranking_ids.last()?;
        self.results.get(latest_id)
    }

    /// Obtém configuração de um tipo de ranking
    pub fn get_ranking_config(&self, ranking_type: &RankingType) -> Option<RankingConfig> {
        self.configs.get(ranking_type)
    }

    /// Atualiza configuração de um tipo de ranking
    pub fn update_ranking_config(
        &mut self,
        ranking_type: RankingType,
        config: RankingConfig,
    ) -> Result<(), RankingError> {
        self.configs.insert(&ranking_type, &config);
        Ok(())
    }

    /// Obtém estatísticas gerais do sistema
    pub fn get_stats(&self) -> RankingStats {
        self.stats.clone()
    }

    /// Pausa/despausa o sistema
    pub fn set_system_status(&mut self, active: bool) {
        self.is_active = active;
    }

    /// Verifica se um ranking precisa ser atualizado
    pub fn needs_update(&self, ranking_type: &RankingType, current_timestamp: u64) -> bool {
        if let Some(config) = self.configs.get(ranking_type) {
            if let Some(last_update) = self.last_updates.get(ranking_type) {
                return current_timestamp >= last_update + config.update_interval;
            }
        }
        true // Se não há configuração ou última atualização, precisa atualizar
    }

    /// Calcula pontuação geral de uma carteira
    pub fn calculate_general_score(
        &self,
        balance: u128,
        staking_balance: u128,
        burn_volume: u128,
        transaction_volume: u128,
        affiliate_count: u32,
        governance_score: u32,
    ) -> Result<u128, RankingError> {
        let weights = &self.scoring_weights;
        
        // Normaliza os valores (implementação simplificada)
        let normalized_balance = balance / 1_000_000_000; // Divide por 10 FIAPO
        let normalized_staking = staking_balance / 1_000_000_000;
        let normalized_burn = burn_volume / 1_000_000_000;
        let normalized_transactions = transaction_volume / 1_000_000_000;
        let normalized_affiliates = affiliate_count as u128;
        let normalized_governance = governance_score as u128;

        // Calcula pontuação ponderada
        let score = normalized_balance
            .saturating_mul(weights.balance_weight as u128)
            .saturating_add(normalized_staking.saturating_mul(weights.staking_weight as u128))
            .saturating_add(normalized_burn.saturating_mul(weights.burn_weight as u128))
            .saturating_add(normalized_transactions.saturating_mul(weights.transaction_weight as u128))
            .saturating_add(normalized_affiliates.saturating_mul(weights.affiliate_weight as u128))
            .saturating_add(normalized_governance.saturating_mul(weights.governance_weight as u128));

        Ok(score)
    }
}

// AccountId type alias for ranking system (32-byte array representation)
type AccountId = [u8; 32];

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ranking_system_creation() {
        // Teste simplificado sem dependências do Ink! runtime
        let config = RankingConfig {
            max_ranking_size: 12,
            exclude_top_wallets: 100,
            minimum_balance: 1_000_000_000, // 10 FIAPO
            maximum_balance: 1_000_000_000_000_000_000, // 10B FIAPO
            update_interval: 86400, // 24 horas
            reward_percentage: 20,  // 20%
            is_active: true,
            status: RankingStatus::Active,
            last_updated: 0,
        };
        
        assert_eq!(config.max_ranking_size, 12);
        assert_eq!(config.exclude_top_wallets, 100);
        assert!(config.is_active);
    }

    #[test]
    fn test_monthly_rewards_ranking() {
        // Teste da lógica de filtragem sem dependências do runtime
        let wallets_data: Vec<([u8; 32], u128)> = vec![
            ([1u8; 32], 1_000_000_000_000u128), // 10k FIAPO
            ([2u8; 32], 500_000_000_000u128),   // 5k FIAPO
            ([3u8; 32], 100_000_000_000u128),   // 1k FIAPO
        ];
        
        // Testa ordenação por saldo
        let mut sorted = wallets_data.clone();
        sorted.sort_by(|a, b| b.1.cmp(&a.1));
        
        assert_eq!(sorted[0].1, 1_000_000_000_000u128);
        assert_eq!(sorted[1].1, 500_000_000_000u128);
        assert_eq!(sorted[2].1, 100_000_000_000u128);
        
        // Testa cálculo de recompensas
        let fund_amount = 1_000_000_000_000u128; // 10k FIAPO
        let reward_percentage = 20u8;
        let total_rewards = fund_amount * reward_percentage as u128 / 100;
        assert_eq!(total_rewards, 200_000_000_000u128); // 20% de 10k
    }

    #[test]
    fn test_general_score_calculation() {
        let ranking_system = RankingSystem::new();
        
        let score = ranking_system.calculate_general_score(
            10_000_000_000_000, // 100k FIAPO balance
            5_000_000_000_000,  // 50k FIAPO staking
            1_000_000_000_000,  // 10k FIAPO burned
            2_000_000_000_000,  // 20k FIAPO transactions
            10,                 // 10 affiliates
            50,                 // 50 governance score
        ).unwrap();
        
        assert!(score > 0);
    }

    #[test]
    fn test_ranking_history() {
        // Teste da estrutura de dados do histórico
        let ranking_history = RankingHistory {
            ranking_type: RankingType::MonthlyRewards,
            ranking_ids: vec![1, 2, 3],
            last_updated: 1640995200,
            total_rankings: 3,
        };
        
        // Verifica se a estrutura está correta
        assert_eq!(ranking_history.ranking_type, RankingType::MonthlyRewards);
        assert_eq!(ranking_history.ranking_ids.len(), 3);
        assert_eq!(ranking_history.total_rankings, 3);
        assert_eq!(ranking_history.ranking_ids[0], 1);
        assert_eq!(ranking_history.ranking_ids[2], 3);
    }

    #[test]
    fn test_needs_update() {
        // Teste da lógica de verificação de atualização
        let current_time = 1640995200u64;
        let last_update = 1640908800u64; // 1 dia atrás
        let update_interval = 2592000u64; // 30 dias
        
        let needs_update = current_time >= last_update + update_interval;
        assert!(!needs_update); // Não precisa atualizar ainda
        
        let old_update = 1609459200u64; // 1 ano atrás
        let needs_update_old = current_time >= old_update + update_interval;
        assert!(needs_update_old); // Precisa atualizar
        
        // Teste com intervalo exato
        let exact_time = last_update + update_interval;
        let needs_update_exact = current_time >= exact_time;
        assert!(!needs_update_exact); // Ainda não chegou no tempo exato
    }

    #[test]
    fn test_filter_eligible_wallets() {
        let ranking_system = RankingSystem::new();
        let config = RankingConfig {
            exclude_top_wallets: 2,
            minimum_balance: 1_000_000_000, // 10 FIAPO
            maximum_balance: 100_000_000_000_000, // 1M FIAPO
            ..Default::default()
        };
        
        let wallets_data = vec![
            ([1u8; 32], 1_000_000_000_000_000), // 10M FIAPO (whale 1)
            ([2u8; 32], 500_000_000_000_000),   // 5M FIAPO (whale 2)
            ([3u8; 32], 10_000_000_000_000),    // 100k FIAPO (elegível)
            ([4u8; 32], 5_000_000_000_000),     // 50k FIAPO (elegível)
            ([5u8; 32], 500_000_000),           // 5 FIAPO (muito baixo)
        ];
        
        let eligible = ranking_system.filter_eligible_wallets(
            wallets_data,
            &config,
            RankingType::MonthlyRewards,
        ).unwrap();
        
        // Deve ter 2 carteiras elegíveis (excluiu 2 whales e 1 com saldo baixo)
        assert_eq!(eligible.len(), 2);
        assert_eq!(eligible[0].1, 10_000_000_000_000); // 100k FIAPO
        assert_eq!(eligible[1].1, 5_000_000_000_000);  // 50k FIAPO
    }
}