//! Módulo para distribuição de taxas e penalidades.
//!
//! Centraliza a lógica de como as taxas coletadas são divididas
//! entre os diferentes fundos do ecossistema (Queima, Staking, Recompensas, Equipe).

use scale::{Decode, Encode};

/// Representa os valores distribuídos para cada fundo.
/// A ordem é: (Queima, Staking, Recompensas, Equipe)
pub type DistributionAmounts = (u128, u128, u128, u128);

/// Erro na distribuição de taxas.
#[derive(Debug, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub enum DistributionError {
    /// O valor total a ser distribuído é zero.
    ZeroAmount,
}

/// Centraliza a lógica de distribuição de taxas.
pub struct FeeDistributor;

impl FeeDistributor {
    /// Distribui a taxa de transação de $FIAPO (0.6%).
    /// - 30% para Queima
    /// - 50% para Staking
    /// - 20% para Recompensas
    pub fn distribute_transaction_fee(total_fee: u128) -> Result<DistributionAmounts, DistributionError> {
        if total_fee == 0 {
            return Ok((0, 0, 0, 0));
        }
        let burn_amount = total_fee.saturating_mul(30).saturating_div(100);
        let staking_amount = total_fee.saturating_mul(50).saturating_div(100);
        let rewards_amount = total_fee.saturating_sub(burn_amount).saturating_sub(staking_amount);
        
        Ok((burn_amount, staking_amount, rewards_amount, 0))
    }

    /// Distribui a taxa de entrada em Staking (paga em LUSDT/USDT).
    /// - 10% para a Equipe
    /// - 40% para o Fundo de Staking
    /// - 50% para o Fundo de Recompensas
    pub fn distribute_staking_entry_fee(total_fee: u128) -> Result<DistributionAmounts, DistributionError> {
        if total_fee == 0 {
            return Ok((0, 0, 0, 0));
        }
        let team_amount = total_fee.saturating_mul(10).saturating_div(100);
        let staking_amount = total_fee.saturating_mul(40).saturating_div(100);
        let rewards_amount = total_fee.saturating_sub(team_amount).saturating_sub(staking_amount);

        Ok((0, staking_amount, rewards_amount, team_amount))
    }

    /// Distribui a taxa de saque de juros (1% dos juros em $FIAPO).
    /// - 20% para Queima
    /// - 50% para Staking
    /// - 30% para Recompensas
    pub fn distribute_interest_withdrawal_fee(total_fee: u128) -> Result<DistributionAmounts, DistributionError> {
        if total_fee == 0 {
            return Ok((0, 0, 0, 0));
        }
        let burn_amount = total_fee.saturating_mul(20).saturating_div(100);
        let staking_amount = total_fee.saturating_mul(50).saturating_div(100);
        let rewards_amount = total_fee.saturating_sub(burn_amount).saturating_sub(staking_amount);

        Ok((burn_amount, staking_amount, rewards_amount, 0))
    }

    /// Distribui a penalidade de saque antecipado de $FIAPO (Don Burn).
    /// - 20% para Queima
    /// - 50% para Staking
    /// - 30% para Recompensas
    pub fn distribute_early_withdrawal_penalty(total_penalty: u128) -> Result<DistributionAmounts, DistributionError> {
        if total_penalty == 0 {
            return Ok((0, 0, 0, 0));
        }
        let burn_amount = total_penalty.saturating_mul(20).saturating_div(100);
        let staking_amount = total_penalty.saturating_mul(50).saturating_div(100);
        let rewards_amount = total_penalty.saturating_sub(burn_amount).saturating_sub(staking_amount);

        Ok((burn_amount, staking_amount, rewards_amount, 0))
    }

    /// Distribui a taxa de cancelamento de $FIAPO (Don $LUNES).
    /// - 10% para a Equipe
    /// - 50% para o Fundo de Staking
    /// - 40% para o Fundo de Recompensas
    pub fn distribute_cancellation_fee(total_fee: u128) -> Result<DistributionAmounts, DistributionError> {
        if total_fee == 0 {
            return Ok((0, 0, 0, 0));
        }
        let team_amount = total_fee.saturating_mul(10).saturating_div(100);
        let staking_amount = total_fee.saturating_mul(50).saturating_div(100);
        let rewards_amount = total_fee.saturating_sub(team_amount).saturating_sub(staking_amount);
        
        Ok((0, staking_amount, rewards_amount, team_amount))
    }

    /// Distribui as taxas de governança (pagamentos de propostas e votos).
    /// - 60% para o Fundo de Staking (incentiva participação)
    /// - 30% para o Fundo de Recompensas (recompensa governadores ativos)
    /// - 10% para a Equipe (manutenção do sistema)
    pub fn distribute_governance_fee(total_fee: u128) -> Result<DistributionAmounts, DistributionError> {
        if total_fee == 0 {
            return Ok((0, 0, 0, 0));
        }
        let staking_amount = total_fee.saturating_mul(60).saturating_div(100);
        let rewards_amount = total_fee.saturating_mul(30).saturating_div(100);
        let team_amount = total_fee.saturating_sub(staking_amount).saturating_sub(rewards_amount);
        
        Ok((0, staking_amount, rewards_amount, team_amount))
    }

