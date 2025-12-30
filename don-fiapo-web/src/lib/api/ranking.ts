/**
 * Ranking API Service
 * 
 * Handles communication with the Don Fiapo ranking system
 */

import { initializeContract } from './contract';

// ============ Types ============

export type RankingType =
  | 'MonthlyRewards'
  | 'MonthlyLottery'
  | 'ChristmasLottery'
  | 'Staking'
  | 'Burn'
  | 'Affiliates'
  | 'Governance'
  | 'General';

export interface WalletRankingInfo {
  address: string;
  balance: bigint;
  stakingBalance: bigint;
  burnVolume: bigint;
  transactionVolume: bigint;
  stakingCount: number;
  affiliateCount: number;
  governanceScore: number;
  rank: number;
  rewardAmount: bigint;
  rankingType: RankingType;
  lastUpdated: number;
  isEligible: boolean;
  totalScore: bigint;
}

export interface RankingResult {
  rankingId: number;
  rankingType: RankingType;
  winners: WalletRankingInfo[];
  totalRewards: bigint;
  totalParticipants: number;
  executedAt: number;
  periodStart: number;
  periodEnd: number;
  rewardsDistributed: boolean;
}

export interface RankingStats {
  totalRankings: number;
  totalRewardsDistributed: bigint;
  totalUniqueParticipants: number;
  mostActiveRanking: RankingType;
  lastUpdated: number;
}

export interface RankingConfig {
  maxRankingSize: number;
  excludeTopWallets: number;
  minimumBalance: bigint;
  maximumBalance: bigint;
  updateInterval: number;
  rewardPercentage: number;
  isActive: boolean;
  lastUpdated: number;
}

// ============ Mock Data for Development ============

const MOCK_ADDRESSES = [
  "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
  "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
  "5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy",
  "5HGjWAeFDfFCWPsjFQdVV2Msvz2XtMktvgocEZcCj68kUMaw",
  "5CiPPseXPECbkjWCa6MnjNokrgYjMqmKndv2rSnekmSK2DjL",
  "5GNJqTPyNqANBkUVMN1LPPrxXnFouWXoe2wNSmmEoLctxiZY",
  "5HpG9w8EBLe5XCrbczpwq5TSXvedjrBGCwqxK1iQ7qUsSWFc",
];

function generateMockWalletInfo(
  address: string,
  rank: number,
  type: RankingType
): WalletRankingInfo {
  const baseBalance = BigInt(50_000_000 - rank * 5_000_000) * BigInt(10 ** 8);
  const stakingBalance = BigInt(15_000_000 - rank * 1_500_000) * BigInt(10 ** 8);
  const burnVolume = BigInt(5_000_000 - rank * 500_000) * BigInt(10 ** 8);

  return {
    address,
    balance: baseBalance,
    stakingBalance,
    burnVolume,
    transactionVolume: BigInt(1_000_000) * BigInt(10 ** 8),
    stakingCount: Math.max(1, 10 - rank),
    affiliateCount: Math.max(1, 150 - rank * 15),
    governanceScore: Math.max(10, 100 - rank * 10),
    rank,
    rewardAmount: BigInt(200_000) * BigInt(10 ** 8),
    rankingType: type,
    lastUpdated: Date.now(),
    isEligible: true,
    totalScore: baseBalance + stakingBalance + burnVolume,
  };
}

function generateMockRankingResult(type: RankingType, _maxSize: number = 7): RankingResult {
  // Return empty ranking result (no data yet - contract not deployed)
  return {
    rankingId: 0,
    rankingType: type,
    winners: [],
    totalRewards: BigInt(0),
    totalParticipants: 0,
    executedAt: 0,
    periodStart: 0,
    periodEnd: 0,
    rewardsDistributed: false,
  };
}


/**
 * Get ranking results by type
 */
