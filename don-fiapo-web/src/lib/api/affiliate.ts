/**
 * Affiliate API Service
 * 
 * Handles communication with the Don Fiapo affiliate system
 */

import { getGasLimit, parseNum, parseBigInt } from './contract';
import { API_CONFIG } from './config';
import AFFILIATE_ABI from '../contracts/abis/affiliate.json';
import type { ContractPromise } from '@polkadot/api-contract';

// ============ Types ============

export interface AffiliateInfo {
  referralCode: string;
  referredBy: string | null;
  totalReferrals: number;
  directReferrals: number;
  secondLevelReferrals: number;
  totalEarnings: bigint;
  pendingRewards: bigint;
  currentBoostBps: number;
  tier: 'Bronze' | 'Silver' | 'Gold';
  isActive: boolean;
  registrationDate: number;
}

export interface AffiliateStats {
  totalAffiliates: number;
  totalReferrals: number;
  totalRewardsDistributed: bigint;
  rewardPercentage: number;
  boostPerAffiliateBps: number;
  maxBoostBps: number;
}

export interface ReferralRecord {
  address: string;
  level: 1 | 2;
  joinedAt: number;
  totalStaked: bigint;
  rewardsGenerated: bigint;
  isActive: boolean;
}

export interface AffiliateLeaderboard {
  rank: number;
  address: string;
  referralCount: number;
  totalEarnings: bigint;
  tier: 'Bronze' | 'Silver' | 'Gold';
}

// ============ Default empty states (contract not yet deployed) ============

function emptyAffiliateInfo(address: string): AffiliateInfo {
  return {
    referralCode: `REF-${address.slice(0, 8).toUpperCase()}`,
    referredBy: null,
    totalReferrals: 0,
    directReferrals: 0,
    secondLevelReferrals: 0,
    totalEarnings: BigInt(0),
    pendingRewards: BigInt(0),
    currentBoostBps: 0,
    tier: 'Bronze',
    isActive: false,
    registrationDate: 0,
  };
}

const EMPTY_STATS: AffiliateStats = {
  totalAffiliates: 0,
  totalReferrals: 0,
  totalRewardsDistributed: BigInt(0),
  rewardPercentage: 7,
  boostPerAffiliateBps: 50,
  maxBoostBps: 500,
};

// ============ API Functions ============

// Affiliate contract instance cache
let affiliateContract: ContractPromise | null = null;
let affiliateConnectionPromise: Promise<ContractPromise | null> | null = null;

/**
 * Initialize the Affiliate contract specifically
 */
async function initializeAffiliateContract(): Promise<ContractPromise | null> {
  // Return cached contract
  if (affiliateContract) return affiliateContract;

  // Return existing connection promise
  if (affiliateConnectionPromise) return affiliateConnectionPromise;

  affiliateConnectionPromise = (async () => {
    try {
      const affiliateAddress = API_CONFIG.contracts.affiliate;

      if (!affiliateAddress) {
        console.warn('[Affiliate] No affiliate contract address configured');
        return null;
      }

      // Dynamic imports
      const { ApiPromise, WsProvider } = await import('@polkadot/api');
      const { ContractPromise: ContractPromiseClass } = await import('@polkadot/api-contract');

      // Connect to node
      const provider = new WsProvider(API_CONFIG.lunesRpc);
      const api = await ApiPromise.create({ provider });

      // Create contract instance with affiliate ABI and address
      affiliateContract = new ContractPromiseClass(api, AFFILIATE_ABI as any, affiliateAddress);

      console.log('[Affiliate] Connected to affiliate contract:', affiliateAddress);
      affiliateConnectionPromise = null;
      return affiliateContract;
    } catch (error) {
      console.warn('[Affiliate] Failed to connect to affiliate contract:', error);
      affiliateConnectionPromise = null;
      return null;
    }
  })();

  return affiliateConnectionPromise;
}

/**
 * Get affiliate info for a specific address
 */
