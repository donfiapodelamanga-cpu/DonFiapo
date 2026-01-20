//! Sistema de Evolução de NFTs
//!
//! Permite queimar 2 ou mais NFTs do mesmo tipo para receber um NFT superior
//! com bônus permanente de +10% no poder de mineração.
//!
//! ## Regras:
//! - Mínimo de 2 NFTs do mesmo tipo para evoluir
//! - NFT resultante é do tier imediatamente superior
//! - Bônus de +10% no mining rate é aplicado permanentemente
//! - NFTs gratuitos (tier 0) podem evoluir para tier 1
//! - Tier 6 (máximo) não pode evoluir mais

use ink::prelude::vec::Vec;
use scale::{Decode, Encode};
use ink::env::{DefaultEnvironment, Environment};

type AccountId = <DefaultEnvironment as Environment>::AccountId;

/// Configuração do sistema de evolução
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct EvolutionConfig {
    /// Número mínimo de NFTs necessários para evolução
    pub min_nfts_required: u8,
    /// Bônus de mining em basis points (1000 = 10%)
    pub evolution_bonus_bps: u16,
    /// Se o sistema está ativo
    pub is_active: bool,
    /// Taxa em USDT para evolução (em centavos, 0 = grátis)
    pub evolution_fee_cents: u64,
    /// Período de cooldown entre evoluções (em segundos)
    pub cooldown_period: u64,
}

impl Default for EvolutionConfig {
    fn default() -> Self {
        Self {
            min_nfts_required: 2, // Geral, será sobrescrito por lógica de tier
            evolution_bonus_bps: 1000, // 10%
            is_active: true,
            evolution_fee_cents: 0,
            cooldown_period: 7200, // 2 horas (conforme solicitado pelo usuário)
        }
    }
}

/// Recompensas de queima ($FIAPO com 8 decimais)
pub const BURN_REWARDS: [u128; 7] = [
    100 * 10u128.pow(8),      // Tier 0 -> 1: 100 $FIAPO
    500 * 10u128.pow(8),      // Tier 1 -> 2: 500 $FIAPO
    600 * 10u128.pow(8),      // Tier 2 -> 3: 600 $FIAPO
    800 * 10u128.pow(8),      // Tier 3 -> 4: 800 $FIAPO
    1_000 * 10u128.pow(8),    // Tier 4 -> 5: 1.000 $FIAPO
    50_000 * 10u128.pow(8),   // Tier 5 -> 6: 50.000 $FIAPO
    100_000 * 10u128.pow(8),  // Tier 6 (Max): 100.000 $FIAPO
];

/// Bônus de Prestígio ($FIAPO com 8 decimais)
/// [Tier][BonusType] -> 0: Early Adopter (100), 1: Last Survivor (10)
pub const PRESTIGE_BONUSES: [[u128; 2]; 7] = [
    [100 * 10u128.pow(8), 100 * 10u128.pow(8)],             // Tier 0
    [10_000 * 10u128.pow(8), 10_000 * 10u128.pow(8)],       // Tier 1
    [100_000 * 10u128.pow(8), 100_000 * 10u128.pow(8)],     // Tier 2
    [150_000 * 10u128.pow(8), 150_000 * 10u128.pow(8)],     // Tier 3
    [200_000 * 10u128.pow(8), 200_000 * 10u128.pow(8)],     // Tier 4
    [300_000 * 10u128.pow(8), 300_000 * 10u128.pow(8)],     // Tier 5
    [1_000_000 * 10u128.pow(8), 1_000_000 * 10u128.pow(8)], // Tier 6
];

/// Dados de um NFT evoluído
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct EvolvedNFTData {
    /// ID do NFT evoluído
    pub nft_id: u64,
    /// IDs dos NFTs queimados para criar este
    pub source_nft_ids: Vec<u64>,
    /// Tier original dos NFTs queimados
    pub source_tier: u8,
    /// Tier resultante após evolução
    pub result_tier: u8,
    /// Bônus total de mining em basis points
    pub total_bonus_bps: u16,
    /// Timestamp da evolução
    pub evolved_at: u64,
    /// Número de evoluções (pode evoluir múltiplas vezes)
    pub evolution_count: u8,
}

