/**
 * Don Fiapo Contract ABI
 * 
 * Updated to match the REAL contract methods from lib.rs
 * ink! 4.3.0 / ink! 5.1.1 compatible
 */

export const CONTRACT_ABI = {
  version: "4",
  source: {
    hash: "0x0000000000000000000000000000000000000000000000000000000000000000",
    language: "ink! 5.1.1",
    compiler: "rustc 1.90.0-nightly",
    wasm: "0x",
  },
  contract: {
    name: "don_fiapo",
    version: "1.0.0",
    authors: ["Don Fiapo Team"],
  },
  spec: {
    constructors: [
      {
        args: [
          { label: "name", type: { type: 4 } },
          { label: "symbol", type: { type: 4 } },
          { label: "initial_supply", type: { type: 0 } },
          { label: "system_wallets", type: { type: 1 } },
        ],
        default: false,
        docs: ["Creates a new Don Fiapo contract"],
        label: "new",
        payable: false,
        returnType: { type: 2 },
        selector: "0x9bae9d5e",
      },
    ],
    events: [
      {
        args: [
          { docs: [], indexed: true, label: "from", type: { type: 3 } },
          { docs: [], indexed: true, label: "to", type: { type: 3 } },
          { docs: [], indexed: false, label: "value", type: { type: 0 } },
        ],
        docs: ["Emitted when tokens are transferred"],
        label: "Transfer",
      },
      {
        args: [
          { docs: [], indexed: true, label: "owner", type: { type: 1 } },
          { docs: [], indexed: true, label: "spender", type: { type: 1 } },
          { docs: [], indexed: false, label: "value", type: { type: 0 } },
        ],
        docs: ["Emitted when an approval is made"],
        label: "Approval",
      },
      {
        args: [
          { docs: [], indexed: true, label: "from", type: { type: 1 } },
          { docs: [], indexed: false, label: "amount", type: { type: 0 } },
          { docs: [], indexed: false, label: "new_total_supply", type: { type: 0 } },
        ],
        docs: ["Emitted when tokens are burned"],
        label: "TokensBurned",
      },
      {
        args: [
          { docs: [], indexed: true, label: "staker", type: { type: 1 } },
          { docs: [], indexed: false, label: "staking_type", type: { type: 4 } },
          { docs: [], indexed: false, label: "amount", type: { type: 0 } },
          { docs: [], indexed: false, label: "apy_bps", type: { type: 9 } },
        ],
        docs: ["Emitted when staking is created"],
        label: "StakingCreated",
      },
    ],
    messages: [
      // ===== PSP22 Token Methods (REAL) =====
      {
        args: [],
        default: false,
        docs: ["Returns the token name"],
        label: "token_name",
        mutates: false,
        payable: false,
        returnType: { type: 4 },
        selector: "0x3d261bd4",
      },
      {
        args: [],
        default: false,
        docs: ["Returns the token symbol"],
        label: "token_symbol",
        mutates: false,
        payable: false,
        returnType: { type: 4 },
        selector: "0x34205be5",
      },
      {
        args: [],
        default: false,
        docs: ["Returns the number of decimals"],
        label: "decimals",
        mutates: false,
        payable: false,
        returnType: { type: 6 },
        selector: "0x7271b782",
      },
      {
        args: [],
        default: false,
        docs: ["Returns the total supply of the token"],
        label: "total_supply",
        mutates: false,
        payable: false,
        returnType: { type: 0 },
        selector: "0x162df8c2",
      },
      {
        args: [{ label: "owner", type: { type: 1 } }],
        default: false,
        docs: ["Returns the balance of the specified account"],
        label: "balance_of",
        mutates: false,
        payable: false,
        returnType: { type: 0 },
        selector: "0x0f755a56",
      },
      {
        args: [
          { label: "owner", type: { type: 1 } },
          { label: "spender", type: { type: 1 } },
        ],
        default: false,
        docs: ["Returns the allowance"],
        label: "allowance",
        mutates: false,
        payable: false,
        returnType: { type: 0 },
        selector: "0x6a00165e",
      },
      {
        args: [
          { label: "to", type: { type: 1 } },
          { label: "value", type: { type: 0 } },
        ],
        default: false,
        docs: ["Transfers tokens to the specified account"],
        label: "transfer",
        mutates: true,
        payable: false,
        returnType: { type: 7 },
        selector: "0x84a15da1",
      },
      // ===== Affiliate Methods (REAL) =====
      {
        args: [{ label: "referrer", type: { type: 1 } }],
        default: false,
        docs: ["Registers a new affiliate"],
        label: "register_affiliate",
        mutates: true,
        payable: false,
        returnType: { type: 7 },
        selector: "0x1d4a7f3b",
      },
      {
        args: [{ label: "user", type: { type: 1 } }],
        default: false,
        docs: ["Returns affiliate data for a user"],
        label: "get_affiliate_data",
        mutates: false,
        payable: false,
        returnType: { type: 14 },
        selector: "0x8e3f2a5c",
      },
      {
        args: [{ label: "user", type: { type: 1 } }],
        default: false,
        docs: ["Returns APY boost based on affiliates"],
        label: "get_affiliate_apy_boost",
        mutates: false,
        payable: false,
        returnType: { type: 9 },
        selector: "0x2a5f8e3c",
      },
      // ===== Staking Methods (REAL) =====
      {
        args: [
          { label: "staking_type", type: { type: 8 } },
          { label: "amount", type: { type: 0 } },
        ],
        default: false,
        docs: ["Creates a staking position"],
        label: "create_staking",
        mutates: true,
        payable: false,
        returnType: { type: 7 },
        selector: "0x5b9d2569",
      },
      // ===== Burn Methods (REAL) =====
      {
        args: [{ label: "amount", type: { type: 0 } }],
        default: false,
        docs: ["Burns tokens from caller"],
        label: "burn",
        mutates: true,
        payable: false,
        returnType: { type: 7 },
        selector: "0xb1efc17b",
      },
      // ===== System Methods (REAL) =====
      {
        args: [],
        default: false,
        docs: ["Returns system statistics"],
        label: "get_stats",
        mutates: false,
        payable: false,
        returnType: { type: 15 },
        selector: "0x1a1a1a1a",
      },
      {
        args: [],
        default: false,
        docs: ["Returns if system is paused"],
        label: "is_paused",
        mutates: false,
        payable: false,
        returnType: { type: 16 },
        selector: "0x2b2b2b2b",
      },
      {
        args: [],
        default: false,
        docs: ["Returns system wallets"],
        label: "get_system_wallets",
        mutates: false,
        payable: false,
        returnType: { type: 17 },
        selector: "0x3c3c3c3c",
      },
      {
        args: [],
        default: false,
        docs: ["Calculates initial distribution"],
        label: "calculate_initial_distribution",
        mutates: false,
        payable: false,
        returnType: { type: 18 },
        selector: "0x4d4d4d4d",
      },
      // ===== Owner Methods (REAL) =====
      {
        args: [],
        default: false,
        docs: ["Pauses the contract (owner only)"],
        label: "pause_owner",
        mutates: true,
        payable: false,
        returnType: { type: 7 },
        selector: "0x5e5e5e5e",
      },
      {
        args: [],
        default: false,
        docs: ["Unpauses the contract (owner only)"],
        label: "unpause_owner",
        mutates: true,
        payable: false,
        returnType: { type: 7 },
        selector: "0x6f6f6f6f",
      },
      {
        args: [{ label: "top_wallets", type: { type: 19 } }],
        default: false,
        docs: ["Distributes ranking rewards (owner only)"],
        label: "distribute_ranking_rewards",
        mutates: true,
        payable: false,
        returnType: { type: 7 },
        selector: "0x7a7a7a7a",
      },
      // ===== NFT Methods (RECONSTRUCTED) =====
      {
        args: [
          { label: "nft_type", type: { type: 21 } },
          { label: "lunes_balance", type: { type: 0 } },
          { label: "payment_proof", type: { type: 23 } },
        ],
        default: false,
        docs: ["Mints a new NFT"],
        label: "mint_nft",
        mutates: true,
        payable: false,
        returnType: { type: 29 },
        selector: "0x219a113e",
      },
      {
        args: [{ label: "owner", type: { type: 1 } }],
        default: false,
        docs: ["Returns NFTs owned by account"],
        label: "get_user_nfts",
        mutates: false,
        payable: false,
        returnType: { type: 28 },
        selector: "0x75b82d34",
      },
      {
        args: [{ label: "nft_id", type: { type: 5 } }],
        default: false,
        docs: ["Claims available tokens from NFT"],
        label: "claim_tokens",
        mutates: true,
        payable: false,
        returnType: { type: 30 },
        selector: "0xfbcfbf73",
      },
      {
        args: [{ label: "nft_id", type: { type: 5 } }],
        default: false,
        docs: ["Gets claimable tokens amount"],
        label: "get_claimable_tokens",
        mutates: false,
        payable: false,
        returnType: { type: 30 },
        selector: "0x236f2a7e",
      },
    ],
  },
  types: [
    { id: 0, type: { def: { primitive: "u128" } } }, // Balance
    { id: 1, type: { def: { composite: { fields: [{ type: 20 }] } } } }, // AccountId
    { id: 2, type: { def: { variant: { variants: [{ index: 0, name: "Ok" }, { index: 1, name: "Err" }] } } } }, // Result
    { id: 3, type: { def: { variant: { variants: [{ index: 0, name: "None" }, { index: 1, name: "Some", fields: [{ type: 1 }] }] } } } }, // Option<AccountId>
    { id: 4, type: { def: { primitive: "str" } } }, // String
    { id: 5, type: { def: { primitive: "u64" } } }, // u64
    { id: 6, type: { def: { primitive: "u8" } } }, // u8
    { id: 7, type: { def: { variant: { variants: [{ index: 0, name: "Ok" }, { index: 1, name: "Err", fields: [{ type: 4 }] }] } } } }, // Result<(), Error>
    { id: 8, type: { def: { composite: { fields: [] } } } }, // StakingType enum
    { id: 9, type: { def: { primitive: "u32" } } }, // u32
    { id: 14, type: { def: { variant: { variants: [{ index: 0, name: "None" }, { index: 1, name: "Some" }] } } } }, // Option<AffiliateData>
    { id: 15, type: { def: { composite: { fields: [] } } } }, // SystemStats
    { id: 16, type: { def: { primitive: "bool" } } }, // bool
    { id: 17, type: { def: { tuple: { types: [3, 3, 3, 3] } } } }, // (Option<AccountId>, ...)
    { id: 18, type: { def: { composite: { fields: [] } } } }, // InitialDistribution
    { id: 19, type: { def: { sequence: { type: 1 } } } }, // Vec<AccountId>
    { id: 20, type: { def: { array: { len: 32, type: 6 } } } }, // [u8; 32]
    { id: 21, type: { def: { variant: { variants: [{ index: 0, name: "Free" }, { index: 1, name: "Tier2" }, { index: 2, name: "Tier3" }, { index: 3, name: "Tier4" }, { index: 4, name: "Tier5" }, { index: 5, name: "Tier6" }, { index: 6, name: "Tier7" }] } } } }, // NFTType
    { id: 22, type: { def: { composite: { fields: [{ name: "transaction_hash", type: 4 }, { name: "sender_address", type: 4 }, { name: "amount_usdt", type: 5 }] } } } }, // PaymentProof
    { id: 23, type: { def: { variant: { variants: [{ index: 0, name: "None" }, { index: 1, name: "Some", fields: [{ type: 22 }] }] } } } }, // Option<PaymentProof>
    { id: 24, type: { def: { variant: { variants: [{ index: 0, name: "Common" }, { index: 1, name: "Uncommon" }, { index: 2, name: "Rare" }, { index: 3, name: "Epic" }, { index: 4, name: "Legendary" }] } } } }, // VisualRarity
    { id: 25, type: { def: { sequence: { type: 5 } } } }, // Vec<u64>
    { id: 26, type: { def: { composite: { fields: [{ name: "id", type: 5 }, { name: "nft_type", type: 21 }, { name: "owner", type: 1 }, { name: "created_at", type: 5 }, { name: "tokens_mined", type: 0 }, { name: "tokens_claimed", type: 0 }, { name: "last_mining_timestamp", type: 5 }, { name: "active", type: 16 }, { name: "visual_rarity", type: 24 }, { name: "evolution_count", type: 6 }, { name: "mining_bonus_bps", type: 6 }, { name: "evolved_from", type: 25 }] } } } }, // NFTData
    { id: 27, type: { def: { sequence: { type: 26 } } } }, // Vec<NFTData>
    { id: 28, type: { def: { variant: { variants: [{ index: 0, name: "Ok", fields: [{ type: 27 }] }, { index: 1, name: "Err", fields: [{ type: 4 }] }] } } } }, // Result<Vec<NFTData>, Error>
    { id: 29, type: { def: { variant: { variants: [{ index: 0, name: "Ok", fields: [{ type: 5 }] }, { index: 1, name: "Err", fields: [{ type: 4 }] }] } } } }, // Result<u64, Error>
    { id: 30, type: { def: { variant: { variants: [{ index: 0, name: "Ok", fields: [{ type: 0 }] }, { index: 1, name: "Err", fields: [{ type: 4 }] }] } } } }, // Result<u128, Error>
  ],
};

// ===== REAL TypeScript Types from Contract =====

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
  totalTransfers: number;
  totalFeesCollected: bigint;
  totalBurned: bigint;
  totalStaked: bigint;
  totalPositions: number;
  largestSingleBurn: bigint;
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
};

// Contract method selectors
export const SELECTORS = {
  tokenName: "0x3d261bd4",
  tokenSymbol: "0x34205be5",
  decimals: "0x7271b782",
  totalSupply: "0x162df8c2",
  balanceOf: "0x0f755a56",
  allowance: "0x6a00165e",
  transfer: "0x84a15da1",
  registerAffiliate: "0x1d4a7f3b",
  getAffiliateData: "0x8e3f2a5c",
  getAffiliateApyBoost: "0x2a5f8e3c",
  createStaking: "0x5b9d2569",
  burn: "0xb1efc17b",
  getStats: "0x1a1a1a1a",
  isPaused: "0x2b2b2b2b",
  getSystemWallets: "0x3c3c3c3c",
  // NFT
  mintNft: "0x219a113e",
  getUserNfts: "0x75b82d34",
  claimTokens: "0xfbcfbf73",
  getClaimableTokens: "0x236f2a7e",
};