export async function getAffiliateInfo(address: string): Promise<AffiliateInfo> {
  try {
    const contract = await initializeAffiliateContract();

    if (!contract) {
      console.info('[Affiliate] Contract not available — returning empty state');
      return emptyAffiliateInfo(address);
    }

    // Use the actual methods from the affiliate contract ABI
    // Methods available: get_referrals, get_referrer, calculate_apy_boost, get_stats

    // Debug: log available query methods
    const queryMethods = Object.keys(contract.query);
    console.log('[Affiliate] Available query methods:', queryMethods);

    try {
      // Contract uses camelCase method names
      // Available: getReferrals, getReferrer, getStats, calculateApyBoost, totalAffiliates

      // Get referrals for this user
      const referralsResult = await contract.query.getReferrals(
        contract.address,
        getGasLimit(contract.api),
        address
      );

      // Get who referred this user
      const referrerResult = await contract.query.getReferrer(
        contract.address,
        getGasLimit(contract.api),
        address
      );

      // Calculate APY boost - only takes 1 argument (user address)
      const boostResult = await contract.query.calculateApyBoost(
        contract.address,
        getGasLimit(contract.api),
        address
      );

      let totalReferrals = 0;
      let referredBy: string | null = null;
      let boostBps = 0;

      if (referralsResult.result.isOk && referralsResult.output) {
        const referrals = referralsResult.output.toHuman() as any;
        if (Array.isArray(referrals)) {
          totalReferrals = referrals.length;
        } else if (referrals?.Ok && Array.isArray(referrals.Ok)) {
          totalReferrals = referrals.Ok.length;
        }
      }

      if (referrerResult.result.isOk && referrerResult.output) {
        const referrer = referrerResult.output.toHuman() as any;
        if (referrer && referrer !== 'None' && referrer.Ok) {
          referredBy = referrer.Ok;
        }
      }

      if (boostResult.result.isOk && boostResult.output) {
        const boost = boostResult.output.toHuman() as any;
        boostBps = parseNum(boost?.Ok || boost || 0);
      }

      console.log('[Affiliate] Contract data - Referrals:', totalReferrals, 'Referred by:', referredBy, 'Boost:', boostBps);

      return {
        referralCode: `REF-${address.slice(0, 8).toUpperCase()}`,
        referredBy,
        totalReferrals,
        directReferrals: totalReferrals,
        secondLevelReferrals: 0,
        totalEarnings: BigInt(0), // Would need events or state tracking
        pendingRewards: BigInt(0),
        currentBoostBps: boostBps,
        tier: getTierFromReferrals(totalReferrals),
        isActive: true,
        registrationDate: Date.now(),
      };
    } catch (queryError) {
      console.warn('[Affiliate] Query error:', queryError);
      return emptyAffiliateInfo(address);
    }
  } catch (error) {
    console.warn('[Affiliate] Error fetching info:', error);
    return emptyAffiliateInfo(address);
  }
}

/**
 * Get affiliate system stats
 */
export async function getAffiliateStats(): Promise<AffiliateStats> {
  try {
    const contract = await initializeAffiliateContract();
    if (!contract) return EMPTY_STATS;

    // Try to read stats from contract if available
    const queryMethods = Object.keys(contract.query);
    if (queryMethods.includes('getStats') || queryMethods.includes('get_stats')) {
      const method = contract.query.getStats || contract.query.get_stats;
      const { result, output } = await method(contract.address, getGasLimit(contract.api));
      if (result.isOk && output) {
        return parseAffiliateStats(output.toHuman());
      }
    }
    return EMPTY_STATS;
  } catch (error) {
    console.warn('[Affiliate] Error fetching stats:', error);
    return EMPTY_STATS;
  }
}

/**
 * Get list of referrals for an address
 */
