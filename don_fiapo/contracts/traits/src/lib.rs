//! # Fiapo Traits
//! 
//! Shared trait definitions for cross-contract communication in the Don Fiapo ecosystem.
//! 
//! These traits define the interfaces that contracts use to communicate with each other,
//! following ink! 4.x best practices for modular contract architecture.

#![cfg_attr(not(feature = "std"), no_std, no_main)]

use ink::prelude::string::String;
use ink::prelude::vec::Vec;

// Re-export common types
pub use ink::primitives::AccountId;

/// Balance type used across all contracts
pub type Balance = u128;

/// Result type for PSP22 operations
pub type PSP22Result<T> = core::result::Result<T, PSP22Error>;

/// Error types for PSP22 token operations
#[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub enum PSP22Error {
    /// Custom error with message
    Custom(String),
    /// Insufficient balance for transfer
    InsufficientBalance,
    /// Insufficient allowance for transferFrom
    InsufficientAllowance,
    /// Zero address not allowed as sender
    ZeroSenderAddress,
    /// Zero address not allowed as recipient
    ZeroRecipientAddress,
    /// Safe transfer check failed
    SafeTransferCheckFailed(String),
    /// Caller not authorized for this operation
    NotAuthorized,
    /// System is paused
    SystemPaused,
    /// Max supply exceeded
    MaxSupplyExceeded,
}

/// PSP22 Token Standard Interface
/// 
/// This trait defines the standard fungible token interface compatible with PSP22.
#[ink::trait_definition]
pub trait IPSP22 {
    /// Returns the total token supply
    #[ink(message)]
    fn total_supply(&self) -> Balance;
    
    /// Returns the account balance of `owner`
    #[ink(message)]
    fn balance_of(&self, owner: AccountId) -> Balance;
    
    /// Returns the amount which `spender` is still allowed to withdraw from `owner`
    #[ink(message)]
    fn allowance(&self, owner: AccountId, spender: AccountId) -> Balance;
    
    /// Transfers `value` amount of tokens from caller to `to`
    #[ink(message)]
    fn transfer(&mut self, to: AccountId, value: Balance) -> PSP22Result<()>;
    
    /// Transfers `value` tokens from `from` to `to` using allowance mechanism
    #[ink(message)]
    fn transfer_from(&mut self, from: AccountId, to: AccountId, value: Balance) -> PSP22Result<()>;
    
    /// Allows `spender` to withdraw from caller's account multiple times up to `value`
    #[ink(message)]
    fn approve(&mut self, spender: AccountId, value: Balance) -> PSP22Result<()>;
}

/// PSP22 Mintable Extension
/// 
/// Allows authorized contracts to mint new tokens.
#[ink::trait_definition]
pub trait IPSP22Mintable {
    /// Mints `amount` tokens to `to` account
    /// 
    /// # Security
    /// This function should only be callable by authorized contracts (e.g., ICO, Staking)
    #[ink(message)]
    fn mint_to(&mut self, to: AccountId, amount: Balance) -> PSP22Result<()>;
}

/// PSP22 Burnable Extension
/// 
/// Allows authorized burning of tokens.
#[ink::trait_definition]
pub trait IPSP22Burnable {
    /// Burns `amount` tokens from caller's account
    #[ink(message)]
    fn burn(&mut self, amount: Balance) -> PSP22Result<()>;
    
    /// Burns `amount` tokens from `from` account (requires authorization)
    #[ink(message)]
    fn burn_from(&mut self, from: AccountId, amount: Balance) -> PSP22Result<()>;
}

/// Staking Contract Interface
#[ink::trait_definition]
pub trait IStaking {
    /// Stakes `amount` tokens in the specified pool
    #[ink(message)]
    fn stake(&mut self, pool_type: u8, amount: Balance) -> PSP22Result<u64>;
    
    /// Unstakes position and claims rewards
    #[ink(message)]
    fn unstake(&mut self, position_id: u64) -> PSP22Result<Balance>;
    
