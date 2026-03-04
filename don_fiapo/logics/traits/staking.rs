//! # Staking Trait Definition
//! 
//! Pure ink! trait for type-safe cross-contract calls to the Staking contract.
//! No OpenBrush dependency.

use ink::prelude::vec::Vec;
use fiapo_traits::AccountId;
use ink::env::DefaultEnvironment as Environment;

/// Reference type for cross-contract calls to Staking
pub type StakingRef = ink::contract_ref!(Staking);

/// Staking trait for cross-contract communication
#[ink::trait_definition]
pub trait Staking {
    /// Returns a simple ping value (123) for connectivity test
    #[ink(message)]
    fn ping(&self) -> u32;

    /// Gets all staking position IDs for a user
    #[ink(message)]
    fn get_user_positions(&self, user: AccountId) -> Vec<u64>;

    /// Gets the core contract address
    #[ink(message)]
    fn core_contract(&self) -> AccountId;
}
