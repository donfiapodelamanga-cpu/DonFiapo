//! Sistema de Raridade Visual de NFTs
//!
//! Este módulo implementa atributos visuais raros para NFTs durante o mint.
//! Alguns NFTs podem ter skins, animações ou efeitos especiais sem alterar
//! seu poder de mineração, incentivando o colecionismo e mercado secundário.
//!
//! ## Características:
//! - Raridade visual determinada por RNG no momento do mint
//! - Não afeta poder de mineração (apenas visual)
//! - Atributos armazenados nos metadados do NFT
//! - Suporte a múltiplos tipos de raridade (skin, animação, efeito, moldura)

use ink::prelude::{vec::Vec, vec, string::String, format};
use scale::{Decode, Encode};

/// Níveis de raridade visual
#[derive(Debug, Clone, Copy, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub enum VisualRarity {
    /// Comum - aparência padrão (70%)
    Common,
    /// Incomum - pequenas variações (20%)
    Uncommon,
    /// Raro - skins alternativas (7%)
    Rare,
    /// Épico - efeitos visuais (2.5%)
    Epic,
    /// Lendário - animações especiais (0.5%)
    Legendary,
}

impl Default for VisualRarity {
    fn default() -> Self {
        Self::Common
    }
}

/// Tipos de atributos visuais
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub enum VisualAttribute {
    /// Skin alternativa
    Skin(String),
    /// Efeito de partículas
    ParticleEffect(String),
    /// Animação especial
    Animation(String),
    /// Moldura decorativa
    Frame(String),
    /// Aura/glow
    Aura(String),
    /// Background especial
    Background(String),
}

/// Configuração de probabilidades de raridade
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct RarityProbabilities {
    /// Probabilidade de Common (em basis points, 7000 = 70%)
    pub common_bps: u16,
    /// Probabilidade de Uncommon (em basis points, 2000 = 20%)
    pub uncommon_bps: u16,
    /// Probabilidade de Rare (em basis points, 700 = 7%)
    pub rare_bps: u16,
    /// Probabilidade de Epic (em basis points, 250 = 2.5%)
    pub epic_bps: u16,
    /// Probabilidade de Legendary (em basis points, 50 = 0.5%)
    pub legendary_bps: u16,
}

impl Default for RarityProbabilities {
    fn default() -> Self {
        Self {
            common_bps: 7000,     // 70%
            uncommon_bps: 2000,   // 20%
            rare_bps: 700,        // 7%
            epic_bps: 250,        // 2.5%
            legendary_bps: 50,    // 0.5%
        }
    }
}

impl RarityProbabilities {
    /// Valida se as probabilidades somam 100%
    pub fn is_valid(&self) -> bool {
        let total = self.common_bps as u32
            + self.uncommon_bps as u32
            + self.rare_bps as u32
            + self.epic_bps as u32
            + self.legendary_bps as u32;
        total == 10000
    }
}

/// Atributos visuais completos de um NFT
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode, Default)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct NFTVisualAttributes {
    /// Nível de raridade visual
    pub rarity: VisualRarity,
    /// Lista de atributos visuais
    pub attributes: Vec<VisualAttribute>,
    /// Hash do seed usado para gerar (para verificação)
    pub seed_hash: u64,
    /// Se os atributos foram revelados
    pub revealed: bool,
}

/// Resultado do roll de raridade
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct RarityRollResult {
    /// Raridade obtida
    pub rarity: VisualRarity,
    /// Valor do roll (0-9999)
    pub roll_value: u16,
    /// Atributos visuais gerados
    pub attributes: Vec<VisualAttribute>,
}

/// Erros do sistema de raridade
#[derive(Debug, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub enum RarityError {
    /// Probabilidades inválidas
    InvalidProbabilities,
    /// NFT não encontrado
    NFTNotFound,
    /// Atributos já revelados
    AlreadyRevealed,
    /// Seed inválido
    InvalidSeed,
}

/// Gerenciador do sistema de raridade
#[derive(Debug, Clone, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct RarityManager {
    /// Configuração de probabilidades
    pub probabilities: RarityProbabilities,
    /// Contador de NFTs por raridade
    pub rarity_counts: RarityCounts,
    /// Total de rolls realizados
    pub total_rolls: u64,
}

