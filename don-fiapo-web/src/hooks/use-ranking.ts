"use client";

import { useState, useEffect, useCallback } from 'react';
import {
  RankingType,
  RankingResult,
  RankingStats,
  WalletRankingInfo,
  getMonthlyRewardsRanking,
  getMonthlyLotteryRanking,
  getChristmasLotteryRanking,
  getStakingRanking,
  getBurnRanking,
  getAffiliateRanking,
  getGovernanceRanking,
  getGeneralRanking,
  getRankingStats,
  getWalletRankingInfo,
  getNextDistributionDate,
  getRankingByType,
} from '@/lib/api/ranking';

// ============ Types ============

interface UseRankingOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseRankingResult {
  data: RankingResult | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

interface UseRankingStatsResult {
  stats: RankingStats | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// ============ Format Utilities ============

export function formatRankingBalance(balance: bigint): string {
  const value = Number(balance) / 10 ** 8;
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toLocaleString();
}

export function formatRankingReward(reward: bigint): string {
  const value = Number(reward) / 10 ** 8;
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export function formatDaysUntil(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  
  if (days <= 0) return 'Today';
  if (days === 1) return '1 day';
  return `${days} days`;
}

// ============ Hooks ============

/**
 * Hook to fetch ranking by type
 */
export function useRanking(
  type: RankingType,
  options: UseRankingOptions = {}
): UseRankingResult {
  const { autoRefresh = false, refreshInterval = 60000 } = options;
  const [data, setData] = useState<RankingResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getRankingByType(type);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch ranking'));
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook to fetch Monthly Rewards ranking
 */
export function useMonthlyRewardsRanking(options?: UseRankingOptions): UseRankingResult {
  return useRanking('MonthlyRewards', options);
}

/**
 * Hook to fetch Monthly Lottery ranking
 */
export function useMonthlyLotteryRanking(options?: UseRankingOptions): UseRankingResult {
  return useRanking('MonthlyLottery', options);
}

/**
 * Hook to fetch Christmas Lottery ranking
 */
export function useChristmasLotteryRanking(options?: UseRankingOptions): UseRankingResult {
  return useRanking('ChristmasLottery', options);
}

/**
 * Hook to fetch Staking ranking
 */
export function useStakingRanking(options?: UseRankingOptions): UseRankingResult {
  return useRanking('Staking', options);
}

/**
 * Hook to fetch Burn ranking
 */
export function useBurnRanking(options?: UseRankingOptions): UseRankingResult {
  return useRanking('Burn', options);
}

/**
 * Hook to fetch Affiliate ranking
 */
export function useAffiliateRanking(options?: UseRankingOptions): UseRankingResult {
  return useRanking('Affiliates', options);
}

/**
 * Hook to fetch Governance ranking
 */
export function useGovernanceRanking(options?: UseRankingOptions): UseRankingResult {
  return useRanking('Governance', options);
}

/**
 * Hook to fetch General ranking
 */
export function useGeneralRanking(options?: UseRankingOptions): UseRankingResult {
  return useRanking('General', options);
}

/**
 * Hook to fetch ranking stats
 */
export function useRankingStats(options?: UseRankingOptions): UseRankingStatsResult {
  const { autoRefresh = false, refreshInterval = 60000 } = options || {};
  const [stats, setStats] = useState<RankingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getRankingStats();
      setStats(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch stats'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, fetchData]);

  return { stats, loading, error, refetch: fetchData };
}

/**
 * Hook to fetch wallet ranking info
 */
export function useWalletRankingInfo(
  address: string | null,
  type: RankingType
): { data: WalletRankingInfo | null; loading: boolean; error: Error | null } {
  const [data, setData] = useState<WalletRankingInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!address) {
      setData(null);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await getWalletRankingInfo(address, type);
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch wallet info'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [address, type]);

  return { data, loading, error };
}

/**
 * Hook to get next distribution date
 */
export function useNextDistributionDate(type: RankingType): {
  date: Date | null;
  daysUntil: string;
  loading: boolean;
} {
  const [date, setDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDate = async () => {
      try {
        const nextDate = await getNextDistributionDate(type);
        setDate(nextDate);
      } catch (error) {
        console.error('Error fetching next distribution date:', error);
        setDate(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000));
      } finally {
        setLoading(false);
      }
    };

    fetchDate();
  }, [type]);

  const daysUntil = date ? formatDaysUntil(date) : '...';

  return { date, daysUntil, loading };
}