    /// Claims pending rewards for a position
    #[ink(message)]
    fn claim_rewards(&mut self, position_id: u64) -> PSP22Result<Balance>;
    
    /// Returns total staked amount across all pools
    #[ink(message)]
    fn total_staked(&self) -> Balance;
}

/// ICO/NFT Contract Interface
#[ink::trait_definition]
pub trait IICO {
    /// Mints a new NFT of the specified type
    #[ink(message)]
    fn mint_nft(&mut self, nft_type: u8) -> PSP22Result<u64>;
    
    /// Claims mined tokens from an NFT
    #[ink(message)]
    fn claim_mined(&mut self, nft_id: u64) -> PSP22Result<Balance>;
    
    /// Returns the total number of NFTs created
    #[ink(message)]
    fn total_nfts(&self) -> u64;
    
    /// Returns NFTs owned by an account
    #[ink(message)]
    fn nfts_of(&self, owner: AccountId) -> Vec<u64>;
}

/// Governance Contract Interface
#[ink::trait_definition]
pub trait IGovernance {
    /// Creates a new proposal
    #[ink(message)]
    fn create_proposal(&mut self, description: String) -> PSP22Result<u64>;
    
    /// Casts a vote on a proposal
    #[ink(message)]
    fn vote(&mut self, proposal_id: u64, support: bool) -> PSP22Result<()>;
    
    /// Executes an approved proposal
    #[ink(message)]
    fn execute_proposal(&mut self, proposal_id: u64) -> PSP22Result<()>;
}

/// Lottery Contract Interface
#[ink::trait_definition]
pub trait ILottery {
    /// Registers for the current lottery period
    #[ink(message)]
    fn register(&mut self) -> PSP22Result<()>;
    
    /// Executes the lottery draw (admin only)
    #[ink(message)]
    fn draw(&mut self) -> PSP22Result<Vec<AccountId>>;
    
    /// Returns if an account is eligible for lottery
    #[ink(message)]
    fn is_eligible(&self, account: AccountId) -> bool;
}

/// Affiliate Contract Interface
#[ink::trait_definition]
pub trait IAffiliate {
    /// Registers a referral relationship
    #[ink(message)]
    fn register_referral(&mut self, referrer: AccountId) -> PSP22Result<()>;
    
    /// Gets the referrer of an account
    #[ink(message)]
    fn get_referrer(&self, account: AccountId) -> Option<AccountId>;
    
    /// Calculates APY boost based on active affiliates
    #[ink(message)]
    fn calculate_apy_boost(&self, account: AccountId) -> u32;
    
    /// Updates referral activity (called by Staking)
    #[ink(message)]
    fn update_referral_activity(&mut self, user: AccountId, staked_amount: Balance) -> PSP22Result<()>;
}

/// Rewards Contract Interface
#[ink::trait_definition]
pub trait IRewards {
    /// Claims pending rewards
    #[ink(message)]
    fn claim(&mut self) -> PSP22Result<Balance>;
    
    /// Returns pending reward for an account
    #[ink(message)]
    fn pending_reward(&self, account: AccountId) -> Balance;
    
    /// Adds rewards to an account (called by other contracts)
    #[ink(message)]
    fn add_reward(&mut self, user: AccountId, amount: Balance) -> PSP22Result<()>;
    
    /// Updates wallet data for ranking (called by other contracts)
    #[ink(message)]
    fn update_wallet_data(
        &mut self,
        wallet: AccountId,
        balance: Balance,
        staking_balance: Balance,
        burn_volume: Balance,
        affiliate_count: u32,
        governance_score: u32,
    ) -> PSP22Result<()>;
}

/// Bridge Contract Interface
#[ink::trait_definition]
pub trait IBridge {
    /// Initiates a bridge request to Solana
    #[ink(message)]
    fn initiate_bridge(&mut self, amount: Balance, destination: String) -> PSP22Result<u64>;
    