/// Registro de uma evolução
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct EvolutionRecord {
    /// ID único da evolução
    pub id: u64,
    /// Proprietário que realizou a evolução
    pub owner: AccountId,
    /// IDs dos NFTs queimados
    pub burned_nft_ids: Vec<u64>,
    /// Tier dos NFTs queimados
    pub source_tier: u8,
    /// ID do NFT resultante
    pub result_nft_id: u64,
    /// Tier do NFT resultante
    pub result_tier: u8,
    /// Bônus aplicado (em bps)
    pub bonus_applied_bps: u16,
    /// Timestamp
    pub timestamp: u64,
}

/// Erros do sistema de evolução
#[derive(Debug, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub enum EvolutionError {
    /// Sistema de evolução não está ativo
    SystemNotActive,
    /// Número insuficiente de NFTs para evolução
    InsufficientNFTs,
    /// NFTs não são do mesmo tipo
    NFTTypeMismatch,
    /// NFT não pertence ao caller
    NotOwner,
    /// NFT não encontrado
    NFTNotFound,
    /// Tier máximo já atingido (não pode evoluir)
    MaxTierReached,
    /// NFT já foi queimado ou não está ativo
    NFTNotActive,
    /// Pagamento de taxa necessário
    PaymentRequired,
    /// Período de espera (cooldown) ainda ativo
    CooldownActive,
    /// Erro interno
    InternalError,
}

/// Resultado de uma evolução bem-sucedida
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct EvolutionResult {
    /// ID do novo NFT criado
    pub new_nft_id: u64,
    /// Tier do novo NFT
    pub new_tier: u8,
    /// Bônus de mining aplicado (em bps)
    pub bonus_bps: u16,
    /// Mining rate do novo NFT (com bônus)
    pub new_daily_mining_rate: u128,
    /// IDs dos NFTs queimados
    pub burned_nft_ids: Vec<u64>,
}

/// Gerenciador do sistema de evolução
#[derive(Debug, Clone, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct EvolutionManager {
    /// Configuração do sistema
    pub config: EvolutionConfig,
    /// Próximo ID de evolução
    pub next_evolution_id: u64,
    /// Total de evoluções realizadas
    pub total_evolutions: u64,
    /// Total de NFTs queimados em evoluções
    pub total_nfts_burned: u64,
}

impl Default for EvolutionManager {
    fn default() -> Self {
        Self::new()
    }
}

impl EvolutionManager {
    /// Cria uma nova instância do gerenciador de evolução
    pub fn new() -> Self {
        Self {
            config: EvolutionConfig::default(),
            next_evolution_id: 1,
            total_evolutions: 0,
            total_nfts_burned: 0,
        }
    }

    /// Verifica se NFTs podem ser evoluídos
    /// 
    /// # Regras de validação:
    /// 1. Sistema deve estar ativo
    /// 2. Mínimo de 2 NFTs
    /// 3. Todos NFTs devem ser do mesmo tipo
    /// 4. Tipo não pode ser o máximo (6)
    /// 5. Todos NFTs devem estar ativos
    pub fn can_evolve(
        &self,
        nft_tiers: &[u8],
    ) -> Result<u8, EvolutionError> {
        // 1. Sistema ativo
        if !self.config.is_active {
            return Err(EvolutionError::SystemNotActive);
        }

        // 2. Todos do mesmo tipo
        let first_tier = nft_tiers.first().ok_or(EvolutionError::InsufficientNFTs)?;
        if !nft_tiers.iter().all(|t| t == first_tier) {
            return Err(EvolutionError::NFTTypeMismatch);
        }

        // 3. Mínimo de NFTs específico por Tier
        // Tier 0 (Free) exige 5 NFTs conforme novas regras de tokenomics
        // Tiers 1+ respeitam a configuração min_nfts_required (default 2)
        let required = if *first_tier == 0 { 5 } else { self.config.min_nfts_required };
        if nft_tiers.len() < required as usize {
            return Err(EvolutionError::InsufficientNFTs);
        }

        // 4. Não pode ser tier máximo
        if *first_tier >= 6 {
            return Err(EvolutionError::MaxTierReached);
        }

        // Retorna o tier resultante (próximo tier)
        Ok(first_tier + 1)
    }

    /// Retorna o valor de Burn Reward para um determinado tier
    pub fn get_burn_reward(&self, source_tier: u8) -> u128 {
        if (source_tier as usize) < BURN_REWARDS.len() {
            BURN_REWARDS[source_tier as usize]
        } else {
            0
        }
    }

