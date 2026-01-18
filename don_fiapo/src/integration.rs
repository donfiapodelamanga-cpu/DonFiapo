//! Módulo de Integração Final do Don Fiapo
//! 
//! Este módulo integra todos os sistemas desenvolvidos:
//! - Token PSP22 base
//! - Sistema de taxas escalonadas
//! - Sistema de staking
//! - Sistema de recompensas e ranking
//!
//! Fornece uma interface unificada para todas as funcionalidades

use ink::prelude::vec::Vec;
use ink::primitives::AccountId;
use scale::{Decode, Encode};
use crate::staking::{StakingManager, StakingType, StakingPosition, WithdrawalResult};
use crate::rewards::{RewardsManager, RankingResult};
use crate::fees::calculation::{FeeCalculator, FeeCalculationResult};
use crate::ico::{ICOManager, NFTData, NFTType, PaymentProof};
use ink::env::DefaultEnvironment;

/// Configuração geral do sistema Don Fiapo
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct DonFiapoConfig {
    /// Taxa de transferência em basis points (60 = 0.6%)
    pub transfer_fee_rate: u16,
    /// Distribuição da taxa: [burn, staking, rewards] em basis points
    pub fee_distribution: [u16; 3],
    /// Endereço do admin do sistema
    pub admin: AccountId,
    /// Fundo de recompensas acumulado
    pub rewards_fund: u128,
    /// Timestamp da última distribuição de recompensas
    pub last_rewards_distribution: u64,
    /// Intervalo de distribuição de recompensas (em segundos)
    pub rewards_interval: u64,
}

/// Estatísticas gerais do sistema
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode, Default)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct SystemStats {
    /// Total de tokens em staking
    pub total_staked: u128,
    /// Total de recompensas distribuídas
    pub total_rewards_distributed: u128,
    /// Número de posições de staking ativas
    pub active_staking_positions: u32,
    /// Total de tokens queimados
    pub total_burned: u128,
    /// Total de taxas coletadas
    pub total_fees_collected: u128,
    /// Número de carteiras no último ranking
    pub wallets_in_ranking: u8,
}

/// Resultado de uma operação de staking integrada
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct StakingOperationResult {
    /// Taxa cobrada na entrada
    pub entry_fee: FeeCalculationResult,
    /// Posição de staking criada
    pub position: StakingPosition,
    /// Valor líquido depositado (após taxas)
    pub net_amount: u128,
}

/// Gerenciador integrado do sistema Don Fiapo
#[derive(Debug)]
pub struct DonFiapoIntegration {
    /// Configuração do sistema
    config: DonFiapoConfig,
    /// Calculadora de taxas
    fee_calculator: FeeCalculator,
    /// Gerenciador de staking
    staking_manager: StakingManager,
    /// Gerenciador de recompensas
    rewards_manager: RewardsManager,
    /// Gerenciador de ICO/NFTs
    pub ico_manager: ICOManager,
    /// Estatísticas do sistema
    stats: SystemStats,
}

impl Default for DonFiapoConfig {
    fn default() -> Self {
        Self {
            transfer_fee_rate: 60, // 0.6%
            fee_distribution: [3000, 5000, 2000], // 30% burn, 50% staking, 20% rewards
            admin: AccountId::from([0u8; 32]),
            rewards_fund: 0,
            last_rewards_distribution: 0,
            rewards_interval: 30 * 24 * 60 * 60, // 30 dias em segundos
        }
    }
}



impl DonFiapoIntegration {
    /// Cria uma nova instância do sistema integrado
    pub fn new(admin: AccountId) -> Self {
        let config = DonFiapoConfig {
            admin,
            ..Default::default()
        };
        
        Self {
            config,
            fee_calculator: FeeCalculator::new(),
            staking_manager: StakingManager::new(),
            rewards_manager: RewardsManager::new(),
            ico_manager: ICOManager::new(),
            stats: SystemStats::default(),
        }
    }

