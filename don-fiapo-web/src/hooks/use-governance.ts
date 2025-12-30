"use client";

import { useState, useEffect, useCallback } from 'react';
import {
  Proposal,
  ProposalStatus,
  GovernanceStats,
  GovernanceConfig,
  UserVote,
  getProposals,
  getProposal,
  getGovernanceStats,
  getGovernanceConfig,
  canCreateProposal,
  canVote,
  getUserVote,
  isGovernor,
} from '@/lib/api/governance';

// ============ Types ============

interface UseProposalsOptions {
  filter?: ProposalStatus;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseProposalsResult {
  proposals: Proposal[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

interface UseGovernanceStatsResult {
  stats: GovernanceStats | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// ============ Format Utilities ============

export function formatVoteCount(votes: number): string {
  if (votes >= 1_000_000) {
    return `${(votes / 1_000_000).toFixed(2)}M`;
  }
  if (votes >= 1_000) {
    return `${(votes / 1_000).toFixed(1)}K`;
  }
  return votes.toLocaleString();
}

export function formatProposalDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function getTimeRemaining(endTime: number): string {
  const now = Date.now();
  const diff = endTime - now;
  
  if (diff <= 0) return 'Ended';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 0) {
    return `${days}d ${hours}h remaining`;
  }
  if (hours > 0) {
    return `${hours}h remaining`;
  }
  
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${minutes}m remaining`;
}

export function calculateVotePercentage(votesFor: number, votesAgainst: number): {
  forPercentage: number;
  againstPercentage: number;
} {
  const total = votesFor + votesAgainst;
  if (total === 0) return { forPercentage: 50, againstPercentage: 50 };
  
  return {
    forPercentage: (votesFor / total) * 100,
    againstPercentage: (votesAgainst / total) * 100,
  };
}

export function getProposalTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    ConfigChange: '⚙️ Configuration Change',
    Emergency: '🚨 Emergency',
    Upgrade: '🔄 Contract Upgrade',
    SystemWalletChange: '💼 Wallet Change',
    PauseSystem: '⏸️ Pause System',
    ExchangeListing: '📈 Exchange Listing',
    InfluencerMarketing: '📢 Marketing',
    AcceleratedBurn: '🔥 Accelerated Burn',
    ListingDonation: '💰 Listing Donation',
    MarketingDonation: '📣 Marketing Donation',
  };
  return labels[type] || type;
}

export function getStatusColor(status: ProposalStatus): string {
  const colors: Record<ProposalStatus, string> = {
    Active: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    Approved: 'bg-green-500/20 text-green-500 border-green-500/30',
    Rejected: 'bg-red-500/20 text-red-500 border-red-500/30',
    Executed: 'bg-purple-500/20 text-purple-500 border-purple-500/30',
    Expired: 'bg-gray-500/20 text-gray-500 border-gray-500/30',
  };
  return colors[status] || '';
}

// ============ Hooks ============

/**
 * Hook to fetch all proposals
 */
export function useProposals(options: UseProposalsOptions = {}): UseProposalsResult {
  const { filter, autoRefresh = false, refreshInterval = 60000 } = options;
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getProposals(filter);
      setProposals(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch proposals'));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, fetchData]);

  return { proposals, loading, error, refetch: fetchData };
}

/**
 * Hook to fetch a single proposal
 */
export function useProposal(id: number): {
  proposal: Proposal | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
} {
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getProposal(id);
      setProposal(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch proposal'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { proposal, loading, error, refetch: fetchData };
}

/**
 * Hook to fetch governance stats
 */
export function useGovernanceStats(options?: { autoRefresh?: boolean; refreshInterval?: number }): UseGovernanceStatsResult {
  const { autoRefresh = false, refreshInterval = 60000 } = options || {};
  const [stats, setStats] = useState<GovernanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getGovernanceStats();
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
 * Hook to fetch governance config
 */
export function useGovernanceConfig(): {
  config: GovernanceConfig | null;
  loading: boolean;
  error: Error | null;
} {
  const [config, setConfig] = useState<GovernanceConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await getGovernanceConfig();
        setConfig(result);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch config'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { config, loading, error };
}

/**
 * Hook to check if user can create proposal
 */
export function useCanCreateProposal(address: string | null): {
  canCreate: boolean;
  reason?: string;
  requiredStaking: bigint;
  requiredPayment: bigint;
  loading: boolean;
} {
  const [data, setData] = useState({
    canCreate: false,
    reason: undefined as string | undefined,
    requiredStaking: BigInt(0),
    requiredPayment: BigInt(0),
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) {
      setData({
        canCreate: false,
        reason: 'Wallet not connected',
        requiredStaking: BigInt(0),
        requiredPayment: BigInt(0),
      });
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await canCreateProposal(address);
        setData({
          canCreate: result.canCreate,
          reason: result.reason,
          requiredStaking: result.requiredStaking,
          requiredPayment: result.requiredPayment,
        });
      } catch (error) {
        setData({
          canCreate: false,
          reason: 'Error checking eligibility',
          requiredStaking: BigInt(0),
          requiredPayment: BigInt(0),
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [address]);

  return { ...data, loading };
}

/**
 * Hook to check if user can vote on a proposal
 */
export function useCanVote(address: string | null, proposalId: number): {
  canVote: boolean;
  reason?: string;
  hasVoted: boolean;
  voteWeight: number;
  loading: boolean;
} {
  const [data, setData] = useState({
    canVote: false,
    reason: undefined as string | undefined,
    hasVoted: false,
    voteWeight: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) {
      setData({
        canVote: false,
        reason: 'Wallet not connected',
        hasVoted: false,
        voteWeight: 0,
      });
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await canVote(address, proposalId);
        setData({
          canVote: result.canVote,
          reason: result.reason,
          hasVoted: result.hasVoted,
          voteWeight: result.voteWeight,
        });
      } catch (error) {
        setData({
          canVote: false,
          reason: 'Error checking eligibility',
          hasVoted: false,
          voteWeight: 0,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [address, proposalId]);

  return { ...data, loading };
}

/**
 * Hook to get user's vote on a proposal
 */
export function useUserVote(address: string | null, proposalId: number): {
  vote: UserVote | null;
  loading: boolean;
} {
  const [vote, setVote] = useState<UserVote | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) {
      setVote(null);
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await getUserVote(address, proposalId);
        setVote(result);
      } catch (error) {
        setVote(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [address, proposalId]);

  return { vote, loading };
}

/**
 * Hook to check if user is a governor
 */
export function useIsGovernor(address: string | null): {
  isGovernor: boolean;
  loading: boolean;
} {
  const [isGov, setIsGov] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) {
      setIsGov(false);
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await isGovernor(address);
        setIsGov(result);
      } catch (error) {
        setIsGov(false);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [address]);

  return { isGovernor: isGov, loading };
}
