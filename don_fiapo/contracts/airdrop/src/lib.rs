//! # Fiapo Airdrop Contract
//! 
//! Sistema de airdrop baseado em pontos para o ecossistema Don Fiapo.
//! Distribui tokens baseado em:
//! - 25% para holders (saldo médio)
//! - 30% para stakers
//! - 20% para queimadores
//! - 10% para rede de afiliados
//! - 15% para NFT holders

#![cfg_attr(not(feature = "std"), no_std, no_main)]

// Traits são re-exportados pelo ink::contract

#[ink::contract]
mod fiapo_airdrop {
    use fiapo_traits::PSP22Error;
    use ink::storage::Mapping;

    /// Erros do airdrop
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum AirdropError {
        NotActive,
        RoundNotFound,
        AlreadyClaimed,
        NotEligible,
        Unauthorized,
        AirdropAlreadyActive,
        AirdropNotEnded,
        NoParticipants,
        TransferFailed,
    }

    /// Taxas de distribuição
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct DistributionRates {
        pub holders: u8,
        pub stakers: u8,
        pub burners: u8,
        pub affiliates: u8,
        pub nft_holders: u8,
    }

    impl Default for DistributionRates {
        fn default() -> Self {
            Self {
                holders: 25,
                stakers: 30,
                burners: 20,
                affiliates: 10,
                nft_holders: 15,
            }
        }
    }

    /// Configuração do airdrop
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct AirdropConfig {
        pub is_active: bool,
        pub start_block: u32,
        pub end_block: u32,
        pub min_balance: Balance,
        pub points_per_fiapo: u8,
        pub points_per_stake: u8,
        pub points_per_burn: u8,
        pub points_per_nft: u16,
        pub nft_tier_multipliers: [u8; 7],
        pub max_participants: u32,
        pub distribution_rates: DistributionRates,
    }

    impl Default for AirdropConfig {
        fn default() -> Self {
            Self {
                is_active: false,
                start_block: 0,
                end_block: 0,
                min_balance: 1000 * 100_000_000, // 1000 FIAPO
                points_per_fiapo: 1,
                points_per_stake: 2,
                points_per_burn: 5,
                points_per_nft: 100,
                nft_tier_multipliers: [1, 2, 4, 6, 12, 30, 60],
                max_participants: 10_000,
                distribution_rates: DistributionRates::default(),
            }
        }
    }