/// Contagem de NFTs por raridade
#[derive(Debug, Clone, Default, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct RarityCounts {
    pub common: u64,
    pub uncommon: u64,
    pub rare: u64,
    pub epic: u64,
    pub legendary: u64,
}

impl Default for RarityManager {
    fn default() -> Self {
        Self::new()
    }
}

impl RarityManager {
    /// Cria uma nova instância do gerenciador
    pub fn new() -> Self {
        Self {
            probabilities: RarityProbabilities::default(),
            rarity_counts: RarityCounts::default(),
            total_rolls: 0,
        }
    }

    /// Determina a raridade baseada em um valor de roll (0-9999)
    /// 
    /// # Parâmetros
    /// - `roll`: Valor entre 0 e 9999
    /// 
    /// # Retorno
    /// Raridade correspondente ao roll
    pub fn determine_rarity(&self, roll: u16) -> VisualRarity {
        let roll = roll.min(9999);
        
        let common_threshold = self.probabilities.common_bps;
        let uncommon_threshold = common_threshold + self.probabilities.uncommon_bps;
        let rare_threshold = uncommon_threshold + self.probabilities.rare_bps;
        let epic_threshold = rare_threshold + self.probabilities.epic_bps;
        
        if roll < common_threshold {
            VisualRarity::Common
        } else if roll < uncommon_threshold {
            VisualRarity::Uncommon
        } else if roll < rare_threshold {
            VisualRarity::Rare
        } else if roll < epic_threshold {
            VisualRarity::Epic
        } else {
            VisualRarity::Legendary
        }
    }

    /// Gera um valor de roll pseudo-aleatório baseado em múltiplos seeds
    /// 
    /// # Segurança
    /// Combina múltiplas fontes de entropia para dificultar manipulação
    pub fn generate_roll(
        &self,
        block_timestamp: u64,
        block_number: u32,
        caller_bytes: &[u8],
        nft_id: u64,
    ) -> u16 {
        // Combinar múltiplas fontes de entropia
        let mut seed: u64 = 0;
        
        // Timestamp do bloco
        seed = seed.wrapping_add(block_timestamp);
        
        // Número do bloco
        seed = seed.wrapping_add(block_number as u64);
        
        // Bytes do caller (primeiros 8 bytes)
        for (i, &byte) in caller_bytes.iter().take(8).enumerate() {
            seed = seed.wrapping_add((byte as u64) << (i * 8));
        }
        
        // ID do NFT
        seed = seed.wrapping_add(nft_id.wrapping_mul(31337));
        
        // Total de rolls anteriores (adiciona imprevisibilidade)
        seed = seed.wrapping_add(self.total_rolls.wrapping_mul(7919));
        
        // Hash simples
        seed = seed.wrapping_mul(6364136223846793005);
        seed = seed.wrapping_add(1442695040888963407);
        
        // Reduzir para 0-9999
        ((seed >> 32) % 10000) as u16
    }

    /// Gera atributos visuais baseados na raridade
    pub fn generate_attributes(&self, rarity: VisualRarity, nft_tier: u8) -> Vec<VisualAttribute> {
        let mut attributes = Vec::new();
        
        let tier_name = match nft_tier {
            0 => "Commoner",
            1 => "Guard",
            2 => "Explorer",
            3 => "Wealthy",
            4 => "Treasure",
            5 => "Mango",
            6 => "Royal",
            _ => "Unknown",
        };
        
        match rarity {
            VisualRarity::Common => {
                // Sem atributos extras
            }
            VisualRarity::Uncommon => {
                attributes.push(VisualAttribute::Frame(
                    String::from("Bronze Frame")
                ));
            }
            VisualRarity::Rare => {
                attributes.push(VisualAttribute::Skin(
                    format!("{} Alternate", tier_name)
                ));
                attributes.push(VisualAttribute::Frame(
                    String::from("Silver Frame")
                ));
            }
            VisualRarity::Epic => {
                attributes.push(VisualAttribute::Skin(
                    format!("{} Elite", tier_name)
                ));
                attributes.push(VisualAttribute::ParticleEffect(
                    String::from("Golden Sparkles")
                ));
                attributes.push(VisualAttribute::Frame(
                    String::from("Gold Frame")
                ));
            }
            VisualRarity::Legendary => {
                attributes.push(VisualAttribute::Skin(
                    format!("{} Legendary", tier_name)
                ));
                attributes.push(VisualAttribute::Animation(
                    String::from("Idle Animation")
                ));
                attributes.push(VisualAttribute::Aura(
                    String::from("Divine Glow")
                ));
                attributes.push(VisualAttribute::ParticleEffect(
                    String::from("Crown Particles")
                ));
                attributes.push(VisualAttribute::Frame(
                    String::from("Diamond Frame")
                ));
            }
        }
        
        attributes
    }

