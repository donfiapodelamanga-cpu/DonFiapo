/**
 * Don Fiapo Contract ABI
 * 
 * This file exports the real contract metadata from the build.
 * Updated automatically from don_fiapo/target/ink/don_fiapo_contract.json
 */

import contractMetadata from './contract-metadata.json';

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
  seller: string;
  tokenId: number;
  price: bigint;
  isAuction: boolean;
  auctionEnd: number;
  highestBid: bigint;
  highestBidder: string | null;
  isActive: boolean;
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
  // Marketplace
  listNftForSale: "list_nft_for_sale",
  listNftForAuction: "list_nft_for_auction",
  buyNft: "buy_nft",
  bidNft: "bid_nft",
  cancelListing: "cancel_listing",
  settleAuction: "settle_auction",
  getListing: "get_listing",
  getActiveListings: "get_active_listings",
  areAllNftsSold: "are_all_nfts_sold",
};
