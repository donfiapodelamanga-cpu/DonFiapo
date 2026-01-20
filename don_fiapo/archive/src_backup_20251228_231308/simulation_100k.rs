//! Simulação de 100.000 usuários para o contrato Don Fiapo
//! 
//! Este módulo implementa uma simulação completa do comportamento
//! do sistema com 100k usuários ativos, calculando:
//! - Oportunidades de ganhos por perfil
//! - Eficiência do sistema de staking
//! - Impacto da deflação
//! - Performance técnica

use ink::prelude::vec::Vec;
use ink::prelude::string::String;
use ink::prelude::format;

/// Perfis de usuários na simulação
#[derive(Debug, Clone)]
pub enum UserProfile {
    Whale,
    LargeInvestor,
    MediumInvestor,
    SmallInvestor,
    ActiveTrader,
    CasualUser,
}

/// Dados de um usuário na simulação
#[derive(Debug, Clone)]
pub struct SimulationUser {
    pub profile: UserProfile,
    pub holdings: u128,
    pub daily_transactions: u32,
    pub avg_transaction_amount: u128,
    pub staking_amount: u128,
    pub lunes_staking: u128,
    pub burn_staking_daily: u128,
}

/// Resultados da simulação para um usuário
#[derive(Debug, Clone)]
pub struct UserResults {
    pub profile: UserProfile,
    pub annual_staking_rewards: u128,
    pub annual_ranking_rewards: u128,
    pub annual_burn_rewards: u128,
    pub annual_affiliate_rewards: u128,
    pub annual_trading_gains: u128,
    pub total_annual_gains: u128,
    pub roi_percentage: u32,
}

/// Métricas globais da simulação
#[derive(Debug, Clone)]
pub struct GlobalMetrics {
    pub total_users: u32,
    pub total_daily_transactions: u32,
    pub total_daily_volume: u128,
    pub total_daily_fees: u128,
    pub total_daily_burn: u128,
    pub annual_burn_percentage: u32,
    pub system_sustainability_score: u32,
}

/// Simulador principal
pub struct DonFiapoSimulator {
    pub users: Vec<SimulationUser>,
    pub total_supply: u128,
    pub daily_reward_pool: u128,
    pub current_day: u32,
}

impl DonFiapoSimulator {
    /// Cria uma nova instância do simulador
    pub fn new() -> Self {
        Self {
            users: Vec::new(),
            total_supply: 30_000_000_000_000_000_000u128, // 300 bilhões FIAPO
            daily_reward_pool: 68_493_150_684_931u128, // ~25B FIAPO/ano ÷ 365
            current_day: 0,
        }
    }