export async function getRankingByType(type: RankingType): Promise<RankingResult | null> {
  try {
    const contract = await initializeContract();

    if (contract) {
      // Try to fetch from contract
      const { result, output } = await contract.query.getRanking(
        contract.address,
        { gasLimit: -1 },
        type
      );

      if (result.isOk && output) {
        const data = parseRankingResult(output.toJSON());
        console.log(`[Ranking] Fetched ${type} from contract`);
        return data;
      }
    }

    // Fallback to mock data with indicator
    console.info(`[Ranking] Using demo data for ${type} (contract not available)`);
    const mockResult = generateMockRankingResult(type);
    return mockResult;
  } catch (error) {
    console.info(`[Ranking] Using demo data for ${type}:`, error);
    return generateMockRankingResult(type);
  }
}


/**
 * Get Monthly Rewards ranking (Top 7 by balance)
 */
export async function getMonthlyRewardsRanking(): Promise<RankingResult | null> {
  return getRankingByType('MonthlyRewards');
}

/**
 * Get Monthly Lottery winners
 */
export async function getMonthlyLotteryRanking(): Promise<RankingResult | null> {
  return getRankingByType('MonthlyLottery');
}

/**
 * Get Christmas Lottery winners
 */
export async function getChristmasLotteryRanking(): Promise<RankingResult | null> {
  return getRankingByType('ChristmasLottery');
}

/**
 * Get Staking leaders ranking
 */
export async function getStakingRanking(): Promise<RankingResult | null> {
  return getRankingByType('Staking');
}

/**
 * Get Burn leaders ranking
 */
export async function getBurnRanking(): Promise<RankingResult | null> {
  return getRankingByType('Burn');
}

/**
 * Get Affiliate leaders ranking
 */
export async function getAffiliateRanking(): Promise<RankingResult | null> {
  return getRankingByType('Affiliates');
}

/**
 * Get Governance ranking
 */
export async function getGovernanceRanking(): Promise<RankingResult | null> {
  return getRankingByType('Governance');
}

/**
 * Get General ranking (combined score)
 */
export async function getGeneralRanking(): Promise<RankingResult | null> {
  return getRankingByType('General');
}

/**
 * Get ranking statistics
 */
export async function getRankingStats(): Promise<RankingStats> {
  try {
    const contract = await initializeContract();

    if (contract) {
      const { result, output } = await contract.query.getRankingStats(
        contract.address,
        { gasLimit: -1 }
      );

      if (result.isOk && output) {
        const data = parseRankingStats(output.toJSON());
        console.log('[Ranking] Fetched stats from contract');
        return data;
      }
    }

    // Fallback: No data yet (contract not deployed)
    console.info('[Ranking] Using initial stats (contract not deployed yet)');
    return {
      totalRankings: 0,
      totalRewardsDistributed: BigInt(0),
      totalUniqueParticipants: 0,
      mostActiveRanking: 'MonthlyRewards',
      lastUpdated: Date.now(),
    };
  } catch (error) {
    console.info('[Ranking] Using initial stats:', error);
    return {
      totalRankings: 0,
      totalRewardsDistributed: BigInt(0),
      totalUniqueParticipants: 0,
      mostActiveRanking: 'MonthlyRewards',
      lastUpdated: Date.now(),
    };
  }
}


/**
 * Get ranking configuration for a type
 */
export async function getRankingConfig(type: RankingType): Promise<RankingConfig | null> {
  // NOTE: getRankingConfig method doesn't exist in contract yet
  // Using default configuration
  return getDefaultConfig(type);
}

/**
 * Get wallet ranking info
 */
export async function getWalletRankingInfo(
  address: string,
  type: RankingType
): Promise<WalletRankingInfo | null> {
  try {
    const contract = await initializeContract();

    if (!contract) {
      return null;
    }

    const { result, output } = await contract.query.getWalletRankingInfo(
      contract.address,
      { gasLimit: -1 },
      address,
      type
    );

    if (result.isOk && output) {
      return parseWalletRankingInfo(output.toJSON());
    }

    return null;
  } catch (error) {
    console.error('[Ranking] Error fetching wallet info:', error);
    return null;
  }
}