    /// Submits oracle confirmation for a payment
    #[ink(message)]
    fn submit_payment_confirmation(
        &mut self,
        tx_hash: String,
        sender_address: String,
        amount: Balance,
        beneficiary: AccountId,
        payment_type: String,
    ) -> PSP22Result<bool>;
    
    /// Checks if an account is an authorized oracle
    #[ink(message)]
    fn is_oracle(&self, account: AccountId) -> bool;
}

/// Airdrop Contract Interface
#[ink::trait_definition]
pub trait IAirdrop {
    /// Claims airdrop rewards for current round
    #[ink(message)]
    fn claim(&mut self) -> PSP22Result<Balance>;
    
    /// Updates user points (called by other contracts)
    #[ink(message)]
    fn update_balance_points(&mut self, user: AccountId, balance: Balance) -> PSP22Result<()>;
    
    /// Updates staking points
    #[ink(message)]
    fn update_staking_points(&mut self, user: AccountId, staked: Balance) -> PSP22Result<()>;
    
    /// Gets user points for current round
    #[ink(message)]
    fn get_user_points(&self, user: AccountId) -> Balance;
}

/// Marketplace Contract Interface
#[ink::trait_definition]
pub trait IMarketplace {
    /// Lists an NFT for sale
    #[ink(message)]
    fn list_nft(&mut self, nft_id: u64, price: Balance) -> PSP22Result<()>;
    
    /// Buys a listed NFT
    #[ink(message)]
    fn buy_nft(&mut self, nft_id: u64) -> PSP22Result<()>;
    
    /// Cancels a listing
    #[ink(message)]
    fn cancel_listing(&mut self, nft_id: u64) -> PSP22Result<()>;
    
    /// Returns total marketplace volume
    #[ink(message)]
    fn total_volume(&self) -> Balance;
}

/// NFT Type enumeration for ICO
#[derive(Debug, Clone, Copy, PartialEq, Eq, scale::Encode, scale::Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub enum NFTType {
    /// Free tier NFT
    Free = 0,
    /// Bronze tier NFT ($30)
    Bronze = 1,
    /// Silver tier NFT ($150)
    Silver = 2,
    /// Gold tier NFT ($500)
    Gold = 3,
    /// Platinum tier NFT ($1,500)
    Platinum = 4,
    /// Diamond tier NFT ($5,000)
    Diamond = 5,
    /// Black tier NFT ($15,000)
    Black = 6,
}

impl NFTType {
    pub fn from_u8(value: u8) -> Option<Self> {
        match value {
            0 => Some(NFTType::Free),
            1 => Some(NFTType::Bronze),
            2 => Some(NFTType::Silver),
            3 => Some(NFTType::Gold),
            4 => Some(NFTType::Platinum),
            5 => Some(NFTType::Diamond),
            6 => Some(NFTType::Black),
            _ => None,
        }
    }
}

/// Staking pool type
#[derive(Debug, Clone, Copy, PartialEq, Eq, scale::Encode, scale::Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub enum StakingPoolType {
    /// Don Burn pool - daily rewards, 10-300% APY
    DonBurn = 0,
    /// Don Lunes pool - weekly rewards, 6-37% APY
    DonLunes = 1,
    /// Don Fiapo pool - monthly rewards, 7-70% APY
    DonFiapo = 2,
}

impl StakingPoolType {
    pub fn from_u8(value: u8) -> Option<Self> {
        match value {
            0 => Some(StakingPoolType::DonBurn),
            1 => Some(StakingPoolType::DonLunes),
            2 => Some(StakingPoolType::DonFiapo),
            _ => None,
        }
    }
}

// ==================== Security Module ====================

/// Erros de segurança compartilhados
#[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub enum SecurityError {
    IntegerOverflow,
    IntegerUnderflow,
    DivisionByZero,
    ReentrancyDetected,
    InvalidInput,
    ZeroAddress,
    InvalidAmount,
    InvalidAddress,
    Unauthorized,
    SystemPaused,
    RateLimitExceeded,
}

