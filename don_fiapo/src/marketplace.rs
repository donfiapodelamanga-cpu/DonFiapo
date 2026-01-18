//! NFT Marketplace for Don Fiapo Ecosystem
//! 
//! This module allows owners of Don Fiapo NFTs to sell or auction their assets
//! using the native Lunes token. A 5% fee is applied to each transaction.

use ink::storage::Mapping;
use ink::prelude::vec::Vec;
use scale::{Decode, Encode};
use ink::env::DefaultEnvironment;

type AccountId = <DefaultEnvironment as ink::env::Environment>::AccountId;

#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub enum MarketplaceError {
    ICOStillActive,
    NotTokenOwner,
    ListingNotFound,
    ListingInactive,
    PriceTooLow,
    AuctionEnded,
    AuctionNotEnded,
    BidTooLow,
    Unauthorized,
    MathOverflow,
    TransferFailed,
}

#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct Listing {
    pub seller: AccountId,
    pub token_id: u64,
    pub price: u128,
    pub is_auction: bool,
    pub auction_end: u64,
    pub highest_bid: u128,
    pub highest_bidder: Option<AccountId>,
    pub is_active: bool,
}

#[ink::storage_item]
#[derive(Debug)]
pub struct MarketplaceManager {
    /// Listings mapped by Token ID
    pub listings: Mapping<u64, Listing>,
    /// IDs of all active listings for easier indexing
    pub active_listing_ids: Vec<u64>,
    /// Total volume of trades in Lunes
    pub total_volume: u128,
    /// Fee percentage (default 5%)
    pub fee_percentage_bps: u32,
}

impl MarketplaceManager {
    pub fn new() -> Self {
        Self {
            listings: Mapping::default(),
            active_listing_ids: Vec::new(),
            total_volume: 0,
            fee_percentage_bps: 500, // 5%
        }
    }

    /// List a token for direct sale
    pub fn list_for_sale(
        &mut self,
        seller: AccountId,
        token_id: u64,
        price: u128,
    ) -> Result<(), MarketplaceError> {
        let listing = Listing {
            seller,
            token_id,
            price,
            is_auction: false,
            auction_end: 0,
            highest_bid: 0,
            highest_bidder: None,
            is_active: true,
        };
        self.listings.insert(&token_id, &listing);
        if !self.active_listing_ids.contains(&token_id) {
            self.active_listing_ids.push(token_id);
        }
        Ok(())
    }

    /// List a token for auction
    pub fn list_for_auction(
        &mut self,
        seller: AccountId,
        token_id: u64,
        min_price: u128,
        duration: u64,
        current_timestamp: u64,
    ) -> Result<(), MarketplaceError> {
        let listing = Listing {
            seller,
            token_id,
            price: min_price,
            is_auction: true,
            auction_end: current_timestamp.saturating_add(duration),
            highest_bid: 0,
            highest_bidder: None,
            is_active: true,
        };
        self.listings.insert(&token_id, &listing);
        if !self.active_listing_ids.contains(&token_id) {
            self.active_listing_ids.push(token_id);
        }
        Ok(())
    }

    /// Place a bid on an auction
    pub fn place_bid(
        &mut self,
        bidder: AccountId,
        token_id: u64,
        amount: u128,
        current_timestamp: u64,
    ) -> Result<(Option<AccountId>, u128), MarketplaceError> {
        let mut listing = self.listings.get(&token_id).ok_or(MarketplaceError::ListingNotFound)?;
        
        if !listing.is_active || !listing.is_auction {
            return Err(MarketplaceError::ListingInactive);
        }

        if current_timestamp > listing.auction_end {
            return Err(MarketplaceError::AuctionEnded);
        }

        let min_required = if listing.highest_bid == 0 {
            listing.price
        } else {
            listing.highest_bid.saturating_add(1)
        };

        if amount < min_required {
            return Err(MarketplaceError::BidTooLow);
        }

        let previous_bidder = listing.highest_bidder;
        let previous_bid = listing.highest_bid;

        listing.highest_bid = amount;
        listing.highest_bidder = Some(bidder);
        
        self.listings.insert(&token_id, &listing);

        Ok((previous_bidder, previous_bid))
    }

    /// Complete a direct purchase
    pub fn complete_purchase(
        &mut self,
        token_id: u64,
    ) -> Result<Listing, MarketplaceError> {
        let mut listing = self.listings.get(&token_id).ok_or(MarketplaceError::ListingNotFound)?;
        
        if !listing.is_active || listing.is_auction {
            return Err(MarketplaceError::ListingInactive);
        }

        listing.is_active = false;
        self.listings.insert(&token_id, &listing);
        self.remove_from_active(token_id);
        
        self.total_volume = self.total_volume.saturating_add(listing.price);

        Ok(listing)
    }

    /// Settle an auction
    pub fn settle_auction(
        &mut self,
        token_id: u64,
        current_timestamp: u64,
    ) -> Result<Listing, MarketplaceError> {
        let mut listing = self.listings.get(&token_id).ok_or(MarketplaceError::ListingNotFound)?;
        
        if !listing.is_active || !listing.is_auction {
            return Err(MarketplaceError::ListingInactive);
        }

        if current_timestamp <= listing.auction_end {
            return Err(MarketplaceError::AuctionNotEnded);
        }

        listing.is_active = false;
        self.listings.insert(&token_id, &listing);
        self.remove_from_active(token_id);

        if listing.highest_bidder.is_some() {
            self.total_volume = self.total_volume.saturating_add(listing.highest_bid);
        }

        Ok(listing)
    }

