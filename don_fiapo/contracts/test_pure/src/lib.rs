#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[ink::contract]
mod test_pure {
    use ink::env::call::{build_call, ExecutionInput, Selector};
    use ink::env::DefaultEnvironment;
    
    // Define minimal trait locally to avoid external dependencies
    #[ink::trait_definition]
    pub trait StakingTrait {
        #[ink(message)]
        fn ping(&self) -> u32;
    }

    #[ink(storage)]
    pub struct TestPure {
        target: AccountId,
    }

    impl TestPure {
        #[ink(constructor)]
        pub fn new(target: AccountId) -> Self {
            Self { target }
        }

        #[ink(message)]
        pub fn ping_ref(&self) -> u32 {
            // Method 1: Using contract_ref! macro with local trait
            let mut staking: ink::contract_ref!(StakingTrait) = self.target.into();
            staking.ping()
        }

        #[ink(message)]
        pub fn ping_builder(&self) -> u32 {
            // Method 2: Raw CallBuilder
            build_call::<DefaultEnvironment>()
                .call(self.target)
                .exec_input(ExecutionInput::new(Selector::new([0x90, 0x72, 0xb1, 0x14])))
                .returns::<u32>()
                .invoke()
        }
    }
}
