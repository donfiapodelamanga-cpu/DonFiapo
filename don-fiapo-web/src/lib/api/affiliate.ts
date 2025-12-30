/**
 * Affiliate API Service
 * 
 * Handles communication with the Don Fiapo affiliate system
 */

import { initializeContract } from './contract';

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

// ============ Mock Data ============

const MOCK_AFFILIATE_INFO: AffiliateInfo = {
  referralCode: 'DON-FIAPO-ABC123',
  referredBy: null,
  totalReferrals: 15,
  directReferrals: 12,
  secondLevelReferrals: 3,
  totalEarnings: BigInt(25000) * BigInt(10 ** 8),
  pendingRewards: BigInt(1500) * BigInt(10 ** 8),
  currentBoostBps: 150, // 1.5% bonus
  tier: 'Silver',
  isActive: true,
  registrationDate: Date.now() - 30 * 24 * 60 * 60 * 1000,
};

const MOCK_STATS: AffiliateStats = {
  totalAffiliates: 1250,
  totalReferrals: 3800,
  totalRewardsDistributed: BigInt(500000000) * BigInt(10 ** 8),
  rewardPercentage: 5,
  boostPerAffiliateBps: 50, // 0.5% per referral
  maxBoostBps: 500, // 5% max boost
};

const MOCK_REFERRALS: ReferralRecord[] = [
  {
    address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
    level: 1,
    joinedAt: Date.now() - 20 * 24 * 60 * 60 * 1000,
    totalStaked: BigInt(50000) * BigInt(10 ** 8),
    rewardsGenerated: BigInt(2500) * BigInt(10 ** 8),
    isActive: true,
  },
  {
    address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
    level: 1,
    joinedAt: Date.now() - 15 * 24 * 60 * 60 * 1000,
    totalStaked: BigInt(100000) * BigInt(10 ** 8),
    rewardsGenerated: BigInt(5000) * BigInt(10 ** 8),
    isActive: true,
  },
  {
    address: '5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy',
    level: 2,
    joinedAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
    totalStaked: BigInt(25000) * BigInt(10 ** 8),
    rewardsGenerated: BigInt(625) * BigInt(10 ** 8),
    isActive: true,
  },
];

const MOCK_LEADERBOARD: AffiliateLeaderboard[] = [
  { rank: 1, address: '5CiPPseXPECbkjWCa6MnjNokrgYjMqmKndv2rSnekmSK2DjL', referralCount: 87, totalEarnings: BigInt(450000) * BigInt(10 ** 8), tier: 'Gold' },
  { rank: 2, address: '5HGjWAeFDfFCWPsjFQdVV2Msvz2XtMktvgocEZcCj68kUMaw', referralCount: 65, totalEarnings: BigInt(320000) * BigInt(10 ** 8), tier: 'Gold' },
  { rank: 3, address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY', referralCount: 52, totalEarnings: BigInt(280000) * BigInt(10 ** 8), tier: 'Gold' },
  { rank: 4, address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty', referralCount: 43, totalEarnings: BigInt(210000) * BigInt(10 ** 8), tier: 'Silver' },
  { rank: 5, address: '5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy', referralCount: 38, totalEarnings: BigInt(185000) * BigInt(10 ** 8), tier: 'Silver' },
];

// ============ API Functions ============

/**
 * Get affiliate info for a specific address
 */
export async function getAffiliateInfo(address: string): Promise<AffiliateInfo> {
  try {
    const contract = await initializeContract();

    if (!contract) {
      console.log('[Affiliate] Using mock data');
      return {
        ...MOCK_AFFILIATE_INFO,
        referralCode: `REF-${address.slice(0, 8).toUpperCase()}`,
      };
    }

    // Check if method exists in ABI
    if (typeof contract.query.getAffiliateData !== 'function') {
      console.log('[Affiliate] Method not in ABI, using mock data');
      return {
        ...MOCK_AFFILIATE_INFO,
        referralCode: `REF-${address.slice(0, 8).toUpperCase()}`,
      };
    }

    const { result, output } = await contract.query.getAffiliateData(
      contract.address,
      { gasLimit: -1 },
      address
    );

    if (result.isOk && output) {
      return parseAffiliateInfo(output.toJSON(), address);
    }

    return {
      ...MOCK_AFFILIATE_INFO,
      referralCode: `REF-${address.slice(0, 8).toUpperCase()}`,
    };
  } catch (error) {
    console.error('[Affiliate] Error fetching info:', error);
    return {
      ...MOCK_AFFILIATE_INFO,
      referralCode: `REF-${address.slice(0, 8).toUpperCase()}`,
    };
  }
}

/**
 * Get affiliate system stats
 */
export async function getAffiliateStats(): Promise<AffiliateStats> {
  // NOTE: getAffiliateStats method doesn't exist in contract yet
  // Using static configuration values
  return MOCK_STATS;
}

/**
 * Get list of referrals for an address
 */
export async function getReferrals(_address: string): Promise<ReferralRecord[]> {
  // NOTE: getDirectReferrals method doesn't exist in contract yet
  // Using static mock data
  return MOCK_REFERRALS;
}

/**
 * Get affiliate leaderboard
 */
export async function getAffiliateLeaderboard(limit: number = 10): Promise<AffiliateLeaderboard[]> {
  // NOTE: getAffiliateLeaderboard method doesn't exist in contract yet
  // Using static mock data
  return MOCK_LEADERBOARD.slice(0, limit);
}

/**
 * Check if an address is already registered as affiliate
 */
export async function isAffiliateRegistered(address: string): Promise<boolean> {
  try {
    const contract = await initializeContract();

    if (!contract) {
      return true; // Assume registered in mock mode
    }

    // Check if method exists in ABI
    if (typeof contract.query.getAffiliateData !== 'function') {
      return true; // Assume registered if method not available
    }

    const { result, output } = await contract.query.getAffiliateData(
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

    const contract = await initializeContract();

    if (!contract) {
      // Mock validation
      return { valid: true, referrerAddress: cleanCode };
    }

    // Try to find referrer by code
    const { result, output } = await contract.query.getReferrerByCode(
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
    rewardPercentage: data.rewardPercentage || data.reward_percentage || 5,
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
