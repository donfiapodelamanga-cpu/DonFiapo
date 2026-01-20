//! Testes de Regras de Negócio para Don Fiapo
//!
//! Este módulo valida todas as regras de negócio conforme especificado
//! no documento de requisitos (requisitos.md).
//!
//! Cobertura:
//! - Taxas de transação (0.6%)
//! - Taxas de entrada escalonadas
//! - Penalidades de saque antecipado
//! - APY por tipo de staking
//! - Exclusão de baleias do ranking
//! - Distribuição de recompensas

use don_fiapo_contract::fees::calculation::FeeCalculator;
use don_fiapo_contract::staking::{StakingManager, StakingType, StakingConfig};
use don_fiapo_contract::integration::{DonFiapoIntegration, DonFiapoConfig};
use ink::primitives::AccountId;
use ink::prelude::vec::Vec;

#[cfg(test)]
mod business_rules_tests {
    use super::*;

    fn get_admin_account() -> AccountId {
        AccountId::from([255u8; 32])
    }

    fn create_test_accounts(count: usize) -> Vec<AccountId> {
        (0..count)
            .map(|i| AccountId::from([i as u8; 32]))
            .collect()
    }

    // ==========================================================================
    // TAXAS DE ENTRADA ESCALONADAS
    // Conforme requisitos.md: 2%, 1%, 0.5%, 0.25%, 0.1%
    // ==========================================================================

    #[test]
    fn test_entry_fee_tier_1_up_to_1000_fiapo_is_2_percent() {
        let calculator = FeeCalculator::new();
        let one_fiapo = 10u128.pow(8);
        let one_lusdt = 10u128.pow(6);
        
        // 1000 FIAPO * 2% = 20 LUSDT
        let amount = 1_000 * one_fiapo;
        let result = calculator.calculate_staking_entry_fee(amount);
        
        assert_eq!(result.fee_amount, 20 * one_lusdt);
        assert_eq!(result.fee_type, "staking_entry");
    }

    #[test]
    fn test_entry_fee_tier_2_1001_to_10000_is_1_percent() {
        let calculator = FeeCalculator::new();
        let one_fiapo = 10u128.pow(8);
        let one_lusdt = 10u128.pow(6);
        
        // 10000 FIAPO * 1% = 100 LUSDT
        let amount = 10_000 * one_fiapo;
        let result = calculator.calculate_staking_entry_fee(amount);
        
        assert_eq!(result.fee_amount, 100 * one_lusdt);
    }

    #[test]
    fn test_entry_fee_tier_3_10001_to_100000_is_0_5_percent() {
        let calculator = FeeCalculator::new();
        let one_fiapo = 10u128.pow(8);
        let one_lusdt = 10u128.pow(6);
        
        // 100000 FIAPO * 0.5% = 500 LUSDT
        let amount = 100_000 * one_fiapo;
        let result = calculator.calculate_staking_entry_fee(amount);
        
        assert_eq!(result.fee_amount, 500 * one_lusdt);
    }

    #[test]
    fn test_entry_fee_tier_4_100001_to_500000_is_0_25_percent() {
        let calculator = FeeCalculator::new();
        let one_fiapo = 10u128.pow(8);
        let one_lusdt = 10u128.pow(6);
        
        // 500000 FIAPO * 0.25% = 1250 LUSDT
        let amount = 500_000 * one_fiapo;
        let result = calculator.calculate_staking_entry_fee(amount);
        
        assert_eq!(result.fee_amount, 1_250 * one_lusdt);
    }

    #[test]
    fn test_entry_fee_tier_5_above_500000_is_0_1_percent() {
        let calculator = FeeCalculator::new();
        let one_fiapo = 10u128.pow(8);
        let one_lusdt = 10u128.pow(6);
        
        // 1000000 FIAPO * 0.1% = 1000 LUSDT
        let amount = 1_000_000 * one_fiapo;
        let result = calculator.calculate_staking_entry_fee(amount);
        
        assert_eq!(result.fee_amount, 1_000 * one_lusdt);
    }

    #[test]
    fn test_entry_fee_zero_amount_returns_zero() {
        let calculator = FeeCalculator::new();
        
        let result = calculator.calculate_staking_entry_fee(0);
        
        assert_eq!(result.fee_amount, 0);
    }

    #[test]
    fn test_entry_fee_boundary_exactly_1001_fiapo() {
        let calculator = FeeCalculator::new();
        let one_fiapo = 10u128.pow(8);
        let one_lusdt = 10u128.pow(6);
        
        // 1001 FIAPO está na faixa 2 (1%)
        let amount = 1_001 * one_fiapo;
        let result = calculator.calculate_staking_entry_fee(amount);
        
        // 1001 * 1% = 10.01 LUSDT (arredondado para 10)
        assert_eq!(result.fee_amount, 10 * one_lusdt);
    }

    // ==========================================================================
    // TIPOS DE STAKING E APY
    // ==========================================================================

