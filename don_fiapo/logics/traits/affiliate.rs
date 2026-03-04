//! # Affiliate Trait Definition
//! 
//! Pure ink! trait for type-safe cross-contract calls to the Affiliate contract.
//! No OpenBrush dependency.
//! 
//! NOTE: FiapoAffiliate methods are standalone (not via trait), so we use
//! build_call with explicit selectors for cross-contract calls.
//! The helpers below provide a convenient wrapper.

use fiapo_traits::{AccountId, Balance};

/// Helper for cross-contract calls to Affiliate using build_call.
/// Uses raw selectors because FiapoAffiliate methods are standalone #[ink(message)].
pub struct AffiliateCall;

impl AffiliateCall {
    /// Calls `calculate_apy_boost(user) -> u32` on the affiliate contract.
    /// Selector: blake2b("calculate_apy_boost")[:4]
    pub fn calculate_apy_boost(affiliate_addr: AccountId, user: AccountId) -> u32 {
        use ink::env::call::{build_call, ExecutionInput, Selector};

        let selector = ink::selector_bytes!("calculate_apy_boost");

        let result = build_call::<ink::env::DefaultEnvironment>()
            .call(affiliate_addr)
            .gas_limit(0)
            .transferred_value(0)
            .exec_input(
                ExecutionInput::new(Selector::new(selector))
                    .push_arg(user)
            )
            .returns::<u32>()
            .try_invoke();

        match result {
            Ok(Ok(val)) => val,
            _ => 0,
        }
    }

    /// Calls `update_referral_activity(user, staked_amount)` on the affiliate contract.
    /// Selector: blake2b("update_referral_activity")[:4]
    pub fn update_referral_activity(
        affiliate_addr: AccountId,
        user: AccountId,
        amount: Balance,
    ) -> Result<(), ()> {
        use ink::env::call::{build_call, ExecutionInput, Selector};

        let selector = ink::selector_bytes!("update_referral_activity");

        let result = build_call::<ink::env::DefaultEnvironment>()
            .call(affiliate_addr)
            .gas_limit(0)
            .transferred_value(0)
            .exec_input(
                ExecutionInput::new(Selector::new(selector))
                    .push_arg(user)
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