    /// Cancel a listing
    pub fn cancel_listing(
        &mut self,
        caller: AccountId,
        token_id: u64,
    ) -> Result<Listing, MarketplaceError> {
        let mut listing = self.listings.get(&token_id).ok_or(MarketplaceError::ListingNotFound)?;
        
        if listing.seller != caller {
            return Err(MarketplaceError::Unauthorized);
        }

        if !listing.is_active {
            return Err(MarketplaceError::ListingInactive);
        }

        // Refund highest bidder if auction has one
        let _refund = if listing.is_auction && listing.highest_bidder.is_some() {
            Some((listing.highest_bidder.unwrap(), listing.highest_bid))
        } else {
            None
        };

        listing.is_active = false;
        self.listings.insert(&token_id, &listing);
        self.remove_from_active(token_id);

        // This method returns the listing so the caller (contract) can handle refunds and NFT return
        Ok(listing)
    }

    pub fn calculate_fees(&self, amount: u128) -> (u128, u128, u128) {
        let total_fee = amount.saturating_mul(self.fee_percentage_bps as u128).saturating_div(10000);
        let team_fee = total_fee.saturating_div(2);
        let staking_fee = total_fee.saturating_sub(team_fee);
        let seller_amount = amount.saturating_sub(total_fee);
        (seller_amount, team_fee, staking_fee)
    }

    fn remove_from_active(&mut self, token_id: u64) {
        if let Some(pos) = self.active_listing_ids.iter().position(|&id| id == token_id) {
            self.active_listing_ids.remove(pos);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn mock_account(id: u8) -> AccountId {
        [id; 32].into()
    }

    #[ink::test]
    fn test_list_for_sale() {
        let mut manager = MarketplaceManager::new();
        let seller = mock_account(1);
        let token_id = 100;
        let price = 1000;

        manager.list_for_sale(seller, token_id, price).unwrap();
        
        let listing = manager.listings.get(token_id).unwrap();
        assert_eq!(listing.seller, seller);
        assert_eq!(listing.price, price);
        assert!(!listing.is_auction);
        assert!(listing.is_active);
    }

    #[ink::test]
    fn test_complete_purchase() {
        let mut manager = MarketplaceManager::new();
        let seller = mock_account(1);
        let token_id = 100;
        let price = 1000;

        manager.list_for_sale(seller, token_id, price).unwrap();
        let listing = manager.complete_purchase(token_id).unwrap();

        assert_eq!(listing.price, price);
        assert!(!listing.is_active);
        assert_eq!(manager.total_volume, price);
        
        let stored_listing = manager.listings.get(token_id).unwrap();
        assert!(!stored_listing.is_active);
    }

    #[ink::test]
    fn test_auction_flow() {
        let mut manager = MarketplaceManager::new();
        let seller = mock_account(1);
        let bidder1 = mock_account(2);
        let bidder2 = mock_account(3);
        let token_id = 200;
        let min_price = 1000;
        let duration = 3600;
        let start_time = 10000;

        manager.list_for_auction(seller, token_id, min_price, duration, start_time).unwrap();

        // Invalid bid (too low)
        let result = manager.place_bid(bidder1, token_id, 500, start_time + 100);
        assert!(matches!(result, Err(MarketplaceError::BidTooLow)));

        // First valid bid
        let (prev_bidder, prev_bid) = manager.place_bid(bidder1, token_id, 1100, start_time + 100).unwrap();
        assert!(prev_bidder.is_none());
        assert_eq!(prev_bid, 0);

        // Second valid bid
        let (prev_bidder, prev_bid) = manager.place_bid(bidder2, token_id, 1200, start_time + 200).unwrap();
        assert_eq!(prev_bidder, Some(bidder1));
        assert_eq!(prev_bid, 1100);

        // Try to settle before end
        let result = manager.settle_auction(token_id, start_time + 500);
        assert!(matches!(result, Err(MarketplaceError::AuctionNotEnded)));

        // Settle after end
        let listing = manager.settle_auction(token_id, start_time + duration + 1).unwrap();
        assert!(!listing.is_active);
        assert_eq!(listing.highest_bidder, Some(bidder2));
        assert_eq!(listing.highest_bid, 1200);
        assert_eq!(manager.total_volume, 1200);
    }

    #[ink::test]
    fn test_cancel_listing() {
        let mut manager = MarketplaceManager::new();
        let seller = mock_account(1);
        let other = mock_account(2);
        let token_id = 300;

        manager.list_for_sale(seller, token_id, 1000).unwrap();

        // Unauthorized cancel
        let result = manager.cancel_listing(other, token_id);
        assert!(matches!(result, Err(MarketplaceError::Unauthorized)));

        // Valid cancel
        manager.cancel_listing(seller, token_id).unwrap();
        let listing = manager.listings.get(token_id).unwrap();
        assert!(!listing.is_active);
    }

    #[ink::test]
    fn test_fee_calculation() {
        let manager = MarketplaceManager::new();
        let amount = 10000; // 5% total fee = 500
        
        let (seller_amount, team_fee, staking_fee) = manager.calculate_fees(amount);
        
        assert_eq!(team_fee, 250);
        assert_eq!(staking_fee, 250);
        assert_eq!(seller_amount, 9500);
        assert_eq!(seller_amount + team_fee + staking_fee, amount);
    }
}