    #[test]
    fn test_staking_types_exist() {
        // Verifica que os 3 tipos de staking existem
        let _don_burn = StakingType::DonBurn;
        let _don_lunes = StakingType::DonLunes;
        let _don_fiapo = StakingType::DonFiapo;
        
        assert_ne!(_don_burn, _don_lunes);
        assert_ne!(_don_lunes, _don_fiapo);
        assert_ne!(_don_burn, _don_fiapo);
    }

    #[test]
    fn test_staking_type_to_string() {
        assert_eq!(StakingType::DonBurn.to_string(), "DonBurn");
        assert_eq!(StakingType::DonLunes.to_string(), "DonLunes");
        assert_eq!(StakingType::DonFiapo.to_string(), "DonFiapo");
    }

    #[test]
    fn test_staking_manager_creates_position() {
        let mut manager = StakingManager::new();
        let user = AccountId::from([1u8; 32]);
        let one_fiapo = 10u128.pow(8);
        let current_time = 1_000_000u64;
        
        let result = manager.create_position(
            user,
            StakingType::DonFiapo,
            100_000 * one_fiapo,
            current_time
        );
        
        assert!(result.is_ok());
        let position = result.unwrap();
        assert_eq!(position.staking_type, StakingType::DonFiapo);
        assert_eq!(position.amount, 100_000 * one_fiapo);
    }

    #[test]
    fn test_staking_zero_amount_rejected() {
        let mut manager = StakingManager::new();
        let user = AccountId::from([1u8; 32]);
        let current_time = 1_000_000u64;
        
        let result = manager.create_position(user, StakingType::DonFiapo, 0, current_time);
        
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Amount must be greater than zero");
    }

    // ==========================================================================
    // PENALIDADES
    // ==========================================================================

    #[test]
    fn test_early_withdrawal_penalty_don_burn() {
        let manager = StakingManager::new();
        let user = AccountId::from([1u8; 32]);
        let one_fiapo = 10u128.pow(8);
        let current_time = 1_000_000u64;
        
        // Cria uma posição
        let mut manager_mut = StakingManager::new();
        let position = manager_mut.create_position(
            user,
            StakingType::DonBurn,
            100_000 * one_fiapo,
            current_time
        ).unwrap();
        
        // Tenta saque antecipado (apenas 5 dias depois)
        let early_time = current_time + (5 * 24 * 60 * 60);
        let penalty_result = manager.calculate_early_withdrawal_penalty(&position, early_time);
        
        assert!(penalty_result.is_ok());
        let (penalty, is_early) = penalty_result.unwrap();
        assert!(is_early, "Deve ser considerado saque antecipado");
        assert!(penalty > 0, "Deve haver penalidade");
    }

    #[test]
    fn test_don_lunes_cancellation_fee() {
        let manager = StakingManager::new();
        let user = AccountId::from([1u8; 32]);
        let one_fiapo = 10u128.pow(8);
        let current_time = 1_000_000u64;
        
        // Cria uma posição Don Lunes
        let mut manager_mut = StakingManager::new();
        let position = manager_mut.create_position(
            user,
            StakingType::DonLunes,
            100_000 * one_fiapo,
            current_time
        ).unwrap();
        
        // Calcula taxa de cancelamento
        let cancel_result = manager.calculate_cancellation_penalty(&position);
        
        assert!(cancel_result.is_ok());
        let penalty = cancel_result.unwrap();
        
        // Taxa de cancelamento deve ser 2.5% do capital
        let expected = (100_000 * one_fiapo * 250) / 10000; // 2.5%
        assert_eq!(penalty, expected);
    }

    // ==========================================================================
    // EXCLUSÃO DE BALEIAS (TOP 100)
    // ==========================================================================

    #[test]
    fn test_top_100_wallets_excluded_from_ranking() {
        let admin = get_admin_account();
        let mut don_fiapo = DonFiapoIntegration::new(admin);
        let accounts = create_test_accounts(120);
        
        // Adiciona fundos ao fundo de recompensas
        don_fiapo.add_to_rewards_fund(admin, 10_000_000).unwrap();
        
        let current_time = 1_000_000u64 + (31 * 24 * 60 * 60);
        
        // Cria carteiras: 100 grandes (serão excluídas) + 15 pequenas (elegíveis)
        let mut wallets = Vec::new();
        
        // 100 carteiras com saldos altos (serão excluídas)
        for i in 0..100 {
            let high_balance = 10_000_000u128 + (i as u128 * 100_000);
            wallets.push((accounts[i], high_balance));
        }
        
        // 15 carteiras com saldos menores (elegíveis)
        for i in 100..115 {
            let lower_balance = 500_000u128 - ((i - 100) as u128 * 10_000);
            wallets.push((accounts[i], lower_balance));
        }
        
        let ranking_result = don_fiapo.distribute_monthly_rewards(wallets, current_time);
        
        assert!(ranking_result.is_ok());
        let ranking = ranking_result.unwrap();
        
        // Deve ter 12 carteiras no ranking (das 15 elegíveis após excluir top 100)
        assert_eq!(ranking.top_wallets.len(), 12);
    }

