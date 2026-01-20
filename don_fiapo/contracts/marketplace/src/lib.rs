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
        staking_contract: Option<AccountId>,
        owner: AccountId,
        team_wallet: AccountId,
        listings: Mapping<u64, Listing>,
        active_listings: Vec<u64>,
        fee_bps: u16,
        total_volume: Balance,
        total_fees_collected: Balance,
    }

    impl FiapoMarketplace {
        #[ink(constructor)]
        pub fn new(core_contract: AccountId, ico_contract: AccountId) -> Self {
            let caller = Self::env().caller();
            Self {
                core_contract,
                ico_contract,
                staking_contract: None,
                owner: caller,
                team_wallet: caller,
                listings: Mapping::default(),
                active_listings: Vec::new(),
                fee_bps: 500, // 5% fee (conforme monólito)
                total_volume: 0,
                total_fees_collected: 0,
            }
        }

        /// Configura o contrato de staking para receber fees
        #[ink(message)]
        pub fn set_staking_contract(&mut self, staking: AccountId) -> Result<(), MarketplaceError> {
            if self.env().caller() != self.owner {
                return Err(MarketplaceError::Unauthorized);
            }
            self.staking_contract = Some(staking);
            Ok(())
        }

        /// Configura a carteira do time para receber fees
        #[ink(message)]
        pub fn set_team_wallet(&mut self, wallet: AccountId) -> Result<(), MarketplaceError> {
            if self.env().caller() != self.owner {
                return Err(MarketplaceError::Unauthorized);
            }
            self.team_wallet = wallet;
            Ok(())
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

        /// Compra um NFT listado
        /// Fee split conforme monólito: 5% total = 50% team + 50% staking
        #[ink(message)]
        pub fn buy_nft(&mut self, nft_id: u64) -> Result<(), MarketplaceError> {
            let buyer = self.env().caller();

            let mut listing = self.listings.get(nft_id)
                .ok_or(MarketplaceError::ListingNotFound)?;

            if !listing.active {
                return Err(MarketplaceError::ListingNotFound);
            }

            // Calcula taxa do marketplace (5%)
            let total_fee = listing.price
                .saturating_mul(self.fee_bps as u128)
                .saturating_div(10000);
            let seller_amount = listing.price.saturating_sub(total_fee);

            // Fee split: 50% team, 50% staking
            let team_fee = total_fee / 2;
            let staking_fee = total_fee.saturating_sub(team_fee);

            // 1. Transfere tokens do comprador para o vendedor (menos fee)
            self.call_core_transfer_from(buyer, listing.seller, seller_amount)?;

            // 2. Transfere fee para team wallet
            if team_fee > 0 {
                self.call_core_transfer_from(buyer, self.team_wallet, team_fee)?;
            }

            // 3. Transfere fee para staking contract (se configurado)
            if staking_fee > 0 {
                if let Some(staking) = self.staking_contract {
                    self.call_core_transfer_from(buyer, staking, staking_fee)?;
                } else {
                    // Se staking não configurado, envia para team
                    self.call_core_transfer_from(buyer, self.team_wallet, staking_fee)?;
                }
            }

            // 4. Transfere NFT do vendedor para o comprador
            self.call_ico_transfer_nft(listing.seller, buyer, nft_id)?;

            listing.active = false;
            self.listings.insert(nft_id, &listing);

            // Remove from active
            self.active_listings.retain(|&id| id != nft_id);
            self.total_volume = self.total_volume.saturating_add(listing.price);
            self.total_fees_collected = self.total_fees_collected.saturating_add(total_fee);

            Self::env().emit_event(NFTSold {
                nft_id,
                seller: listing.seller,
                buyer,
                price: listing.price,
            });

            Ok(())
        }

        /// Cross-contract call: transfere tokens via Core
        fn call_core_transfer_from(&self, from: AccountId, to: AccountId, amount: Balance) -> Result<(), MarketplaceError> {
            use ink::env::call::{build_call, ExecutionInput, Selector};

            let result = build_call::<ink::env::DefaultEnvironment>()
                .call(self.core_contract)
                .gas_limit(0)
                .transferred_value(0)
                .exec_input(
                    ExecutionInput::new(Selector::new(ink::selector_bytes!("transfer_from")))
                        .push_arg(from)
                        .push_arg(to)
                        .push_arg(amount),
                )
                .returns::<Result<(), u8>>()
                .try_invoke();

            match result {
                Ok(Ok(Ok(()))) => Ok(()),
                _ => Err(MarketplaceError::InsufficientFunds),
            }
        }

        /// Cross-contract call: transfere NFT via ICO
        fn call_ico_transfer_nft(&self, from: AccountId, to: AccountId, nft_id: u64) -> Result<(), MarketplaceError> {
            use ink::env::call::{build_call, ExecutionInput, Selector};

            let result = build_call::<ink::env::DefaultEnvironment>()
                .call(self.ico_contract)
                .gas_limit(0)
                .transferred_value(0)
                .exec_input(
                    ExecutionInput::new(Selector::new(ink::selector_bytes!("transfer_nft")))
                        .push_arg(from)
                        .push_arg(to)
                        .push_arg(nft_id),
                )
                .returns::<Result<(), u8>>()
                .try_invoke();

            match result {
                Ok(Ok(Ok(()))) => Ok(()),
                _ => Err(MarketplaceError::NFTNotOwned),
            }
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