/**
 * Get ranking history
 */
export async function getRankingHistory(
  type: RankingType,
  limit: number = 10
): Promise<RankingResult[]> {
  try {
    const contract = await initializeContract();

    if (!contract) {
      return [generateMockRankingResult(type)];
    }

    const { result, output } = await contract.query.getRankingHistory(
      contract.address,
      { gasLimit: -1 },
      type,
      limit
    );

    if (result.isOk && output) {
      const history = output.toJSON() as any[];
      return history.map(parseRankingResult);
    }

    return [generateMockRankingResult(type)];
  } catch (error) {
    console.error('[Ranking] Error fetching history:', error);
    return [generateMockRankingResult(type)];
  }
}

/**
 * Get next distribution date
 */
export async function getNextDistributionDate(type: RankingType): Promise<Date> {
  const config = await getRankingConfig(type);
  if (!config) {
    return new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 days default
  }

  const lastUpdated = new Date(config.lastUpdated);
  const interval = config.updateInterval * 1000;
  return new Date(lastUpdated.getTime() + interval);
}

// ============ Helper Functions ============

function getDefaultConfig(type: RankingType): RankingConfig {
  const configs: Record<RankingType, RankingConfig> = {
    MonthlyRewards: {
      maxRankingSize: 7,
      excludeTopWallets: 100,
      minimumBalance: BigInt(10) * BigInt(10 ** 8),
      maximumBalance: BigInt(10_000_000_000) * BigInt(10 ** 8),
      updateInterval: 2592000, // 30 days
      rewardPercentage: 20,
      isActive: true,
      lastUpdated: Date.now() - 25 * 24 * 60 * 60 * 1000,
    },
    MonthlyLottery: {
      maxRankingSize: 3,
      excludeTopWallets: 100,
      minimumBalance: BigInt(10) * BigInt(10 ** 8),
      maximumBalance: BigInt(10_000_000_000) * BigInt(10 ** 8),
      updateInterval: 2592000, // 30 days
      rewardPercentage: 5,
      isActive: true,
      lastUpdated: Date.now() - 25 * 24 * 60 * 60 * 1000,
    },
    ChristmasLottery: {
      maxRankingSize: 12,
      excludeTopWallets: 100,
      minimumBalance: BigInt(10) * BigInt(10 ** 8),
      maximumBalance: BigInt(10_000_000_000) * BigInt(10 ** 8),
      updateInterval: 31536000, // 365 days
      rewardPercentage: 5,
      isActive: true,
      lastUpdated: Date.now() - 300 * 24 * 60 * 60 * 1000,
    },
    Staking: {
      maxRankingSize: 7,
      excludeTopWallets: 0,
      minimumBalance: BigInt(100) * BigInt(10 ** 8),
      maximumBalance: BigInt(10_000_000_000) * BigInt(10 ** 8),
      updateInterval: 604800, // 7 days
      rewardPercentage: 0,
      isActive: true,
      lastUpdated: Date.now() - 2 * 24 * 60 * 60 * 1000,
    },
    Burn: {
      maxRankingSize: 7,
      excludeTopWallets: 0,
      minimumBalance: BigInt(100) * BigInt(10 ** 8),
      maximumBalance: BigInt(10_000_000_000) * BigInt(10 ** 8),
      updateInterval: 604800, // 7 days
      rewardPercentage: 0,
      isActive: true,
      lastUpdated: Date.now() - 2 * 24 * 60 * 60 * 1000,
    },
    Affiliates: {
      maxRankingSize: 7,
      excludeTopWallets: 0,
      minimumBalance: BigInt(0),
      maximumBalance: BigInt(10_000_000_000) * BigInt(10 ** 8),
      updateInterval: 604800, // 7 days
      rewardPercentage: 0,
      isActive: true,
      lastUpdated: Date.now() - 2 * 24 * 60 * 60 * 1000,
    },
    Governance: {
      maxRankingSize: 7,
      excludeTopWallets: 0,
      minimumBalance: BigInt(1000) * BigInt(10 ** 8),
      maximumBalance: BigInt(10_000_000_000) * BigInt(10 ** 8),
      updateInterval: 604800, // 7 days
      rewardPercentage: 0,
      isActive: true,
      lastUpdated: Date.now() - 2 * 24 * 60 * 60 * 1000,
    },
    General: {
      maxRankingSize: 7,
      excludeTopWallets: 0,
      minimumBalance: BigInt(100) * BigInt(10 ** 8),
      maximumBalance: BigInt(10_000_000_000) * BigInt(10 ** 8),
      updateInterval: 604800, // 7 days
      rewardPercentage: 10,
      isActive: true,
      lastUpdated: Date.now() - 2 * 24 * 60 * 60 * 1000,
    },
  };

  return configs[type];
}