/// Validações de segurança para operações matemáticas
pub struct MathValidator;

impl MathValidator {
    /// Adição segura com verificação de overflow
    #[inline]
    pub fn safe_add(a: u128, b: u128) -> Result<u128, SecurityError> {
        a.checked_add(b).ok_or(SecurityError::IntegerOverflow)
    }

    /// Subtração segura com verificação de underflow
    #[inline]
    pub fn safe_sub(a: u128, b: u128) -> Result<u128, SecurityError> {
        a.checked_sub(b).ok_or(SecurityError::IntegerUnderflow)
    }

    /// Multiplicação segura com verificação de overflow
    #[inline]
    pub fn safe_mul(a: u128, b: u128) -> Result<u128, SecurityError> {
        a.checked_mul(b).ok_or(SecurityError::IntegerOverflow)
    }

    /// Divisão segura com verificação de divisão por zero
    #[inline]
    pub fn safe_div(dividend: u128, divisor: u128) -> Result<u128, SecurityError> {
        if divisor == 0 {
            return Err(SecurityError::DivisionByZero);
        }
        Ok(dividend / divisor)
    }

    /// Calcula porcentagem de forma segura (value * percentage / base)
    pub fn safe_percentage(value: u128, percentage: u16, base: u16) -> Result<u128, SecurityError> {
        if base == 0 {
            return Err(SecurityError::DivisionByZero);
        }
        Self::safe_mul(value, percentage as u128)
            .and_then(|result| Self::safe_div(result, base as u128))
    }

    /// Calcula porcentagem em basis points (value * bps / 10000)
    pub fn safe_bps(value: u128, bps: u16) -> Result<u128, SecurityError> {
        Self::safe_percentage(value, bps, 10000)
    }
}

/// Validações de input
pub struct InputValidator;

impl InputValidator {
    /// Valida se um endereço não é zero
    pub fn validate_address(address: &AccountId) -> Result<(), SecurityError> {
        if *address == AccountId::from([0u8; 32]) {
            return Err(SecurityError::ZeroAddress);
        }
        Ok(())
    }

    /// Valida valor positivo (maior que zero)
    pub fn validate_positive_amount(amount: u128) -> Result<(), SecurityError> {
        if amount == 0 {
            return Err(SecurityError::InvalidAmount);
        }
        Ok(())
    }

    /// Valida range de valor
    pub fn validate_range(value: u128, min: u128, max: u128) -> Result<(), SecurityError> {
        if value < min || value > max {
            return Err(SecurityError::InvalidInput);
        }
        Ok(())
    }

    /// Valida se endereços são únicos (sem duplicatas)
    pub fn validate_unique_addresses(addresses: &[AccountId]) -> Result<(), SecurityError> {
        for i in 0..addresses.len() {
            for j in i + 1..addresses.len() {
                if addresses[i] == addresses[j] {
                    return Err(SecurityError::InvalidAddress);
                }
            }
        }
        Ok(())
    }
}

/// Utilitário para validação de timestamps
pub struct TimeValidator;

impl TimeValidator {
    /// Valida se o timestamp está dentro de uma tolerância
    pub fn validate_timestamp(timestamp: u64, current_time: u64, tolerance: u64) -> Result<(), SecurityError> {
        if timestamp > current_time.saturating_add(tolerance) {
            return Err(SecurityError::InvalidInput);
        }
        if timestamp < current_time.saturating_sub(tolerance) {
            return Err(SecurityError::InvalidInput);
        }
        Ok(())
    }

    /// Valida período de tempo válido (end > start, duração mínima)
    pub fn validate_period(start: u64, end: u64, min_duration: u64) -> Result<(), SecurityError> {
        if end <= start {
            return Err(SecurityError::InvalidInput);
        }
        let duration = end.saturating_sub(start);
        if duration < min_duration {
            return Err(SecurityError::InvalidInput);
        }
        Ok(())
    }
}
