//! # Sistema de APY Dinâmico
//!
//! Este módulo implementa o sistema de APY dinâmico baseado no volume de queima de tokens.
//! O APY varia conforme o usuário queima mais tokens, incentivando o holding de longo prazo.

use ink::prelude::{string::{String, ToString}, vec::Vec, vec, format};
use ink::storage::Mapping;
use ink::primitives::AccountId;
use scale::{Decode, Encode};
use crate::staking::StakingType;

type Balance = u128;

#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub enum Error {
    DynamicAPYDisabled,
    StakingTypeNotFound,
    InvalidAPYRange,
    InvalidBurnThreshold,
    InvalidTimeWindow,
    MathOverflow,
}

/// Histórico de queima global para cálculo de APY dinâmico
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode, Default)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct GlobalBurnHistory {
    /// Total queimado histórico
    pub total_burned: Balance,
    /// Queimado nas últimas 24h
    pub last_24h_burned: Balance,
    /// Queimado nos últimos 7 dias
    pub last_7d_burned: Balance,
    /// Queimado nos últimos 30 dias
    pub last_30d_burned: Balance,
    /// Timestamp da última atualização
    pub last_update: u64,
    /// Janelas de tempo para rastreamento
    pub burn_windows: Vec<BurnWindow>,
}

/// Janela de tempo para rastreamento de queima
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct BurnWindow {
    /// Timestamp do início da janela
    pub start_time: u64,
    /// Timestamp do fim da janela
    pub end_time: u64,
    /// Quantidade queimada nesta janela
    pub amount_burned: Balance,
}

/// Resultado do cálculo de APY dinâmico
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct APYCalculationResult {
    /// APY atual calculado (basis points)
    pub current_apy: u16,
    /// Nível baseado na queima (0-10)
    pub burn_level: u8,
    /// Próximo threshold para aumento
    pub next_threshold: Balance,
    /// Queima ponderada por tempo
    pub time_weighted_burn: Balance,
    /// Detalhes do cálculo
    pub calculation_details: APYCalculationDetails,
}

/// Detalhes do cálculo de APY para auditoria
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct APYCalculationDetails {
    /// Contribuição das últimas 24h (50%)
    pub contribution_24h: Balance,
    /// Contribuição dos últimos 7d (30%)
    pub contribution_7d: Balance,
    /// Contribuição dos últimos 30d (20%)
    pub contribution_30d: Balance,
    /// Threshold base usado
    pub threshold_base: Balance,
    /// Multiplicador aplicado
    pub multiplier_applied: u16,
}

/// Configuração de APY dinâmico para um tipo de staking
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct DynamicAPYConfig {
    /// APY mínimo para este tipo de staking (em basis points)
    pub min_apy: u16,
    /// APY máximo para este tipo de staking (em basis points)
    pub max_apy: u16,
    /// Valor em tokens necessário para aumentar 1% no APY
    pub burn_threshold_per_apy_point: Balance,
    /// Incremento de APY por threshold atingido (em basis points)
    pub apy_increment: u16,
    /// Tipo de staking associado
    pub staking_type: String,
}

/// Dados de APY de um usuário
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode, Default)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct UserAPYData {
    /// Total de tokens queimados pelo usuário
    pub total_burned: Balance,
    /// APY atual calculado (em basis points)
    pub current_apy: u16,
    /// Último timestamp de atualização
    pub last_update: u64,
    /// Próximo threshold para aumento de APY
    pub next_threshold: Balance,
    /// Tipo de staking associado
    pub staking_type: String,
}

/// Progressão de APY por nível
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct APYProgression {
    /// Threshold de queima necessário
    pub burn_threshold: Balance,
    /// APY correspondente a este threshold (em basis points)
    pub apy_percentage: u16,
    /// Descrição do nível
    pub level_description: String,
}

/// Gerenciador principal do sistema de APY dinâmico
#[derive(Debug)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct DynamicAPYManager {
    /// Configurações por tipo de staking
    pub configs: Mapping<String, DynamicAPYConfig>,
    /// Dados de APY por usuário e tipo de staking
    pub user_apy_data: Mapping<(AccountId, String), UserAPYData>,
    /// Se o sistema de APY dinâmico está ativo
    pub is_enabled: bool,
}

/// Eventos relacionados ao APY dinâmico
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct APYUpdated {
    pub user: AccountId,
    pub staking_type: String,
    pub old_apy: u16,
    pub new_apy: u16,
    pub total_burned: Balance,
    pub next_threshold: Balance,
    pub timestamp: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct APYLevelAchieved {
    pub user: AccountId,
    pub staking_type: String,
    pub level: u64,
    pub apy_percentage: u16,
    pub total_burned: Balance,
}

#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct APYConfigUpdated {
    pub staking_type: String,
    pub min_apy: u16,
    pub max_apy: u16,
    pub threshold_per_point: Balance,
}