export async function getReferrals(address: string): Promise<ReferralRecord[]> {
  try {
    const contract = await initializeAffiliateContract();

    if (!contract) {
      console.info('[Affiliate] Contract not available — no referrals');
      return [];
    }

    // Get referrals from the contract
    const referralsResult = await contract.query.getReferrals(
      contract.address,
      getGasLimit(contract.api),
      address
    );

    if (referralsResult.result.isOk && referralsResult.output) {
      const data = referralsResult.output.toHuman() as any;
      const referralAddresses = data?.Ok || data || [];

      if (Array.isArray(referralAddresses) && referralAddresses.length > 0) {
        console.log('[Affiliate] Found', referralAddresses.length, 'referrals from contract');

        // Map the addresses to ReferralRecord format
        // Note: Contract only returns addresses, not full activity data
        return referralAddresses.map((addr: string, index: number) => ({
          address: addr,
          level: 1 as const, // All direct referrals are level 1
          joinedAt: Date.now() - (index * 24 * 60 * 60 * 1000), // Placeholder dates
          totalStaked: BigInt(0), // Would need getReferralActivity for this
          rewardsGenerated: BigInt(0),
          isActive: true,
        }));
      }

      console.log('[Affiliate] No referrals found for this address');
      return [];
    }

    return [];
  } catch (error) {
    console.warn('[Affiliate] Error fetching referrals:', error);
    return [];
  }
}

/**
 * Get affiliate leaderboard
 */
export async function getAffiliateLeaderboard(limit: number = 10): Promise<AffiliateLeaderboard[]> {
  try {
    const contract = await initializeAffiliateContract();

    if (!contract) {
      console.info('[Affiliate] Contract not available — no leaderboard');
      return [];
    }

    // New method: getTopAffiliates(limit)
    // Returns Vec<(AccountId, AffiliateStats)>
    // Method name likely converted to camelCase: getTopAffiliates
    const getTopAffiliatesMethod = contract.query.get_top_affiliates || contract.query.getTopAffiliates;

    if (!getTopAffiliatesMethod) {
      console.warn('[Affiliate] Contract missing getTopAffiliates method. Is ABI updated?');
      return [];
    }

    const result = await getTopAffiliatesMethod(
      contract.address,
      getGasLimit(contract.api),
      limit
    );

    if (result.result.isOk && result.output) {
      const data = result.output.toHuman() as any;
      const entries = data?.Ok || data || [];

      if (!Array.isArray(entries)) {
        console.warn('[Affiliate] Leaderboard data is not array:', entries);
        return [];
      }

      console.log('[Affiliate] Found', entries.length, 'leaderboard entries');

      // Map contract data to UI format
      // Entry layout: [Address, Stats]
      return entries.map((entry: any, index: number) => {
        // Handle tuple format from PolkadotJS
        const address = Array.isArray(entry) ? entry[0] : entry.address || entry.AccountId;
        const stats = Array.isArray(entry) ? entry[1] : entry.stats || entry.AffiliateStats;

        return {
          rank: index + 1,
          address: address.toString(), // Ensure string
          referralCount: parseNum(stats?.direct_referrals || stats?.directReferrals || 0),
          totalEarnings: parseBigInt(stats?.total_earnings || stats?.totalEarnings || 0),
          tier: getTierFromReferrals(parseNum(stats?.direct_referrals || stats?.directReferrals || 0)),
        };
      });
    }

    return [];
  } catch (error) {
    console.warn('[Affiliate] Error fetching leaderboard:', error);
    return [];
  }
}

// Helpers
// parseNum and parseBigInt are imported from ./contract
/**
 * Check if an address is already registered as affiliate
 */
export async function isAffiliateRegistered(address: string): Promise<boolean> {
  try {
    const contract = await initializeAffiliateContract();

    if (!contract) {
      return false;
    }

    // Check if method exists in ABI
    if (typeof contract.query.get_affiliate_data !== 'function') {
      return true; // Assume registered if method not available
    }

    const { result, output } = await contract.query.get_affiliate_data(
      contract.address,
      { gasLimit: -1 },
      address
    );

    if (result.isOk && output) {
      const data = output.toJSON();
      return data !== null && data !== undefined;
    }

    return false;
  } catch (error) {
    console.error('[Affiliate] Error checking registration:', error);
    return false;
  }
}