    /// Inicializa a simulação com 100k usuários
    pub fn initialize_users(&mut self) {
        // Whales (100 usuários)
        for _ in 0..100 {
            self.users.push(SimulationUser {
                profile: UserProfile::Whale,
                holdings: 1_000_000_000_000_000_000u128, // 1B FIAPO
                daily_transactions: 10,
                avg_transaction_amount: 10_000_000_000_000_000u128, // 10M FIAPO
                staking_amount: 500_000_000_000_000_000u128, // 500M FIAPO
                lunes_staking: 10_000_000_000u128, // 10K LUNES (em wei)
                burn_staking_daily: 100_000_000_000_000_000u128, // 100M FIAPO
            });
        }

        // Grandes Investidores (900 usuários)
        for _ in 0..900 {
            self.users.push(SimulationUser {
                profile: UserProfile::LargeInvestor,
                holdings: 100_000_000_000_000_000u128, // 100M FIAPO
                daily_transactions: 5,
                avg_transaction_amount: 5_000_000_000_000_000u128, // 5M FIAPO
                staking_amount: 50_000_000_000_000_000u128, // 50M FIAPO
                lunes_staking: 1_000_000_000u128, // 1K LUNES
                burn_staking_daily: 10_000_000_000_000_000u128, // 10M FIAPO
            });
        }

        // Investidores Médios (9.000 usuários)
        for _ in 0..9_000 {
            self.users.push(SimulationUser {
                profile: UserProfile::MediumInvestor,
                holdings: 10_000_000_000_000_000u128, // 10M FIAPO
                daily_transactions: 3,
                avg_transaction_amount: 1_000_000_000_000_000u128, // 1M FIAPO
                staking_amount: 5_000_000_000_000_000u128, // 5M FIAPO
                lunes_staking: 100_000_000u128, // 100 LUNES
                burn_staking_daily: 1_000_000_000_000_000u128, // 1M FIAPO
            });
        }

        // Pequenos Investidores (30.000 usuários)
        for _ in 0..30_000 {
            self.users.push(SimulationUser {
                profile: UserProfile::SmallInvestor,
                holdings: 1_000_000_000_000_000u128, // 1M FIAPO
                daily_transactions: 2,
                avg_transaction_amount: 100_000_000_000_000u128, // 100K FIAPO
                staking_amount: 500_000_000_000_000u128, // 500K FIAPO
                lunes_staking: 0,
                burn_staking_daily: 0,
            });
        }

        // Traders Ativos (10.000 usuários)
        for _ in 0..10_000 {
            self.users.push(SimulationUser {
                profile: UserProfile::ActiveTrader,
                holdings: 5_000_000_000_000_000u128, // 5M FIAPO
                daily_transactions: 20,
                avg_transaction_amount: 500_000_000_000_000u128, // 500K FIAPO
                staking_amount: 2_000_000_000_000_000u128, // 2M FIAPO
                lunes_staking: 0,
                burn_staking_daily: 0,
            });
        }

        // Usuários Casuais (50.000 usuários)
        for _ in 0..50_000 {
            self.users.push(SimulationUser {
                profile: UserProfile::CasualUser,
                holdings: 100_000_000_000_000u128, // 100K FIAPO
                daily_transactions: 0, // 0.5 tx/dia = 1 tx a cada 2 dias
                avg_transaction_amount: 50_000_000_000_000u128, // 50K FIAPO
                staking_amount: 50_000_000_000_000u128, // 50K FIAPO
                lunes_staking: 0,
                burn_staking_daily: 0,
            });
        }
    }

    /// Calcula APY dinâmico baseado no perfil e volume de staking
    pub fn calculate_dynamic_apy(&self, profile: &UserProfile, staking_amount: u128) -> u32 {
        match profile {
            UserProfile::Whale => {
                if staking_amount >= 500_000_000_000_000_000u128 { 1500 } // 15%
                else { 1200 } // 12%
            },
            UserProfile::LargeInvestor => {
                if staking_amount >= 50_000_000_000_000_000u128 { 1200 } // 12%
                else { 1000 } // 10%
            },
            UserProfile::MediumInvestor => 1000, // 10%
            UserProfile::SmallInvestor => 800,   // 8%
            UserProfile::ActiveTrader => 600,    // 6%
            UserProfile::CasualUser => 800,      // 8%
        }
    }

    /// Calcula recompensas de staking FIAPO
    pub fn calculate_fiapo_staking_rewards(&self, user: &SimulationUser) -> u128 {
        let apy_bps = self.calculate_dynamic_apy(&user.profile, user.staking_amount);
        (user.staking_amount * apy_bps as u128) / 10_000 // Anual
    }

    /// Calcula recompensas de staking LUNES
    pub fn calculate_lunes_staking_rewards(&self, user: &SimulationUser) -> u128 {
        if user.lunes_staking == 0 {
            return 0;
        }
        
        let apy_bps = match user.profile {
            UserProfile::Whale => 1500,        // 15%
            UserProfile::LargeInvestor => 1200, // 12%
            UserProfile::MediumInvestor => 1000, // 10%
            _ => 800, // 8%
        };
        
        // Conversão: 1 LUNES = 100 FIAPO (exemplo)
        let fiapo_equivalent = user.lunes_staking * 100;
        (fiapo_equivalent * apy_bps as u128) / 10_000
    }

    /// Calcula recompensas do sistema de ranking
    pub fn calculate_ranking_rewards(&self, user: &SimulationUser) -> u128 {
        let monthly_pool = self.daily_reward_pool * 30 / 6; // ~500M FIAPO/mês
        
        let monthly_reward = match user.profile {
            UserProfile::Whale => monthly_pool * 30 / 100 / 10, // Top 10: 30% do pool
            UserProfile::LargeInvestor => monthly_pool * 25 / 100 / 90, // Top 100: 25% do pool
            UserProfile::MediumInvestor => monthly_pool * 25 / 100 / 900, // Top 1K: 25% do pool
            UserProfile::SmallInvestor => monthly_pool * 15 / 100 / 9_000, // Top 10K: 15% do pool
            _ => monthly_pool * 5 / 100 / 90_000, // Demais: 5% do pool
        };
        
        monthly_reward * 12 // Anual
    }

