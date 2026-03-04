
#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[ink::contract]
mod test_cross {
    use fiapo_logics::traits::staking::StakingRef;
    use fiapo_logics::traits::staking::Staking;

    #[ink(storage)]
    pub struct TestCross {
        staking: StakingRef,
    }

    impl TestCross {
        #[ink(constructor)]
        pub fn new(staking_addr: AccountId) -> Self {
            let staking: StakingRef = staking_addr.into();
            Self { staking }
        }

        #[ink(message)]
        pub fn ping(&self) -> u32 {
            self.staking.ping()
        }



        #[ink(message)]
        pub fn ping_manual_addr(&self, target: AccountId) -> u32 {
            use ink::env::call::{build_call, ExecutionInput, Selector};
            
            // Selector for Staking::ping is 0x9072b114
            let result = build_call::<ink::env::DefaultEnvironment>()
                .call(target)
                .exec_input(ExecutionInput::new(Selector::new([0x90, 0x72, 0xb1, 0x14])))
                .returns::<u32>()
                .try_invoke();
            
            match result {
                Ok(Ok(val)) => val,
                _ => 0
            }
        }
}
}
