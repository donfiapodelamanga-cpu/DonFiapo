/**
 * Don Fiapo Contract ABI
 * 
 * This file exports the real contract metadata from the build.
 * Updated: Using ICO contract ABI (fiapo_ico.json)
 */

import contractMetadata from '../contracts/fiapo_ico.json';

// Export the full contract ABI from the build
export const CONTRACT_ABI = contractMetadata;

// ===== TypeScript Types from Contract =====

export interface AffiliateData {
  referrer: string | null;
  directReferrals: string[];
  secondLevelReferrals: string[];
  registrationTimestamp: number;
  currentBoostBps: number;
  totalReferralRewards: bigint;
  isActive: boolean;
}

export interface SystemStats {
  totalStaked: bigint;
  totalRewardsDistributed: bigint;
  activeStakingPositions: number;
  totalBurned: bigint;
  totalFeesCollected: bigint;
  walletsInRanking: number;
}

export interface NFTData {
  id: number;
  nftType: number;
  owner: string;
  createdAt: number;
  tokensMined: bigint;
  tokensClaimed: bigint;
  lastMiningTimestamp: number;
  active: boolean;
  visualRarity: string;
  evolutionCount: number;
  miningBonusBps: number;
}

export interface Listing {
  nftId: number;
  seller: string;
  price: bigint;
  nftTier: number;
  /** 0=LUNES (nativo), 1=FIAPO (PSP22) */
  currency: number;
  active: boolean;
}

export interface Auction {
  auctionId: number;
  nftId: number;
  seller: string;
  minPrice: bigint;
  highestBid: bigint;
  highestBidder: string | null;
  endTime: number;
  nftTier: number;
  /** 0=LUNES (nativo), 1=FIAPO (PSP22) */
  currency: number;
  active: boolean;
  finalized: boolean;
}

export interface TradeOffer {
  tradeId: number;
  nftIdOffered: number;
  offerer: string;
  nftIdWanted: number;
  wantedTier: number | null;
  counterparty: string | null;
  active: boolean;
}

export interface MarketplaceStats {
  totalVolume: bigint;
  totalFeesCollected: bigint;
  totalAuctionsCompleted: number;
  totalTradesCompleted: number;
}

// ===== Method name mapping (Rust snake_case to JS camelCase) =====
export const METHOD_MAP = {
  // PSP22
  tokenName: "token_name",
  tokenSymbol: "token_symbol",
  decimals: "decimals",
  totalSupply: "total_supply",
  balanceOf: "balance_of",
  allowance: "allowance",
  transfer: "transfer",
  // Affiliate
  registerAffiliate: "register_affiliate",
  getAffiliateData: "get_affiliate_data",
  getAffiliateApyBoost: "get_affiliate_apy_boost",
  // Staking
  createStaking: "create_staking",
  getStakingData: "get_staking_data",
  claimStakingRewards: "claim_staking_rewards",
  unstake: "unstake",
  // Burn
  burn: "burn",
  // System
  getStats: "get_stats",
  isPaused: "is_paused",
  getSystemWallets: "get_system_wallets",
  calculateInitialDistribution: "calculate_initial_distribution",
  // Owner
  pauseOwner: "pause_owner",
  unpauseOwner: "unpause_owner",
  distributeRankingRewards: "distribute_ranking_rewards",
  // NFT
  mintNft: "mint_nft",
  getUserNfts: "get_user_nfts",
  claimTokens: "claim_tokens",
  getClaimableTokens: "get_claimable_tokens",
  getNft: "get_nft",
  // New Getters
  getStakingConfig: "get_staking_config",
  getRankingData: "get_ranking_data",
  getGovernanceStats: "get_governance_stats",
  // Marketplace — Listings
  listNft: "list_nft",
  buyNft: "buy_nft",
  buyNftWithCode: "buy_nft_with_code",
  cancelListing: "cancel_listing",
  getListing: "get_listing",
  getActiveListings: "get_active_listings",
  getMinPrice: "get_min_price",
  isIcoSalesCompleted: "is_ico_sales_completed",
  // Marketplace — Auctions
  createAuction: "create_auction",
  placeBid: "place_bid",
  finalizeAuction: "finalize_auction",
  cancelAuction: "cancel_auction",
  getAuction: "get_auction",
  getActiveAuctions: "get_active_auctions",
  // Marketplace — Trades
  createTrade: "create_trade",
  acceptTrade: "accept_trade",
  cancelTrade: "cancel_trade",
  getTrade: "get_trade",
  getActiveTrades: "get_active_trades",
  // Marketplace — Stats
  getMarketplaceStats: "get_stats",
  getPaymentMode: "payment_mode",
  // ICO
  areAllNftsSold: "are_all_nfts_sold",
  isIcoActive: "is_ico_active",
  // Evolution
  getEvolutionStats: "get_evolution_stats",
  getRarityStats: "get_rarity_stats",
  getUserEvolutions: "get_user_evolutions",
};
