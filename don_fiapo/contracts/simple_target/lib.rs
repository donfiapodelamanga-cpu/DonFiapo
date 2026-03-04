#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[ink::contract]
mod simple_target {
    #[ink(storage)]
    pub struct SimpleTarget {}

    impl SimpleTarget {
        #[ink(constructor)]
        pub fn new() -> Self {
            Self {}
        }

        #[ink(message, selector = 0x9072b114)]
        pub fn ping(&self) -> u32 {
            123
        }
    }
}

#[cfg(feature = "ink-as-dependency")]
pub use self::simple_target::*;