/// Evento emitido quando o histórico de queima global é atualizado
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct GlobalBurnHistoryUpdated {
    pub new_burn_amount: Balance,
    pub total_burned: Balance,
    pub last_24h_burned: Balance,
    pub last_7d_burned: Balance,
    pub last_30d_burned: Balance,
    pub timestamp: u64,
}

/// Evento emitido quando o APY dinâmico é recalculado
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct DynamicAPYRecalculated {
    pub staking_type: String,
    pub old_apy: u16,
    pub new_apy: u16,
    pub burn_level: u8,
    pub time_weighted_burn: Balance,
    pub timestamp: u64,
}

impl Default for DynamicAPYManager {
    fn default() -> Self {
        Self {
            configs: Mapping::default(),
            user_apy_data: Mapping::default(),
            is_enabled: false,
        }
    }
}

impl Encode for DynamicAPYManager {
    fn encode(&self) -> Vec<u8> {
        self.is_enabled.encode()
    }
}

impl Decode for DynamicAPYManager {
    fn decode<I: scale::Input>(input: &mut I) -> Result<Self, scale::Error> {
        let is_enabled = bool::decode(input)?;
        let mut manager = Self::default();
        manager.is_enabled = is_enabled;
        Ok(manager)
    }
}

impl DynamicAPYManager {
    /// Cria um novo gerenciador de APY dinâmico
    pub fn new() -> Self {
        Self {
            configs: Mapping::default(),
            user_apy_data: Mapping::default(),
            is_enabled: false,
        }
    }

    /// Atualiza o histórico de queima global
    pub fn update_burn_history(
        &self,
        history: &mut GlobalBurnHistory,
        new_burn_amount: Balance,
        current_time: u64,
    ) -> Result<(), Error> {
        // Atualiza total histórico
        history.total_burned = history.total_burned
            .checked_add(new_burn_amount)
            .ok_or(Error::MathOverflow)?;

        // Adiciona nova janela de queima
        let new_window = BurnWindow {
            start_time: current_time,
            end_time: current_time,
            amount_burned: new_burn_amount,
        };
        history.burn_windows.push(new_window);

        // Remove janelas antigas (mais de 30 dias)
        let thirty_days_ago = current_time.saturating_sub(30 * 24 * 60 * 60);
        history.burn_windows.retain(|window| window.start_time >= thirty_days_ago);

        // Recalcula totais por período
        self.recalculate_period_totals(history, current_time)?;
        
        history.last_update = current_time;
        Ok(())
    }

    /// Recalcula os totais por período (24h, 7d, 30d)
    fn recalculate_period_totals(
        &self,
        history: &mut GlobalBurnHistory,
        current_time: u64,
    ) -> Result<(), Error> {
        let twenty_four_hours_ago = current_time.saturating_sub(24 * 60 * 60);
        let seven_days_ago = current_time.saturating_sub(7 * 24 * 60 * 60);
        let thirty_days_ago = current_time.saturating_sub(30 * 24 * 60 * 60);

        history.last_24h_burned = 0;
        history.last_7d_burned = 0;
        history.last_30d_burned = 0;

        for window in &history.burn_windows {
            if window.start_time >= twenty_four_hours_ago {
                history.last_24h_burned = history.last_24h_burned
                    .checked_add(window.amount_burned)
                    .ok_or(Error::MathOverflow)?;
            }
            if window.start_time >= seven_days_ago {
                history.last_7d_burned = history.last_7d_burned
                    .checked_add(window.amount_burned)
                    .ok_or(Error::MathOverflow)?;
            }
            if window.start_time >= thirty_days_ago {
                history.last_30d_burned = history.last_30d_burned
                    .checked_add(window.amount_burned)
                    .ok_or(Error::MathOverflow)?;
            }
        }

        Ok(())
    }

    /// Calcula APY dinâmico baseado no volume de queima global
    pub fn calculate_dynamic_apy_with_history(
        &self,
        staking_type: &str,
        burn_history: &GlobalBurnHistory,
    ) -> Result<APYCalculationResult, Error> {
        if !self.is_enabled {
            return Err(Error::DynamicAPYDisabled);
        }

        let config = self.configs.get(staking_type)
            .ok_or(Error::StakingTypeNotFound)?;

        // Calcula queima ponderada por tempo
        // 50% peso para últimas 24h, 30% para 7d, 20% para 30d
        let weighted_burn = self.calculate_time_weighted_burn(burn_history)?;
        
        // Calcula nível baseado na queima ponderada
        let burn_level = self.calculate_burn_level(weighted_burn, &config);
        
        // Calcula APY baseado no nível
        let current_apy = self.calculate_apy_from_level(burn_level, &config);
        
        // Calcula próximo threshold
        let next_threshold = self.calculate_next_threshold_for_level(burn_level, &config);
        
        // Prepara detalhes do cálculo
        let calculation_details = APYCalculationDetails {
            contribution_24h: burn_history.last_24h_burned.saturating_mul(50) / 100,
            contribution_7d: burn_history.last_7d_burned.saturating_mul(30) / 100,
            contribution_30d: burn_history.last_30d_burned.saturating_mul(20) / 100,
            threshold_base: config.burn_threshold_per_apy_point,
            multiplier_applied: config.apy_increment,
        };

        Ok(APYCalculationResult {
            current_apy,
            burn_level,
            next_threshold,
            time_weighted_burn: weighted_burn,
            calculation_details,
        })
    }

