"use client";

import { useState, useEffect, useCallback } from 'react';
import {
  AffiliateInfo,
  AffiliateStats,
  ReferralRecord,
  AffiliateLeaderboard,
  getAffiliateInfo,
  getAffiliateStats,
  getReferrals,
  getAffiliateLeaderboard,
  isAffiliateRegistered,
  validateReferralCode,
} from '@/lib/api/affiliate';
import { API_CONFIG } from '@/lib/api/config';

// ============ Format Utilities ============

export function formatAffiliateBalance(value: bigint): string {
  const num = Number(value) / 10 ** API_CONFIG.token.decimals;
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(2)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function formatBoostPercentage(bps: number): string {
  return `${(bps / 100).toFixed(2)}%`;
}

export function getTierColor(tier: 'Bronze' | 'Silver' | 'Gold'): string {
  const colors = {
    Bronze: 'bg-orange-600 text-white',
    Silver: 'bg-gray-400 text-black',
    Gold: 'bg-golden text-black',
  };
  return colors[tier];
}

export function getTierBorderColor(tier: 'Bronze' | 'Silver' | 'Gold'): string {
  const colors = {
    Bronze: 'border-orange-600',
    Silver: 'border-gray-400',
    Gold: 'border-golden',
  };
  return colors[tier];
}

export function getTierRequirements(tier: 'Bronze' | 'Silver' | 'Gold'): string {
  const requirements = {
    Bronze: '1-10 referrals',
    Silver: '11-50 referrals',
    Gold: '50+ referrals',
  };
  return requirements[tier];
}

export function getTierCommission(tier: 'Bronze' | 'Silver' | 'Gold'): number {
  const commissions = {
    Bronze: 5,
    Silver: 7,
    Gold: 10,
  };
  return commissions[tier];
}

// ============ Hooks ============

/**
 * Hook to fetch affiliate info for connected wallet
 */
export function useAffiliateInfo(address: string | null, options?: { autoRefresh?: boolean; refreshInterval?: number }) {
  const { autoRefresh = false, refreshInterval = 60000 } = options || {};
  const [info, setInfo] = useState<AffiliateInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!address) {
      setInfo(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await getAffiliateInfo(address);
      setInfo(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch affiliate info'));
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (autoRefresh && address) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, fetchData, address]);

  return { info, loading, error, refetch: fetchData };
}

/**
 * Hook to fetch affiliate system stats
 */
export function useAffiliateStats(options?: { autoRefresh?: boolean; refreshInterval?: number }) {
  const { autoRefresh = false, refreshInterval = 60000 } = options || {};
  const [stats, setStats] = useState<AffiliateStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getAffiliateStats();
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
 * Hook to fetch referrals for an address
 */
export function useReferrals(address: string | null, options?: { autoRefresh?: boolean; refreshInterval?: number }) {
  const { autoRefresh = false, refreshInterval = 60000 } = options || {};
  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!address) {
      setReferrals([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await getReferrals(address);
      setReferrals(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch referrals'));
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (autoRefresh && address) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, fetchData, address]);

  return { referrals, loading, error, refetch: fetchData };
}

/**
 * Hook to fetch affiliate leaderboard
 */
export function useAffiliateLeaderboard(limit: number = 10) {
  const [leaderboard, setLeaderboard] = useState<AffiliateLeaderboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getAffiliateLeaderboard(limit);
      setLeaderboard(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch leaderboard'));
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { leaderboard, loading, error, refetch: fetchData };
}

/**
 * Hook to check registration status
 */
export function useIsAffiliateRegistered(address: string | null) {
  const [isRegistered, setIsRegistered] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) {
      setIsRegistered(false);
      setLoading(false);
      return;
    }

    const checkRegistration = async () => {
      try {
        setLoading(true);
        const result = await isAffiliateRegistered(address);
        setIsRegistered(result);
      } catch (error) {
        setIsRegistered(false);
      } finally {
        setLoading(false);
      }
    };

    checkRegistration();
  }, [address]);

  return { isRegistered, loading };
}

/**
 * Hook to validate referral code
 */
export function useValidateReferralCode() {
  const [validating, setValidating] = useState(false);
  const [result, setResult] = useState<{ valid: boolean; referrerAddress?: string; error?: string } | null>(null);

  const validate = useCallback(async (code: string) => {
    if (!code.trim()) {
      setResult({ valid: false, error: 'Please enter a referral code' });
      return;
    }

    try {
      setValidating(true);
      const validationResult = await validateReferralCode(code);
      setResult(validationResult);
      return validationResult;
    } catch (error) {
      const errorResult = { valid: false, error: 'Validation failed' };
      setResult(errorResult);
      return errorResult;
    } finally {
      setValidating(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
  }, []);

  return { validate, validating, result, reset };
}