    /// Retorna o bônus de prestígio se aplicável
    pub fn get_prestige_bonus(&self, tier: u8, total_created: u32, max_supply: u32) -> u128 {
        if (tier as usize) >= PRESTIGE_BONUSES.len() {
            return 0;
        }

        // 100 Primeiros
        if total_created <= 100 {
            return PRESTIGE_BONUSES[tier as usize][0];
        }

        // 10 Últimos (se max_supply for atingido ou quase)
        if total_created > max_supply.saturating_sub(10) && total_created <= max_supply {
            return PRESTIGE_BONUSES[tier as usize][1];
        }

        0
    }

    /// Calcula o bônus de mining para um NFT evoluído
    /// 
    /// # Parâmetros
    /// - `base_mining_rate`: Taxa de mineração base do tier resultante
    /// - `evolution_count`: Número de vezes que o NFT foi evoluído (1 = primeira evolução)
    /// 
    /// # Retorno
    /// Taxa de mineração com bônus aplicado
    pub fn calculate_evolved_mining_rate(
        &self,
        base_mining_rate: u128,
        evolution_count: u8,
    ) -> u128 {
        // Bônus é cumulativo: 10% por evolução
        let total_bonus_bps = (self.config.evolution_bonus_bps as u128)
            .saturating_mul(evolution_count as u128);
        
        // Aplicar bônus: rate * (10000 + bonus) / 10000
        base_mining_rate
            .saturating_mul(10000u128.saturating_add(total_bonus_bps))
            .saturating_div(10000)
    }

    /// Registra uma evolução bem-sucedida
    pub fn record_evolution(
        &mut self,
        burned_count: u64,
    ) {
        self.total_evolutions = self.total_evolutions.saturating_add(1);
        self.total_nfts_burned = self.total_nfts_burned.saturating_add(burned_count);
        self.next_evolution_id = self.next_evolution_id.saturating_add(1);
    }

    /// Atualiza a configuração do sistema
    pub fn update_config(&mut self, new_config: EvolutionConfig) {
        self.config = new_config;
    }

    /// Ativa ou desativa o sistema
    pub fn set_active(&mut self, active: bool) {
        self.config.is_active = active;
    }
}