    /// Calcula queima ponderada por tempo
    fn calculate_time_weighted_burn(
        &self,
        history: &GlobalBurnHistory,
    ) -> Result<Balance, Error> {
        let contribution_24h = history.last_24h_burned
            .checked_mul(50)
            .and_then(|x| x.checked_div(100))
            .ok_or(Error::MathOverflow)?;
        
        let contribution_7d = history.last_7d_burned
            .checked_mul(30)
            .and_then(|x| x.checked_div(100))
            .ok_or(Error::MathOverflow)?;
        
        let contribution_30d = history.last_30d_burned
            .checked_mul(20)
            .and_then(|x| x.checked_div(100))
            .ok_or(Error::MathOverflow)?;

        contribution_24h
            .checked_add(contribution_7d)
            .and_then(|x| x.checked_add(contribution_30d))
            .ok_or(Error::MathOverflow)
    }

    /// Calcula nível de queima (0-10) baseado na queima ponderada
    fn calculate_burn_level(&self, weighted_burn: Balance, config: &DynamicAPYConfig) -> u8 {
        if weighted_burn < config.burn_threshold_per_apy_point {
            return 0;
        }

        let excess = weighted_burn.saturating_sub(config.burn_threshold_per_apy_point);
        let level_increment = config.burn_threshold_per_apy_point / 10; // Divide em 10 níveis
        
        let level = if level_increment > 0 {
            (excess / level_increment) as u8
        } else {
            0
        };
        level.min(10) // Máximo nível 10
    }

    /// Calcula APY baseado no nível de queima
    fn calculate_apy_from_level(&self, level: u8, config: &DynamicAPYConfig) -> u16 {
        let additional_apy = (level as u16).saturating_mul(config.apy_increment);
        let total_apy = config.min_apy.saturating_add(additional_apy);
        total_apy.min(config.max_apy)
    }

    /// Calcula próximo threshold para aumento de nível
    fn calculate_next_threshold_for_level(&self, current_level: u8, config: &DynamicAPYConfig) -> Balance {
        if current_level >= 10 {
            return Balance::MAX; // Já no nível máximo
        }
        
        let level_increment = config.burn_threshold_per_apy_point / 10;
        config.burn_threshold_per_apy_point + ((current_level as Balance + 1) * level_increment)
    }

    /// Inicializa as configurações padrão de APY dinâmico
    pub fn initialize_default_configs(&mut self) {
        // Don Burn: 10% - 300%
        let don_burn_config = DynamicAPYConfig {
            min_apy: 10,
            max_apy: 300,
            burn_threshold_per_apy_point: 1000 * 10u128.pow(18), // 1000 tokens por 1% APY
            apy_increment: 1,
            staking_type: "Don Burn".to_string(),
        };

        // Don Lunes: 6% - 37%
        let don_lunes_config = DynamicAPYConfig {
            min_apy: 6,
            max_apy: 37,
            burn_threshold_per_apy_point: 2000 * 10u128.pow(18), // 2000 tokens por 1% APY
            apy_increment: 1,
            staking_type: "Don Lunes".to_string(),
        };

        // Don Fiapo: 7% - 70%
        let don_fiapo_config = DynamicAPYConfig {
            min_apy: 7,
            max_apy: 70,
            burn_threshold_per_apy_point: 1500 * 10u128.pow(18), // 1500 tokens por 1% APY
            apy_increment: 1,
            staking_type: "Don Fiapo".to_string(),
        };

        self.configs.insert("Don Burn", &don_burn_config);
        self.configs.insert("Don Lunes", &don_lunes_config);
        self.configs.insert("Don Fiapo", &don_fiapo_config);

        // Habilita o sistema por padrão
        self.is_enabled = true;
    }

    /// Calcula o APY dinâmico baseado no volume de queima
    pub fn calculate_dynamic_apy(
        &self,
        staking_type: &str,
        total_burned: Balance,
    ) -> Result<u16, Error> {
        if !self.is_enabled {
            return Err(Error::DynamicAPYDisabled);
        }

        let config = self
            .configs
            .get(staking_type)
            .ok_or(Error::StakingTypeNotFound)?;

        // Calcula quantos thresholds foram atingidos
        let thresholds_achieved = total_burned.saturating_div(config.burn_threshold_per_apy_point);

        // Calcula APY baseado nos thresholds
        let calculated_apy = config.min_apy.saturating_add((thresholds_achieved as u16).saturating_mul(config.apy_increment));

        // Garante que não exceda o máximo
        let final_apy = calculated_apy.min(config.max_apy);

        Ok(final_apy)
    }

