//! Módulo de staking para o ecossistema Don Fiapo
//!
//! Este módulo implementa os três tipos de staking:
//! - Don Burn: APY 10% a 300% (dinâmico), pagamento diário
//! - Don Lunes: APY 6% a 37% (dinâmico), pagamento a cada 7 dias
//! - Don Fiapo: APY 7% a 70% (dinâmico), pagamento a cada 30 dias
//!
//! Funcionalidades:
//! - Depósito com taxas escalonadas
//! - Cálculo de recompensas baseado em APY
//! - Saque com penalidades por antecipação
//! - Cancelamento com penalidades

use scale::{Decode, Encode};
use crate::fees::calculation::{FeeCalculator, FeeCalculationResult};


use ink::prelude::string::String;

/// Tipos de staking disponíveis
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub enum StakingType {
    /// Don Burn: APY 15%, mínimo 30 dias
    DonBurn,
    /// Don Lunes: APY 12%, mínimo 60 dias
    DonLunes,
    /// Don Fiapo: APY 10%, período mínimo 90 dias
    DonFiapo,
}

impl StakingType {
    /// Converte StakingType para string
    pub fn to_string(&self) -> String {
        match self {
            StakingType::DonBurn => String::from("DonBurn"),
            StakingType::DonLunes => String::from("DonLunes"),
            StakingType::DonFiapo => String::from("DonFiapo"),
        }
    }
}

/// Status de uma posição de staking
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub enum StakingStatus {
    /// Ativo e gerando recompensas
    Active,
    /// Cancelado pelo usuário
    Cancelled,
    /// Finalizado (saque realizado)
    Completed,
}

/// Informações de uma posição de staking
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct StakingPosition {
    /// ID único da posição
    pub id: u64,
    /// Endereço do usuário
    pub user: ink::primitives::AccountId,
    /// Tipo de staking
    pub staking_type: StakingType,
    /// Quantidade depositada em $FIAPO (com 8 decimais)
    pub amount: u128,
    /// Taxa paga na entrada (em $FIAPO)
    pub entry_fee: u128,
    /// Timestamp do depósito
    pub start_time: u64,
    /// Timestamp do último cálculo de recompensas
    pub last_reward_time: u64,
    /// Recompensas acumuladas (em $FIAPO)
    pub accumulated_rewards: u128,
    /// Status da posição
    pub status: StakingStatus,
}

/// Configuração de um tipo de staking
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct StakingConfig {
    /// APY em basis points (1000 = 10%)
    pub apy_bps: u16,
    /// Período mínimo em dias
    pub min_period_days: u32,
    /// Penalidade por saque antecipado em basis points
    pub early_withdrawal_penalty_bps: u16,
    /// Penalidade por cancelamento em basis points
    pub cancellation_penalty_bps: u16,
    /// Frequência de pagamento em dias (7 para semanal, 14 para quinzenal, 30 para mensal)
    pub payment_frequency_days: u32,
}

/// Resultado do cálculo de recompensas
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct RewardCalculation {
    /// Recompensas calculadas (em $FIAPO)
    pub rewards: u128,
    /// Dias desde o último cálculo
    pub days_elapsed: u32,
    /// APY efetivo aplicado
    pub effective_apy_bps: u16,
}

/// Resultado de uma operação de saque
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct WithdrawalResult {
    /// Valor principal a ser devolvido
    pub principal_amount: u128,
    /// Recompensas a serem pagas
    pub rewards_amount: u128,
    /// Penalidade aplicada
    pub penalty_amount: u128,
    /// Taxa sobre juros (1%)
    pub interest_fee: u128,
    /// Parte para carteira do projeto (0.5%)
    pub project_share: u128,
    /// Parte para fundo top 12 (0.5%)
    pub fund_share: u128,
    /// Valor líquido a receber
    pub net_amount: u128,
    /// Se foi saque antecipado
    pub is_early_withdrawal: bool,
}