// ============================================================================
// TESTES TDD
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    // -------------------------------------------------------------------------
    // Testes de Configuração
    // -------------------------------------------------------------------------

    #[test]
    fn test_default_config() {
        let config = EvolutionConfig::default();
        
        assert_eq!(config.min_nfts_required, 2);
        assert_eq!(config.evolution_bonus_bps, 1000); // 10%
        assert!(config.is_active);
        assert_eq!(config.evolution_fee_cents, 0);
    }

    #[test]
    fn test_new_manager() {
        let manager = EvolutionManager::new();
        
        assert_eq!(manager.next_evolution_id, 1);
        assert_eq!(manager.total_evolutions, 0);
        assert_eq!(manager.total_nfts_burned, 0);
        assert!(manager.config.is_active);
    }

    // -------------------------------------------------------------------------
    // Testes de Validação (can_evolve)
    // -------------------------------------------------------------------------

    #[test]
    fn test_can_evolve_success_two_nfts_tier1() {
        let manager = EvolutionManager::new();
        
        // 2 NFTs do tier 1 (Pickaxe) devem evoluir para tier 2
        let nft_tiers = vec![1, 1];
        let result = manager.can_evolve(&nft_tiers);
        
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 2); // Tier resultante
    }

    #[test]
    fn test_can_evolve_success_five_nfts_tier0() {
        let manager = EvolutionManager::new();
        
        // 5 NFTs do tier 0 (Shovel) devem evoluir para tier 1
        let nft_tiers = vec![0, 0, 0, 0, 0];
        let result = manager.can_evolve(&nft_tiers);
        
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 1); // Tier resultante
    }

    #[test]
    fn test_can_evolve_success_three_nfts() {
        let manager = EvolutionManager::new();
        
        // 3 NFTs do tier 2 (Silver) devem evoluir para tier 3
        let nft_tiers = vec![2, 2, 2];
        let result = manager.can_evolve(&nft_tiers);
        
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 3); // Tier resultante
    }

    #[test]
    fn test_can_evolve_fails_insufficient_nfts() {
        let manager = EvolutionManager::new();
        
        // Apenas 1 NFT - deve falhar
        let nft_tiers = vec![0];
        let result = manager.can_evolve(&nft_tiers);
        
        assert_eq!(result, Err(EvolutionError::InsufficientNFTs));
    }

    #[test]
    fn test_can_evolve_fails_empty() {
        let manager = EvolutionManager::new();
        
        let nft_tiers: Vec<u8> = vec![];
        let result = manager.can_evolve(&nft_tiers);
        
        assert_eq!(result, Err(EvolutionError::InsufficientNFTs));
    }

    #[test]
    fn test_can_evolve_fails_type_mismatch() {
        let manager = EvolutionManager::new();
        
        // NFTs de tipos diferentes - deve falhar
        let nft_tiers = vec![0, 1];
        let result = manager.can_evolve(&nft_tiers);
        
        assert_eq!(result, Err(EvolutionError::NFTTypeMismatch));
    }

    #[test]
    fn test_can_evolve_fails_max_tier() {
        let manager = EvolutionManager::new();
        
        // NFTs do tier máximo (6) - não podem evoluir
        let nft_tiers = vec![6, 6];
        let result = manager.can_evolve(&nft_tiers);
        
        assert_eq!(result, Err(EvolutionError::MaxTierReached));
    }

    #[test]
    fn test_can_evolve_fails_system_inactive() {
        let mut manager = EvolutionManager::new();
        manager.set_active(false);
        
        let nft_tiers = vec![0, 0];
        let result = manager.can_evolve(&nft_tiers);
        
        assert_eq!(result, Err(EvolutionError::SystemNotActive));
    }

    // -------------------------------------------------------------------------
    // Testes de Cálculo de Bônus
    // -------------------------------------------------------------------------

    #[test]
    fn test_calculate_evolved_mining_rate_first_evolution() {
        let manager = EvolutionManager::new();
        
        // Taxa base de 100 tokens/dia, primeira evolução (10% bônus)
        let base_rate = 100u128;
        let evolved_rate = manager.calculate_evolved_mining_rate(base_rate, 1);
        
        // 100 * (10000 + 1000) / 10000 = 110
        assert_eq!(evolved_rate, 110);
    }

    #[test]
    fn test_calculate_evolved_mining_rate_second_evolution() {
        let manager = EvolutionManager::new();
        
        // Taxa base de 100 tokens/dia, segunda evolução (20% bônus)
        let base_rate = 100u128;
        let evolved_rate = manager.calculate_evolved_mining_rate(base_rate, 2);
        
        // 100 * (10000 + 2000) / 10000 = 120
        assert_eq!(evolved_rate, 120);
    }

    #[test]
    fn test_calculate_evolved_mining_rate_third_evolution() {
        let manager = EvolutionManager::new();
        
        // Taxa base de 1000 tokens/dia, terceira evolução (30% bônus)
        let base_rate = 1000u128;
        let evolved_rate = manager.calculate_evolved_mining_rate(base_rate, 3);
        
        // 1000 * (10000 + 3000) / 10000 = 1300
        assert_eq!(evolved_rate, 1300);
    }

    #[test]
    fn test_calculate_evolved_mining_rate_no_evolution() {
        let manager = EvolutionManager::new();
        
        // Taxa base de 100 tokens/dia, sem evolução
        let base_rate = 100u128;
        let evolved_rate = manager.calculate_evolved_mining_rate(base_rate, 0);
        
        // Sem bônus
        assert_eq!(evolved_rate, 100);
    }

    #[test]
    fn test_calculate_evolved_mining_rate_realistic_values() {
        let manager = EvolutionManager::new();
        
        // Tier 3 Gold tem ~142 tokens/dia
        // Após evolução, deve ter ~156 tokens/dia (142 * 1.1)
        let base_rate = 142u128;
        let evolved_rate = manager.calculate_evolved_mining_rate(base_rate, 1);
        
        // 142 * 1.1 = 156.2 -> 156 (truncado)
        assert_eq!(evolved_rate, 156);
    }

    // -------------------------------------------------------------------------
    // Testes de Registro de Evolução
    // -------------------------------------------------------------------------

    #[test]
    fn test_record_evolution() {
        let mut manager = EvolutionManager::new();
        
        assert_eq!(manager.total_evolutions, 0);
        assert_eq!(manager.total_nfts_burned, 0);
        assert_eq!(manager.next_evolution_id, 1);
        
        // Primeira evolução com 2 NFTs
        manager.record_evolution(2);
        
        assert_eq!(manager.total_evolutions, 1);
        assert_eq!(manager.total_nfts_burned, 2);
        assert_eq!(manager.next_evolution_id, 2);
        
        // Segunda evolução com 3 NFTs
        manager.record_evolution(3);
        
        assert_eq!(manager.total_evolutions, 2);
        assert_eq!(manager.total_nfts_burned, 5);
        assert_eq!(manager.next_evolution_id, 3);
    }

    // -------------------------------------------------------------------------
    // Testes de Configuração Dinâmica
    // -------------------------------------------------------------------------

    #[test]
    fn test_update_config() {
        let mut manager = EvolutionManager::new();
        
        let new_config = EvolutionConfig {
            min_nfts_required: 3,
            evolution_bonus_bps: 1500, // 15%
            is_active: true,
            evolution_fee_cents: 500, // $5.00
            cooldown_period: 86400,
        };
        
        manager.update_config(new_config.clone());
        
        assert_eq!(manager.config.min_nfts_required, 3);
        assert_eq!(manager.config.evolution_bonus_bps, 1500);
        assert_eq!(manager.config.evolution_fee_cents, 500);
    }

    #[test]
    fn test_can_evolve_with_custom_min_nfts() {
        let mut manager = EvolutionManager::new();
        
        // Alterar para exigir 3 NFTs mínimo (Testaremos com Tier 1 para não usar a regra de Tier 0)
        manager.config.min_nfts_required = 3;
        
        // 2 NFTs agora falha
        let nft_tiers = vec![1, 1];
        assert_eq!(manager.can_evolve(&nft_tiers), Err(EvolutionError::InsufficientNFTs));
        
        // 3 NFTs funciona
        let nft_tiers = vec![1, 1, 1];
        assert!(manager.can_evolve(&nft_tiers).is_ok());
    }

    // -------------------------------------------------------------------------
    // Testes de Casos de Borda
    // -------------------------------------------------------------------------

    #[test]
    fn test_evolve_all_tiers() {
        let manager = EvolutionManager::new();
        
        // Tier 0 -> 1 (Exige 5)
        assert_eq!(manager.can_evolve(&vec![0, 0, 0, 0, 0]).unwrap(), 1);
        
        // Tier 1 -> 2
        assert_eq!(manager.can_evolve(&vec![1, 1]).unwrap(), 2);
        
        // Tier 2 -> 3
        assert_eq!(manager.can_evolve(&vec![2, 2]).unwrap(), 3);
        
        // Tier 3 -> 4
        assert_eq!(manager.can_evolve(&vec![3, 3]).unwrap(), 4);
        
        // Tier 4 -> 5
        assert_eq!(manager.can_evolve(&vec![4, 4]).unwrap(), 5);
        
        // Tier 5 -> 6
        assert_eq!(manager.can_evolve(&vec![5, 5]).unwrap(), 6);
        
        // Tier 6 -> Erro (máximo)
        assert_eq!(manager.can_evolve(&vec![6, 6]), Err(EvolutionError::MaxTierReached));
    }

    #[test]
    fn test_large_number_of_nfts() {
        let manager = EvolutionManager::new();
        
        // 10 NFTs do mesmo tipo
        let nft_tiers = vec![3; 10];
        let result = manager.can_evolve(&nft_tiers);
        
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 4);
    }

    #[test]
    fn test_mining_rate_overflow_protection() {
        let manager = EvolutionManager::new();
        
        // Taxa muito alta que poderia causar overflow
        let base_rate = u128::MAX / 20000; // Valor alto mas que permite cálculo
        let evolved_rate = manager.calculate_evolved_mining_rate(base_rate, 1);
        
        // Deve usar saturating_mul para evitar overflow e retornar valor maior
        assert!(evolved_rate > base_rate);
        
        // Taxa extremamente alta - deve saturar sem panic
        let extreme_rate = u128::MAX;
        let result = manager.calculate_evolved_mining_rate(extreme_rate, 255);
        // Não deve dar panic, deve saturar para MAX
        assert!(result > 0);
    }
}