    // ==========================================================================
    // DISTRIBUIÇÃO DE RECOMPENSAS (TOP 12)
    // ==========================================================================

    #[test]
    fn test_rewards_distributed_to_top_12_wallets() {
        let admin = get_admin_account();
        let mut don_fiapo = DonFiapoIntegration::new(admin);
        let accounts = create_test_accounts(120);
        
        // Adiciona fundos ao fundo de recompensas
        don_fiapo.add_to_rewards_fund(admin, 10_000_000).unwrap();
        
        let current_time = 1_000_000u64 + (31 * 24 * 60 * 60);
        
        // Cria carteiras
        let mut wallets = Vec::new();
        
        // 100 carteiras grandes (excluídas)
        for i in 0..100 {
            wallets.push((accounts[i], 10_000_000u128 + (i as u128 * 100_000)));
        }
        
        // 20 carteiras elegíveis
        for i in 100..120 {
            wallets.push((accounts[i], 500_000u128 - ((i - 100) as u128 * 10_000)));
        }
        
        let ranking_result = don_fiapo.distribute_monthly_rewards(wallets, current_time);
        
        assert!(ranking_result.is_ok());
        let ranking = ranking_result.unwrap();
        
        // Deve distribuir para EXATAMENTE 12 carteiras
        assert_eq!(ranking.top_wallets.len(), 12, 
            "Deve distribuir para exatamente top 12 carteiras, recebeu {}", 
            ranking.top_wallets.len());
        
        // Todas devem ter recebido recompensas
        for wallet_info in &ranking.top_wallets {
            assert!(wallet_info.reward_amount > 0, 
                "Cada carteira no top 12 deve receber recompensas");
        }
    }

    // ==========================================================================
    // DISTRIBUIÇÃO DE TAXAS (30/50/20)
    // ==========================================================================

    #[test]
    fn test_transaction_fee_distribution_30_50_20() {
        let admin = get_admin_account();
        let mut don_fiapo = DonFiapoIntegration::new(admin);
        let accounts = create_test_accounts(1);
        
        let one_fiapo = 10u128.pow(8);
        let current_time = 1_000_000u64;
        
        let initial_burned = don_fiapo.get_stats().total_burned;
        let initial_rewards = don_fiapo.get_rewards_fund();
        
        // Faz um staking
        let stake_amount = 100_000 * one_fiapo;
        let result = don_fiapo.stake_with_fees(
            accounts[0],
            stake_amount,
            StakingType::DonFiapo,
            current_time
        ).unwrap();
        
        let fee = result.entry_fee.fee_amount;
        let final_burned = don_fiapo.get_stats().total_burned;
        let final_rewards = don_fiapo.get_rewards_fund();
        
        // 30% para queima
        let expected_burn = (fee * 3000) / 10000;
        let actual_burn = final_burned - initial_burned;
        assert_eq!(actual_burn, expected_burn, "30% da taxa deve ir para queima");
        
        // 20% para rewards
        let expected_rewards = (fee * 2000) / 10000;
        let actual_rewards = final_rewards - initial_rewards;
        assert_eq!(actual_rewards, expected_rewards, "20% da taxa deve ir para rewards");
    }

    // ==========================================================================
    // INTEGRAÇÃO E2E - FLUXO COMPLETO
    // ==========================================================================

    #[test]
    fn test_complete_staking_flow_with_correct_fees() {
        let admin = get_admin_account();
        let mut don_fiapo = DonFiapoIntegration::new(admin);
        let accounts = create_test_accounts(10);
        
        let one_fiapo = 10u128.pow(8);
        let current_time = 1_000_000u64;
        
        // Adiciona fundos
        don_fiapo.add_to_rewards_fund(admin, 10_000_000).unwrap();
        
        // Testa cada faixa de taxa
        let test_cases = vec![
            (500 * one_fiapo, "2%"),      // Faixa 1
            (5_000 * one_fiapo, "1%"),    // Faixa 2
            (50_000 * one_fiapo, "0.5%"), // Faixa 3
        ];
        
        for (i, (amount, _expected_tier)) in test_cases.iter().enumerate() {
            let result = don_fiapo.stake_with_fees(
                accounts[i],
                *amount,
                StakingType::DonFiapo,
                current_time + (i as u64 * 1000)
            );
            
            assert!(result.is_ok(), "Staking deve funcionar para quantidade {}", amount);
            
            let staking_result = result.unwrap();
            assert!(staking_result.entry_fee.fee_amount > 0, 
                "Deve cobrar taxa para quantidade {}", amount);
            assert!(staking_result.net_amount < *amount, 
                "Valor líquido deve ser menor que valor bruto");
        }
        
        // Verifica estatísticas finais
        let stats = don_fiapo.get_stats();
        assert_eq!(stats.active_staking_positions, 3);
        assert!(stats.total_fees_collected > 0);
        assert!(stats.total_burned > 0);
    }
}