/// Gerenciador de staking
#[derive(Debug, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct StakingManager {
    /// Configurações por tipo de staking
    configs: [StakingConfig; 3],
    /// Calculadora de taxas
    fee_calculator: FeeCalculator,
    /// Próximo ID de posição
    next_position_id: u64,
}

impl Default for StakingManager {
    fn default() -> Self {
        Self::new()
    }
}

impl StakingManager {
    /// Cria um novo gerenciador com configurações padrão
    pub fn new() -> Self {
        Self {
            configs: [
                // Don Burn: APY base 10% (dinâmico), mínimo 30 dias, pagamento diário
                StakingConfig {
                    apy_bps: 1000, // 10%
                    min_period_days: 30,
                    early_withdrawal_penalty_bps: 1000, // 10%
                    cancellation_penalty_bps: 2000, // 20%
                    payment_frequency_days: 1,
                },
                // Don Lunes: APY base 6% (dinâmico), mínimo 60 dias, pagamento semanal
                StakingConfig {
                    apy_bps: 600, // 6%
                    min_period_days: 60,
                    early_withdrawal_penalty_bps: 800, // 8%
                    cancellation_penalty_bps: 1500, // 15%
                    payment_frequency_days: 7,
                },
                // Don Fiapo: APY base 7% (dinâmico), mínimo 90 dias, pagamento mensal
                StakingConfig {
                    apy_bps: 700, // 7%
                    min_period_days: 90,
                    early_withdrawal_penalty_bps: 600, // 6%
                    cancellation_penalty_bps: 1000, // 10%
                    payment_frequency_days: 30,
                },
            ],
            fee_calculator: FeeCalculator::new(),
            next_position_id: 1,
        }
    }

    /// Calcula a taxa de entrada para um depósito
    pub fn calculate_entry_fee(&self, amount: u128, _staking_type: StakingType) -> FeeCalculationResult {
        self.fee_calculator.calculate_staking_entry_fee(amount)
    }

    /// Cria uma nova posição de staking
    pub fn create_position(
        &mut self,
        user: ink::primitives::AccountId,
        staking_type: StakingType,
        amount: u128,
        current_time: u64,
    ) -> Result<StakingPosition, &'static str> {
        if amount == 0 {
            return Err("Amount must be greater than zero");
        }

        // Calcula taxa de entrada
        let fee_result = self.calculate_entry_fee(amount, staking_type.clone());
        
        let position = StakingPosition {
            id: self.next_position_id,
            user,
            staking_type,
            amount,
            entry_fee: fee_result.fee_amount,
            start_time: current_time,
            last_reward_time: current_time,
            accumulated_rewards: 0,
            status: StakingStatus::Active,
        };