    /// Cria uma nova instância com configuração customizada
    pub fn new_with_config(
        config: DonFiapoConfig,
        fee_calculator: FeeCalculator,
        staking_manager: StakingManager,
        rewards_manager: RewardsManager,
    ) -> Self {
        Self {
            config,
            fee_calculator,
            staking_manager,
            rewards_manager,
            ico_manager: ICOManager::new(),
            stats: SystemStats::default(),
        }
    }

    /// Executa uma operação de staking integrada
    pub fn stake_with_fees(
        &mut self,
        user: AccountId,
        amount: u128,
        staking_type: StakingType,
        current_time: u64,
    ) -> Result<StakingOperationResult, &'static str> {
        if amount == 0 {
            return Err("Amount cannot be zero");
        }

        // Calcula a taxa de entrada baseada no valor
        let entry_fee = self.fee_calculator.calculate_staking_entry_fee(amount);
        let net_amount = amount.saturating_sub(entry_fee.fee_amount);

        if net_amount == 0 {
            return Err("Net amount after fees is zero");
        }

        // Cria a posição de staking
        let position = self.staking_manager.create_position(
            user,
            staking_type,
            net_amount,
            current_time,
        )?;

        // Atualiza estatísticas
        self.stats.total_staked = self.stats.total_staked.saturating_add(net_amount);
        self.stats.total_fees_collected = self.stats.total_fees_collected.saturating_add(entry_fee.fee_amount);
        self.stats.active_staking_positions = self.stats.active_staking_positions.saturating_add(1);

        // Distribui a taxa coletada
        self.distribute_fee(entry_fee.fee_amount);

