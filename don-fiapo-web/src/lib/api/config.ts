/**
 * API Configuration
 */

// Lunes Network RPC endpoints - uses only env variable for testnet/mainnet switching
export const LUNES_RPC_ENDPOINTS = [
  'ws://127.0.0.1:9944',
];


export const API_CONFIG = {
  // Oracle service URL
  oracleUrl: process.env.NEXT_PUBLIC_ORACLE_URL || 'http://localhost:3001',

  // Lunes Network (primary - for backward compatibility)
  lunesRpc: process.env.NEXT_PUBLIC_LUNES_RPC || 'ws://127.0.0.1:9944',

  // Lunes RPC endpoints for redundancy
  lunesRpcEndpoints: LUNES_RPC_ENDPOINTS,

  // Contract addresses (replace with actual deployed addresses)
  contracts: {
    donFiapo: process.env.NEXT_PUBLIC_ICO_CONTRACT || '',
  },

  // Solana configuration
  solana: {
    rpc: process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.devnet.solana.com',
    usdtMint: 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr', // Devnet USDT
    usdcMint: 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr', // Devnet USDC (using a common Devnet SPL token)
    receiverWallet: process.env.NEXT_PUBLIC_SOLANA_RECEIVER || '',
  },

  // Token info
  token: {
    name: 'Don Fiapo',
    symbol: 'FIAPO',
    decimals: 8,
    totalSupply: 300_000_000_000,
  },

  // Staking pools configuration (keyed by URL slug)
  stakingPools: {
    'don-burn': {
      id: 'don-burn',
      name: 'Don Burn',
      apy: 10,
      minApy: 10,
      maxApy: 300,
      minStake: 1_000,
      lockDays: 30,
      paymentFrequency: 'daily',
    },
    'don-lunes': {
      id: 'don-lunes',
      name: 'Don Lunes',
      apy: 7,
      minApy: 6,
      maxApy: 37,
      minStake: 1_000,
      lockDays: 60,
      paymentFrequency: 'weekly',
    },
    'don-fiapo': {
      id: 'don-fiapo',
      name: 'Don Fiapo',
      apy: 10,
      minApy: 7,
      maxApy: 70,
      minStake: 1_000,
      lockDays: 90,
      paymentFrequency: 'monthly',
    },
  } as Record<string, {
    id: string;
    name: string;
    apy: number;
    minApy: number;
    maxApy: number;
    minStake: number;
    lockDays: number;
    paymentFrequency: string;
  }>,

  // NFT tiers configuration - SMART CONTRACT VALUES (ico.rs)
  // Daily mining x 112 days = Total mining
  // IPFS hashes uploaded via Pinata on 2025-12-30
  nftTiers: [
    { id: 0, name: 'The Shovel of the Commoner Miner', shortName: 'Free', price: 0, dailyMining: 5, totalMining: 560, miningDays: 112, supply: 10_000, categoryTotal: 5_600_000, image: '/nfts/tier1-free.png', color: 'bg-green-500', ipfsImage: 'ipfs://bafybeiegeqvx36cqwjnuexq5rqimd4gtzitnc6havjdxixvrsrnhnugwie', ipfsMetadata: 'ipfs://bafkreialowx7hkvxs43pzep3dnnli7u47rdz5hdzjag3suf6lchr2xrsfy', evolutionRequirement: 5, burnReward: 100, prestigeBonus: { first: 100, last: 1000 } },
    { id: 1, name: 'The Pickaxe of the Royal Guard', shortName: 'Bronze', price: 10, dailyMining: 50, totalMining: 5_600, miningDays: 112, supply: 50_000, categoryTotal: 280_000_000, image: '/nfts/tier2-bronze.png', color: 'bg-amber-600', ipfsImage: 'ipfs://bafybeia6hp4i42r22l7rotv536bawcmb3jbm2zxqpuifti464hhjaa7qt4', ipfsMetadata: 'ipfs://bafkreiaqq6fqo34o5da7qc7m3ibluh7cvchf6xbt6lkyp65gnncdwak5jy', evolutionRequirement: 2, burnReward: 500, prestigeBonus: { first: 10_000, last: 100_000 } },
    { id: 2, name: 'The Candelabrum of the Explorer', shortName: 'Silver', price: 30, dailyMining: 150, totalMining: 16_800, miningDays: 112, supply: 40_000, categoryTotal: 672_000_000, image: '/nfts/tier3-silver.png', color: 'bg-slate-400', ipfsImage: 'ipfs://bafybeicalundyfevl3lwcje2cwrwsxk6rfaihi7ufaxlnxebr6vy6qwmay', ipfsMetadata: 'ipfs://bafkreigp7z6enxowwzsiarpcxboutxxpbyb7f2roqgb35hxqxeob3f2epa', evolutionRequirement: 2, burnReward: 1500, prestigeBonus: { first: 25_000, last: 250_000 } },
    { id: 3, name: "The Power to Unlock Kingdom's Wealth", shortName: 'Gold', price: 55, dailyMining: 300, totalMining: 33_600, miningDays: 112, supply: 30_000, categoryTotal: 1_008_000_000, image: '/nfts/tier4-gold.png', color: 'bg-yellow-500', ipfsImage: 'ipfs://bafybeid7nxupxhudefbvd36nd45nd3cxfqiybzrbaor2infnjq3hoalanm', ipfsMetadata: 'ipfs://bafkreidn5klyignb7y6skguanaixee2tnhi32tyfehsufn2paqvcuspuwu', evolutionRequirement: 2, burnReward: 5000, prestigeBonus: { first: 50_000, last: 500_000 } },
    { id: 4, name: 'The Royal Treasure Map', shortName: 'Platinum', price: 100, dailyMining: 500, totalMining: 56_000, miningDays: 112, supply: 20_000, categoryTotal: 1_120_000_000, image: '/nfts/tier5-platinum.png', color: 'bg-cyan-400', ipfsImage: 'ipfs://bafybeidaesu4zssaeh2upn7tpe664iqn2v5tr6focmrrd753sxnkitissa', ipfsMetadata: 'ipfs://bafkreigyljgp6pt3ukb3xghngurb6akdkvbqp7l4geqxtp7btneruqtyhe', evolutionRequirement: 2, burnReward: 15_000, prestigeBonus: { first: 75_000, last: 750_000 } },
    { id: 5, name: 'The Golden Mango Eye', shortName: 'Diamond', price: 250, dailyMining: 1_200, totalMining: 134_400, miningDays: 112, supply: 5_000, categoryTotal: 672_000_000, image: '/nfts/tier6-diamond.png', color: 'bg-blue-500', ipfsImage: 'ipfs://bafybeicydbtys4etbit3xyyn2jcovcntoqjkrwyfvoh7si6ykh7is3skdu', ipfsMetadata: 'ipfs://bafkreienipvdroutcqyf2gmf4zm7a2ttoewooam5wtjl7cmpfqqp3urzwi', evolutionRequirement: 2, burnReward: 50_000, prestigeBonus: { first: 100_000, last: 1_000_000 } },
    { id: 6, name: 'The Royal Scepter of Don Himself', shortName: 'Royal', price: 500, dailyMining: 2_500, totalMining: 280_000, miningDays: 112, supply: 2_000, categoryTotal: 560_000_000, image: '/nfts/tier7-royal.png', color: 'bg-golden', ipfsImage: 'ipfs://bafybeifjhbupjwplkknvixya223saxdcn2zkhrmir7o7xrbzhywlp5irce', ipfsMetadata: 'ipfs://bafkreidg7cyym2ggwrywbdbx45mvnjfufnd25qjpvymmbmqne4dfkmj4uy', evolutionRequirement: 0, burnReward: 100_000, prestigeBonus: { first: 1_000_000, last: 1_000_000 } },
  ],

  // Visual rarity configuration
  visualRarity: {
    common: { name: 'Common', color: 'text-gray-400', bgColor: 'bg-gray-500/20', chance: 70 },
    uncommon: { name: 'Uncommon', color: 'text-green-400', bgColor: 'bg-green-500/20', chance: 20 },
    rare: { name: 'Rare', color: 'text-blue-400', bgColor: 'bg-blue-500/20', chance: 7 },
    epic: { name: 'Epic', color: 'text-purple-400', bgColor: 'bg-purple-500/20', chance: 2.5 },
    legendary: { name: 'Legendary', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20', chance: 0.5 },
  },

  // Evolution system configuration
  evolution: {
    minNFTsRequired: 2, // General default, but specific requirements are in nftTiers
    bonusPerEvolution: 10, // +10% mining bonus per evolution
    maxEvolutions: 6, // Maximum number of evolutions possible
    cooldownHours: 2, // New cooldown period
  },

  // Total NFTs and tokens
  totalNFTSupply: 157_000,
  totalMiningAllocation: 5_070_000_000, // 13% of 39B allocated to NFT mining

  // Default mining duration (average across tiers)
  miningDuration: 112, // days
};

export type StakingPoolId = keyof typeof API_CONFIG.stakingPools;
export type NftTier = typeof API_CONFIG.nftTiers[number];
export type VisualRarityKey = keyof typeof API_CONFIG.visualRarity;
export type VisualRarityConfig = typeof API_CONFIG.visualRarity[VisualRarityKey];

// Helper functions
export function getRarityConfig(rarity: string): VisualRarityConfig {
  const key = rarity.toLowerCase() as VisualRarityKey;
  return API_CONFIG.visualRarity[key] || API_CONFIG.visualRarity.common;
}

export function getTierById(id: number): NftTier | undefined {
  return API_CONFIG.nftTiers.find(t => t.id === id);
}

export function getNextTier(currentTierId: number): NftTier | undefined {
  return API_CONFIG.nftTiers.find(t => t.id === currentTierId + 1);
}