    /// Distribui as taxas de governança por tipo de pagamento.
    /// - Pagamentos de Propostas: 70% Staking, 20% Recompensas, 10% Equipe
    /// - Pagamentos de Votos: 50% Staking, 40% Recompensas, 10% Equipe
    pub fn distribute_governance_fee_by_type(
        total_fee: u128, 
        payment_type: &str
    ) -> Result<DistributionAmounts, DistributionError> {
        if total_fee == 0 {
            return Ok((0, 0, 0, 0));
        }

        match payment_type {
            "PROPOSAL" => {
                // Pagamentos de propostas: incentiva criação de propostas de qualidade
                let staking_amount = total_fee.saturating_mul(70).saturating_div(100);
                let rewards_amount = total_fee.saturating_mul(20).saturating_div(100);
                let team_amount = total_fee.saturating_sub(staking_amount).saturating_sub(rewards_amount);
                
                Ok((0, staking_amount, rewards_amount, team_amount))
            },
            "VOTE" => {
                // Pagamentos de votos: incentiva participação ativa
                let staking_amount = total_fee.saturating_mul(50).saturating_div(100);
                let rewards_amount = total_fee.saturating_mul(40).saturating_div(100);
                let team_amount = total_fee.saturating_sub(staking_amount).saturating_sub(rewards_amount);
                
                Ok((0, staking_amount, rewards_amount, team_amount))
            },
            _ => {
                // Distribuição padrão para outros tipos
                Self::distribute_governance_fee(total_fee)
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn distribute_transaction_fee_works() {
        let fee: u128 = 1000;
        let (burn, staking, rewards, team) = FeeDistributor::distribute_transaction_fee(fee).unwrap();
        assert_eq!(burn, 300);    // 30%
        assert_eq!(staking, 500); // 50%
        assert_eq!(rewards, 200); // 20%
        assert_eq!(team, 0);
    }

    #[test]
    fn distribute_staking_entry_fee_works() {
        let fee: u128 = 1000;
        let (burn, staking, rewards, team) = FeeDistributor::distribute_staking_entry_fee(fee).unwrap();
        assert_eq!(burn, 0);
        assert_eq!(staking, 400); // 40%
        assert_eq!(rewards, 500); // 50%
        assert_eq!(team, 100);    // 10%
    }
    
    #[test]
    fn distribute_interest_withdrawal_fee_works() {
        let fee: u128 = 1000;
        let (burn, staking, rewards, team) = FeeDistributor::distribute_interest_withdrawal_fee(fee).unwrap();
        assert_eq!(burn, 200);    // 20%
        assert_eq!(staking, 500); // 50%
        assert_eq!(rewards, 300); // 30%
        assert_eq!(team, 0);
    }
    
    #[test]
    fn distribute_early_withdrawal_penalty_works() {
        let penalty: u128 = 1000;
        let (burn, staking, rewards, team) = FeeDistributor::distribute_early_withdrawal_penalty(penalty).unwrap();
        assert_eq!(burn, 200);    // 20%
        assert_eq!(staking, 500); // 50%
        assert_eq!(rewards, 300); // 30%
        assert_eq!(team, 0);
    }

    #[test]
    fn distribute_cancellation_fee_works() {
        let fee: u128 = 1000;
        let (burn, staking, rewards, team) = FeeDistributor::distribute_cancellation_fee(fee).unwrap();
        assert_eq!(burn, 0);
        assert_eq!(staking, 500); // 50%
        assert_eq!(rewards, 400); // 40%
        assert_eq!(team, 100);    // 10%
    }

    #[test]
    fn distribute_governance_fee_works() {
        let fee: u128 = 1000;
        let (burn, staking, rewards, team) = FeeDistributor::distribute_governance_fee(fee).unwrap();
        assert_eq!(burn, 0);
        assert_eq!(staking, 600); // 60%
        assert_eq!(rewards, 300); // 30%
        assert_eq!(team, 100);    // 10%
    }

    #[test]
    fn distribute_governance_fee_by_type_proposal_works() {
        let fee: u128 = 1000;
        let (burn, staking, rewards, team) = FeeDistributor::distribute_governance_fee_by_type(fee, "PROPOSAL").unwrap();
        assert_eq!(burn, 0);
        assert_eq!(staking, 700); // 70%
        assert_eq!(rewards, 200); // 20%
        assert_eq!(team, 100);    // 10%
    }

    #[test]
    fn distribute_governance_fee_by_type_vote_works() {
        let fee: u128 = 1000;
        let (burn, staking, rewards, team) = FeeDistributor::distribute_governance_fee_by_type(fee, "VOTE").unwrap();
        assert_eq!(burn, 0);
        assert_eq!(staking, 500); // 50%
        assert_eq!(rewards, 400); // 40%
        assert_eq!(team, 100);    // 10%
    }

    #[test]
    fn distribute_governance_fee_by_type_default_works() {
        let fee: u128 = 1000;
        let (burn, staking, rewards, team) = FeeDistributor::distribute_governance_fee_by_type(fee, "OTHER").unwrap();
        assert_eq!(burn, 0);
        assert_eq!(staking, 600); // 60%
        assert_eq!(rewards, 300); // 30%
        assert_eq!(team, 100);    // 10%
    }

    #[test]
    fn distribute_zero_amount_works() {
        assert_eq!(FeeDistributor::distribute_transaction_fee(0), Ok((0,0,0,0)));
    }
}