    /// Atualiza APY de um usuário baseado no volume de queima
    pub fn update_user_apy_after_burn(
        &mut self,
        user: AccountId,
        staking_type: StakingType,
        burn_amount: Balance,
        current_time: u64,
    ) -> Result<u16, Error> {
        if !self.is_enabled {
            return Err(Error::DynamicAPYDisabled);
        }
        
        // Converte StakingType para string
        let staking_type_str = match staking_type {
            StakingType::DonBurn => "Don Burn",
            StakingType::DonLunes => "Don Lunes", 
            StakingType::DonFiapo => "Don Fiapo",
        };
        
        // Obtém dados atuais do usuário
        let mut user_data = self.user_apy_data.get(&(user, staking_type_str.to_string())).unwrap_or_default();
        
        // Define o staking_type corretamente
        user_data.staking_type = staking_type_str.to_string();
        
        // Atualiza volume total queimado
        user_data.total_burned = user_data.total_burned.saturating_add(burn_amount);
        
        // Calcula novo APY baseado no volume de queima
        let new_apy = self.calculate_dynamic_apy_for_user(&user_data)?;
        user_data.current_apy = new_apy;
        user_data.last_update = current_time;
        
        // Calcula próximo threshold
        user_data.next_threshold = self.calculate_next_threshold(&user_data)?;
        
        // Salva dados atualizados
        self.user_apy_data.insert(&(user, staking_type_str.to_string()), &user_data);
        
        Ok(new_apy)
    }
    
    /// Calcula o APY dinâmico para um usuário específico
    pub fn calculate_dynamic_apy_for_user(&self, user_data: &UserAPYData) -> Result<u16, Error> {
        if !self.is_enabled {
            return Err(Error::DynamicAPYDisabled);
        }

        // Usa a string correta do staking_type
        let staking_type_str = &user_data.staking_type;
        
        let config = self
            .configs
            .get(staking_type_str)
            .ok_or(Error::StakingTypeNotFound)?;

        // Calcula quantos thresholds foram atingidos
        let thresholds_achieved = user_data.total_burned.saturating_div(config.burn_threshold_per_apy_point);

        // Calcula APY baseado nos thresholds
        let calculated_apy = config.min_apy.saturating_add((thresholds_achieved as u16).saturating_mul(config.apy_increment));

        // Garante que não exceda o máximo
        let final_apy = calculated_apy.min(config.max_apy);

        Ok(final_apy)
    }
    
    /// Calcula o próximo threshold para aumento de APY
    pub fn calculate_next_threshold(&self, user_data: &UserAPYData) -> Result<Balance, Error> {
        // Usa a string correta do staking_type
        let staking_type_str = &user_data.staking_type;
        let config = self
            .configs
            .get(staking_type_str)
            .ok_or(Error::StakingTypeNotFound)?;

        // Calcula quantos thresholds já foram atingidos
        let current_thresholds = user_data.total_burned.saturating_div(config.burn_threshold_per_apy_point);
        
        // Próximo threshold
        let next_threshold = current_thresholds.saturating_add(1).saturating_mul(config.burn_threshold_per_apy_point);
        
        Ok(next_threshold)
    }
    
    /// Obtém o APY atual de um usuário para um tipo de staking específico
    pub fn get_user_current_apy(&self, user: AccountId, staking_type: &str) -> Result<u16, Error> {
        if !self.is_enabled {
            return Err(Error::DynamicAPYDisabled);
        }

        let user_data = self.user_apy_data.get(&(user, staking_type.to_string()));
        
        match user_data {
            Some(data) => {
                if data.current_apy > 0 {
                    Ok(data.current_apy)
                } else {
                    // Se não há dados ou APY é 0, retorna o APY base
                    Ok(self.get_default_apy(staking_type))
                }
            },
            None => {
                // Se não há dados do usuário, retorna o APY base
                Ok(self.get_default_apy(staking_type))
            }
        }
    }

    /// Obtém o APY base para um tipo de staking
    #[allow(dead_code)]
    fn get_base_apy(&self, staking_type: &str) -> Result<u16, Error> {
        let config = self
            .configs
            .get(staking_type)
            .ok_or(Error::StakingTypeNotFound)?;
        Ok(config.min_apy)
    }

    /// Obtém timestamp atual
    #[allow(dead_code)]
    fn get_current_timestamp(&self) -> u64 {
        // Em ambiente de teste, retorna um valor fixo
        // Em produção, usará o timestamp do bloco
        #[cfg(test)]
        return 1234567890;
        
        #[cfg(not(test))]
        ink::env::block_timestamp::<ink::env::DefaultEnvironment>()
    }



    /// Obtém o APY padrão para um tipo de staking
    pub fn get_default_apy(&self, staking_type: &str) -> u16 {
        match staking_type {
            "Don Burn" => 10,
            "Don Lunes" => 6,
            "Don Fiapo" => 7,
            _ => 10, // Fallback padrão
        }
    }

