//! # Fiapo Marketplace Contract
//!
//! Marketplace para NFTs do ecossistema Don Fiapo.
//! Inclui: venda direta, leilão, troca P2P, preço mínimo, auto-claim de vesting.
//!
//! Pagamento dual:
//!   - Durante ICO: pagamentos em LUNES (moeda nativa)
//!   - Após ICO (todas NFTs vendidas): pagamentos em FIAPO (token PSP22)

#![cfg_attr(not(feature = "std"), no_std, no_main)]

use fiapo_traits::{AccountId, Balance};

#[ink::contract]
mod fiapo_marketplace {
    use super::*;
    use ink::prelude::vec::Vec;
    use ink::storage::Mapping;
    
    // Cross-contract: PSP22Ref garante selector correto do trait IPSP22
    use fiapo_logics::traits::psp22::{PSP22, PSP22Ref};

    // ==================== Errors ====================

    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum MarketplaceError {
        Unauthorized,
        ListingNotFound,
        InsufficientFunds,
        NFTNotOwned,
        PriceBelowMinimum,
        AuctionNotFound,
        AuctionNotActive,
        AuctionNotEnded,
        AuctionAlreadyEnded,
        BidTooLow,
        SelfBidNotAllowed,
        TradeNotFound,
        TradeNotActive,
        TradeNFTMismatch,
        SelfTradeNotAllowed,
        TransferFailed,
        InsufficientPayment,
        NativeTransferFailed,
    }

    // ==================== Types ====================

    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct Listing {
        pub nft_id: u64,
        pub seller: AccountId,
        pub price: Balance,
        pub nft_tier: u8,
        /// 0 = LUNES (nativo), 1 = FIAPO (PSP22)
        pub currency: u8,
        pub active: bool,
    }

    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct Auction {
        pub auction_id: u64,
        pub nft_id: u64,
        pub seller: AccountId,
        pub min_price: Balance,
        pub highest_bid: Balance,
        pub highest_bidder: Option<AccountId>,
        pub end_time: u64,
        pub nft_tier: u8,
        /// 0 = LUNES (nativo), 1 = FIAPO (PSP22)
        pub currency: u8,
        pub active: bool,
        pub finalized: bool,
    }

    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct TradeOffer {
        pub trade_id: u64,
        pub nft_id_offered: u64,
        pub offerer: AccountId,
        pub nft_id_wanted: u64,
        pub wanted_tier: Option<u8>,
        pub counterparty: Option<AccountId>,
        pub active: bool,
    }

