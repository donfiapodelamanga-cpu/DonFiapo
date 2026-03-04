//! # PSP22 Trait Definition
//! 
//! Pure ink! trait references for type-safe cross-contract calls to PSP22 token contracts.
//! Uses IPSP22 from fiapo-traits to guarantee matching selectors with fiapo-core.

use fiapo_traits::{IPSP22, IPSP22Mintable, IPSP22Burnable};
use ink::env::DefaultEnvironment as Environment;

/// Reference type for cross-contract calls to PSP22 (transfer, balance_of, etc.)
pub type PSP22Ref = ink::contract_ref!(IPSP22);

/// Reference type for cross-contract calls to PSP22 Mintable (mint_to)
pub type PSP22MintableRef = ink::contract_ref!(IPSP22Mintable);

/// Reference type for cross-contract calls to PSP22 Burnable (burn, burn_from)
pub type PSP22BurnableRef = ink::contract_ref!(IPSP22Burnable);

// Re-export traits for convenience
pub use fiapo_traits::{IPSP22 as PSP22, IPSP22Mintable as PSP22Mintable, IPSP22Burnable as PSP22Burnable};