    /// Calcula recompensas do Don Burn staking
    pub fn calculate_burn_rewards(&self, user: &SimulationUser) -> u128 {
        if user.burn_staking_daily == 0 {
            return 0;
        }
        
        let annual_burn = user.burn_staking_daily * 365;
        let apy_bps = match user.profile {
            UserProfile::Whale => 2000,        // 20%
            UserProfile::LargeInvestor => 1500, // 15%
            UserProfile::MediumInvestor => 1200, // 12%
            _ => 1000, // 10%
        };
        
        (annual_burn * apy_bps as u128) / 10_000
    }

    /// Calcula recompensas de afiliados
    pub fn calculate_affiliate_rewards(&self, user: &SimulationUser) -> u128 {
        let referrals = match user.profile {
            UserProfile::Whale => 20,
            UserProfile::LargeInvestor => 15,
            UserProfile::MediumInvestor => 10,
            UserProfile::SmallInvestor => 5,
            UserProfile::ActiveTrader => 10,
            UserProfile::CasualUser => 2,
        };
        
        let avg_monthly_volume = 1_000_000_000_000_000u128; // 1M FIAPO por referido
        let commission_rate = 200; // 2% em bps
        
        (avg_monthly_volume * referrals as u128 * commission_rate as u128 * 12) / 10_000
    }

    /// Calcula ganhos potenciais de trading
    pub fn calculate_trading_gains(&self, user: &SimulationUser) -> u128 {
        match user.profile {
            UserProfile::ActiveTrader => {
                // Traders ativos: 100-250% ROI anual
                let base_roi = 1500; // 150% médio
                (user.holdings * base_roi as u128) / 10_000
            },
            UserProfile::Whale | UserProfile::LargeInvestor => {
                // Grandes investidores: trading ocasional
                let base_roi = 200; // 20%
                (user.holdings * base_roi as u128) / 10_000
            },
            _ => 0, // Outros perfis não fazem trading ativo
        }
    }

    /// Executa simulação completa para um usuário
    pub fn simulate_user(&self, user: &SimulationUser) -> UserResults {
        let staking_rewards = self.calculate_fiapo_staking_rewards(user) + 
                             self.calculate_lunes_staking_rewards(user);
        let ranking_rewards = self.calculate_ranking_rewards(user);
        let burn_rewards = self.calculate_burn_rewards(user);
        let affiliate_rewards = self.calculate_affiliate_rewards(user);
        let trading_gains = self.calculate_trading_gains(user);
        
        let total_gains = staking_rewards + ranking_rewards + burn_rewards + 
                         affiliate_rewards + trading_gains;
        
        let roi = if user.holdings > 0 {
            ((total_gains * 10_000) / user.holdings) as u32
        } else {
            0
        };
        
        UserResults {
            profile: user.profile.clone(),
            annual_staking_rewards: staking_rewards,
            annual_ranking_rewards: ranking_rewards,
            annual_burn_rewards: burn_rewards,
            annual_affiliate_rewards: affiliate_rewards,
            annual_trading_gains: trading_gains,
            total_annual_gains: total_gains,
            roi_percentage: roi,
        }
    }

    /// Calcula métricas globais do sistema
    pub fn calculate_global_metrics(&self) -> GlobalMetrics {
        let mut total_daily_tx = 0u32;
        let mut total_daily_volume = 0u128;
        
        for user in &self.users {
            total_daily_tx += user.daily_transactions;
            total_daily_volume += user.avg_transaction_amount * user.daily_transactions as u128;
        }
        
        // Adicionar transações de usuários casuais (0.5 tx/dia)
        total_daily_tx += 25_000; // 50k usuários * 0.5
        total_daily_volume += 25_000u128 * 50_000_000_000_000u128; // 50K FIAPO médio
        
        let total_daily_fees = (total_daily_volume * 60) / 10_000; // 0.6% fee
        let total_daily_burn = (total_daily_fees * 3000) / 10_000; // 30% para queima
        
        let annual_burn_percentage = ((total_daily_burn * 365 * 10_000) / self.total_supply) as u32;
        
        // Score de sustentabilidade (0-100)
        let sustainability_score = if total_daily_fees >= self.daily_reward_pool {
            100
        } else {
            ((total_daily_fees * 100) / self.daily_reward_pool) as u32
        };
        
        GlobalMetrics {
            total_users: self.users.len() as u32,
            total_daily_transactions: total_daily_tx,
            total_daily_volume,
            total_daily_fees,
            total_daily_burn,
            annual_burn_percentage,
            system_sustainability_score: sustainability_score,
        }
    }