    /// Pontuação de um usuário
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode, Default)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct UserPoints {
        pub balance_points: u128,
        pub staking_points: u128,
        pub burning_points: u128,
        pub affiliate_points: u128,
        pub nft_points: u128,
        pub claimed: bool,
    }

    impl UserPoints {
        pub fn total(&self) -> u128 {
            self.balance_points
                .saturating_add(self.staking_points)
                .saturating_add(self.burning_points)
                .saturating_add(self.affiliate_points)
                .saturating_add(self.nft_points)
        }
    }

    /// Rodada de airdrop
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct AirdropRound {
        pub id: u32,
        pub total_points: u128,
        pub total_participants: u32,
        pub tokens_per_point: u128,
        pub is_distributed: bool,
        pub total_distributed: u128,
    }

    /// Evento de claim
    #[ink(event)]
    pub struct AirdropClaimed {
        #[ink(topic)]
        user: AccountId,
        round_id: u32,
        amount: Balance,
    }

    /// Storage do contrato
    #[ink(storage)]
    pub struct FiapoAirdrop {
        /// Contrato Core
        core_contract: AccountId,
        /// Owner
        owner: AccountId,
        /// Configuração
        config: AirdropConfig,
        /// Pontos dos usuários
        user_points: Mapping<AccountId, UserPoints>,
        /// Rodadas
        rounds: Mapping<u32, AirdropRound>,
        /// Rodada atual
        current_round: u32,
        /// Total de tokens a distribuir
        total_tokens: Balance,
        /// Total de pontos
        total_points: u128,
    }

    impl FiapoAirdrop {
        /// Construtor
        #[ink(constructor)]
        pub fn new(core_contract: AccountId) -> Self {
            let caller = Self::env().caller();

            Self {
                core_contract,
                owner: caller,
                config: AirdropConfig::default(),
                user_points: Mapping::default(),
                rounds: Mapping::default(),
                current_round: 0,
                total_tokens: 0,
                total_points: 0,
            }
        }

        // ==================== View Functions ====================

        #[ink(message)]
        pub fn core_contract(&self) -> AccountId {
            self.core_contract
        }

        #[ink(message)]
        pub fn get_config(&self) -> AirdropConfig {
            self.config.clone()
        }

        #[ink(message)]
        pub fn get_user_points(&self, user: AccountId) -> UserPoints {
            self.user_points.get(user).unwrap_or_default()
        }

        #[ink(message)]
        pub fn get_round(&self, round_id: u32) -> Option<AirdropRound> {
            self.rounds.get(round_id)
        }

        #[ink(message)]
        pub fn current_round_id(&self) -> u32 {
            self.current_round
        }

        #[ink(message)]
        pub fn is_active(&self) -> bool {
            self.config.is_active
        }

        // ==================== Admin Functions ====================

        /// Inicia uma nova rodada
        #[ink(message)]
        #[allow(clippy::arithmetic_side_effects)]
        pub fn start_round(&mut self, total_tokens: Balance) -> Result<u32, AirdropError> {
            if self.env().caller() != self.owner {
                return Err(AirdropError::Unauthorized);
            }

            if self.config.is_active {
                return Err(AirdropError::AirdropAlreadyActive);
            }

            let block = self.env().block_number();
            let round_id = self.current_round + 1;

            // 12 meses em blocos (~12s por bloco)
            let duration = 12 * 30 * 24 * 60 * 60 / 12; // 12 meses em segundos (aprox)

            self.config.is_active = true;
            self.config.start_block = block;
            self.config.end_block = block + duration;
            self.total_tokens = total_tokens;
            self.total_points = 0;

            let round = AirdropRound {
                id: round_id,
                total_points: 0,
                total_participants: 0,
                tokens_per_point: 0,
                is_distributed: false,
                total_distributed: 0,
            };

            self.rounds.insert(round_id, &round);
            self.current_round = round_id;

            Ok(round_id)
        }

        /// Fecha a rodada atual
        #[ink(message)]
        #[allow(clippy::arithmetic_side_effects)]
        pub fn close_round(&mut self) -> Result<(), AirdropError> {
            if self.env().caller() != self.owner {
                return Err(AirdropError::Unauthorized);
            }

            if !self.config.is_active {
                return Err(AirdropError::NotActive);
            }

            let block = self.env().block_number();
            if block < self.config.end_block {
                return Err(AirdropError::AirdropNotEnded);
            }

            if let Some(mut round) = self.rounds.get(self.current_round) {
                if round.total_participants == 0 {
                    return Err(AirdropError::NoParticipants);
                }

                round.total_points = self.total_points;
                if self.total_points > 0 {
                    round.tokens_per_point = self.total_tokens.saturating_div(self.total_points);
                } else {
                    round.tokens_per_point = 0;
                }
                self.rounds.insert(self.current_round, &round);
            }

            self.config.is_active = false;
            Ok(())
        }

        // ==================== Points Functions ====================

        /// Atualiza pontos de balance
        #[ink(message)]
        pub fn update_balance_points(&mut self, user: AccountId, avg_balance: Balance) -> Result<(), AirdropError> {
            if !self.config.is_active {
                return Err(AirdropError::NotActive);
            }

            if avg_balance < self.config.min_balance {
                return Ok(());
            }

            let points = avg_balance.saturating_div(100_000_000).saturating_mul(self.config.points_per_fiapo as u128);

            let mut user_data = self.user_points.get(user).unwrap_or_default();
            let old_points = user_data.balance_points;
            if old_points == points {
                return Ok(());
            }
            user_data.balance_points = points;
            self.user_points.insert(user, &user_data);

            self.total_points = self.total_points
                .saturating_sub(old_points)
                .saturating_add(points);

            Ok(())
        }

        /// Atualiza pontos de staking
        #[ink(message)]
        pub fn update_staking_points(&mut self, user: AccountId, staked: Balance) -> Result<(), AirdropError> {
            if !self.config.is_active {
                return Err(AirdropError::NotActive);
            }

            let points = staked.saturating_div(100_000_000).saturating_mul(self.config.points_per_stake as u128);

            let mut user_data = self.user_points.get(user).unwrap_or_default();
            let old_points = user_data.staking_points;
            if old_points == points {
                return Ok(());
            }
            user_data.staking_points = points;
            self.user_points.insert(user, &user_data);

            self.total_points = self.total_points
                .saturating_sub(old_points)
                .saturating_add(points);

            Ok(())
        }

        /// Atualiza pontos de NFT
        #[ink(message)]
        pub fn update_nft_points(&mut self, user: AccountId, nft_counts: [u32; 7]) -> Result<(), AirdropError> {
            if !self.config.is_active {
                return Err(AirdropError::NotActive);
            }

            let mut points: u128 = 0;
            for tier in 0..7 {
                let count = nft_counts[tier] as u128;
                let multiplier = self.config.nft_tier_multipliers[tier] as u128;
                let base = self.config.points_per_nft as u128;
                points = points.saturating_add(count.saturating_mul(base).saturating_mul(multiplier));
            }

            let mut user_data = self.user_points.get(user).unwrap_or_default();
            let old_points = user_data.nft_points;
            if old_points == points {
                return Ok(());
            }
            user_data.nft_points = points;
            self.user_points.insert(user, &user_data);

            self.total_points = self.total_points
                .saturating_sub(old_points)
                .saturating_add(points);

            Ok(())
        }

        // ==================== Claim ====================

        /// Reivindica tokens do airdrop
        #[ink(message)]
        pub fn claim(&mut self) -> Result<Balance, AirdropError> {
            let caller = self.env().caller();

            if self.config.is_active {
                return Err(AirdropError::AirdropNotEnded);
            }

            let round = self.rounds.get(self.current_round)
                .ok_or(AirdropError::RoundNotFound)?;

            let mut user_data = self.user_points.get(caller)
                .ok_or(AirdropError::NotEligible)?;

            if user_data.claimed {
                return Err(AirdropError::AlreadyClaimed);
            }

            let total_user_points = user_data.total();
            if total_user_points == 0 {
                return Err(AirdropError::NotEligible);
            }

            let amount = total_user_points.saturating_mul(round.tokens_per_point);

            user_data.claimed = true;
            self.user_points.insert(caller, &user_data);

            Self::env().emit_event(AirdropClaimed {
                user: caller,
                round_id: self.current_round,
                amount,
            });

            // Cross-contract call: transfere tokens para o usuário
            self.call_core_transfer(caller, amount)?;

            Ok(amount)
        }

        // ==================== Cross-Contract Calls ====================

        /// Chama Core.transfer para enviar tokens
        fn call_core_transfer(
            &self,
            to: AccountId,
            amount: Balance,
        ) -> Result<(), AirdropError> {
            use ink::env::call::{build_call, ExecutionInput, Selector};

            let result = build_call::<ink::env::DefaultEnvironment>()
                .call(self.core_contract)
                .gas_limit(0)
                .transferred_value(0)
                .exec_input(
                    ExecutionInput::new(Selector::new(ink::selector_bytes!("transfer")))
                        .push_arg(to)
                        .push_arg(amount),
                )
                .returns::<Result<(), PSP22Error>>()
                .try_invoke();

            match result {
                Ok(Ok(Ok(()))) => Ok(()),
                _ => Err(AirdropError::TransferFailed),
            }
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;

        fn default_accounts() -> ink::env::test::DefaultAccounts<ink::env::DefaultEnvironment> {
            ink::env::test::default_accounts::<ink::env::DefaultEnvironment>()
        }

        #[ink::test]
        fn constructor_works() {
            let accounts = default_accounts();
            let contract = FiapoAirdrop::new(accounts.charlie);
            
            assert!(!contract.is_active());
            assert_eq!(contract.current_round_id(), 0);
        }

        #[ink::test]
        fn distribution_rates_sum_100() {
            let rates = DistributionRates::default();
            let sum = rates.holders + rates.stakers + rates.burners + rates.affiliates + rates.nft_holders;
            assert_eq!(sum, 100);
        }

        #[ink::test]
        fn balance_points_are_recorded() {
            let accounts = default_accounts();
            let mut contract = FiapoAirdrop::new(accounts.charlie);

            contract.start_round(1_000 * 100_000_000).unwrap();

            let avg_balance = 2_000 * 100_000_000;
            contract.update_balance_points(accounts.alice, avg_balance).unwrap();

            let points = contract.get_user_points(accounts.alice).balance_points;
            assert!(points > 0);
        }
    }
}