/**
 * Validate a referral code
 */
export async function validateReferralCode(code: string): Promise<{
  valid: boolean;
  referrerAddress?: string;
  error?: string;
}> {
  try {
    // Extract address from referral code format (e.g., REF-5GRWVAEF or full address)
    const cleanCode = code.replace('REF-', '').replace('ref-', '');

    // For now, just validate format
    if (cleanCode.length < 6) {
      return { valid: false, error: 'Invalid referral code format' };
    }

    const contract = await initializeAffiliateContract();

    if (!contract) {
      return { valid: false, error: 'Affiliate contract not available yet' };
    }

    // Try to find referrer by code
    const { result, output } = await contract.query.get_referrer_by_code(
      contract.address,
      { gasLimit: -1 },
      code
    );

    if (result.isOk && output) {
      const referrerAddress = output.toJSON() as string;
      if (referrerAddress) {
        return { valid: true, referrerAddress };
      }
    }

    return { valid: false, error: 'Referral code not found' };
  } catch (error) {
    console.error('[Affiliate] Error validating code:', error);
    return { valid: false, error: 'Failed to validate code' };
  }
}

// ============ Helper Functions ============

function getTierFromReferrals(count: number): 'Bronze' | 'Silver' | 'Gold' {
  if (count >= 50) return 'Gold';
  if (count >= 11) return 'Silver';
  return 'Bronze';
}

function parseAffiliateInfo(data: any, address: string): AffiliateInfo {
  const directReferrals = data.directReferrals?.length || data.direct_referrals?.length || 0;
  const secondLevelReferrals = data.secondLevelReferrals?.length || data.second_level_referrals?.length || 0;
  const totalReferrals = directReferrals + secondLevelReferrals;

  return {
    referralCode: data.referralCode || data.referral_code || `REF-${address.slice(0, 8).toUpperCase()}`,
    referredBy: data.referrer || data.referred_by || null,
    totalReferrals,
    directReferrals,
    secondLevelReferrals,
    totalEarnings: BigInt(data.totalReferralRewards || data.total_referral_rewards || 0),
    pendingRewards: BigInt(data.pendingRewards || data.pending_rewards || 0),
    currentBoostBps: data.currentBoostBps || data.current_boost_bps || 0,
    tier: getTierFromReferrals(totalReferrals),
    isActive: data.isActive ?? data.is_active ?? true,
    registrationDate: data.registrationTimestamp || data.registration_timestamp || Date.now(),
  };
}

function parseAffiliateStats(data: any): AffiliateStats {
  return {
    totalAffiliates: data.totalAffiliates || data.total_affiliates || 0,
    totalReferrals: data.totalReferrals || data.total_referrals || 0,
    totalRewardsDistributed: BigInt(data.totalRewardsDistributed || data.total_rewards_distributed || 0),
    rewardPercentage: data.rewardPercentage || data.reward_percentage || 2.5,
    boostPerAffiliateBps: data.boostPerAffiliateBps || data.boost_per_affiliate_bps || 50,
    maxBoostBps: data.maxBoostBps || data.max_boost_bps || 500,
  };
}

function parseReferralRecord(data: any): ReferralRecord {
  return {
    address: data.address || '',
    level: data.level || 1,
    joinedAt: data.joinedAt || data.joined_at || Date.now(),
    totalStaked: BigInt(data.totalStaked || data.total_staked || 0),
    rewardsGenerated: BigInt(data.rewardsGenerated || data.rewards_generated || 0),
    isActive: data.isActive ?? data.is_active ?? true,
  };
}

function parseLeaderboardEntry(data: any, index: number): AffiliateLeaderboard {
  const referralCount = data.referralCount || data.referral_count || 0;
  return {
    rank: data.rank || index + 1,
    address: data.address || '',
    referralCount,
    totalEarnings: BigInt(data.totalEarnings || data.total_earnings || 0),
    tier: getTierFromReferrals(referralCount),
  };
}
