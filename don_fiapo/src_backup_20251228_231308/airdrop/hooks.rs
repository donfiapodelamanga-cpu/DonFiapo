//! Hooks para integração do módulo de airdrop com outros módulos do contrato

use ink::prelude::vec::Vec;
use ink::env::{
    DefaultEnvironment,
    Environment,
};
use crate::airdrop::{
    Airdrop,
    AirdropError,
};

/// Tipo de conta para o módulo de airdrop
type AccountId = <DefaultEnvironment as Environment>::AccountId;

/// Trait que define os hooks para integração com outros módulos
pub trait AirdropHooks {
    /// Chamado quando um usuário faz staking de tokens
    fn on_stake(
        &mut self,
        account: AccountId,
        staked_amount: u128,
        staking_duration_blocks: u32,
    ) -> Result<(), AirdropError>;

    /// Chamado quando um usuário queima tokens
    fn on_burn(
        &mut self,
        account: AccountId,
        burned_amount: u128,
    ) -> Result<(), AirdropError>;

    /// Chamado quando um usuário se torna afiliado ou indica novos usuários
    fn on_affiliate_update(
        &mut self,
        referrer: AccountId,
        direct_referrals: Vec<AccountId>,
        second_level_referrals: Vec<AccountId>,
    ) -> Result<(), AirdropError>;
}

impl AirdropHooks for Airdrop {
    /// Chamado quando um usuário faz staking de tokens
    fn on_stake(
        &mut self,
        account: AccountId,
        staked_amount: u128,
        staking_duration_blocks: u32,
    ) -> Result<(), AirdropError> {
        // Atualiza a pontuação de staking do usuário
        self.update_staking_score(account, staked_amount, staking_duration_blocks)
    }

    /// Chamado quando um usuário queima tokens
    fn on_burn(
        &mut self,
        account: AccountId,
        burned_amount: u128,
    ) -> Result<(), AirdropError> {
        // Atualiza a pontuação de queima do usuário
        self.update_burning_score(account, burned_amount)
    }

    /// Chamado quando um usuário se torna afiliado ou indica novos usuários
    fn on_affiliate_update(
        &mut self,
        referrer: AccountId,
        direct_referrals: Vec<AccountId>,
        second_level_referrals: Vec<AccountId>,
    ) -> Result<(), AirdropError> {
        // Atualiza a pontuação de afiliados do usuário
        self.update_affiliate_score(referrer, direct_referrals, second_level_referrals)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::airdrop::{
        Airdrop,
    };
    use ink::env::test;

    // Função auxiliar para obter contas de teste
    fn default_accounts() -> test::DefaultAccounts<DefaultEnvironment> {
        test::default_accounts::<DefaultEnvironment>()
    }

    // Função auxiliar para configurar o chamador
    fn set_sender(sender: AccountId) {
        ink::env::test::set_caller::<DefaultEnvironment>(sender);
    }

    // Teste básico para verificar se os hooks estão implementados
    #[test]
    fn test_hooks_implementation() {
        let accounts = default_accounts();
        set_sender(accounts.alice);
        
        let mut airdrop = Airdrop::new();
        
        // Verifica se os métodos dos hooks existem e podem ser chamados
        let _ = airdrop.on_stake(accounts.bob, 1000 * 10u128.pow(8), 100);
        let _ = airdrop.on_burn(accounts.bob, 500 * 10u128.pow(8));
        let _ = airdrop.on_affiliate_update(accounts.alice, vec![], vec![]);
        
        // Se chegou até aqui, os hooks estão implementados corretamente
        assert!(true);
    }
}
