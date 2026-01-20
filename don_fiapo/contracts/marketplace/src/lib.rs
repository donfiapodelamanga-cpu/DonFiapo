//! # Fiapo Marketplace Contract
//!
//! Marketplace para NFTs do ecossistema Don Fiapo.

#![cfg_attr(not(feature = "std"), no_std, no_main)]

use fiapo_traits::{AccountId, Balance};

#[ink::contract]
mod fiapo_marketplace {
    use super::*;
    use ink::prelude::vec::Vec;
    use ink::storage::Mapping;

    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum MarketplaceError {
        Unauthorized,
        ListingNotFound,
        InsufficientFunds,
        NFTNotOwned,
    }

    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct Listing {
        pub nft_id: u64,
        pub seller: AccountId,
        pub price: Balance,
        pub active: bool,
    }

    #[ink(event)]
    pub struct NFTListed {
        #[ink(topic)]
        nft_id: u64,
        seller: AccountId,
        price: Balance,
    }

    #[ink(event)]
    pub struct NFTSold {
        #[ink(topic)]
        nft_id: u64,
        seller: AccountId,
        buyer: AccountId,
        price: Balance,
    }

    #[ink(storage)]
    pub struct FiapoMarketplace {
        core_contract: AccountId,
        ico_contract: AccountId,
        owner: AccountId,
        listings: Mapping<u64, Listing>,
        active_listings: Vec<u64>,
        fee_bps: u16,
        total_volume: Balance,
    }

    impl FiapoMarketplace {
        #[ink(constructor)]
        pub fn new(core_contract: AccountId, ico_contract: AccountId) -> Self {
            Self {
                core_contract,
                ico_contract,
                owner: Self::env().caller(),
                listings: Mapping::default(),
                active_listings: Vec::new(),
                fee_bps: 250, // 2.5% fee
                total_volume: 0,
            }
        }

        #[ink(message)]
        pub fn core_contract(&self) -> AccountId {
            self.core_contract
        }

        #[ink(message)]
        pub fn get_listing(&self, nft_id: u64) -> Option<Listing> {
            self.listings.get(nft_id)
        }

        #[ink(message)]
        pub fn get_active_listings(&self) -> Vec<u64> {
            self.active_listings.clone()
        }

        #[ink(message)]
        pub fn total_volume(&self) -> Balance {
            self.total_volume
        }

        #[ink(message)]
        pub fn list_nft(&mut self, nft_id: u64, price: Balance) -> Result<(), MarketplaceError> {
            let caller = self.env().caller();

            let listing = Listing {
                nft_id,
                seller: caller,
                price,
                active: true,
            };

            self.listings.insert(nft_id, &listing);
            self.active_listings.push(nft_id);

            Self::env().emit_event(NFTListed {
                nft_id,
                seller: caller,
                price,
            });

            Ok(())
        }

        #[ink(message)]
        pub fn buy_nft(&mut self, nft_id: u64) -> Result<(), MarketplaceError> {
            let buyer = self.env().caller();

            let mut listing = self.listings.get(nft_id)
                .ok_or(MarketplaceError::ListingNotFound)?;

            if !listing.active {
                return Err(MarketplaceError::ListingNotFound);
            }

            listing.active = false;
            self.listings.insert(nft_id, &listing);

            // Remove from active
            self.active_listings.retain(|&id| id != nft_id);
            self.total_volume = self.total_volume.saturating_add(listing.price);

            Self::env().emit_event(NFTSold {
                nft_id,
                seller: listing.seller,
                buyer,
                price: listing.price,
            });

            Ok(())
        }

        #[ink(message)]
        pub fn cancel_listing(&mut self, nft_id: u64) -> Result<(), MarketplaceError> {
            let caller = self.env().caller();

            let mut listing = self.listings.get(nft_id)
                .ok_or(MarketplaceError::ListingNotFound)?;

            if listing.seller != caller {
                return Err(MarketplaceError::Unauthorized);
            }

            listing.active = false;
            self.listings.insert(nft_id, &listing);
            self.active_listings.retain(|&id| id != nft_id);

            Ok(())
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;

        #[ink::test]
        fn constructor_works() {
            let accounts = ink::env::test::default_accounts::<ink::env::DefaultEnvironment>();
            let contract = FiapoMarketplace::new(accounts.charlie, accounts.django);
            assert_eq!(contract.total_volume(), 0);
        }
    }
}