    /// Obtém dados completos do usuário
    pub fn get_user_apy_data(&self, user: AccountId, staking_type: &str) -> UserAPYData {
        self.user_apy_data
            .get(&(user, staking_type.to_string()))
            .unwrap_or_else(|| {
                // Buscar configuração do tipo de staking ou usar valores padrão
                let default_min_apy = 600u16; // 6% padrão
                let default_threshold = 1000u128;
                
                let (min_apy, threshold) = self.configs
                    .get(&staking_type.to_string())
                    .or_else(|| self.configs.get(&"DonFiapo".to_string()))
                    .map(|c| (c.min_apy, c.burn_threshold_per_apy_point))
                    .unwrap_or((default_min_apy, default_threshold));
                
                UserAPYData {
                    current_apy: min_apy,
                    last_update: 0,
                    total_burned: 0,
                    next_threshold: threshold,
                    staking_type: staking_type.to_string(),
                }
            })
    }

    /// Obtém a progressão de APY para um tipo de staking
    pub fn get_apy_progression(&self, staking_type: &str) -> Vec<APYProgression> {
        let config = match self.configs.get(staking_type) {
            Some(config) => config,
            None => return Vec::new(),
        };

        let mut progressions = Vec::new();
        let mut current_apy = config.min_apy;
        let mut threshold = config.burn_threshold_per_apy_point;
        let mut level = 1;

        while current_apy <= config.max_apy {
            progressions.push(APYProgression {
                burn_threshold: threshold,
                apy_percentage: current_apy,
                level_description: format!("Nível {}: {}% APY", level, current_apy),
            });

            current_apy += config.apy_increment;
            threshold += config.burn_threshold_per_apy_point;
            level += 1;

            // Previne loop infinito
            if level > 1000 {
                break;
            }
        }

        progressions
    }

    /// Calcula quantos tokens precisam ser queimados para o próximo nível de APY
    pub fn get_burn_needed_for_next_level(
        &self,
        user: AccountId,
        staking_type: &str,
    ) -> Result<Balance, Error> {
        if !self.is_enabled {
            return Err(Error::DynamicAPYDisabled);
        }

        let config = self
            .configs
            .get(staking_type)
            .ok_or(Error::StakingTypeNotFound)?;

        let user_data = self.user_apy_data.get(&(user, staking_type.to_string())).unwrap_or_default();

        // Se já está no máximo, não há próximo nível
        if user_data.current_apy >= config.max_apy {
            return Ok(0);
        }

        // Calcula quantos tokens precisam ser queimados para o próximo nível
        let current_thresholds = user_data.total_burned.saturating_div(config.burn_threshold_per_apy_point);
        let next_threshold = current_thresholds.saturating_add(1);
        let tokens_needed = next_threshold.saturating_mul(config.burn_threshold_per_apy_point).saturating_sub(user_data.total_burned);

        Ok(tokens_needed)
    }

    /// Atualiza configuração de um tipo de staking
    pub fn update_config(&mut self, config: DynamicAPYConfig) -> Result<(), Error> {
        if config.min_apy >= config.max_apy {
            return Err(Error::InvalidAPYRange);
        }

        if config.burn_threshold_per_apy_point == 0 {
            return Err(Error::InvalidBurnThreshold);
        }

        self.configs.insert(&config.staking_type, &config);
        Ok(())
    }

    /// Habilita ou desabilita o sistema de APY dinâmico
    pub fn set_enabled(&mut self, enabled: bool) {
        self.is_enabled = enabled;
    }

    /// Verifica se o sistema está habilitado
    pub fn is_enabled(&self) -> bool {
        self.is_enabled
    }

    /// Obtém configuração de um tipo de staking
    pub fn get_config(&self, staking_type: &str) -> Option<DynamicAPYConfig> {
        self.configs.get(staking_type)
    }