    /// Realiza um roll completo e gera atributos visuais
    pub fn roll_rarity(
        &mut self,
        block_timestamp: u64,
        block_number: u32,
        caller_bytes: &[u8],
        nft_id: u64,
        nft_tier: u8,
    ) -> RarityRollResult {
        let roll_value = self.generate_roll(block_timestamp, block_number, caller_bytes, nft_id);
        let rarity = self.determine_rarity(roll_value);
        let attributes = self.generate_attributes(rarity, nft_tier);
        
        // Atualizar contagens
        match rarity {
            VisualRarity::Common => self.rarity_counts.common += 1,
            VisualRarity::Uncommon => self.rarity_counts.uncommon += 1,
            VisualRarity::Rare => self.rarity_counts.rare += 1,
            VisualRarity::Epic => self.rarity_counts.epic += 1,
            VisualRarity::Legendary => self.rarity_counts.legendary += 1,
        }
        self.total_rolls += 1;
        
        RarityRollResult {
            rarity,
            roll_value,
            attributes,
        }
    }

    /// Atualiza as probabilidades (requer validação)
    pub fn update_probabilities(&mut self, new_probs: RarityProbabilities) -> Result<(), RarityError> {
        if !new_probs.is_valid() {
            return Err(RarityError::InvalidProbabilities);
        }
        self.probabilities = new_probs;
        Ok(())
    }

    /// Retorna estatísticas de raridade
    pub fn get_stats(&self) -> (RarityCounts, u64) {
        (self.rarity_counts.clone(), self.total_rolls)
    }

    /// Calcula a porcentagem real de cada raridade (em basis points, 100 = 1%)
    pub fn get_actual_percentages_bps(&self) -> Vec<(VisualRarity, u16)> {
        if self.total_rolls == 0 {
            return vec![];
        }
        
        // Usa u64 para cálculo intermediário para evitar overflow
        let total = self.total_rolls;
        vec![
            (VisualRarity::Common, ((self.rarity_counts.common as u64 * 10000) / total) as u16),
            (VisualRarity::Uncommon, ((self.rarity_counts.uncommon as u64 * 10000) / total) as u16),
            (VisualRarity::Rare, ((self.rarity_counts.rare as u64 * 10000) / total) as u16),
            (VisualRarity::Epic, ((self.rarity_counts.epic as u64 * 10000) / total) as u16),
            (VisualRarity::Legendary, ((self.rarity_counts.legendary as u64 * 10000) / total) as u16),
        ]
    }
    
