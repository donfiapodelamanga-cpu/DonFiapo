//! # Fiapo Logics
//! 
//! Shared traits and logic for Don Fiapo ecosystem cross-contract calls.
//! Uses pure ink! contract_ref! and build_call for type-safe inter-contract communication.
//! No OpenBrush dependency.

#![cfg_attr(not(feature = "std"), no_std, no_main)]

pub mod traits;
