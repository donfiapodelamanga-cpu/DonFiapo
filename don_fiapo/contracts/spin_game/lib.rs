#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[ink::contract]
pub mod spin_game {
    use ink::storage::Mapping;
    use ink::prelude::string::String;
    const SCALE: u128 = 1_00000000; // 8 decimals

    #[derive(Debug, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum Error {
        Unauthorized,
        InsufficientSpins,
        InvalidPrize,
    }

    #[ink(event)]
    pub struct SpinsCredited {
        #[ink(topic)]
        player: AccountId,
        amount: u32,
        #[ink(topic)]
        purchase_tx: String,
    }

    #[ink(event)]
    pub struct WheelSpun {
        #[ink(topic)]
        player: AccountId,
        prize_index: u8,
        prize_description: String,
    }

    #[ink(storage)]
    pub struct SpinGame {
        owner: AccountId,
        oracle: AccountId,
        spin_balances: Mapping<AccountId, u32>,
    }

    impl SpinGame {
        #[ink(constructor)]
        pub fn new(oracle_address: AccountId) -> Self {
            Self {
                owner: Self::env().caller(),
                oracle: oracle_address,
                spin_balances: Mapping::default(),
            }
        }

        #[ink(message)]
        pub fn get_spin_balance(&self, player: AccountId) -> u32 {
            self.spin_balances.get(&player).unwrap_or(0)
        }

        #[ink(message)]
        pub fn credit_spins(&mut self, player: AccountId, amount: u32, purchase_tx: String) -> Result<(), Error> {
            if self.env().caller() != self.oracle {
                return Err(Error::Unauthorized);
            }

            let current_spins = self.get_spin_balance(player);
            let new_spins = current_spins.saturating_add(amount);
            self.spin_balances.insert(player, &new_spins);

            self.env().emit_event(SpinsCredited {
                player,
                amount,
                purchase_tx,
            });

            Ok(())
        }

        #[ink(message)]
        pub fn spin_the_wheel(&mut self) -> Result<(u8, String), Error> {
            let caller = self.env().caller();
            let current_spins = self.get_spin_balance(caller);

            if current_spins == 0 {
                return Err(Error::InsufficientSpins);
            }

            self.spin_balances.insert(caller, &current_spins.saturating_sub(1));

            let (prize_index, prize_description) = self.determine_prize();

            self.env().emit_event(WheelSpun {
                player: caller,
                prize_index,
                prize_description: prize_description.clone(),
            });

            Ok((prize_index, prize_description))
        }

        fn determine_prize(&self) -> (u8, String) {
            let caller = self.env().caller();
            let caller_bytes: &[u8] = caller.as_ref();
            let caller_sum = caller_bytes.iter().fold(0u64, |acc, &b| acc.wrapping_add(b as u64));
            let seed = self.env().block_timestamp().wrapping_add(caller_sum);
            
            let pseudo_random = (seed % 10000) as u32;

            match pseudo_random {
                0..=5 => (0, "100.000 $FIAPO (Jackpot)".into()),
                6..=30 => (1, "50.000 $FIAPO".into()),
                31..=130 => (2, "10.000 Lunes".into()),
                131..=330 => (3, "5 USDT".into()),
                331..=630 => (4, "1.000 $FIAPO".into()),
                631..=1130 => (5, "Caixa Misteriosa".into()),
                1131..=1730 => (6, "1 USDT".into()),
                1731..=2530 => (7, "Boost de Staking".into()),
                2531..=3530 => (8, "20 Lunes".into()),
                3531..=5030 => (9, "100 $FIAPO".into()),
                5031..=7030 => (10, "10 Lunes".into()),
                _ => (11, "Nada".into()),
            }
        }
    }
}
