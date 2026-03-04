//! # Oracle Trait Definition
//! 
//! Pure ink! trait for type-safe cross-contract calls to the Oracle Multisig contract.
//! No OpenBrush dependency.

use fiapo_traits::AccountId;
use ink::prelude::string::String;
use ink::env::DefaultEnvironment as Environment;

/// Reference type for cross-contract calls to Oracle
pub type OracleRef = ink::contract_ref!(Oracle);

/// Oracle trait for cross-contract communication
#[ink::trait_definition]
pub trait Oracle {
    /// Verifies if a payment has been confirmed by the oracle
    #[ink(message)]
    fn is_payment_confirmed(
        &self,
        tx_hash: String,
        user: AccountId,
        amount_cents: u64,
        is_governance_deposit: bool,
    ) -> bool;
}
