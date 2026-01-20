#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[ink::contract]
pub mod royal_wheel {
    use ink::storage::Mapping;
    use ink::prelude::string::String;
    use ink::storage::traits::StorageLayout;

    // --- Constants ---
    const MAX_DAILY_USDT_CENTS: u32 = 200_00; // 200.00 USDT
    const MAX_DAILY_JACKPOTS: u8 = 1;
    const MAX_CAMPAIGN_USDT_CENTS: u32 = 6000_00; // 6000.00 USDT
    const BOOST_DURATION_MS: u64 = 5 * 60 * 60 * 1000; // 5 hours

    // --- Enums ---

    #[derive(Debug, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum Error {
        Unauthorized,
        InsufficientSpins,
        TransferFailed,
        ContractPaused,
    }

    #[derive(Debug, PartialEq, Eq, scale::Encode, scale::Decode, Clone, Copy, Default)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
    pub enum SpinPackage {
        #[default]
        One = 0,
        Five = 1,
        TwentyFive = 2,
        Fifty = 3,
        Hundred = 4,
        TwoHundred = 5,
    }

    #[derive(Debug, PartialEq, Eq, scale::Encode, scale::Decode, Clone, Copy)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum RewardType {
        TokenFiapo,
        TokenLunes,
        Usdt,
        Boost,
        Nada,
    }

    // --- Structs ---

    #[derive(Debug, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, StorageLayout))]
    pub struct DailyLimits {
        pub total_usdt_cents: u32,
        pub jackpot_hits: u8,
        pub last_reset_timestamp: u64,
    }

    impl Default for DailyLimits {
        fn default() -> Self {
            Self {
                total_usdt_cents: 0,
                jackpot_hits: 0,
                last_reset_timestamp: 0,
            }
        }
    }

    #[derive(Debug, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub struct SpinResult {
        pub reward_id: u8,
        pub reward_type: RewardType,
        pub amount: u128,
        pub wheel_index: u8,
        pub description: String,
    }

    // --- Events ---

    #[ink(event)]
    pub struct SpinExecuted {
        #[ink(topic)]
        player: AccountId,
        package: SpinPackage,
        reward_type: RewardType,
        amount: u128,
        wheel_index: u8,
    }

    #[ink(event)]
    pub struct SpinsPurchased {
        #[ink(topic)]
        player: AccountId,
        amount: u32,
        package: SpinPackage,
    }

    #[ink(event)]
    pub struct JackpotWon {
        #[ink(topic)]
        player: AccountId,
        amount: u128,
    }

    #[ink(event)]
    pub struct BoostActivated {
        #[ink(topic)]
        player: AccountId,
        duration: u64,
    }

    // --- Contract Storage ---

    #[ink(storage)]
    pub struct RoyalWheel {
        owner: AccountId,
        oracle: AccountId, // Trusted source for creating spins (simulated payment)
        paused: bool,
        
        // User State
        spins_balance: Mapping<AccountId, u32>,
        user_active_package: Mapping<AccountId, SpinPackage>,
        user_boost_end_time: Mapping<AccountId, u64>,
        
        // Economy Control
        daily_limits: DailyLimits,
        campaign_usdt_cents: u32,
        
        // Nonce for randomness
        nonce: u64,
    }

    impl RoyalWheel {
        #[ink(constructor)]
        pub fn new(oracle_address: AccountId) -> Self {
            Self {
                owner: Self::env().caller(),
                oracle: oracle_address,
                paused: false,
                spins_balance: Mapping::default(),
                user_active_package: Mapping::default(),
                user_boost_end_time: Mapping::default(),
                daily_limits: DailyLimits::default(),
                campaign_usdt_cents: 0,
                nonce: 0,
            }
        }

        // --- Admin Functions ---

        #[ink(message)]
        pub fn set_oracle(&mut self, oracle: AccountId) -> Result<(), Error> {
            self.ensure_owner()?;
            self.oracle = oracle;
            Ok(())
        }

        #[ink(message)]
        pub fn set_paused(&mut self, paused: bool) -> Result<(), Error> {
            self.ensure_owner()?;
            self.paused = paused;
            Ok(())
        }

        // --- Core Functions ---

        /// Called by Oracle/Backend after payment verification
        #[ink(message)]
        pub fn credit_spins(&mut self, player: AccountId, amount: u32, package_type: u8) -> Result<(), Error> {
            self.ensure_oracle()?;
            
            let package = match package_type {
                0 => SpinPackage::One,
                1 => SpinPackage::Five,
                2 => SpinPackage::TwentyFive,
                3 => SpinPackage::Fifty,
                4 => SpinPackage::Hundred,
                _ => SpinPackage::TwoHundred,
            };

            let current = self.spins_balance.get(player).unwrap_or(0);
            self.spins_balance.insert(player, &current.saturating_add(amount));
            self.user_active_package.insert(player, &package);

            self.env().emit_event(SpinsPurchased {
                player,
                amount,
                package,
            });

            Ok(())
        }

        #[ink(message)]
        pub fn spin(&mut self) -> Result<SpinResult, Error> {
            if self.paused { return Err(Error::ContractPaused); }
            
            let player = self.env().caller();
            let balance = self.spins_balance.get(player).unwrap_or(0);
            
            if balance == 0 {
                return Err(Error::InsufficientSpins);
            }

            // Consume spin
            self.spins_balance.insert(player, &balance.saturating_sub(1));

            // Get context
            let package = self.user_active_package.get(player).unwrap_or(SpinPackage::One);
            self.check_daily_reset();

            // Draw Reward
            let reward = self.draw_reward(player, package);

            // Apply Reward Logic (Storage updates, Limits updates)
            self.apply_reward(&player, &reward);

            // Emit Event
            self.env().emit_event(SpinExecuted {
                player,
                package,
                reward_type: reward.reward_type,
                amount: reward.amount,
                wheel_index: reward.wheel_index,
            });

            Ok(reward)
        }

        #[ink(message)]
        pub fn get_spin_balance(&self, player: AccountId) -> u32 {
            self.spins_balance.get(&player).unwrap_or(0)
        }

        #[ink(message)]
        pub fn get_spins(&self, player: AccountId) -> u32 {
            self.get_spin_balance(player)
        }

        #[ink(message)]
        pub fn get_owner(&self) -> AccountId {
            self.owner
        }

        #[ink(message)]
        pub fn get_oracle(&self) -> AccountId {
            self.oracle
        }

        // --- Internal Logic ---

        fn ensure_owner(&self) -> Result<(), Error> {
            if self.env().caller() != self.owner {
                Err(Error::Unauthorized)
            } else {
                Ok(())
            }
        }

        fn ensure_oracle(&self) -> Result<(), Error> {
            if self.env().caller() != self.oracle {
                Err(Error::Unauthorized)
            } else {
                Ok(())
            }
        }

        fn check_daily_reset(&mut self) {
            let now = self.env().block_timestamp();
            // 86,400,000 ms = 24h
            if now.saturating_sub(self.daily_limits.last_reset_timestamp) > 86_400_000 {
                self.daily_limits.total_usdt_cents = 0;
                self.daily_limits.jackpot_hits = 0;
                self.daily_limits.last_reset_timestamp = now;
            }
        }

        fn weighted_random(&mut self, max: u32) -> u32 {
            let block_number = self.env().block_number();
            let timestamp = self.env().block_timestamp();
            let caller = self.env().caller();
            self.nonce = self.nonce.wrapping_add(1);

            let seed_data = (block_number, timestamp, caller, self.nonce);
            let mut output = <[u8; 32]>::default();
            ink::env::hash_encoded::<ink::env::hash::Keccak256, _>(&seed_data, &mut output);
            
            let random_val = u32::from_le_bytes([output[0], output[1], output[2], output[3]]);
            random_val % max
        }

        fn draw_reward(&mut self, _player: AccountId, package: SpinPackage) -> SpinResult {
            let rng = self.weighted_random(10000); // 0-9999

            // 1. Check Jackpot (0.05% -> < 5)
            // Global check: Max 1/day, 3/campaign (not implemented fully here but daily is)
            if rng < 5 {
                if self.daily_limits.jackpot_hits < MAX_DAILY_JACKPOTS {
                    return self.create_reward(0); // Jackpot
                }
                // Fallback if limit reached -> 50k FIAPO
                return self.create_reward(1); 
            }

            // 2. Select Probability Table based on Package
            // Ranges: (USDT, FIAPO, BOOST) - Nada is remainder
            let (usdt_limit, fiapo_limit, boost_limit) = self.get_thresholds(package);

            // Adjust RHS of ranges for calculation
            // RNG is 5..9999
            // USDT Range: 5 .. (5 + usdt)
            let usdt_end = 5 + usdt_limit;
            let fiapo_end = usdt_end + fiapo_limit;
            let boost_end = fiapo_end + boost_limit;

            if rng < usdt_end {
                // USDT Hit
                // Determine 1 vs 5 USDT (Internal weight: 20% chances for 5 USDT)
                let sub_rng = self.weighted_random(100);
                let (reward_id, amount_cents) = if sub_rng < 20 { (3, 500) } else { (6, 100) };

                // Anti-Drain Check
                if self.daily_limits.total_usdt_cents + amount_cents > MAX_DAILY_USDT_CENTS ||
                   self.campaign_usdt_cents + amount_cents > MAX_CAMPAIGN_USDT_CENTS {
                       // Fallback -> 100 FIAPO (Emotionally better than nothing)
                       return self.create_reward(9);
                }
                return self.create_reward(reward_id);
            }

            if rng < fiapo_end {
                // FIAPO Hit
                // Internal Weights: 
                // 1000 FIAPO (5%)
                // 100 FIAPO (25%)
                // 0.5 FIAPO (70%)
                let sub_rng = self.weighted_random(100);
                if sub_rng < 5 { return self.create_reward(4); }
                if sub_rng < 30 { return self.create_reward(9); }
                
                // 0.5 FIAPO - Randomize index for visual variety (2, 5, 8, 10)
                let visual_rng = self.weighted_random(4);
                let idx = match visual_rng {
                    0 => 2,
                    1 => 5,
                    2 => 8,
                    _ => 10
                };
                return self.create_reward(idx);
            }

            if rng < boost_end {
                return self.create_reward(7); // Boost
            }

            // Nada
            self.create_reward(11)
        }

        fn get_thresholds(&self, package: SpinPackage) -> (u32, u32, u32) {
            match package {
                // Format: (USDT %, FIAPO %, BOOST %) * 100
                SpinPackage::One => (300, 3500, 1200),        // 3%, 35%, 12%
                SpinPackage::Five => (400, 4200, 1600),       // 4%, 42%, 16%
                SpinPackage::TwentyFive => (300, 5500, 2200), // 3%, 55%, 22%
                SpinPackage::Fifty => (200, 6000, 2800),      // 2%, 60%, 28%
                SpinPackage::Hundred => (100, 6500, 3000),    // 1%, 65%, 30%
                SpinPackage::TwoHundred => (50, 7000, 2800),  // 0.5%, 70%, 28%
            }
        }

        fn create_reward(&self, index: u8) -> SpinResult {
            // Mapping Index to Reward Details
            match index {
                0 => SpinResult { reward_id: 0, reward_type: RewardType::TokenFiapo, amount: 100_000, wheel_index: 0, description: "100.000 $FIAPO (Jackpot)".into() },
                1 => SpinResult { reward_id: 1, reward_type: RewardType::TokenFiapo, amount: 50_000, wheel_index: 1, description: "50.000 $FIAPO".into() },
                // 0.5 FIAPO occupies indices 2, 5, 8, 10
                2 => SpinResult { reward_id: 2, reward_type: RewardType::TokenFiapo, amount: 0, wheel_index: 2, description: "0.5 $FIAPO".into() }, // Amount 0 (decimal handled elsewhere) or 0.5 represented appropriately
                3 => SpinResult { reward_id: 3, reward_type: RewardType::Usdt, amount: 500, wheel_index: 3, description: "5 USDT".into() }, // 500 cents
                4 => SpinResult { reward_id: 4, reward_type: RewardType::TokenFiapo, amount: 1_000, wheel_index: 4, description: "1.000 $FIAPO".into() },
                5 => SpinResult { reward_id: 5, reward_type: RewardType::TokenFiapo, amount: 0, wheel_index: 5, description: "0.5 $FIAPO".into() },
                6 => SpinResult { reward_id: 6, reward_type: RewardType::Usdt, amount: 100, wheel_index: 6, description: "1 USDT".into() }, // 100 cents
                7 => SpinResult { reward_id: 7, reward_type: RewardType::Boost, amount: 5, wheel_index: 7, description: "Boost de Staking".into() }, // 5 hours
                8 => SpinResult { reward_id: 8, reward_type: RewardType::TokenFiapo, amount: 0, wheel_index: 8, description: "0.5 $FIAPO".into() },
                9 => SpinResult { reward_id: 9, reward_type: RewardType::TokenFiapo, amount: 100, wheel_index: 9, description: "100 $FIAPO".into() },
                10 => SpinResult { reward_id: 10, reward_type: RewardType::TokenFiapo, amount: 0, wheel_index: 10, description: "0.5 $FIAPO".into() },
                _ => SpinResult { reward_id: 11, reward_type: RewardType::Nada, amount: 0, wheel_index: 11, description: "Nada".into() },
            }
        }

        fn apply_reward(&mut self, player: &AccountId, reward: &SpinResult) {
            match reward.reward_type {
                RewardType::Usdt => {
                    self.daily_limits.total_usdt_cents += reward.amount as u32;
                    self.campaign_usdt_cents += reward.amount as u32;
                    // Logic to transfer USDT would go here (Cross-contract call)
                },
                RewardType::Boost => {
                    let current_end = self.user_boost_end_time.get(player).unwrap_or(0);
                    let now = self.env().block_timestamp();
                    let start_time = if current_end > now { current_end } else { now };
                    let new_end = start_time + BOOST_DURATION_MS;
                    self.user_boost_end_time.insert(player, &new_end);
                    
                    self.env().emit_event(BoostActivated {
                        player: *player,
                        duration: BOOST_DURATION_MS,
                    });
                },
                RewardType::TokenFiapo => {
                    if reward.amount == 100_000 { // Jackpot
                        self.daily_limits.jackpot_hits += 1;
                        self.env().emit_event(JackpotWon{
                            player: *player,
                            amount: reward.amount,
                        });
                    }
                    // Logic to transfer FIAPO tokens (Cross-contract call)
                },
                _ => {}
            }
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;

        fn default_accounts() -> ink::env::test::DefaultAccounts<ink::env::DefaultEnvironment> {
            ink::env::test::default_accounts::<ink::env::DefaultEnvironment>()
        }

        fn set_caller(caller: AccountId) {
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(caller);
        }

        #[allow(dead_code)]
        fn set_block(_block: u32) {
            // Block number não é diretamente configurável no test environment do ink!
        }

        fn set_timestamp(ts: u64) {
            ink::env::test::set_block_timestamp::<ink::env::DefaultEnvironment>(ts);
        }

        /// Testa a criação do contrato
        #[ink::test]
        fn test_new_contract() {
            let accounts = default_accounts();
            set_caller(accounts.alice);
            
            let contract = RoyalWheel::new(accounts.bob);
            
            assert_eq!(contract.get_owner(), accounts.alice);
            assert_eq!(contract.get_oracle(), accounts.bob);
            assert!(!contract.paused);
        }

        /// Testa credit_spins pelo oracle
        #[ink::test]
        fn test_credit_spins() {
            let accounts = default_accounts();
            set_caller(accounts.alice);
            let mut contract = RoyalWheel::new(accounts.bob);
            
            // Oracle (Bob) credita spins
            set_caller(accounts.bob);
            let result = contract.credit_spins(accounts.charlie, 10, 1);
            assert!(result.is_ok());
            
            // Verifica saldo
            assert_eq!(contract.get_spins(accounts.charlie), 10);
        }

        /// Testa que apenas o oracle pode creditar spins
        #[ink::test]
        fn test_credit_spins_unauthorized() {
            let accounts = default_accounts();
            set_caller(accounts.alice);
            let mut contract = RoyalWheel::new(accounts.bob);
            
            // Charlie (não é oracle) tenta creditar
            set_caller(accounts.charlie);
            let result = contract.credit_spins(accounts.django, 10, 1);
            
            assert!(result.is_err());
            assert_eq!(result.unwrap_err(), Error::Unauthorized);
        }

        /// Testa spin básico
        #[ink::test]
        fn test_spin() {
            let accounts = default_accounts();
            set_caller(accounts.alice);
            set_block(1);
            set_timestamp(1000);
            
            let mut contract = RoyalWheel::new(accounts.bob);
            
            // Oracle credita spins
            set_caller(accounts.bob);
            contract.credit_spins(accounts.charlie, 5, 0).unwrap();
            
            // Charlie gira
            set_caller(accounts.charlie);
            set_block(2);
            set_timestamp(2000);
            let result = contract.spin();
            assert!(result.is_ok());
            
            // Verifica que saldo diminuiu
            assert_eq!(contract.get_spins(accounts.charlie), 4);
        }

        /// Testa spin sem saldo
        #[ink::test]
        fn test_spin_insufficient_balance() {
            let accounts = default_accounts();
            set_caller(accounts.alice);
            let mut contract = RoyalWheel::new(accounts.bob);
            
            // Charlie tenta girar sem spins
            set_caller(accounts.charlie);
            let result = contract.spin();
            
            assert!(result.is_err());
            assert_eq!(result.unwrap_err(), Error::InsufficientSpins);
        }

        /// Testa pause/unpause
        #[ink::test]
        fn test_pause_contract() {
            let accounts = default_accounts();
            set_caller(accounts.alice);
            let mut contract = RoyalWheel::new(accounts.bob);
            
            // Owner pausa
            let result = contract.set_paused(true);
            assert!(result.is_ok());
            
            // Oracle credita spins
            set_caller(accounts.bob);
            contract.credit_spins(accounts.charlie, 5, 0).unwrap();
            
            // Charlie tenta girar (deve falhar)
            set_caller(accounts.charlie);
            let result = contract.spin();
            
            assert!(result.is_err());
            assert_eq!(result.unwrap_err(), Error::ContractPaused);
        }

        /// Testa set_oracle
        #[ink::test]
        fn test_set_oracle() {
            let accounts = default_accounts();
            set_caller(accounts.alice);
            let mut contract = RoyalWheel::new(accounts.bob);
            
            // Owner muda oracle
            let result = contract.set_oracle(accounts.django);
            assert!(result.is_ok());
            assert_eq!(contract.get_oracle(), accounts.django);
            
            // Bob (antigo oracle) não consegue mais creditar
            set_caller(accounts.bob);
            let result = contract.credit_spins(accounts.charlie, 5, 0);
            assert!(result.is_err());
            
            // Dave (novo oracle) consegue
            set_caller(accounts.django);
            let result = contract.credit_spins(accounts.charlie, 5, 0);
            assert!(result.is_ok());
        }

        /// Testa set_oracle por não-owner
        #[ink::test]
        fn test_set_oracle_unauthorized() {
            let accounts = default_accounts();
            set_caller(accounts.alice);
            let mut contract = RoyalWheel::new(accounts.bob);
            
            // Charlie tenta mudar oracle
            set_caller(accounts.charlie);
            let result = contract.set_oracle(accounts.django);
            
            assert!(result.is_err());
            assert_eq!(result.unwrap_err(), Error::Unauthorized);
        }

        /// Testa múltiplos spins
        #[ink::test]
        fn test_multiple_spins() {
            let accounts = default_accounts();
            set_caller(accounts.alice);
            set_block(1);
            set_timestamp(1000);
            
            let mut contract = RoyalWheel::new(accounts.bob);
            
            // Oracle credita 3 spins
            set_caller(accounts.bob);
            contract.credit_spins(accounts.charlie, 3, 2).unwrap();
            
            // Charlie gira 3 vezes
            set_caller(accounts.charlie);
            for i in 0..3 {
                set_block(i + 2);
                set_timestamp((i as u64 + 2) * 1000);
                let result = contract.spin();
                assert!(result.is_ok());
            }
            
            // Verifica que saldo zerou
            assert_eq!(contract.get_spins(accounts.charlie), 0);
            
            // Tentar girar novamente deve falhar
            set_block(10);
            let result = contract.spin();
            assert_eq!(result.unwrap_err(), Error::InsufficientSpins);
        }

        /// Testa reward creation
        #[ink::test]
        fn test_create_reward() {
            let accounts = default_accounts();
            set_caller(accounts.alice);
            let contract = RoyalWheel::new(accounts.bob);
            
            // Testa jackpot
            let jackpot = contract.create_reward(0);
            assert_eq!(jackpot.reward_type, RewardType::TokenFiapo);
            assert_eq!(jackpot.amount, 100_000);
            
            // Testa USDT
            let usdt = contract.create_reward(3);
            assert_eq!(usdt.reward_type, RewardType::Usdt);
            assert_eq!(usdt.amount, 500);
            
            // Testa Boost
            let boost = contract.create_reward(7);
            assert_eq!(boost.reward_type, RewardType::Boost);
            
            // Testa Nada
            let nada = contract.create_reward(11);
            assert_eq!(nada.reward_type, RewardType::Nada);
        }

        /// Testa daily reset
        #[ink::test]
        fn test_daily_reset() {
            let accounts = default_accounts();
            set_caller(accounts.alice);
            set_timestamp(0);
            
            let mut contract = RoyalWheel::new(accounts.bob);
            
            // Simula limite atingido
            contract.daily_limits.total_usdt_cents = 100;
            contract.daily_limits.jackpot_hits = 1;
            contract.daily_limits.last_reset_timestamp = 0;
            
            // Avança 25 horas (mais de 24h)
            set_timestamp(25 * 60 * 60 * 1000);
            contract.check_daily_reset();
            
            // Verifica que limites foram resetados
            assert_eq!(contract.daily_limits.total_usdt_cents, 0);
            assert_eq!(contract.daily_limits.jackpot_hits, 0);
        }
    }
}