    /// Executa simulação completa
    pub fn run_full_simulation(&self) -> (Vec<UserResults>, GlobalMetrics) {
        let mut results = Vec::new();
        
        // Simular cada usuário
        for user in &self.users {
            results.push(self.simulate_user(user));
        }
        
        let global_metrics = self.calculate_global_metrics();
        
        (results, global_metrics)
    }

    /// Gera relatório resumido por perfil
    pub fn generate_profile_summary(&self, results: &[UserResults]) -> Vec<(UserProfile, u32, u128, u32)> {
        let mut summary = Vec::new();
        
        let profiles = [
            UserProfile::Whale,
            UserProfile::LargeInvestor,
            UserProfile::MediumInvestor,
            UserProfile::SmallInvestor,
            UserProfile::ActiveTrader,
            UserProfile::CasualUser,
        ];
        
        for profile in profiles {
            let profile_results: Vec<_> = results.iter()
                .filter(|r| matches!(&r.profile, _profile))
                .collect();
            
            if !profile_results.is_empty() {
                let count = profile_results.len() as u32;
                let avg_gains = profile_results.iter()
                    .map(|r| r.total_annual_gains)
                    .sum::<u128>() / count as u128;
                let avg_roi = profile_results.iter()
                    .map(|r| r.roi_percentage)
                    .sum::<u32>() / count;
                
                summary.push((profile, count, avg_gains, avg_roi));
            }
        }
        
        summary
    }
}

/// Função utilitária para formatar números grandes
pub fn format_large_number(num: u128) -> String {
    if num >= 1_000_000_000_000_000_000u128 {
        format!("{:.1}B FIAPO", num as f64 / 1_000_000_000_000_000_000.0)
    } else if num >= 1_000_000_000_000_000u128 {
        format!("{:.1}M FIAPO", num as f64 / 1_000_000_000_000_000.0)
    } else if num >= 1_000_000_000_000u128 {
        format!("{:.1}K FIAPO", num as f64 / 1_000_000_000_000.0)
    } else {
        format!("{} FIAPO", num)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_simulator_initialization() {
        let mut simulator = DonFiapoSimulator::new();
        simulator.initialize_users();
        
        assert_eq!(simulator.users.len(), 100_000);
        assert_eq!(simulator.total_supply, 30_000_000_000_000_000_000u128);
    }

    #[test]
    fn test_whale_simulation() {
        let simulator = DonFiapoSimulator::new();
        let whale = SimulationUser {
            profile: UserProfile::Whale,
            holdings: 1_000_000_000_000_000_000u128,
            daily_transactions: 10,
            avg_transaction_amount: 10_000_000_000_000_000u128,
            staking_amount: 500_000_000_000_000_000u128,
            lunes_staking: 10_000_000_000u128,
            burn_staking_daily: 100_000_000_000_000_000u128,
        };
        
        let result = simulator.simulate_user(&whale);
        
        // Whale deve ter ROI > 500%
        assert!(result.roi_percentage > 500);
        assert!(result.total_annual_gains > 5_000_000_000_000_000_000u128); // > 5B FIAPO
    }

    #[test]
    fn test_global_metrics() {
        let mut simulator = DonFiapoSimulator::new();
        simulator.initialize_users();
        
        let metrics = simulator.calculate_global_metrics();
        
        assert_eq!(metrics.total_users, 100_000);
        assert!(metrics.total_daily_transactions > 300_000);
        assert!(metrics.system_sustainability_score > 50);
    }

    #[test]
    fn test_format_large_number() {
        assert_eq!(format_large_number(1_000_000_000_000_000_000u128), "1.0B FIAPO");
        assert_eq!(format_large_number(500_000_000_000_000u128), "500.0K FIAPO");
    }
}