        self.next_position_id = self.next_position_id.saturating_add(1);
        Ok(position)
    }

    /// Calcula recompensas para uma posição
    pub fn calculate_rewards(
        &self,
        position: &StakingPosition,
        current_time: u64,
        dynamic_apy_bps: Option<u16>,
    ) -> Result<RewardCalculation, &'static str> {
        if position.status != StakingStatus::Active {
            return Err("Position is not active");
        }

        if current_time < position.last_reward_time {
            return Err("Invalid time");
        }

        let config = self.get_config(&position.staking_type)?;
        
        // Calcula dias desde último cálculo
        let seconds_elapsed = current_time.saturating_sub(position.last_reward_time);
        let days_elapsed = u32::try_from(seconds_elapsed.saturating_div(86400)).unwrap_or(0); // 86400 segundos = 1 dia
        
        if days_elapsed < config.payment_frequency_days {
            return Ok(RewardCalculation {
                rewards: 0,
                days_elapsed: 0,
                effective_apy_bps: dynamic_apy_bps.unwrap_or(config.apy_bps),
            });
        }

        // Usa APY dinâmico se fornecido, senão usa o APY fixo
        let effective_apy = dynamic_apy_bps.unwrap_or(config.apy_bps);

        // Calcula número de períodos completos
        let periods = days_elapsed / config.payment_frequency_days;
        if periods == 0 {
            return Ok(RewardCalculation {
                rewards: 0,
                days_elapsed,
                effective_apy_bps: effective_apy,
            });
        }
        // Calcula recompensas totais com operações aritméticas seguras
        let total_days = (periods as u128).checked_mul(config.payment_frequency_days as u128)
            .ok_or("Arithmetic overflow in days calculation")?;
        
        let amount_apy = position.amount.checked_mul(effective_apy as u128)
            .ok_or("Arithmetic overflow in amount * APY calculation")?;
        
        let numerator = amount_apy.checked_mul(total_days)
            .ok_or("Arithmetic overflow in numerator calculation")?;
        
        let denominator = 365u128.checked_mul(10000u128)
            .ok_or("Arithmetic overflow in denominator calculation")?;
        
        let rewards = numerator.checked_div(denominator)
            .ok_or("Division by zero or arithmetic error")?;

        Ok(RewardCalculation {
            rewards,
            days_elapsed,
            effective_apy_bps: effective_apy,
        })
    }

    /// Verifica se está na época de pagamento baseada na frequência
    pub fn is_payment_due(&self, position: &StakingPosition, current_time: u64) -> Result<bool, &'static str> {
        let config = self.get_config(&position.staking_type)?;
        
        let seconds_elapsed = current_time.saturating_sub(position.last_reward_time);
        let days_elapsed = u32::try_from(seconds_elapsed.saturating_div(86400)).unwrap_or(0);
        
        Ok(days_elapsed >= config.payment_frequency_days)
    }

    /// Calcula penalidade por saque antecipado
    pub fn calculate_early_withdrawal_penalty(
        &self,
        position: &StakingPosition,
        current_time: u64,
    ) -> Result<(u128, bool), &'static str> {
        let config = self.get_config(&position.staking_type)?;
        
        let seconds_staked = current_time.saturating_sub(position.start_time);
        let days_staked = u32::try_from(seconds_staked.saturating_div(86400)).unwrap_or(0);
        
        let is_early = days_staked < config.min_period_days;
        
        if !is_early {
            return Ok((0, false));
        }

        let penalty_amount = match position.staking_type {
            StakingType::DonBurn => {
                // Don Burn - Saque Antecipado: 10 LUSDT/USDT + 50% do capital + 80% dos juros
                let usdt_penalty = 10 * 10u128.pow(6); // 10 LUSDT (6 decimais)
                let capital_penalty = position.amount / 2; // 50% do capital
                usdt_penalty + capital_penalty
            }
            _ => {
                // Outras modalidades usam penalidade percentual
                position.amount.saturating_mul(config.early_withdrawal_penalty_bps as u128).saturating_div(10000)
            }
        };
        
        Ok((penalty_amount, true))
    }

    /// Calcula penalidade por cancelamento
    pub fn calculate_cancellation_penalty(
        &self,
        position: &StakingPosition,
    ) -> Result<u128, &'static str> {
        let config = self.get_config(&position.staking_type)?;
        
        let penalty_amount = match position.staking_type {
            StakingType::DonLunes => {
                // Don Lunes - Cancelamento: 2.5% do capital em $FIAPO
                position.amount * 25 / 1000 // 2.5%
            }
            _ => {
                // Outras modalidades usam penalidade percentual da configuração
                position.amount.saturating_mul(config.cancellation_penalty_bps as u128).saturating_div(10000)
            }
        };
        
        Ok(penalty_amount)
    }

    /// Atualiza recompensas de uma posição
    pub fn update_rewards(
        &self,
        position: &mut StakingPosition,
        current_time: u64,
        dynamic_apy_bps: Option<u16>,
    ) -> Result<u128, &'static str> {
        let calculation = self.calculate_rewards(position, current_time, dynamic_apy_bps)?;
        
        position.accumulated_rewards = position.accumulated_rewards.saturating_add(calculation.rewards);
        position.last_reward_time = current_time;
        
        Ok(calculation.rewards)
    }

    /// Calcula resultado de saque
    pub fn calculate_withdrawal(
        &self,
        position: &StakingPosition,
        current_time: u64,
        dynamic_apy_bps: Option<u16>,
    ) -> Result<WithdrawalResult, &'static str> {
        if position.status != StakingStatus::Active {
            return Err("Position is not active");
        }

        let config = self.get_config(&position.staking_type)?;
        
        // Calcula recompensas atualizadas
        let reward_calc = self.calculate_rewards(position, current_time, dynamic_apy_bps)?;
        let total_rewards = position.accumulated_rewards.saturating_add(reward_calc.rewards);
        
        // Verifica se é saque antecipado
        let days_staked = current_time.saturating_sub(position.start_time).saturating_div(86400);
        let is_early = days_staked < config.min_period_days as u64;
        
        let penalty_amount = if is_early {
            if let StakingType::DonBurn = position.staking_type {
                // Don Burn - Saque Antecipado: 10 LUSDT/USDT + 50% do capital + 80% dos juros
                let usdt_penalty = 10 * 10u128.pow(6); // 10 LUSDT (6 decimais)
                let capital_penalty = position.amount / 2; // 50% do capital
                let interest_penalty = total_rewards * 80 / 100; // 80% dos juros
                usdt_penalty + capital_penalty + interest_penalty
            } else {
                // Outras modalidades mantêm penalidade percentual
                total_rewards.saturating_mul(config.early_withdrawal_penalty_bps as u128).saturating_div(10000)
            }
        } else {
            0
        };

        let net_rewards_after_penalty = total_rewards.saturating_sub(penalty_amount);
        let interest_fee = net_rewards_after_penalty / 100; // 1%
        let project_share = interest_fee / 2; // 0.5%
        let fund_share = interest_fee / 2; // 0.5%
        let net_rewards = net_rewards_after_penalty.saturating_sub(interest_fee);
        let net_amount = position.amount.saturating_add(net_rewards);

        Ok(WithdrawalResult {
            principal_amount: position.amount,
            rewards_amount: net_rewards,
            penalty_amount,
            interest_fee,
            project_share,
            fund_share,
            net_amount,
            is_early_withdrawal: is_early,
        })
    }

    /// Calcula resultado de cancelamento
    pub fn calculate_cancellation(
        &self,
        position: &StakingPosition,
    ) -> Result<WithdrawalResult, &'static str> {
        if position.status != StakingStatus::Active {
            return Err("Position is not active");
        }

        let config = self.get_config(&position.staking_type)?;
        
        let penalty_amount = if let StakingType::DonLunes = position.staking_type {
            // Don Lunes - Cancelamento: 2.5% do capital em $FIAPO
            position.amount * 25 / 1000 // 2.5%
        } else {
            // Outras modalidades usam penalidade percentual da configuração
            position.amount.saturating_mul(config.cancellation_penalty_bps as u128).saturating_div(10000)
        };
        let net_amount = position.amount.saturating_sub(penalty_amount);

        Ok(WithdrawalResult {
            principal_amount: position.amount,
            rewards_amount: 0,
            penalty_amount,
            interest_fee: 0,
            project_share: 0,
            fund_share: 0,
            net_amount,
            is_early_withdrawal: true,
        })
    }

    /// Obtém configuração por tipo de staking
    pub fn get_config(&self, staking_type: &StakingType) -> Result<&StakingConfig, &'static str> {
        match staking_type {
            StakingType::DonBurn => Ok(&self.configs[0]),
            StakingType::DonLunes => Ok(&self.configs[1]),
            StakingType::DonFiapo => Ok(&self.configs[2]),
        }
    }

    /// Obtém todas as configurações
    pub fn get_all_configs(&self) -> &[StakingConfig; 3] {
        &self.configs
    }

    /// Obtém próximo ID de posição
    pub fn get_next_position_id(&self) -> u64 {
        self.next_position_id
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use ink::primitives::AccountId;

    fn get_test_account() -> AccountId {
        AccountId::from([0x01; 32])
    }

    #[ink::test]
    fn staking_manager_creation_works() {
        let manager = StakingManager::new();
        let configs = manager.get_all_configs();
        
        // Verifica configurações do Don Burn
        assert_eq!(configs[0].apy_bps, 1000); // 10%
        assert_eq!(configs[0].min_period_days, 30);
        assert_eq!(configs[0].payment_frequency_days, 1);
        
        // Verifica configurações do Don Lunes
        assert_eq!(configs[1].apy_bps, 600); // 6%
        assert_eq!(configs[1].min_period_days, 60);
        assert_eq!(configs[1].payment_frequency_days, 7);

        // Verifica configurações do Don Fiapo
        assert_eq!(configs[2].apy_bps, 700); // 7%
        assert_eq!(configs[2].min_period_days, 90);
        assert_eq!(configs[2].payment_frequency_days, 30);
        
        // Verifica ID inicial
        assert_eq!(manager.get_next_position_id(), 1);
    }

    #[ink::test]
fn create_position_works() {
        let mut manager = StakingManager::new();
        let user = get_test_account();
        let amount = 1000 * 10u128.pow(8); // 1000 FIAPO
        let current_time = 1000000;
        
        let position = manager.create_position(
            user,
            StakingType::DonBurn,
            amount,
            current_time,
        ).unwrap();
        
        assert_eq!(position.id, 1);
        assert_eq!(position.user, user);
        assert_eq!(position.staking_type, StakingType::DonBurn);
        assert_eq!(position.amount, amount);
        assert_eq!(position.start_time, current_time);
        assert_eq!(position.last_reward_time, current_time);
        assert_eq!(position.accumulated_rewards, 0);
        assert_eq!(position.status, StakingStatus::Active);
        
        // Verifica se taxa foi calculada (primeira faixa = 2%)
        // Taxa é em LUSDT (6 decimais): 2% de 1000 = 20 LUSDT = 20 * 10^6
        let one_lusdt = 10u128.pow(6);
        assert_eq!(position.entry_fee, 20 * one_lusdt); // 2% de 1000 FIAPO = 20 LUSDT
        
        // Verifica incremento do ID
        assert_eq!(manager.get_next_position_id(), 2);
    }

    #[ink::test]
fn create_position_zero_amount_fails() {
        let mut manager = StakingManager::new();
        let user = get_test_account();
        
        let result = manager.create_position(
            user,
            StakingType::DonBurn,
            0,
            1000000,
        );
        
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Amount must be greater than zero");
    }

    #[ink::test]
fn calculate_rewards_works() {
        let manager = StakingManager::new();
        let user = get_test_account();
        let amount = 1000 * 10u128.pow(8); // 1000 FIAPO
        let start_time = 1000000;
        
        let position = StakingPosition {
            id: 1,
            user,
            staking_type: StakingType::DonBurn, // 10% APY
            amount,
            entry_fee: 0,
            start_time,
            last_reward_time: start_time,
            accumulated_rewards: 0,
            status: StakingStatus::Active,
        };
        
        // Simula 35 dias (35 * 86400 segundos)
        let current_time = start_time + (35 * 86400);
        
        let calculation = manager.calculate_rewards(&position, current_time, None).unwrap();
        
        assert_eq!(calculation.days_elapsed, 35);
        assert_eq!(calculation.effective_apy_bps, 1000); // 10%
        
        // Calcula recompensa esperada: (1000 * 1000 * 35) / (365 * 10000)
        let expected_rewards = (amount * 1000 * 35) / (365 * 10000);
        assert_eq!(calculation.rewards, expected_rewards);
    }

    #[ink::test]
fn calculate_rewards_inactive_position_fails() {
        let manager = StakingManager::new();
        let user = get_test_account();
        
        let position = StakingPosition {
            id: 1,
            user,
            staking_type: StakingType::DonBurn,
            amount: 1000 * 10u128.pow(8),
            entry_fee: 0,
            start_time: 1000000,
            last_reward_time: 1000000,
            accumulated_rewards: 0,
            status: StakingStatus::Cancelled, // Posição inativa
        };
        
        let result = manager.calculate_rewards(&position, 1100000, None);
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Position is not active");
    }

    #[ink::test]
    fn update_rewards_works() {
        let manager = StakingManager::new();
        let user = get_test_account();
        let amount = 1000 * 10u128.pow(8);
        let start_time = 1000000;
        
        let mut position = StakingPosition {
            id: 1,
            user,
            staking_type: StakingType::DonFiapo, // 7% APY
            amount,
            entry_fee: 0,
            start_time,
            last_reward_time: start_time,
            accumulated_rewards: 0,
            status: StakingStatus::Active,
        };
        
        // Simula 30 dias
        let current_time = start_time + (30 * 86400);
        
        let new_rewards = manager.update_rewards(&mut position, current_time, None).unwrap();
        
        // Verifica se recompensas foram acumuladas
        assert_eq!(position.accumulated_rewards, new_rewards);
        assert_eq!(position.last_reward_time, current_time);
        
        // Calcula recompensa esperada: (1000 * 700 * 30) / (365 * 10000)
        let expected_rewards = (amount * 700 * 30) / (365 * 10000);
        assert_eq!(new_rewards, expected_rewards);
    }

    #[ink::test]
fn calculate_withdrawal_normal_works() {
        let manager = StakingManager::new();
        let user = get_test_account();
        let amount = 1000 * 10u128.pow(8);
        let start_time = 1000000;
        
        let position = StakingPosition {
            id: 1,
            user,
            staking_type: StakingType::DonBurn, // 30 dias mínimo
            amount,
            entry_fee: 0,
            start_time,
            last_reward_time: start_time,
            accumulated_rewards: 50 * 10u128.pow(8), // 50 FIAPO acumulados
            status: StakingStatus::Active,
        };
        
        // Simula 35 dias (após período mínimo)
        let current_time = start_time + (35 * 86400);
        
        let result = manager.calculate_withdrawal(&position, current_time, None).unwrap();
        
        assert_eq!(result.principal_amount, amount);
        assert_eq!(result.penalty_amount, 0); // Sem penalidade
        assert!(!result.is_early_withdrawal);
        assert_eq!(result.net_amount, result.principal_amount + result.rewards_amount);
    }

    #[ink::test]
fn calculate_withdrawal_early_works() {
        let manager = StakingManager::new();
        let user = get_test_account();
        let amount = 1000 * 10u128.pow(8);
        let start_time = 1000000;
        
        let position = StakingPosition {
            id: 1,
            user,
            staking_type: StakingType::DonBurn, // 30 dias mínimo, penalidade 10%
            amount,
            entry_fee: 0,
            start_time,
            last_reward_time: start_time,
            accumulated_rewards: 50 * 10u128.pow(8), // 50 FIAPO acumulados
            status: StakingStatus::Active,
        };
        
        // Simula 15 dias (antes do período mínimo)
        let current_time = start_time + (15 * 86400);
        
        let additional_rewards = manager.calculate_rewards(&position, current_time, None).unwrap().rewards;
        let total_rewards = position.accumulated_rewards + additional_rewards;
        let result = manager.calculate_withdrawal(&position, current_time, None).unwrap();
        assert_eq!(result.principal_amount, amount);
        assert!(result.penalty_amount > 0);
        assert!(result.is_early_withdrawal);
        let usdt_penalty = 10 * 10u128.pow(6);
        let converted_usdt_penalty = usdt_penalty;
        let capital_penalty = amount / 2;
        let interest_penalty = total_rewards * 80 / 100;
        let expected_penalty = converted_usdt_penalty + capital_penalty + interest_penalty;
        assert_eq!(result.penalty_amount, expected_penalty);
        assert_eq!(result.rewards_amount, total_rewards.saturating_sub(expected_penalty));
    }

    #[ink::test]
fn calculate_cancellation_works() {
        let manager = StakingManager::new();
        let user = get_test_account();
        let amount = 1000 * 10u128.pow(8);
        
        let position = StakingPosition {
            id: 1,
            user,
            staking_type: StakingType::DonBurn, // Penalidade cancelamento 20%
            amount,
            entry_fee: 0,
            start_time: 1000000,
            last_reward_time: 1000000,
            accumulated_rewards: 50 * 10u128.pow(8), // 50 FIAPO acumulados
            status: StakingStatus::Active,
        };
        
        let result = manager.calculate_cancellation(&position).unwrap();
        
        assert_eq!(result.principal_amount, amount);
        assert_eq!(result.rewards_amount, 0); // Perde todas as recompensas
        assert_eq!(result.penalty_amount, amount * 2000 / 10000); // 20% do principal
        assert_eq!(result.net_amount, amount - result.penalty_amount);
        assert!(result.is_early_withdrawal);
    }

    #[ink::test]
fn get_config_works() {
    let manager = StakingManager::new();
    
    let don_burn_config = manager.get_config(&StakingType::DonBurn).unwrap();
    assert_eq!(don_burn_config.apy_bps, 1000);
    
    let don_lunes_config = manager.get_config(&StakingType::DonLunes).unwrap();
    assert_eq!(don_lunes_config.apy_bps, 600);
    
    let don_fiapo_config = manager.get_config(&StakingType::DonFiapo).unwrap();
    assert_eq!(don_fiapo_config.apy_bps, 700);
}

#[ink::test]
fn calculate_don_burn_early_withdrawal_specific_penalty() {
    let manager = StakingManager::new();
    let user = get_test_account();
    let amount = 1000 * 10u128.pow(8); // 1000 FIAPO
    let start_time = 1000000;
    let current_time = start_time + (15 * 86400); // 15 dias
    let accumulated_rewards = 50 * 10u128.pow(8); // 50 FIAPO de juros
    let position = StakingPosition {
        id: 1,
        user,
        staking_type: StakingType::DonBurn,
        amount,
        entry_fee: 0,
        start_time,
        last_reward_time: start_time,
        accumulated_rewards,
        status: StakingStatus::Active,
    };
    let additional_rewards = manager.calculate_rewards(&position, current_time, None).unwrap().rewards;
    let total_rewards = accumulated_rewards + additional_rewards;
    let result = manager.calculate_withdrawal(&position, current_time, None).unwrap();
    let usdt_penalty = 10 * 10u128.pow(6);
    let converted_usdt_penalty = usdt_penalty; // Assumir 1:1 para teste
    let capital_penalty = amount / 2;
    let interest_penalty = total_rewards * 80 / 100;
    let expected_penalty = converted_usdt_penalty + capital_penalty + interest_penalty;
    assert_eq!(result.penalty_amount, expected_penalty);
}

#[ink::test]
fn calculate_don_lunes_cancellation_specific_penalty() {
    let manager = StakingManager::new();
    let user = get_test_account();
    let amount = 1000 * 10u128.pow(8); // 1000 FIAPO
    let position = StakingPosition {
        id: 1,
        user,
        staking_type: StakingType::DonLunes,
        amount,
        entry_fee: 0,
        start_time: 1000000,
        last_reward_time: 1000000,
        accumulated_rewards: 0,
        status: StakingStatus::Active,
    };
    let result = manager.calculate_cancellation(&position).unwrap();
    let expected_penalty = amount * 25 / 1000; // 2.5% do capital
    assert_eq!(result.penalty_amount, expected_penalty);
}

#[ink::test]
fn calculate_interest_withdrawal_fee_works() {
    let manager = StakingManager::new();
    let user = get_test_account();
    let amount = 1000 * 10u128.pow(8);
    let start_time = 1000000;
    let current_time = start_time + (35 * 86400); // Após período mínimo
    let accumulated_rewards = 50 * 10u128.pow(8);
    let position = StakingPosition {
        id: 1,
        user,
        staking_type: StakingType::DonBurn,
        amount,
        entry_fee: 0,
        start_time,
        last_reward_time: start_time,
        accumulated_rewards,
        status: StakingStatus::Active,
    };
    let additional_rewards = manager.calculate_rewards(&position, current_time, None).unwrap().rewards;
    let total_rewards = accumulated_rewards + additional_rewards;
    let result = manager.calculate_withdrawal(&position, current_time, None).unwrap();
    let expected_fee = total_rewards / 100; // 1%
    let expected_project_share = expected_fee / 2; // 0.5%
    let expected_fund_share = expected_fee / 2; // 0.5%
    let expected_net_rewards = total_rewards - expected_fee;
    assert_eq!(result.interest_fee, expected_fee);
    assert_eq!(result.project_share, expected_project_share);
    assert_eq!(result.fund_share, expected_fund_share);
    assert_eq!(result.rewards_amount, expected_net_rewards);
}

#[ink::test]
fn calculate_rewards_respects_payment_frequency() {
    let manager = StakingManager::new();
    let user = get_test_account();
    let amount = 1000 * 10u128.pow(8);
    let start_time = 1000000;

    // Teste para Don Burn (diário)
    let position_burn = StakingPosition {
        id: 1,
        user,
        staking_type: StakingType::DonBurn,
        amount,
        entry_fee: 0,
        start_time,
        last_reward_time: start_time,
        accumulated_rewards: 0,
        status: StakingStatus::Active,
    };
    let time_after_6_days = start_time + (6 * 86400);
    let rewards_6_days = manager.calculate_rewards(&position_burn, time_after_6_days, None).unwrap().rewards;
    assert!(rewards_6_days > 0); // Deve acumular após 1 dia (diário)
    let time_after_1_day = start_time + (1 * 86400);
    let rewards_1_day = manager.calculate_rewards(&position_burn, time_after_1_day, None).unwrap().rewards;
    assert!(rewards_1_day > 0); // Deve acumular após 1 dia

    // Teste para Don Lunes (semanal)
    let position_lunes = StakingPosition {
        id: 2,
        user,
        staking_type: StakingType::DonLunes,
        amount,
        entry_fee: 0,
        start_time,
        last_reward_time: start_time,
        accumulated_rewards: 0,
        status: StakingStatus::Active,
    };
    let time_after_6_days_lunes = start_time + (6 * 86400);
    let rewards_6_days_lunes = manager.calculate_rewards(&position_lunes, time_after_6_days_lunes, None).unwrap().rewards;
    assert_eq!(rewards_6_days_lunes, 0); // Não deve acumular antes de 7 dias
    let time_after_7_days = start_time + (7 * 86400);
    let rewards_7_days = manager.calculate_rewards(&position_lunes, time_after_7_days, None).unwrap().rewards;
    assert!(rewards_7_days > 0); // Deve acumular após 7 dias

    // Teste para Don Fiapo (mensal)
    let position_fiapo = StakingPosition {
        id: 3,
        user,
        staking_type: StakingType::DonFiapo,
        amount,
        entry_fee: 0,
        start_time,
        last_reward_time: start_time,
        accumulated_rewards: 0,
        status: StakingStatus::Active,
    };
    let time_after_29_days = start_time + (29 * 86400);
    let rewards_29_days = manager.calculate_rewards(&position_fiapo, time_after_29_days, None).unwrap().rewards;
    assert_eq!(rewards_29_days, 0); // Não deve acumular antes de 30 dias
    let time_after_30_days = start_time + (30 * 86400);
    let rewards_30_days = manager.calculate_rewards(&position_fiapo, time_after_30_days, None).unwrap().rewards;
    assert!(rewards_30_days > 0); // Deve acumular após 30 dias
}
}