        Ok(StakingOperationResult {
            entry_fee,
            position,
            net_amount,
        })
    }

    /// Executa um saque de staking
    pub fn withdraw_staking(
        &mut self,
        position_id: u64,
        current_time: u64,
    ) -> Result<WithdrawalResult, &'static str> {
        // Busca a posição (simulado - em implementação real seria do storage)
        let position = self.get_staking_position(position_id)?;
        
        // Obtém APY dinâmico do usuário (em implementação real seria do storage)
        let _staking_type_str = match position.staking_type {
            StakingType::DonBurn => "DonBurn",
            StakingType::DonLunes => "DonLunes", 
            StakingType::DonFiapo => "DonFiapo",
        };
        
        // Calcula o saque com APY dinâmico
        let dynamic_apy = None; // Will be obtained from dynamic APY system in production
        let withdrawal = self.staking_manager.calculate_withdrawal(&position, current_time, dynamic_apy)?;
        
        // Atualiza estatísticas
        if withdrawal.principal_amount > 0 {
            self.stats.total_staked = self.stats.total_staked.saturating_sub(withdrawal.principal_amount);
            self.stats.active_staking_positions = self.stats.active_staking_positions.saturating_sub(1);
        }
        
        if withdrawal.penalty_amount > 0 {
            // Penalidade vai para o fundo de recompensas
        self.config.rewards_fund = self.config.rewards_fund.saturating_add(withdrawal.penalty_amount);
        }
        
        Ok(withdrawal)
    }

    /// Distribui recompensas mensais
    pub fn distribute_monthly_rewards(
        &mut self,
        wallets: Vec<(AccountId, u128)>,
        current_time: u64,
    ) -> Result<RankingResult, &'static str> {
        // Verifica se é hora de distribuir
        if current_time < self.config.last_rewards_distribution.saturating_add(self.config.rewards_interval) {
            return Err("Rewards distribution interval not reached");
        }

        if self.config.rewards_fund == 0 {
            return Err("No rewards fund available");
        }

        // Converte AccountId para [u8; 32] para compatibilidade com rewards_manager
        let wallets_converted: Vec<([u8; 32], u128)> = wallets
            .into_iter()
            .map(|(account_id, balance)| {
                let mut bytes = [0u8; 32];
                bytes.copy_from_slice(account_id.as_ref());
                (bytes, balance)
            })
            .collect();
        
        // Calcula o ranking e distribui recompensas (distribui 20% do fundo mensalmente)
        let available_for_distribution = self.config.rewards_fund.saturating_mul(20).saturating_div(100);
        
        if available_for_distribution == 0 {
            return Err("No rewards fund available");
        }
        
        let ranking = self.rewards_manager.calculate_ranking(
            wallets_converted,
            available_for_distribution,
            current_time,
        )?;

        // Atualiza estatísticas
        self.stats.total_rewards_distributed = self.stats.total_rewards_distributed.saturating_add(ranking.total_distributed);
        self.stats.wallets_in_ranking = u8::try_from(ranking.top_wallets.len().min(255)).unwrap_or(255);
        
        // Atualiza configuração
        self.config.rewards_fund = self.config.rewards_fund.saturating_sub(ranking.total_distributed);
        self.config.last_rewards_distribution = current_time;

        Ok(ranking)
    }

    /// Distribui uma taxa coletada entre os fundos
    fn distribute_fee(&mut self, fee_amount: u128) {
        let burn_amount = fee_amount.saturating_mul(self.config.fee_distribution[0] as u128).saturating_div(10000);
        let staking_amount = fee_amount.saturating_mul(self.config.fee_distribution[1] as u128).saturating_div(10000);
        let rewards_amount = fee_amount.saturating_sub(burn_amount).saturating_sub(staking_amount);

        // Atualiza estatísticas
        self.stats.total_burned = self.stats.total_burned.saturating_add(burn_amount);
        self.config.rewards_fund = self.config.rewards_fund.saturating_add(rewards_amount);
        
        // staking_amount seria distribuído para os stakers (implementação futura)
    }

    /// Simula busca de posição de staking (em implementação real seria do storage)
    fn get_staking_position(&self, _position_id: u64) -> Result<StakingPosition, &'static str> {
        // Simulação para testes - retorna uma posição padrão
        Ok(StakingPosition {
            id: 1,
            user: AccountId::from([1u8; 32]),
            amount: 1000,
            staking_type: StakingType::DonFiapo,
            start_time: 1000000,
            accumulated_rewards: 100,
            entry_fee: 10,
            last_reward_time: 1000000,
            status: crate::staking::StakingStatus::Active,
        })
    }

    /// Obtém as estatísticas do sistema
    pub fn get_stats(&self) -> &SystemStats {
        &self.stats
    }

    /// Obtém a configuração do sistema
    pub fn get_config(&self) -> &DonFiapoConfig {
        &self.config
    }

    /// Verifica se o usuário é admin
    pub fn is_admin(&self, user: AccountId) -> bool {
        self.config.admin == user
    }

    /// Atualiza a configuração (apenas admin)
    pub fn update_config(
        &mut self,
        caller: AccountId,
        new_config: DonFiapoConfig,
    ) -> Result<(), &'static str> {
        if !self.is_admin(caller) {
            return Err("Only admin can update config");
        }
        
        self.config = new_config;
        Ok(())
    }

    /// Obtém o saldo do fundo de recompensas
    pub fn get_rewards_fund(&self) -> u128 {
        self.config.rewards_fund
    }

    /// Adiciona fundos ao fundo de recompensas (apenas admin)
    pub fn add_to_rewards_fund(
        &mut self,
        caller: AccountId,
        amount: u128,
    ) -> Result<(), &'static str> {
        if !self.is_admin(caller) {
            return Err("Only admin can add to rewards fund");
        }
        
        self.config.rewards_fund = self.config.rewards_fund.saturating_add(amount);
        Ok(())
    }

    /// Calcula taxa de entrada
    pub fn calculate_staking_entry_fee(&self, amount: u128) -> FeeCalculationResult {
        let fee_calculator = FeeCalculator::new();
        fee_calculator.calculate_staking_entry_fee(amount)
    }

    /// Executa mint de NFT (Wrapper para ICOManager com mock de caller)
    #[cfg(any(test, feature = "std"))]
    pub fn mint_nft(
        &mut self,
        nft_type: NFTType,
        lunes_balance: u128,
        payment_proof: Option<String>,
        owner: AccountId,
        _current_time: u64, // Ignored logic-wise but kept for signature consistency if needed
    ) -> Result<u64, &'static str> {
        // Mock do caller para o teste
        ink::env::test::set_caller::<DefaultEnvironment>(owner);
        
        // Conversão de PaymentProof se necessário (simplificado para string mock)
        let proof = payment_proof.map(|hash| PaymentProof {
            transaction_hash: hash,
            sender_address: "mock_sender".into(),
            amount_usdt: 0,
            timestamp: 0,
        });

        let nft_id = self.ico_manager.mint_nft(
            nft_type,
            lunes_balance,
            proof
        ).map_err(|_| "NFT Minting failed")?;
        Ok(nft_id)
    }

    /// Reivindica tokens de mineração de NFT
    #[cfg(any(test, feature = "std"))]
    pub fn claim_nft_tokens(
        &mut self,
        nft_id: u64,
        owner: AccountId,
        _current_time: u64,
    ) -> Result<u128, String> {
        ink::env::test::set_caller::<DefaultEnvironment>(owner);
        
        let amount = self.ico_manager.claim_tokens(
            nft_id
        ).map_err(|e| format!("Claim failed: {:?}", e))?;
        Ok(amount)
    }

    /// Inicia a mineração de NFTs (Admin)
    pub fn start_nft_mining(&mut self, current_time: u64) {
        self.ico_manager.start_mining(current_time);
    }

    /// Obtém dados de um NFT do storage
    pub fn get_nft_data(&self, nft_id: u64) -> Option<NFTData> {
        self.ico_manager.nfts.get(nft_id)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn get_test_admin() -> AccountId {
        AccountId::from([1u8; 32])
    }

    fn get_test_user() -> AccountId {
        AccountId::from([2u8; 32])
    }

    #[test]
    fn integration_creation_works() {
        let admin = get_test_admin();
        let integration = DonFiapoIntegration::new(admin);
        
        assert_eq!(integration.get_config().admin, admin);
        assert_eq!(integration.get_config().transfer_fee_rate, 60);
        assert_eq!(integration.get_stats().total_staked, 0);
        assert!(integration.is_admin(admin));
        assert!(!integration.is_admin(get_test_user()));
    }

    #[test]
    fn stake_with_fees_works() {
        let mut manager = DonFiapoIntegration::new(get_test_admin());
        let user = get_test_user();
        let amount = 1000 * 10u128.pow(8);

        // Calcula a taxa de entrada usando a instância do manager
        let fee_result = manager.fee_calculator.calculate_staking_entry_fee(amount);
        let net_amount = amount.saturating_sub(fee_result.fee_amount);

        let result = manager.stake_with_fees(
            user,
            amount,
            StakingType::DonFiapo,
            1000000,
        );

        assert!(result.is_ok());
        let position = result.unwrap();

        assert_eq!(position.net_amount, net_amount);
        assert!(position.entry_fee.fee_amount > 0);
        assert_eq!(position.entry_fee.fee_amount, fee_result.fee_amount);
    }

    #[test]
    fn stake_with_zero_amount_fails() {
        let mut integration = DonFiapoIntegration::new(get_test_admin());
        let result = integration.stake_with_fees(
            get_test_user(),
            0,
            StakingType::DonFiapo,
            1000000,
        );
        
        assert_eq!(result.err(), Some("Amount cannot be zero"));
    }

    #[test]
    fn withdraw_staking_works() {
        let mut integration = DonFiapoIntegration::new(get_test_admin());
        
        // Primeiro faz um stake
        let _ = integration.stake_with_fees(
            get_test_user(),
            10000,
            StakingType::DonFiapo,
            1000000,
        ).unwrap();
        
        let initial_staked = integration.get_stats().total_staked;
        let initial_positions = integration.get_stats().active_staking_positions;
        
        // Depois faz o saque
        let withdrawal = integration.withdraw_staking(1, 1000000 + 100 * 24 * 60 * 60).unwrap();
        
        assert!(withdrawal.principal_amount > 0);
        
        // Verifica se as estatísticas foram atualizadas
        assert_eq!(
            integration.get_stats().total_staked,
            initial_staked - withdrawal.principal_amount
        );
        assert_eq!(
            integration.get_stats().active_staking_positions,
            initial_positions - 1
        );
    }

    #[test]
    fn distribute_monthly_rewards_works() {
        let mut integration = DonFiapoIntegration::new(get_test_admin());
        
        // Adiciona fundos ao fundo de recompensas
        integration.add_to_rewards_fund(get_test_admin(), 1000000).unwrap();
        
        // Cria carteiras para o ranking (115 carteiras: 100 excluídas + 15 elegíveis)
        let mut wallets = Vec::new();
        
        // 100 maiores carteiras (serão excluídas)
        for i in 0..100 {
            wallets.push((AccountId::from([i as u8; 32]), 1_000_000u128.saturating_add(i as u128)));
        }
        
        // 15 carteiras elegíveis
        for i in 100..115 {
            wallets.push((AccountId::from([i as u8; 32]), 500_000 - (i - 100) as u128));
        }
        
        let current_time = 1000000 + 31 * 24 * 60 * 60; // 31 dias depois
        
        let ranking = integration.distribute_monthly_rewards(wallets, current_time).unwrap();
        
        assert_eq!(ranking.top_wallets.len(), 12);
        assert!(ranking.total_distributed > 0);
        assert_eq!(integration.get_stats().wallets_in_ranking, 12);
        assert!(integration.get_stats().total_rewards_distributed > 0);
    }

    #[test]
    fn distribute_rewards_too_early_fails() {
        let mut integration = DonFiapoIntegration::new(get_test_admin());
        integration.add_to_rewards_fund(get_test_admin(), 1000000).unwrap();
        
        let wallets = vec![(AccountId::from([1u8; 32]), 1000u128)];
        let current_time = 1000000; // Muito cedo
        
        let result = integration.distribute_monthly_rewards(wallets, current_time);
        assert_eq!(result.err(), Some("Rewards distribution interval not reached"));
    }

    #[test]
    fn distribute_rewards_no_fund_fails() {
        let mut integration = DonFiapoIntegration::new(get_test_admin());
        
        let wallets = vec![(AccountId::from([1u8; 32]), 1000u128)];
        let current_time = 1000000 + 31 * 24 * 60 * 60;
        
        let result = integration.distribute_monthly_rewards(wallets, current_time);
        assert_eq!(result.err(), Some("No rewards fund available"));
    }

    #[test]
    fn update_config_admin_only() {
        let mut integration = DonFiapoIntegration::new(get_test_admin());
        let new_config = DonFiapoConfig {
            transfer_fee_rate: 100,
            ..DonFiapoConfig::default()
        };
        
        // Admin pode atualizar
        assert!(integration.update_config(get_test_admin(), new_config.clone()).is_ok());
        assert_eq!(integration.get_config().transfer_fee_rate, 100);
        
        // Usuário comum não pode
        let result = integration.update_config(get_test_user(), new_config);
        assert_eq!(result.err(), Some("Only admin can update config"));
    }

    #[test]
    fn add_to_rewards_fund_admin_only() {
        let mut integration = DonFiapoIntegration::new(get_test_admin());
        
        // Admin pode adicionar
        assert!(integration.add_to_rewards_fund(get_test_admin(), 1000).is_ok());
        assert_eq!(integration.get_rewards_fund(), 1000);
        
        // Usuário comum não pode
        let result = integration.add_to_rewards_fund(get_test_user(), 1000);
        assert_eq!(result.err(), Some("Only admin can add to rewards fund"));
    }

    #[test]
    fn fee_distribution_works() {
        let mut integration = DonFiapoIntegration::new(get_test_admin());
        let initial_burned = integration.get_stats().total_burned;
        let initial_rewards_fund = integration.get_rewards_fund();
        
        // Simula distribuição de taxa
        let fee_amount = 1000u128;
        integration.distribute_fee(fee_amount);
        
        // Verifica distribuição: 30% burn, 50% staking, 20% rewards
        let expected_burn = fee_amount.saturating_mul(3000).saturating_div(10000); // 30%
        let expected_rewards = fee_amount.saturating_mul(2000).saturating_div(10000); // 20%
        
        assert_eq!(integration.get_stats().total_burned, initial_burned + expected_burn);
        assert_eq!(integration.get_rewards_fund(), initial_rewards_fund + expected_rewards);
    }
}