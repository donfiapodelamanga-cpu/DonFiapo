//! # Fiapo Affiliate Contract
//!
//! Sistema de afiliados com 2 níveis.

#![cfg_attr(not(feature = "std"), no_std, no_main)]

use fiapo_traits::{AccountId, Balance};

#[ink::contract]
mod fiapo_affiliate {
    use super::*;
    use ink::prelude::vec::Vec;
    use ink::storage::Mapping;

    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum AffiliateError {
        AlreadyHasReferrer,
        CannotReferSelf,
        InvalidReferrer,
        Unauthorized,
    }

    /// Constantes de configuração
    pub const BOOST_PER_AFFILIATE_BPS: u32 = 50;  // 0.5% por afiliado
    pub const MAX_BOOST_BPS: u32 = 500;            // Máximo 5%
    pub const MAX_DIRECT_REFERRALS: u32 = 100;
    pub const SCALE: u128 = 100_000_000;

    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode, Default)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct AffiliateStats {
        pub direct_referrals: u32,
        pub second_level_referrals: u32,
        pub total_earnings: Balance,
        pub current_boost_bps: u32,
        pub active_referrals: u32,
    }

    /// Atividade de um referido
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode, Default)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct ReferralActivity {
        pub total_staked: Balance,
        pub is_active: bool,
        pub last_activity: u64,
    }

    /// Configuração do sistema de afiliados
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct AffiliateConfig {
        pub enabled: bool,
        pub boost_per_affiliate_bps: u32,
        pub max_boost_bps: u32,
        pub min_staking_for_active: Balance,
    }

    impl Default for AffiliateConfig {
        fn default() -> Self {
            Self {
                enabled: true,
                boost_per_affiliate_bps: BOOST_PER_AFFILIATE_BPS,
                max_boost_bps: MAX_BOOST_BPS,
                min_staking_for_active: 1000 * SCALE,
            }
        }
    }

    #[ink(event)]
    pub struct ReferralRegistered {
        #[ink(topic)]
        referrer: AccountId,
        #[ink(topic)]
        referred: AccountId,
    }

    #[ink(event)]
    pub struct CommissionPaid {
        #[ink(topic)]
        affiliate: AccountId,
        amount: Balance,
        level: u8,
    }

    #[ink(storage)]
    pub struct FiapoAffiliate {
        core_contract: AccountId,
        owner: AccountId,
        /// referrer de cada conta
        referrers: Mapping<AccountId, AccountId>,
        /// referidos diretos de cada conta
        referrals: Mapping<AccountId, Vec<AccountId>>,
        /// estatísticas
        stats: Mapping<AccountId, AffiliateStats>,
        /// atividade de referidos
        activities: Mapping<AccountId, ReferralActivity>,
        /// configuração do sistema
        config: AffiliateConfig,
        /// comissão nível 1 (bps)
        level1_commission_bps: u16,
        /// comissão nível 2 (bps)
        level2_commission_bps: u16,
        /// total de afiliados
        total_affiliates: u32,
    }

    impl FiapoAffiliate {
        #[ink(constructor)]
        pub fn new(core_contract: AccountId) -> Self {
            Self {
                core_contract,
                owner: Self::env().caller(),
                referrers: Mapping::default(),
                referrals: Mapping::default(),
                stats: Mapping::default(),
                activities: Mapping::default(),
                config: AffiliateConfig::default(),
                level1_commission_bps: 500, // 5%
                level2_commission_bps: 200, // 2%
                total_affiliates: 0,
            }
        }

        #[ink(message)]
        pub fn core_contract(&self) -> AccountId {
            self.core_contract
        }

        #[ink(message)]
        pub fn get_referrer(&self, account: AccountId) -> Option<AccountId> {
            self.referrers.get(account)
        }

        #[ink(message)]
        pub fn get_referrals(&self, account: AccountId) -> Vec<AccountId> {
            self.referrals.get(account).unwrap_or_default()
        }

        #[ink(message)]
        pub fn get_stats(&self, account: AccountId) -> AffiliateStats {
            self.stats.get(account).unwrap_or_default()
        }

        #[ink(message)]
        pub fn total_affiliates(&self) -> u32 {
            self.total_affiliates
        }

        #[ink(message)]
        pub fn register_referral(&mut self, referrer: AccountId) -> Result<(), AffiliateError> {
            let caller = self.env().caller();

            if caller == referrer {
                return Err(AffiliateError::CannotReferSelf);
            }

            if self.referrers.contains(caller) {
                return Err(AffiliateError::AlreadyHasReferrer);
            }

            // Registra referrer
            self.referrers.insert(caller, &referrer);

            // Adiciona aos referidos do referrer
            let mut refs = self.referrals.get(referrer).unwrap_or_default();
            refs.push(caller);
            self.referrals.insert(referrer, &refs);

            // Atualiza stats do referrer
            let mut stats = self.stats.get(referrer).unwrap_or_default();
            stats.direct_referrals += 1;
            self.stats.insert(referrer, &stats);

            // Se o referrer tiver um referrer (segundo nível)
            if let Some(level2_referrer) = self.referrers.get(referrer) {
                let mut level2_stats = self.stats.get(level2_referrer).unwrap_or_default();
                level2_stats.second_level_referrals += 1;
                self.stats.insert(level2_referrer, &level2_stats);
            }

            self.total_affiliates += 1;

            Self::env().emit_event(ReferralRegistered {
                referrer,
                referred: caller,
            });

            Ok(())
        }

        #[ink(message)]
        pub fn pay_commission(&mut self, user: AccountId, amount: Balance) -> Result<(), AffiliateError> {
            if self.env().caller() != self.owner && self.env().caller() != self.core_contract {
                return Err(AffiliateError::Unauthorized);
            }

            // Paga nível 1
            if let Some(level1) = self.referrers.get(user) {
                let commission1 = amount * self.level1_commission_bps as u128 / 10000;
                let mut stats1 = self.stats.get(level1).unwrap_or_default();
                stats1.total_earnings = stats1.total_earnings.saturating_add(commission1);
                self.stats.insert(level1, &stats1);

                Self::env().emit_event(CommissionPaid {
                    affiliate: level1,
                    amount: commission1,
                    level: 1,
                });

                // Paga nível 2
                if let Some(level2) = self.referrers.get(level1) {
                    let commission2 = amount * self.level2_commission_bps as u128 / 10000;
                    let mut stats2 = self.stats.get(level2).unwrap_or_default();
                    stats2.total_earnings = stats2.total_earnings.saturating_add(commission2);
                    self.stats.insert(level2, &stats2);

                    Self::env().emit_event(CommissionPaid {
                        affiliate: level2,
                        amount: commission2,
                        level: 2,
                    });
                }
            }

            Ok(())
        }

        // ==================== APY Boost Functions ====================

        /// Retorna configuração do sistema
        #[ink(message)]
        pub fn get_config(&self) -> AffiliateConfig {
            self.config.clone()
        }

        /// Calcula o APY boost baseado em afiliados ativos
        /// Cada afiliado ativo dá 0.5% (50 bps) de boost, máximo 5% (500 bps)
        #[ink(message)]
        pub fn calculate_apy_boost(&self, user: AccountId) -> u32 {
            if !self.config.enabled {
                return 0;
            }

            let referrals = self.referrals.get(user).unwrap_or_default();
            
            // Conta referidos ativos
            let mut active_count: u32 = 0;
            for referral in referrals.iter() {
                if let Some(activity) = self.activities.get(*referral) {
                    if activity.is_active {
                        active_count += 1;
                    }
                }
            }

            // Calcula boost
            let boost = active_count.saturating_mul(self.config.boost_per_affiliate_bps);
            boost.min(self.config.max_boost_bps)
        }

        /// Atualiza atividade de um referido (chamado pelo Staking)
        #[ink(message)]
        pub fn update_referral_activity(
            &mut self,
            user: AccountId,
            staked_amount: Balance,
        ) -> Result<(), AffiliateError> {
            if self.env().caller() != self.owner && self.env().caller() != self.core_contract {
                return Err(AffiliateError::Unauthorized);
            }

            let current_time = self.env().block_timestamp();
            let mut activity = self.activities.get(user).unwrap_or_default();
            
            activity.total_staked = activity.total_staked.saturating_add(staked_amount);
            activity.last_activity = current_time;
            activity.is_active = activity.total_staked >= self.config.min_staking_for_active;

            self.activities.insert(user, &activity);

            // Atualiza boost do referrer
            if let Some(referrer) = self.referrers.get(user) {
                let new_boost = self.calculate_apy_boost(referrer);
                let mut stats = self.stats.get(referrer).unwrap_or_default();
                
                // Conta ativos
                let referrals = self.referrals.get(referrer).unwrap_or_default();
                let active_count = referrals.iter().filter(|r| {
                    self.activities.get(**r).map(|a| a.is_active).unwrap_or(false)
                }).count() as u32;
                
                stats.current_boost_bps = new_boost;
                stats.active_referrals = active_count;
                self.stats.insert(referrer, &stats);
            }

            Ok(())
        }

        /// Retorna atividade de um referido
        #[ink(message)]
        pub fn get_referral_activity(&self, user: AccountId) -> ReferralActivity {
            self.activities.get(user).unwrap_or_default()
        }

        /// Atualiza configuração (apenas owner)
        #[ink(message)]
        pub fn update_config(&mut self, config: AffiliateConfig) -> Result<(), AffiliateError> {
            if self.env().caller() != self.owner {
                return Err(AffiliateError::Unauthorized);
            }
            self.config = config;
            Ok(())
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;

        #[ink::test]
        fn constructor_works() {
            let accounts = ink::env::test::default_accounts::<ink::env::DefaultEnvironment>();
            let contract = FiapoAffiliate::new(accounts.charlie);
            assert_eq!(contract.total_affiliates(), 0);
        }

        #[ink::test]
        fn register_referral_works() {
            let accounts = ink::env::test::default_accounts::<ink::env::DefaultEnvironment>();
            let mut contract = FiapoAffiliate::new(accounts.charlie);

            // Bob registra Alice como referrer
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(accounts.bob);
            let result = contract.register_referral(accounts.alice);
            assert!(result.is_ok());

            assert_eq!(contract.get_referrer(accounts.bob), Some(accounts.alice));
            assert_eq!(contract.total_affiliates(), 1);
        }

        #[ink::test]
        fn cannot_refer_self() {
            let accounts = ink::env::test::default_accounts::<ink::env::DefaultEnvironment>();
            let mut contract = FiapoAffiliate::new(accounts.charlie);

            let result = contract.register_referral(accounts.alice);
            assert_eq!(result, Err(AffiliateError::CannotReferSelf));
        }
    }
}