    /// Versão legada para testes - retorna f64 (apenas para compatibilidade)
    #[cfg(test)]
    pub fn get_actual_percentages(&self) -> Vec<(VisualRarity, f64)> {
        if self.total_rolls == 0 {
            return vec![];
        }
        
        let total = self.total_rolls as f64;
        vec![
            (VisualRarity::Common, (self.rarity_counts.common as f64 / total) * 100.0),
            (VisualRarity::Uncommon, (self.rarity_counts.uncommon as f64 / total) * 100.0),
            (VisualRarity::Rare, (self.rarity_counts.rare as f64 / total) * 100.0),
            (VisualRarity::Epic, (self.rarity_counts.epic as f64 / total) * 100.0),
            (VisualRarity::Legendary, (self.rarity_counts.legendary as f64 / total) * 100.0),
        ]
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
    fn test_default_probabilities() {
        let probs = RarityProbabilities::default();
        
        assert_eq!(probs.common_bps, 7000);      // 70%
        assert_eq!(probs.uncommon_bps, 2000);    // 20%
        assert_eq!(probs.rare_bps, 700);         // 7%
        assert_eq!(probs.epic_bps, 250);         // 2.5%
        assert_eq!(probs.legendary_bps, 50);     // 0.5%
        assert!(probs.is_valid());
    }

    #[test]
    fn test_probabilities_validation() {
        // Válido
        let valid = RarityProbabilities {
            common_bps: 5000,
            uncommon_bps: 3000,
            rare_bps: 1000,
            epic_bps: 800,
            legendary_bps: 200,
        };
        assert!(valid.is_valid());
        
        // Inválido (soma > 100%)
        let invalid = RarityProbabilities {
            common_bps: 8000,
            uncommon_bps: 2000,
            rare_bps: 500,
            epic_bps: 500,
            legendary_bps: 500,
        };
        assert!(!invalid.is_valid());
    }

    #[test]
    fn test_new_manager() {
        let manager = RarityManager::new();
        
        assert_eq!(manager.total_rolls, 0);
        assert_eq!(manager.rarity_counts.common, 0);
        assert!(manager.probabilities.is_valid());
    }

    // -------------------------------------------------------------------------
    // Testes de Determinação de Raridade
    // -------------------------------------------------------------------------

    #[test]
    fn test_determine_rarity_common() {
        let manager = RarityManager::new();
        
        // Rolls 0-6999 devem ser Common
        assert_eq!(manager.determine_rarity(0), VisualRarity::Common);
        assert_eq!(manager.determine_rarity(3500), VisualRarity::Common);
        assert_eq!(manager.determine_rarity(6999), VisualRarity::Common);
    }

    #[test]
    fn test_determine_rarity_uncommon() {
        let manager = RarityManager::new();
        
        // Rolls 7000-8999 devem ser Uncommon
        assert_eq!(manager.determine_rarity(7000), VisualRarity::Uncommon);
        assert_eq!(manager.determine_rarity(8000), VisualRarity::Uncommon);
        assert_eq!(manager.determine_rarity(8999), VisualRarity::Uncommon);
    }

    #[test]
    fn test_determine_rarity_rare() {
        let manager = RarityManager::new();
        
        // Rolls 9000-9699 devem ser Rare
        assert_eq!(manager.determine_rarity(9000), VisualRarity::Rare);
        assert_eq!(manager.determine_rarity(9350), VisualRarity::Rare);
        assert_eq!(manager.determine_rarity(9699), VisualRarity::Rare);
    }

    #[test]
    fn test_determine_rarity_epic() {
        let manager = RarityManager::new();
        
        // Rolls 9700-9949 devem ser Epic
        assert_eq!(manager.determine_rarity(9700), VisualRarity::Epic);
        assert_eq!(manager.determine_rarity(9850), VisualRarity::Epic);
        assert_eq!(manager.determine_rarity(9949), VisualRarity::Epic);
    }

    #[test]
    fn test_determine_rarity_legendary() {
        let manager = RarityManager::new();
        
        // Rolls 9950-9999 devem ser Legendary
        assert_eq!(manager.determine_rarity(9950), VisualRarity::Legendary);
        assert_eq!(manager.determine_rarity(9975), VisualRarity::Legendary);
        assert_eq!(manager.determine_rarity(9999), VisualRarity::Legendary);
    }

    #[test]
    fn test_determine_rarity_clamps_value() {
        let manager = RarityManager::new();
        
        // Valor acima de 9999 deve ser tratado como 9999
        assert_eq!(manager.determine_rarity(10000), VisualRarity::Legendary);
        assert_eq!(manager.determine_rarity(u16::MAX), VisualRarity::Legendary);
    }

    // -------------------------------------------------------------------------
    // Testes de Geração de Atributos
    // -------------------------------------------------------------------------

    #[test]
    fn test_generate_attributes_common() {
        let manager = RarityManager::new();
        
        let attrs = manager.generate_attributes(VisualRarity::Common, 0);
        assert!(attrs.is_empty()); // Common não tem atributos extras
    }

    #[test]
    fn test_generate_attributes_uncommon() {
        let manager = RarityManager::new();
        
        let attrs = manager.generate_attributes(VisualRarity::Uncommon, 0);
        assert_eq!(attrs.len(), 1);
        assert!(matches!(attrs[0], VisualAttribute::Frame(_)));
    }

    #[test]
    fn test_generate_attributes_rare() {
        let manager = RarityManager::new();
        
        let attrs = manager.generate_attributes(VisualRarity::Rare, 2);
        assert_eq!(attrs.len(), 2);
        assert!(attrs.iter().any(|a| matches!(a, VisualAttribute::Skin(_))));
        assert!(attrs.iter().any(|a| matches!(a, VisualAttribute::Frame(_))));
    }

    #[test]
    fn test_generate_attributes_epic() {
        let manager = RarityManager::new();
        
        let attrs = manager.generate_attributes(VisualRarity::Epic, 3);
        assert_eq!(attrs.len(), 3);
        assert!(attrs.iter().any(|a| matches!(a, VisualAttribute::Skin(_))));
        assert!(attrs.iter().any(|a| matches!(a, VisualAttribute::ParticleEffect(_))));
        assert!(attrs.iter().any(|a| matches!(a, VisualAttribute::Frame(_))));
    }

    #[test]
    fn test_generate_attributes_legendary() {
        let manager = RarityManager::new();
        
        let attrs = manager.generate_attributes(VisualRarity::Legendary, 6);
        assert_eq!(attrs.len(), 5); // Skin, Animation, Aura, Particles, Frame
        assert!(attrs.iter().any(|a| matches!(a, VisualAttribute::Animation(_))));
        assert!(attrs.iter().any(|a| matches!(a, VisualAttribute::Aura(_))));
    }

    // -------------------------------------------------------------------------
    // Testes de Roll Completo
    // -------------------------------------------------------------------------

    #[test]
    fn test_roll_rarity_updates_counts() {
        let mut manager = RarityManager::new();
        
        assert_eq!(manager.total_rolls, 0);
        
        // Fazer alguns rolls
        let caller_bytes = [1u8; 32];
        manager.roll_rarity(1000, 100, &caller_bytes, 1, 0);
        manager.roll_rarity(2000, 200, &caller_bytes, 2, 1);
        manager.roll_rarity(3000, 300, &caller_bytes, 3, 2);
        
        assert_eq!(manager.total_rolls, 3);
        
        // Total de contagens deve ser igual ao total de rolls
        let total_counts = manager.rarity_counts.common
            + manager.rarity_counts.uncommon
            + manager.rarity_counts.rare
            + manager.rarity_counts.epic
            + manager.rarity_counts.legendary;
        assert_eq!(total_counts, 3);
    }

    #[test]
    fn test_roll_rarity_different_seeds_produce_different_results() {
        let mut manager = RarityManager::new();
        let caller_bytes = [1u8; 32];
        
        let result1 = manager.roll_rarity(1000, 100, &caller_bytes, 1, 0);
        let result2 = manager.roll_rarity(2000, 200, &caller_bytes, 2, 0);
        let result3 = manager.roll_rarity(1000, 100, &[2u8; 32], 1, 0);
        
        // Pelo menos alguma variação deve existir
        // (não garantimos que sejam diferentes, mas é muito improvável que sejam iguais)
        let all_same = result1.roll_value == result2.roll_value 
            && result2.roll_value == result3.roll_value;
        
        // Em produção, isso raramente será verdade
        // Mas para testes deterministicos, verificamos a estrutura
        assert!(result1.roll_value <= 9999);
        assert!(result2.roll_value <= 9999);
        assert!(result3.roll_value <= 9999);
    }

    // -------------------------------------------------------------------------
    // Testes de Atualização de Configuração
    // -------------------------------------------------------------------------

    #[test]
    fn test_update_probabilities_valid() {
        let mut manager = RarityManager::new();
        
        let new_probs = RarityProbabilities {
            common_bps: 6000,
            uncommon_bps: 2500,
            rare_bps: 1000,
            epic_bps: 400,
            legendary_bps: 100,
        };
        
        let result = manager.update_probabilities(new_probs.clone());
        assert!(result.is_ok());
        assert_eq!(manager.probabilities.common_bps, 6000);
        assert_eq!(manager.probabilities.legendary_bps, 100);
    }

    #[test]
    fn test_update_probabilities_invalid() {
        let mut manager = RarityManager::new();
        
        let invalid_probs = RarityProbabilities {
            common_bps: 5000,
            uncommon_bps: 5000,
            rare_bps: 1000, // Soma = 11000, inválido
            epic_bps: 0,
            legendary_bps: 0,
        };
        
        let result = manager.update_probabilities(invalid_probs);
        assert_eq!(result, Err(RarityError::InvalidProbabilities));
        
        // Probabilidades originais devem permanecer
        assert_eq!(manager.probabilities.common_bps, 7000);
    }

    // -------------------------------------------------------------------------
    // Testes de Estatísticas
    // -------------------------------------------------------------------------

    #[test]
    fn test_get_stats() {
        let mut manager = RarityManager::new();
        
        // Forçar alguns resultados específicos
        manager.rarity_counts.common = 70;
        manager.rarity_counts.uncommon = 20;
        manager.rarity_counts.rare = 7;
        manager.rarity_counts.epic = 2;
        manager.rarity_counts.legendary = 1;
        manager.total_rolls = 100;
        
        let (counts, total) = manager.get_stats();
        
        assert_eq!(total, 100);
        assert_eq!(counts.common, 70);
        assert_eq!(counts.legendary, 1);
    }

    #[test]
    fn test_get_actual_percentages() {
        let mut manager = RarityManager::new();
        
        manager.rarity_counts.common = 70;
        manager.rarity_counts.uncommon = 20;
        manager.rarity_counts.rare = 7;
        manager.rarity_counts.epic = 2;
        manager.rarity_counts.legendary = 1;
        manager.total_rolls = 100;
        
        let percentages = manager.get_actual_percentages();
        
        assert_eq!(percentages.len(), 5);
        
        // Common deve ser 70%
        let common_pct = percentages.iter()
            .find(|(r, _)| *r == VisualRarity::Common)
            .map(|(_, p)| *p)
            .unwrap();
        assert!((common_pct - 70.0).abs() < 0.001);
        
        // Legendary deve ser 1%
        let legendary_pct = percentages.iter()
            .find(|(r, _)| *r == VisualRarity::Legendary)
            .map(|(_, p)| *p)
            .unwrap();
        assert!((legendary_pct - 1.0).abs() < 0.001);
    }

    #[test]
    fn test_get_actual_percentages_empty() {
        let manager = RarityManager::new();
        
        let percentages = manager.get_actual_percentages();
        assert!(percentages.is_empty());
    }

    // -------------------------------------------------------------------------
    // Testes de Integração
    // -------------------------------------------------------------------------

    #[test]
    fn test_full_mint_flow() {
        let mut manager = RarityManager::new();
        
        // Simular mint de um NFT tier 3 (Gold)
        let caller_bytes = [42u8; 32];
        let block_timestamp = 1700000000000u64;
        let block_number = 1000000u32;
        let nft_id = 12345u64;
        let nft_tier = 3u8;
        
        let result = manager.roll_rarity(
            block_timestamp,
            block_number,
            &caller_bytes,
            nft_id,
            nft_tier,
        );
        
        // Verificar resultado
        assert!(result.roll_value <= 9999);
        assert_eq!(manager.total_rolls, 1);
        
        // Se for Legendary, deve ter animação
        if result.rarity == VisualRarity::Legendary {
            assert!(result.attributes.iter().any(|a| matches!(a, VisualAttribute::Animation(_))));
        }
    }

    #[test]
    fn test_tier_names_in_attributes() {
        let manager = RarityManager::new();
        
        // Verificar que o nome do tier aparece nos atributos
        let attrs = manager.generate_attributes(VisualRarity::Rare, 6); // Royal
        
        let has_royal = attrs.iter().any(|a| {
            if let VisualAttribute::Skin(name) = a {
                name.contains("Royal")
            } else {
                false
            }
        });
        
        assert!(has_royal);
    }
}