    // ==================== Events ====================

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
        tokens_claimed_for_seller: u128,
    }

    #[ink(event)]
    pub struct AuctionCreated {
        #[ink(topic)]
        auction_id: u64,
        nft_id: u64,
        seller: AccountId,
        min_price: Balance,
        end_time: u64,
    }

    #[ink(event)]
    pub struct BidPlaced {
        #[ink(topic)]
        auction_id: u64,
        bidder: AccountId,
        amount: Balance,
    }

    #[ink(event)]
    pub struct AuctionFinalized {
        #[ink(topic)]
        auction_id: u64,
        winner: AccountId,
        final_price: Balance,
    }

    #[ink(event)]
    pub struct AuctionCancelled {
        #[ink(topic)]
        auction_id: u64,
    }

    #[ink(event)]
    pub struct TradeCreated {
        #[ink(topic)]
        trade_id: u64,
        offerer: AccountId,
        nft_id_offered: u64,
        nft_id_wanted: u64,
    }

    #[ink(event)]
    pub struct TradeCompleted {
        #[ink(topic)]
        trade_id: u64,
        offerer: AccountId,
        acceptor: AccountId,
    }

    #[ink(event)]
    pub struct TradeCancelled {
        #[ink(topic)]
        trade_id: u64,
    }

    // ==================== Storage ====================

    #[ink(storage)]
    pub struct FiapoMarketplace {
        core_contract: AccountId,
        ico_contract: AccountId,
        staking_contract: Option<AccountId>,
        noble_contract: Option<AccountId>,
        owner: AccountId,
        team_wallet: AccountId,

        // --- Listings (venda direta) ---
        listings: Mapping<u64, Listing>,
        active_listings: Vec<u64>,
        fee_bps: u16,

        // --- Auctions (leilão) ---
        auctions: Mapping<u64, Auction>,
        active_auctions: Vec<u64>,
        next_auction_id: u64,

        // --- Trades (troca P2P) ---
        trades: Mapping<u64, TradeOffer>,
        active_trades: Vec<u64>,
        next_trade_id: u64,
        trade_fee_bps: u16,

        // --- Preço mínimo por tier (em FIAPO tokens) ---
        min_prices: Mapping<u8, Balance>,
        ico_sales_completed: bool,

        // --- Stats ---
        total_volume: Balance,
        total_fees_collected: Balance,
        total_auctions_completed: u64,
        total_trades_completed: u64,
    }

    impl FiapoMarketplace {
        #[ink(constructor)]
        pub fn new(core_contract: AccountId, ico_contract: AccountId) -> Self {
            let caller = Self::env().caller();
            Self {
                core_contract,
                ico_contract,
                staking_contract: None,
                noble_contract: None,
                owner: caller,
                team_wallet: caller,
                listings: Mapping::default(),
                active_listings: Vec::new(),
                fee_bps: 600,
                auctions: Mapping::default(),
                active_auctions: Vec::new(),
                next_auction_id: 1,
                trades: Mapping::default(),
                active_trades: Vec::new(),
                next_trade_id: 1,
                trade_fee_bps: 300,
                min_prices: Mapping::default(),
                ico_sales_completed: false,
                total_volume: 0,
                total_fees_collected: 0,
                total_auctions_completed: 0,
                total_trades_completed: 0,
            }
        }

        // ==================== Admin Functions ====================

        #[ink(message)]
        pub fn set_staking_contract(&mut self, staking: AccountId) -> Result<(), MarketplaceError> {
            self.ensure_owner()?;
            self.staking_contract = Some(staking);
            Ok(())
        }

        #[ink(message)]
        pub fn set_team_wallet(&mut self, wallet: AccountId) -> Result<(), MarketplaceError> {
            self.ensure_owner()?;
            self.team_wallet = wallet;
            Ok(())
        }

        #[ink(message)]
        pub fn set_noble_contract(&mut self, noble: AccountId) -> Result<(), MarketplaceError> {
            self.ensure_owner()?;
            self.noble_contract = Some(noble);
            Ok(())
        }

        /// Define preço mínimo em FIAPO para um tier (aplicado enquanto ICO ativa)
        #[ink(message)]
        pub fn set_min_price(&mut self, tier: u8, price: Balance) -> Result<(), MarketplaceError> {
            self.ensure_owner()?;
            self.min_prices.insert(tier, &price);
            Ok(())
        }

        /// Define preços mínimos para todos os tiers de uma vez
        #[ink(message)]
        pub fn set_all_min_prices(&mut self, prices: Vec<Balance>) -> Result<(), MarketplaceError> {
            self.ensure_owner()?;
            for (i, price) in prices.iter().enumerate() {
                self.min_prices.insert(i as u8, price);
            }
            Ok(())
        }

        /// Marca que todas as vendas da ICO foram finalizadas (preço livre)
        #[ink(message)]
        pub fn set_ico_sales_completed(&mut self, completed: bool) -> Result<(), MarketplaceError> {
            self.ensure_owner()?;
            self.ico_sales_completed = completed;
            Ok(())
        }

        /// Configura taxa de venda (em bps, ex: 600 = 6%)
        #[ink(message)]
        pub fn set_fee_bps(&mut self, fee: u16) -> Result<(), MarketplaceError> {
            self.ensure_owner()?;
            self.fee_bps = fee;
            Ok(())
        }

        /// Configura taxa de troca P2P (em bps, ex: 300 = 3%)
        #[ink(message)]
        pub fn set_trade_fee_bps(&mut self, fee: u16) -> Result<(), MarketplaceError> {
            self.ensure_owner()?;
            self.trade_fee_bps = fee;
            Ok(())
        }

        #[ink(message)]
        pub fn transfer_ownership(&mut self, new_owner: AccountId) -> Result<(), MarketplaceError> {
            self.ensure_owner()?;
            self.owner = new_owner;
            Ok(())
        }

        fn ensure_owner(&self) -> Result<(), MarketplaceError> {
            if self.env().caller() != self.owner {
                return Err(MarketplaceError::Unauthorized);
            }
            Ok(())
        }

        // ==================== View Functions ====================

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
        pub fn get_auction(&self, auction_id: u64) -> Option<Auction> {
            self.auctions.get(auction_id)
        }

        #[ink(message)]
        pub fn get_active_auctions(&self) -> Vec<u64> {
            self.active_auctions.clone()
        }

        #[ink(message)]
        pub fn get_trade(&self, trade_id: u64) -> Option<TradeOffer> {
            self.trades.get(trade_id)
        }

        #[ink(message)]
        pub fn get_active_trades(&self) -> Vec<u64> {
            self.active_trades.clone()
        }

        #[ink(message)]
        pub fn get_min_price(&self, tier: u8) -> Balance {
            self.min_prices.get(tier).unwrap_or(0)
        }

        #[ink(message)]
        pub fn is_ico_sales_completed(&self) -> bool {
            self.ico_sales_completed
        }

        #[ink(message)]
        pub fn total_volume(&self) -> Balance {
            self.total_volume
        }

        /// Retorna moedas aceitas: 0=apenas LUNES (durante ICO), 2=LUNES+FIAPO (após ICO)
        #[ink(message)]
        pub fn payment_mode(&self) -> u8 {
            if self.ico_sales_completed { 2 } else { 0 } // 0=só LUNES, 2=ambas
        }

        #[ink(message)]
        pub fn get_stats(&self) -> (Balance, Balance, u64, u64) {
            (
                self.total_volume,
                self.total_fees_collected,
                self.total_auctions_completed,
                self.total_trades_completed,
            )
        }

        // ==================== Listing (Venda Direta) ====================

        /// Lista um NFT para venda.
        /// currency: 0=LUNES, 1=FIAPO (FIAPO só permitido após ICO)
        #[ink(message)]
        pub fn list_nft(&mut self, nft_id: u64, price: Balance, nft_tier: u8, currency: u8) -> Result<(), MarketplaceError> {
            let caller = self.env().caller();

            // Durante ICO: forçar LUNES (currency=0)
            let effective_currency = if !self.ico_sales_completed { 0 } else { currency };

            // Valida preço mínimo se ICO ainda ativa
            if !self.ico_sales_completed {
                let min = self.min_prices.get(nft_tier).unwrap_or(0);
                if price < min {
                    return Err(MarketplaceError::PriceBelowMinimum);
                }
            }

            let listing = Listing {
                nft_id,
                seller: caller,
                price,
                nft_tier,
                currency: effective_currency,
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

        /// Compra um NFT listado (sem código afiliado)
        /// Durante ICO: enviar LUNES nativo como valor da transação
        /// Após ICO: buyer deve ter approved FIAPO suficiente para o marketplace
        #[ink(message, payable)]
        pub fn buy_nft(&mut self, nft_id: u64) -> Result<(), MarketplaceError> {
            self.buy_nft_internal(nft_id, None)
        }

        /// Compra um NFT listado com código afiliado Noble
        #[ink(message, payable)]
        pub fn buy_nft_with_code(&mut self, nft_id: u64, affiliate_code: Hash) -> Result<(), MarketplaceError> {
            self.buy_nft_internal(nft_id, Some(affiliate_code))
        }

        fn buy_nft_internal(&mut self, nft_id: u64, affiliate_code: Option<Hash>) -> Result<(), MarketplaceError> {
            let buyer = self.env().caller();

            let mut listing = self.listings.get(nft_id)
                .ok_or(MarketplaceError::ListingNotFound)?;

            if !listing.active {
                return Err(MarketplaceError::ListingNotFound);
            }

            // currency da listagem: 0=LUNES(nativo), 1=FIAPO(PSP22)
            let is_lunes = listing.currency == 0;

            if is_lunes {
                let paid = self.env().transferred_value();
                if paid < listing.price {
                    return Err(MarketplaceError::InsufficientPayment);
                }
            }

            // Calcula taxas (6%)
            let total_fee = listing.price
                .saturating_mul(self.fee_bps as u128)
                .saturating_div(10000);
            let seller_amount = listing.price.saturating_sub(total_fee);

            // Fee split: 50% Team, 40% Staking, 10% Noble
            let team_fee = total_fee.saturating_mul(50).saturating_div(100);
            let staking_fee = total_fee.saturating_mul(40).saturating_div(100);
            let noble_fee = total_fee.saturating_sub(team_fee).saturating_sub(staking_fee);

            if is_lunes {
                // === LUNES (nativo) ===
                self.native_transfer(listing.seller, seller_amount)?;
                if team_fee > 0 {
                    self.native_transfer(self.team_wallet, team_fee)?;
                }
                if staking_fee > 0 {
                    let target = self.staking_contract.unwrap_or(self.team_wallet);
                    self.native_transfer(target, staking_fee)?;
                }
                if noble_fee > 0 {
                    self.distribute_noble_fee_native(noble_fee, affiliate_code, buyer)?;
                }
            } else {
                // === FIAPO (PSP22) ===
                self.call_core_transfer_from(buyer, listing.seller, seller_amount)?;
                if team_fee > 0 {
                    self.call_core_transfer_from(buyer, self.team_wallet, team_fee)?;
                }
                if staking_fee > 0 {
                    let target = self.staking_contract.unwrap_or(self.team_wallet);
                    self.call_core_transfer_from(buyer, target, staking_fee)?;
                }
                if noble_fee > 0 {
                    self.distribute_noble_fee_fiapo(buyer, noble_fee, affiliate_code)?;
                }
            }

            // Transfere NFT com auto-claim (seller recebe tokens pendentes de mining)
            let claimed = self.call_ico_marketplace_transfer(listing.seller, buyer, nft_id)?;

            listing.active = false;
            self.listings.insert(nft_id, &listing);
            self.active_listings.retain(|&id| id != nft_id);
            self.total_volume = self.total_volume.saturating_add(listing.price);
            self.total_fees_collected = self.total_fees_collected.saturating_add(total_fee);

            Self::env().emit_event(NFTSold {
                nft_id,
                seller: listing.seller,
                buyer,
                price: listing.price,
                tokens_claimed_for_seller: claimed,
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

        // ==================== Auction (Leilão) ====================

        /// Cria um leilão para um NFT
        /// currency: 0=LUNES, 1=FIAPO (FIAPO só após ICO)
        #[ink(message)]
        pub fn create_auction(
            &mut self,
            nft_id: u64,
            min_price: Balance,
            nft_tier: u8,
            duration_secs: u64,
            currency: u8,
        ) -> Result<u64, MarketplaceError> {
            let caller = self.env().caller();
            let now = self.env().block_timestamp();

            // Durante ICO: forçar LUNES
            let effective_currency = if !self.ico_sales_completed { 0 } else { currency };

            // Valida preço mínimo se ICO ativa
            if !self.ico_sales_completed {
                let min = self.min_prices.get(nft_tier).unwrap_or(0);
                if min_price < min {
                    return Err(MarketplaceError::PriceBelowMinimum);
                }
            }

            let auction_id = self.next_auction_id;
            let auction = Auction {
                auction_id,
                nft_id,
                seller: caller,
                min_price,
                highest_bid: 0,
                highest_bidder: None,
                end_time: now.saturating_add(duration_secs),
                nft_tier,
                currency: effective_currency,
                active: true,
                finalized: false,
            };

            self.auctions.insert(auction_id, &auction);
            self.active_auctions.push(auction_id);
            self.next_auction_id = self.next_auction_id.saturating_add(1);

            Self::env().emit_event(AuctionCreated {
                auction_id,
                nft_id,
                seller: caller,
                min_price,
                end_time: auction.end_time,
            });

            Ok(auction_id)
        }

        /// Faz um lance em um leilão (escrow no contrato)
        /// Moeda definida pelo auction.currency (0=LUNES nativo, 1=FIAPO PSP22)
        #[ink(message, payable)]
        pub fn place_bid(&mut self, auction_id: u64, amount: Balance) -> Result<(), MarketplaceError> {
            let bidder = self.env().caller();
            let now = self.env().block_timestamp();

            let mut auction = self.auctions.get(auction_id)
                .ok_or(MarketplaceError::AuctionNotFound)?;

            if !auction.active {
                return Err(MarketplaceError::AuctionNotActive);
            }
            if now >= auction.end_time {
                return Err(MarketplaceError::AuctionAlreadyEnded);
            }
            if bidder == auction.seller {
                return Err(MarketplaceError::SelfBidNotAllowed);
            }
            if amount < auction.min_price || amount <= auction.highest_bid {
                return Err(MarketplaceError::BidTooLow);
            }

            let is_lunes = auction.currency == 0;

            if is_lunes {
                let paid = self.env().transferred_value();
                if paid < amount {
                    return Err(MarketplaceError::InsufficientPayment);
                }
                if let Some(prev_bidder) = auction.highest_bidder {
                    if auction.highest_bid > 0 {
                        self.native_transfer(prev_bidder, auction.highest_bid)?;
                    }
                }
            } else {
                let marketplace_addr = self.env().account_id();
                self.call_core_transfer_from(bidder, marketplace_addr, amount)?;
                if let Some(prev_bidder) = auction.highest_bidder {
                    if auction.highest_bid > 0 {
                        self.call_core_transfer(prev_bidder, auction.highest_bid)?;
                    }
                }
            }

            auction.highest_bid = amount;
            auction.highest_bidder = Some(bidder);
            self.auctions.insert(auction_id, &auction);

            Self::env().emit_event(BidPlaced {
                auction_id,
                bidder,
                amount,
            });

            Ok(())
        }

        /// Finaliza um leilão após o tempo acabar
        #[ink(message)]
        pub fn finalize_auction(&mut self, auction_id: u64) -> Result<(), MarketplaceError> {
            let now = self.env().block_timestamp();

            let mut auction = self.auctions.get(auction_id)
                .ok_or(MarketplaceError::AuctionNotFound)?;

            if !auction.active || auction.finalized {
                return Err(MarketplaceError::AuctionNotActive);
            }
            if now < auction.end_time {
                return Err(MarketplaceError::AuctionNotEnded);
            }

            auction.active = false;
            auction.finalized = true;

            if let Some(winner) = auction.highest_bidder {
                let price = auction.highest_bid;
                let is_lunes = auction.currency == 0;

                // Calcula taxas do escrow
                let total_fee = price
                    .saturating_mul(self.fee_bps as u128)
                    .saturating_div(10000);
                let seller_amount = price.saturating_sub(total_fee);

                // Fee split
                let team_fee = total_fee.saturating_mul(50).saturating_div(100);
                let staking_fee = total_fee.saturating_mul(40).saturating_div(100);
                let noble_fee = total_fee.saturating_sub(team_fee).saturating_sub(staking_fee);

                if is_lunes {
                    // Distribui LUNES do escrow nativo
                    self.native_transfer(auction.seller, seller_amount)?;
                    if team_fee > 0 {
                        self.native_transfer(self.team_wallet, team_fee)?;
                    }
                    if staking_fee > 0 {
                        let target = self.staking_contract.unwrap_or(self.team_wallet);
                        self.native_transfer(target, staking_fee)?;
                    }
                    if noble_fee > 0 {
                        self.native_transfer(self.team_wallet, noble_fee)?;
                    }
                } else {
                    // Distribui FIAPO do escrow PSP22
                    self.call_core_transfer(auction.seller, seller_amount)?;
                    if team_fee > 0 {
                        self.call_core_transfer(self.team_wallet, team_fee)?;
                    }
                    if staking_fee > 0 {
                        let target = self.staking_contract.unwrap_or(self.team_wallet);
                        self.call_core_transfer(target, staking_fee)?;
                    }
                    if noble_fee > 0 {
                        self.call_core_transfer(self.team_wallet, noble_fee)?;
                    }
                }

                // Transfere NFT com auto-claim
                let _ = self.call_ico_marketplace_transfer(auction.seller, winner, auction.nft_id);

                self.total_volume = self.total_volume.saturating_add(price);
                self.total_fees_collected = self.total_fees_collected.saturating_add(total_fee);
                self.total_auctions_completed = self.total_auctions_completed.saturating_add(1);

                Self::env().emit_event(AuctionFinalized {
                    auction_id,
                    winner,
                    final_price: price,
                });
            }
            // Se ninguém deu lance, apenas desativa

            self.auctions.insert(auction_id, &auction);
            self.active_auctions.retain(|&id| id != auction_id);

            Ok(())
        }

        /// Cancela um leilão (apenas seller, e apenas se sem lances)
        #[ink(message)]
        pub fn cancel_auction(&mut self, auction_id: u64) -> Result<(), MarketplaceError> {
            let caller = self.env().caller();

            let mut auction = self.auctions.get(auction_id)
                .ok_or(MarketplaceError::AuctionNotFound)?;

            if auction.seller != caller {
                return Err(MarketplaceError::Unauthorized);
            }
            if !auction.active {
                return Err(MarketplaceError::AuctionNotActive);
            }
            // Só pode cancelar se não tem lance
            if auction.highest_bidder.is_some() {
                return Err(MarketplaceError::Unauthorized);
            }

            auction.active = false;
            auction.finalized = true;
            self.auctions.insert(auction_id, &auction);
            self.active_auctions.retain(|&id| id != auction_id);

            Self::env().emit_event(AuctionCancelled { auction_id });

            Ok(())
        }

        // ==================== Trade (Troca P2P) ====================

        /// Cria uma oferta de troca: oferece um NFT por outro NFT específico
        /// Se nft_id_wanted == 0, aceita qualquer NFT do wanted_tier
        #[ink(message)]
        pub fn create_trade(
            &mut self,
            nft_id_offered: u64,
            nft_id_wanted: u64,
            wanted_tier: Option<u8>,
            counterparty: Option<AccountId>,
        ) -> Result<u64, MarketplaceError> {
            let caller = self.env().caller();

            let trade_id = self.next_trade_id;
            let trade = TradeOffer {
                trade_id,
                nft_id_offered,
                offerer: caller,
                nft_id_wanted,
                wanted_tier,
                counterparty,
                active: true,
            };

            self.trades.insert(trade_id, &trade);
            self.active_trades.push(trade_id);
            self.next_trade_id = self.next_trade_id.saturating_add(1);

            Self::env().emit_event(TradeCreated {
                trade_id,
                offerer: caller,
                nft_id_offered,
                nft_id_wanted,
            });

            Ok(trade_id)
        }

        /// Aceita uma oferta de troca. O acceptor paga a taxa.
        /// Durante ICO: taxa em LUNES (enviar como valor nativo)
        /// Após ICO: taxa em FIAPO (approved no Core)
        #[ink(message, payable)]
        pub fn accept_trade(&mut self, trade_id: u64, acceptor_nft_id: u64) -> Result<(), MarketplaceError> {
            let acceptor = self.env().caller();
            let lunes_mode = !self.ico_sales_completed;

            let mut trade = self.trades.get(trade_id)
                .ok_or(MarketplaceError::TradeNotFound)?;

            if !trade.active {
                return Err(MarketplaceError::TradeNotActive);
            }
            if acceptor == trade.offerer {
                return Err(MarketplaceError::SelfTradeNotAllowed);
            }
            // Verifica counterparty restrita
            if let Some(expected) = trade.counterparty {
                if acceptor != expected {
                    return Err(MarketplaceError::Unauthorized);
                }
            }
            // Verifica NFT correto
            if trade.nft_id_wanted > 0 && acceptor_nft_id != trade.nft_id_wanted {
                return Err(MarketplaceError::TradeNFTMismatch);
            }

            // Cobra taxa de troca (baseada no preço mínimo do tier mais alto)
            let tier_offered = self.get_nft_tier_via_ico(trade.nft_id_offered);
            let tier_accepted = self.get_nft_tier_via_ico(acceptor_nft_id);
            let max_tier = core::cmp::max(tier_offered, tier_accepted);
            let base_price = self.min_prices.get(max_tier).unwrap_or(0);
            let trade_fee = base_price
                .saturating_mul(self.trade_fee_bps as u128)
                .saturating_div(10000);

            if trade_fee > 0 {
                if lunes_mode {
                    let paid = self.env().transferred_value();
                    if paid < trade_fee {
                        return Err(MarketplaceError::InsufficientPayment);
                    }
                    self.native_transfer(self.team_wallet, trade_fee)?;
                } else {
                    self.call_core_transfer_from(acceptor, self.team_wallet, trade_fee)?;
                }
                self.total_fees_collected = self.total_fees_collected.saturating_add(trade_fee);
            }

            // Troca NFTs com auto-claim para ambos
            let _ = self.call_ico_marketplace_transfer(trade.offerer, acceptor, trade.nft_id_offered);
            let _ = self.call_ico_marketplace_transfer(acceptor, trade.offerer, acceptor_nft_id);

            trade.active = false;
            self.trades.insert(trade_id, &trade);
            self.active_trades.retain(|&id| id != trade_id);
            self.total_trades_completed = self.total_trades_completed.saturating_add(1);

            Self::env().emit_event(TradeCompleted {
                trade_id,
                offerer: trade.offerer,
                acceptor,
            });

            Ok(())
        }

        /// Cancela uma oferta de troca (apenas offerer)
        #[ink(message)]
        pub fn cancel_trade(&mut self, trade_id: u64) -> Result<(), MarketplaceError> {
            let caller = self.env().caller();

            let mut trade = self.trades.get(trade_id)
                .ok_or(MarketplaceError::TradeNotFound)?;
            if trade.offerer != caller {
                return Err(MarketplaceError::Unauthorized);
            }
            if !trade.active {
                return Err(MarketplaceError::TradeNotActive);
            }

            trade.active = false;
            self.trades.insert(trade_id, &trade);
            self.active_trades.retain(|&id| id != trade_id);

            Self::env().emit_event(TradeCancelled { trade_id });

            Ok(())
        }

        // ==================== Internal / Cross-Contract ====================

        /// Distribui fee Noble em LUNES nativo (durante ICO)
        fn distribute_noble_fee_native(
            &self,
            noble_fee: Balance,
            affiliate_code: Option<Hash>,
            payer: AccountId,
        ) -> Result<(), MarketplaceError> {
            let mut distributed = false;
            if let Some(noble) = self.noble_contract {
                if let Some(code) = affiliate_code {
                    self.native_transfer(noble, noble_fee)?;
                    self.call_noble_register(noble, code, noble_fee, payer)?;
                    distributed = true;
                }
            }
            if !distributed {
                self.native_transfer(self.team_wallet, noble_fee)?;
            }
            Ok(())
        }

        /// Distribui fee Noble em FIAPO (após ICO)
        fn distribute_noble_fee_fiapo(
            &self,
            payer: AccountId,
            noble_fee: Balance,
            affiliate_code: Option<Hash>,
        ) -> Result<(), MarketplaceError> {
            let mut distributed = false;
            if let Some(noble) = self.noble_contract {
                if let Some(code) = affiliate_code {
                    self.call_core_transfer_from(payer, noble, noble_fee)?;
                    self.call_noble_register(noble, code, noble_fee, payer)?;
                    distributed = true;
                }
            }
            if !distributed {
                self.call_core_transfer_from(payer, self.team_wallet, noble_fee)?;
            }
            Ok(())
        }

        fn call_noble_register(
            &self,
            noble_contract: AccountId,
            code: Hash,
            amount: Balance,
            payer: AccountId,
        ) -> Result<(), MarketplaceError> {
            use ink::env::call::{build_call, ExecutionInput, Selector};
            let _ = build_call::<ink::env::DefaultEnvironment>()
                .call(noble_contract)
                .gas_limit(0)
                .transferred_value(0)
                .exec_input(
                    ExecutionInput::new(Selector::new(ink::selector_bytes!("register_revenue")))
                        .push_arg(code)
                        .push_arg(1u8)
                        .push_arg(amount)
                        .push_arg(payer)
                )
                .returns::<Result<(), ()>>()
                .try_invoke();
            Ok(())
        }

        /// Core: transfer_from via PSP22Ref (selector correto do trait IPSP22)
        fn call_core_transfer_from(&self, from: AccountId, to: AccountId, amount: Balance) -> Result<(), MarketplaceError> {
            let mut psp22: PSP22Ref = self.core_contract.into();
            match psp22.transfer_from(from, to, amount) {
                Ok(_) => Ok(()),
                _ => Err(MarketplaceError::InsufficientFunds),
            }
        }

        /// Core: transfer via PSP22Ref (selector correto do trait IPSP22)
        fn call_core_transfer(&self, to: AccountId, amount: Balance) -> Result<(), MarketplaceError> {
            let mut psp22: PSP22Ref = self.core_contract.into();
            match psp22.transfer(to, amount) {
                Ok(_) => Ok(()),
                _ => Err(MarketplaceError::TransferFailed),
            }
        }

        /// ICO: marketplace_transfer_nft (auto-claim + transfer)
        fn call_ico_marketplace_transfer(&self, from: AccountId, to: AccountId, nft_id: u64) -> Result<u128, MarketplaceError> {
            use ink::env::call::{build_call, ExecutionInput, Selector};
            let result = build_call::<ink::env::DefaultEnvironment>()
                .call(self.ico_contract)
                .gas_limit(0)
                .transferred_value(0)
                .exec_input(
                    ExecutionInput::new(Selector::new(ink::selector_bytes!("marketplace_transfer_nft")))
                        .push_arg(from)
                        .push_arg(to)
                        .push_arg(nft_id),
                )
                .returns::<Result<u128, u8>>()
                .try_invoke();
            match result {
                Ok(Ok(Ok(claimed))) => Ok(claimed),
                _ => Err(MarketplaceError::NFTNotOwned),
            }
        }

        /// Transferência nativa de LUNES do saldo do contrato
        fn native_transfer(&self, to: AccountId, amount: Balance) -> Result<(), MarketplaceError> {
            self.env().transfer(to, amount)
                .map_err(|_| MarketplaceError::NativeTransferFailed)
        }

        /// Consulta tier de um NFT via ICO (para cálculo de taxa de troca)
        fn get_nft_tier_via_ico(&self, _nft_id: u64) -> u8 {
            // Para simplificar, retornamos 0 e a taxa é baseada nos min_prices configurados
            // Em produção, fazer cross-contract call para ICO.get_nft(nft_id).tier
            0
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
            assert_eq!(contract.is_ico_sales_completed(), false);
        }

        #[ink::test]
        fn min_price_enforcement() {
            let accounts = ink::env::test::default_accounts::<ink::env::DefaultEnvironment>();
            let mut contract = FiapoMarketplace::new(accounts.charlie, accounts.django);

            // Set min price for tier 1 = 1000
            contract.set_min_price(1, 1000).unwrap();

            // Try to list below min → should fail
            let result = contract.list_nft(1, 500, 1, 0);
            assert_eq!(result, Err(MarketplaceError::PriceBelowMinimum));

            // List at min → should work
            let result = contract.list_nft(1, 1000, 1, 0);
            assert!(result.is_ok());
        }

        #[ink::test]
        fn min_price_disabled_after_ico() {
            let accounts = ink::env::test::default_accounts::<ink::env::DefaultEnvironment>();
            let mut contract = FiapoMarketplace::new(accounts.charlie, accounts.django);

            contract.set_min_price(1, 1000).unwrap();
            contract.set_ico_sales_completed(true).unwrap();

            // Now any price is OK
            let result = contract.list_nft(1, 1, 1, 0);
            assert!(result.is_ok());
        }

        #[ink::test]
        fn currency_forced_lunes_during_ico() {
            let accounts = ink::env::test::default_accounts::<ink::env::DefaultEnvironment>();
            let mut contract = FiapoMarketplace::new(accounts.charlie, accounts.django);

            // During ICO: currency forced to 0 (LUNES) even if 1 (FIAPO) requested
            contract.list_nft(1, 1000, 0, 1).unwrap();
            let listing = contract.get_listing(1).unwrap();
            assert_eq!(listing.currency, 0); // Forced LUNES
        }

        #[ink::test]
        fn currency_choice_after_ico() {
            let accounts = ink::env::test::default_accounts::<ink::env::DefaultEnvironment>();
            let mut contract = FiapoMarketplace::new(accounts.charlie, accounts.django);

            contract.set_ico_sales_completed(true).unwrap();

            // After ICO: seller can choose FIAPO
            contract.list_nft(1, 500, 0, 1).unwrap();
            let listing = contract.get_listing(1).unwrap();
            assert_eq!(listing.currency, 1); // FIAPO

            // Or LUNES
            contract.list_nft(2, 500, 0, 0).unwrap();
            let listing2 = contract.get_listing(2).unwrap();
            assert_eq!(listing2.currency, 0); // LUNES
        }

        #[ink::test]
        fn payment_mode_changes() {
            let accounts = ink::env::test::default_accounts::<ink::env::DefaultEnvironment>();
            let mut contract = FiapoMarketplace::new(accounts.charlie, accounts.django);

            assert_eq!(contract.payment_mode(), 0); // Only LUNES during ICO

            contract.set_ico_sales_completed(true).unwrap();
            assert_eq!(contract.payment_mode(), 2); // Both LUNES+FIAPO after ICO
        }
    }
}