function parseRankingResult(data: any): RankingResult {
  return {
    rankingId: data.rankingId || data.ranking_id || 0,
    rankingType: data.rankingType || data.ranking_type || 'General',
    winners: (data.winners || []).map(parseWalletRankingInfo),
    totalRewards: BigInt(data.totalRewards || data.total_rewards || 0),
    totalParticipants: data.totalParticipants || data.total_participants || 0,
    executedAt: data.executedAt || data.executed_at || Date.now(),
    periodStart: data.periodStart || data.period_start || Date.now() - 30 * 24 * 60 * 60 * 1000,
    periodEnd: data.periodEnd || data.period_end || Date.now(),
    rewardsDistributed: data.rewardsDistributed || data.rewards_distributed || false,
  };
}

function parseWalletRankingInfo(data: any): WalletRankingInfo {
  return {
    address: data.address || '',
    balance: BigInt(data.balance || 0),
    stakingBalance: BigInt(data.stakingBalance || data.staking_balance || 0),
    burnVolume: BigInt(data.burnVolume || data.burn_volume || 0),
    transactionVolume: BigInt(data.transactionVolume || data.transaction_volume || 0),
    stakingCount: data.stakingCount || data.staking_count || 0,
    affiliateCount: data.affiliateCount || data.affiliate_count || 0,
    governanceScore: data.governanceScore || data.governance_score || 0,
    rank: data.rank || 0,
    rewardAmount: BigInt(data.rewardAmount || data.reward_amount || 0),
    rankingType: data.rankingType || data.ranking_type || 'General',
    lastUpdated: data.lastUpdated || data.last_updated || Date.now(),
    isEligible: data.isEligible || data.is_eligible || false,
    totalScore: BigInt(data.totalScore || data.total_score || 0),
  };
}

function parseRankingStats(data: any): RankingStats {
  return {
    totalRankings: data.totalRankings || data.total_rankings || 0,
    totalRewardsDistributed: BigInt(data.totalRewardsDistributed || data.total_rewards_distributed || 0),
    totalUniqueParticipants: data.totalUniqueParticipants || data.total_unique_participants || 0,
    mostActiveRanking: data.mostActiveRanking || data.most_active_ranking || 'MonthlyRewards',
    lastUpdated: data.lastUpdated || data.last_updated || Date.now(),
  };
}

function parseRankingConfig(data: any): RankingConfig {
  return {
    maxRankingSize: data.maxRankingSize || data.max_ranking_size || 7,
    excludeTopWallets: data.excludeTopWallets || data.exclude_top_wallets || 100,
    minimumBalance: BigInt(data.minimumBalance || data.minimum_balance || 0),
    maximumBalance: BigInt(data.maximumBalance || data.maximum_balance || 0),
    updateInterval: data.updateInterval || data.update_interval || 604800,
    rewardPercentage: data.rewardPercentage || data.reward_percentage || 0,
    isActive: data.isActive || data.is_active || false,
    lastUpdated: data.lastUpdated || data.last_updated || Date.now(),
  };
}