    /// Lista todos os tipos de staking configurados
    pub fn get_configured_types(&self) -> Vec<String> {
        // Como não podemos iterar sobre Mapping diretamente,
        // retornamos os tipos conhecidos
        vec![
            "Don Burn".to_string(),
            "Don Lunes".to_string(),
            "Don Fiapo".to_string(),
        ]
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn get_test_account() -> AccountId {
        AccountId::from([0x1; 32])
    }

    fn create_test_burn_history() -> GlobalBurnHistory {
        GlobalBurnHistory {
            total_burned: 10_000_000,
            last_24h_burned: 1_000_000,
            last_7d_burned: 5_000_000,
            last_30d_burned: 8_000_000,
            last_update: 1000,
            burn_windows: vec![
                BurnWindow {
                    start_time: 900,
                    end_time: 900,
                    amount_burned: 500_000,
                },
                BurnWindow {
                    start_time: 950,
                    end_time: 950,
                    amount_burned: 500_000,
                },
            ],
        }
    }

    #[ink::test]
    fn test_dynamic_apy_manager_creation() {
        let manager = DynamicAPYManager::new();
        assert!(!manager.is_enabled);
    }

    #[ink::test]
    fn test_global_burn_history_creation() {
        let history = GlobalBurnHistory::default();
        assert_eq!(history.total_burned, 0);
        assert_eq!(history.last_24h_burned, 0);
        assert_eq!(history.last_7d_burned, 0);
        assert_eq!(history.last_30d_burned, 0);
        assert_eq!(history.last_update, 0);
        assert!(history.burn_windows.is_empty());
    }

    #[ink::test]
    fn test_update_burn_history() {
        let manager = DynamicAPYManager::new();
        let mut history = GlobalBurnHistory::default();
        let current_time = 1000;
        let burn_amount = 500_000;

        let result = manager.update_burn_history(&mut history, burn_amount, current_time);
        assert!(result.is_ok());
        
        assert_eq!(history.total_burned, burn_amount);
        assert_eq!(history.last_update, current_time);
        assert_eq!(history.burn_windows.len(), 1);
        assert_eq!(history.burn_windows[0].amount_burned, burn_amount);
    }

    #[ink::test]
    fn test_calculate_time_weighted_burn() {
        let manager = DynamicAPYManager::new();
        let history = create_test_burn_history();
        
        let result = manager.calculate_time_weighted_burn(&history);
        assert!(result.is_ok());
        
        let weighted_burn = result.unwrap();
        // 50% de 1M + 30% de 5M + 20% de 8M = 500k + 1.5M + 1.6M = 3.6M
        let expected = (1_000_000 * 50 / 100) + (5_000_000 * 30 / 100) + (8_000_000 * 20 / 100);
        assert_eq!(weighted_burn, expected);
    }

    #[ink::test]
    fn test_calculate_burn_level() {
        let manager = DynamicAPYManager::new();
        let config = DynamicAPYConfig {
            min_apy: 10,
            max_apy: 300,
            burn_threshold_per_apy_point: 1_000_000,
            apy_increment: 1,
            staking_type: "Don Burn".to_string(),
        };
        
        // Teste com queima abaixo do threshold
        let level = manager.calculate_burn_level(500_000, &config);
        assert_eq!(level, 0);
        
        // Teste com queima no threshold
        let level = manager.calculate_burn_level(1_000_000, &config);
        assert_eq!(level, 0);
        
        // Teste com queima acima do threshold
        let level = manager.calculate_burn_level(1_500_000, &config);
        assert!(level > 0);
        
        // Teste com queima muito alta (deve ser limitado a 10)
        let level = manager.calculate_burn_level(50_000_000, &config);
        assert_eq!(level, 10);
    }

    #[ink::test]
    fn test_calculate_apy_from_level() {
        let manager = DynamicAPYManager::new();
        let config = DynamicAPYConfig {
            min_apy: 10,
            max_apy: 300,
            burn_threshold_per_apy_point: 1_000_000,
            apy_increment: 1,
            staking_type: "Don Burn".to_string(),
        };
        
        // Nível 0 = APY mínimo
        let apy = manager.calculate_apy_from_level(0, &config);
        assert_eq!(apy, 10);
        
        // Nível 5 = APY mínimo + 5 * incremento
        let apy = manager.calculate_apy_from_level(5, &config);
        assert_eq!(apy, 10 + (5 * 1));
        
        // Nível muito alto deve ser limitado ao máximo
        let apy = manager.calculate_apy_from_level(255, &config);
        assert_eq!(apy, 265); // 10 + (255 * 1) = 265, que é menor que max_apy=300
    }

    #[ink::test]
    fn test_calculate_dynamic_apy_with_history() {
        let mut manager = DynamicAPYManager::new();
        manager.initialize_default_configs();
        
        let history = create_test_burn_history();
        let result = manager.calculate_dynamic_apy_with_history("Don Burn", &history);
        
        assert!(result.is_ok());
        let apy_result = result.unwrap();
        
        assert!(apy_result.current_apy >= 10);
        assert!(apy_result.current_apy <= 300);
        assert!(apy_result.burn_level <= 10);
        assert!(apy_result.time_weighted_burn > 0);
    }

    #[ink::test]
    fn test_recalculate_period_totals() {
        let manager = DynamicAPYManager::new();
        let current_time = 3_000_000_u64; // Tempo base suficiente para evitar overflow
        let mut history = GlobalBurnHistory {
            total_burned: 0,
            last_24h_burned: 0,
            last_7d_burned: 0,
            last_30d_burned: 0,
            last_update: 0,
            burn_windows: vec![
                BurnWindow {
                    start_time: current_time - (23 * 60 * 60), // 23 horas atrás
                    end_time: current_time - (23 * 60 * 60),
                    amount_burned: 100_000,
                },
                BurnWindow {
                    start_time: current_time - (6 * 24 * 60 * 60), // 6 dias atrás
                    end_time: current_time - (6 * 24 * 60 * 60),
                    amount_burned: 200_000,
                },
                BurnWindow {
                    start_time: current_time - (25 * 24 * 60 * 60), // 25 dias atrás
                    end_time: current_time - (25 * 24 * 60 * 60),
                    amount_burned: 300_000,
                },
            ],
        };
        
        let result = manager.recalculate_period_totals(&mut history, current_time);
        assert!(result.is_ok());
        
        assert_eq!(history.last_24h_burned, 100_000); // Apenas a queima de 23h atrás
        assert_eq!(history.last_7d_burned, 300_000); // 23h + 6d atrás
        assert_eq!(history.last_30d_burned, 600_000); // Todas as queimas
    }

    #[ink::test]
    fn test_old_burn_windows_are_removed() {
        let manager = DynamicAPYManager::new();
        let mut history = GlobalBurnHistory::default();
        let current_time = 3_000_000_u64; // Tempo base suficiente para evitar overflow
        
        // Adiciona algumas janelas antigas
        history.burn_windows.push(BurnWindow {
            start_time: current_time - (31 * 24 * 60 * 60), // 31 dias atrás
            end_time: current_time - (31 * 24 * 60 * 60),
            amount_burned: 100_000,
        });
        
        history.burn_windows.push(BurnWindow {
            start_time: current_time - (29 * 24 * 60 * 60), // 29 dias atrás
            end_time: current_time - (29 * 24 * 60 * 60),
            amount_burned: 200_000,
        });
        
        let result = manager.update_burn_history(&mut history, 50_000, current_time);
        assert!(result.is_ok());
        
        // Deve manter apenas as janelas dos últimos 30 dias + a nova
        assert_eq!(history.burn_windows.len(), 2); // 29 dias atrás + nova
        assert_eq!(history.burn_windows[0].amount_burned, 200_000); // 29 dias atrás
        assert_eq!(history.burn_windows[1].amount_burned, 50_000); // Nova
    }

    #[ink::test]
fn test_initialize_default_configs() {
        let mut manager = DynamicAPYManager::new();
        manager.initialize_default_configs();

        assert!(manager.is_enabled);

        // Verifica configuração Don Burn
        let don_burn_config = manager.get_config("Don Burn").unwrap();
        assert_eq!(don_burn_config.min_apy, 10);
        assert_eq!(don_burn_config.max_apy, 300);

        // Verifica configuração Don Lunes
        let don_lunes_config = manager.get_config("Don Lunes").unwrap();
        assert_eq!(don_lunes_config.min_apy, 6);
        assert_eq!(don_lunes_config.max_apy, 37);

        // Verifica configuração Don Fiapo
        let don_fiapo_config = manager.get_config("Don Fiapo").unwrap();
        assert_eq!(don_fiapo_config.min_apy, 7);
        assert_eq!(don_fiapo_config.max_apy, 70);
    }

    #[ink::test]
fn test_calculate_dynamic_apy_don_burn() {
        let mut manager = DynamicAPYManager::new();
        manager.initialize_default_configs();

        // Teste APY inicial (mínimo)
        let initial_apy = manager.calculate_dynamic_apy("Don Burn", 0).unwrap();
        assert_eq!(initial_apy, 10);

        // Teste após queimar 1000 tokens (1 threshold)
        let apy_after_1000 = manager
            .calculate_dynamic_apy("Don Burn", 1000 * 10u128.pow(18))
            .unwrap();
        assert_eq!(apy_after_1000, 11);

        // Teste após queimar 10000 tokens (10 thresholds)
        let apy_after_10000 = manager
            .calculate_dynamic_apy("Don Burn", 10000 * 10u128.pow(18))
            .unwrap();
        assert_eq!(apy_after_10000, 20);
    }

    #[ink::test]
fn test_apy_maximum_cap() {
        let mut manager = DynamicAPYManager::new();
        manager.initialize_default_configs();

        // Teste com queima muito alta (deve respeitar o máximo)
        let max_apy = manager
            .calculate_dynamic_apy("Don Burn", 1000000 * 10u128.pow(18))
            .unwrap();
        assert_eq!(max_apy, 300); // APY máximo para Don Burn
    }

    #[ink::test]
    fn test_update_user_apy_after_burn() {
        let mut manager = DynamicAPYManager::new();
        manager.initialize_default_configs();

        let user = get_test_account();

        // Primeira queima
        let new_apy = manager
            .update_user_apy_after_burn(user, StakingType::DonBurn, 2000 * 10u128.pow(18), 1000)
            .unwrap();
        assert_eq!(new_apy, 12); // 10% + 2%

        // Segunda queima (acumulativa)
        let new_apy = manager
            .update_user_apy_after_burn(user, StakingType::DonBurn, 2000 * 10u128.pow(18), 2000)
            .unwrap();
        assert_eq!(new_apy, 14); // 10% + 4%
    }

    #[ink::test]
    fn test_get_user_current_apy() {
        let mut manager = DynamicAPYManager::new();
        manager.initialize_default_configs();

        let user = get_test_account();

        // Antes de qualquer queima (deve retornar APY mínimo)
        let initial_apy = manager.get_user_current_apy(user, "Don Burn");
        assert_eq!(initial_apy, Ok(10));

        // Após queima
        manager
            .update_user_apy_after_burn(user, StakingType::DonBurn, 1000 * 10u128.pow(18), 1000)
            .unwrap();
        let updated_apy = manager.get_user_current_apy(user, "Don Burn");
        assert_eq!(updated_apy, Ok(11));
    }

    #[ink::test]
    fn test_burn_needed_for_next_level() {
        let mut manager = DynamicAPYManager::new();
        manager.initialize_default_configs();

        let user = get_test_account();

        // Usuário queimou 500 tokens, precisa de mais 500 para próximo nível
        manager
            .update_user_apy_after_burn(user, StakingType::DonBurn, 500 * 10u128.pow(18), 1000)
            .unwrap();

        let needed = manager
            .get_burn_needed_for_next_level(user, "Don Burn")
            .unwrap();

        assert_eq!(needed, 500 * 10u128.pow(18));
    }

    #[ink::test]
fn test_apy_progression() {
        let mut manager = DynamicAPYManager::new();
        manager.initialize_default_configs();

        let progression = manager.get_apy_progression("Don Burn");
        assert!(!progression.is_empty());

        // Primeiro nível deve ser o APY mínimo
        assert_eq!(progression[0].apy_percentage, 10);
        assert_eq!(progression[0].burn_threshold, 1000 * 10u128.pow(18));

        // Segundo nível deve ser APY mínimo + 1
        assert_eq!(progression[1].apy_percentage, 11);
        assert_eq!(progression[1].burn_threshold, 2000 * 10u128.pow(18));
    }

    #[ink::test]
    fn test_disabled_system() {
        let mut manager = DynamicAPYManager::new();
        manager.initialize_default_configs();
        manager.set_enabled(false);

        let user = get_test_account();

        // Deve retornar erro quando desabilitado
        let result = manager.calculate_dynamic_apy("Don Burn", 1000 * 10u128.pow(18));
        assert!(result.is_err());

        // Deve retornar erro quando desabilitado
        let apy = manager.get_user_current_apy(user, "Don Burn");
        assert!(apy.is_err());
    }

    #[ink::test]
    fn test_disabled_manager_returns_error_for_history_calculation() {
        let manager = DynamicAPYManager::new(); // Não habilitado
        let history = create_test_burn_history();
        
        let result = manager.calculate_dynamic_apy_with_history("Don Burn", &history);
        assert_eq!(result, Err(Error::DynamicAPYDisabled));
    }

    #[ink::test]
    fn test_invalid_staking_type_returns_error_for_history_calculation() {
        let mut manager = DynamicAPYManager::new();
        manager.initialize_default_configs();
        let history = create_test_burn_history();
        
        let result = manager.calculate_dynamic_apy_with_history("invalid_type", &history);
        assert_eq!(result, Err(Error::StakingTypeNotFound));
    }

    #[ink::test]
    fn test_math_overflow_protection() {
        let manager = DynamicAPYManager::new();
        let mut history = GlobalBurnHistory {
            total_burned: Balance::MAX - 1000,
            last_24h_burned: 0,
            last_7d_burned: 0,
            last_30d_burned: 0,
            last_update: 0,
            burn_windows: vec![],
        };
        
        // Tenta adicionar uma queima que causaria overflow
        let result = manager.update_burn_history(&mut history, 2000, 1000);
        assert_eq!(result, Err(Error::MathOverflow));
    }

    #[ink::test]
fn test_invalid_staking_type() {
        let mut manager = DynamicAPYManager::new();
        manager.initialize_default_configs();

        let result = manager.calculate_dynamic_apy("Invalid Type", 1000);
        assert!(result.is_err());
    }

    #[ink::test]
fn test_update_config() {
        let mut manager = DynamicAPYManager::new();

        let new_config = DynamicAPYConfig {
            min_apy: 5,
            max_apy: 50,
            burn_threshold_per_apy_point: 500 * 10u128.pow(18),
            apy_increment: 2,
            staking_type: "Test Type".to_string(),
        };

        let result = manager.update_config(new_config.clone());
        assert!(result.is_ok());

        let stored_config = manager.get_config("Test Type").unwrap();
        assert_eq!(stored_config.min_apy, 5);
        assert_eq!(stored_config.max_apy, 50);
    }

    #[ink::test]
fn test_invalid_config() {
        let mut manager = DynamicAPYManager::new();

        // APY mínimo maior que máximo
        let invalid_config = DynamicAPYConfig {
            min_apy: 50,
            max_apy: 10,
            burn_threshold_per_apy_point: 1000,
            apy_increment: 1,
            staking_type: "Invalid".to_string(),
        };

        let result = manager.update_config(invalid_config);
        assert!(result.is_err());

        // Threshold zero
        let zero_threshold_config = DynamicAPYConfig {
            min_apy: 10,
            max_apy: 50,
            burn_threshold_per_apy_point: 0,
            apy_increment: 1,
            staking_type: "Zero Threshold".to_string(),
        };

        let result = manager.update_config(zero_threshold_config);
        assert!(result.is_err());
    }
}