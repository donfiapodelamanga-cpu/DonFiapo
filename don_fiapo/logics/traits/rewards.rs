//! # Rewards Trait Definition
//! 
//! Pure ink! helper for type-safe cross-contract calls to the Rewards contract.
//! No OpenBrush dependency.
//! 
//! NOTE: FiapoRewards methods are standalone (not via trait), so we use
//! build_call with explicit selectors for cross-contract calls.

use fiapo_traits::{AccountId, Balance};

/// Helper for cross-contract calls to Rewards using build_call.
/// Uses raw selectors because FiapoRewards methods are standalone #[ink(message)].
pub struct RewardsCall;

impl RewardsCall {
    /// Calls `add_rewards_fund(amount)` on the rewards contract.
    /// Selector: blake2b("add_rewards_fund")[:4]
    pub fn add_rewards_fund(rewards_addr: AccountId, amount: Balance) -> Result<(), ()> {
        use ink::env::call::{build_call, ExecutionInput, Selector};

        let selector = ink::selector_bytes!("add_rewards_fund");

        let result = build_call::<ink::env::DefaultEnvironment>()
            .call(rewards_addr)
            .gas_limit(0)
            .transferred_value(0)
            .exec_input(
                ExecutionInput::new(Selector::new(selector))
                    .push_arg(amount)
            )
            .returns::<()>()
            .try_invoke();

        match result {
            Ok(Ok(_)) => Ok(()),
            _ => Err(()),
        }
    }
}
