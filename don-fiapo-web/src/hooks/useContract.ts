"use client";

import { useState, useCallback } from 'react';
import { useWalletStore } from '@/lib/stores/wallet-store';
import { API_CONFIG } from '@/lib/api/config';

// Types for contract responses
interface StakingPosition {
  amount: bigint;
  startTime: number;
  currentApy: number;
  pendingRewards: bigint;
}

interface StakingPoolConfig {
  apy: number;
  minStake: bigint;
  lockPeriod: number;
  totalStaked: bigint;
  totalStakers: number;
}

interface AirdropGlobalStats {
  totalAmount: bigint;
  totalClaimed: bigint;
  eligibleWallets: number;
  claimedWallets: number;
  endTime: number;
  currentRound?: number;
  isActive?: boolean;
}

interface AirdropUserData {
  roundId: number;
  balancePoints: bigint;
  stakingPoints: bigint;
  burningPoints: bigint;
  affiliatePoints: bigint;
  totalPoints: bigint;
  claimed: boolean;
  eligible: boolean;
  estimatedTokens: bigint;
}

interface AirdropConfig {
  isActive: boolean;
  minBalance: bigint;
  pointsPerFiapo: number;
  pointsPerStake: number;
  pointsPerBurn: number;
  affiliateMultiplier: number;
  maxParticipants: number;
  distributionRates: {
    holders: number;
    stakers: number;
    burners: number;
    affiliates: number;
  };
}

interface NFTData {
  tokenId: number;
  nftType: number;
  mintedAt: number;
  minedTokens: bigint;
  claimedTokens: bigint;
}

interface AirdropStatus {
  eligible: boolean;
  amount: bigint;
  claimed: boolean;
}

interface AffiliateInfo {
  referralCode: string;
  referredBy: string | null;
  totalReferrals: number;
  totalEarnings: bigint;
}

// Lazy load contract module to avoid SSR issues
const loadContract = async () => {
  if (typeof window === 'undefined') return null;
  return import('@/lib/api/contract');
};

/**
 * Hook for token balance
 */
export function useBalance() {
  const [balance, setBalance] = useState<bigint>(BigInt(0));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { lunesAddress, lunesConnected } = useWalletStore();

  const fetchBalance = useCallback(async () => {
    if (!lunesConnected || !lunesAddress) {
      setBalance(BigInt(0));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const contract = await loadContract();
      if (!contract) throw new Error('Contract not available');
      const bal = await contract.getBalance(lunesAddress);
      setBalance(bal);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch balance');
      setBalance(BigInt(0));
    } finally {
      setLoading(false);
    }
  }, [lunesAddress, lunesConnected]);

  const formatBalance = (decimals = API_CONFIG.token.decimals) => {
    const divisor = BigInt(10 ** decimals);
    const whole = balance / divisor;
    const fraction = balance % divisor;
    return `${whole.toString()}.${fraction.toString().padStart(decimals, '0').slice(0, 2)}`;
  };

  return { balance, loading, error, fetchBalance, formatBalance };
}

/**
 * Hook for staking operations
 */
export function useStaking(stakingType: string) {
  const [position, setPosition] = useState<StakingPosition | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { lunesAddress, lunesConnected } = useWalletStore();

  const fetchPosition = useCallback(async () => {
    if (!lunesConnected || !lunesAddress) {
      setPosition(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const contract = await loadContract();
      if (!contract) throw new Error('Contract not available');
      const pos = await contract.getStakingPosition(lunesAddress, stakingType);
      setPosition(pos);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch staking position');
    } finally {
      setLoading(false);
    }
  }, [lunesAddress, lunesConnected, stakingType]);

  const stake = useCallback(async (amount: bigint) => {
    if (!lunesConnected || !lunesAddress) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      const contract = await loadContract();
      if (!contract) throw new Error('Contract not available');
      const txHash = await contract.stake(lunesAddress, stakingType, amount);
      await fetchPosition();
      return txHash;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to stake';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, [lunesAddress, lunesConnected, stakingType, fetchPosition]);

  const unstake = useCallback(async () => {
    if (!lunesConnected || !lunesAddress) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      const contract = await loadContract();
      if (!contract) throw new Error('Contract not available');
      const txHash = await contract.unstake(lunesAddress, stakingType);
      await fetchPosition();
      return txHash;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to unstake';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, [lunesAddress, lunesConnected, stakingType, fetchPosition]);

  const claimRewards = useCallback(async () => {
    if (!lunesConnected || !lunesAddress) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      const contract = await loadContract();
      if (!contract) throw new Error('Contract not available');
      const txHash = await contract.claimRewards(lunesAddress, stakingType);
      await fetchPosition();
      return txHash;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to claim rewards';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, [lunesAddress, lunesConnected, stakingType, fetchPosition]);

  return {
    position,
    loading,
    error,
    fetchPosition,
    stake,
    unstake,
    claimRewards,
  };
}

/**
 * Hook for NFT operations
 */
export function useNFTs() {
  const [nfts, setNfts] = useState<NFTData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { lunesAddress, lunesConnected } = useWalletStore();

  const fetchNFTs = useCallback(async () => {
    if (!lunesConnected || !lunesAddress) {
      setNfts([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const contract = await loadContract();
      if (!contract) throw new Error('Contract not available');
      const userNfts = await contract.getUserNFTs(lunesAddress);
      setNfts(userNfts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch NFTs');
    } finally {
      setLoading(false);
    }
  }, [lunesAddress, lunesConnected]);

  const claimMinedTokens = useCallback(async (tokenId: number) => {
    if (!lunesConnected || !lunesAddress) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      const contract = await loadContract();
      if (!contract) throw new Error('Contract not available');
      const txHash = await contract.claimMinedTokens(lunesAddress, tokenId);
      await fetchNFTs();
      return txHash;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to claim mined tokens';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, [lunesAddress, lunesConnected, fetchNFTs]);

  return {
    nfts,
    loading,
    error,
    fetchNFTs,
    claimMinedTokens,
  };
}

/**
 * Hook for airdrop operations with full user data
 */
export function useAirdrop() {
  const [status, setStatus] = useState<AirdropStatus>({
    eligible: false,
    amount: BigInt(0),
    claimed: false,
  });
  const [userData, setUserData] = useState<AirdropUserData>({
    roundId: 1,
    balancePoints: BigInt(0),
    stakingPoints: BigInt(0),
    burningPoints: BigInt(0),
    affiliatePoints: BigInt(0),
    totalPoints: BigInt(0),
    claimed: false,
    eligible: false,
    estimatedTokens: BigInt(0),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { lunesAddress, lunesConnected } = useWalletStore();

  const fetchStatus = useCallback(async () => {
    if (!lunesConnected || !lunesAddress) {
      setStatus({ eligible: false, amount: BigInt(0), claimed: false });
      setUserData({
        roundId: 1,
        balancePoints: BigInt(0),
        stakingPoints: BigInt(0),
        burningPoints: BigInt(0),
        affiliatePoints: BigInt(0),
        totalPoints: BigInt(0),
        claimed: false,
        eligible: false,
        estimatedTokens: BigInt(0),
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const contract = await loadContract();
      if (!contract) throw new Error('Contract not available');

      // Get basic status
      const airdropStatus = await contract.getAirdropStatus(lunesAddress);
      setStatus(airdropStatus);

      // Get detailed user data with points breakdown
      const userAirdropData = await contract.getUserAirdropData(lunesAddress);
      setUserData(userAirdropData);

      // Update status with user data
      setStatus(prev => ({
        ...prev,
        eligible: userAirdropData.eligible,
        amount: userAirdropData.estimatedTokens,
        claimed: userAirdropData.claimed,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch airdrop status');
    } finally {
      setLoading(false);
    }
  }, [lunesAddress, lunesConnected]);

  const claim = useCallback(async (proof: string[]) => {
    if (!lunesConnected || !lunesAddress) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      const contract = await loadContract();
      if (!contract) throw new Error('Contract not available');
      const txHash = await contract.claimAirdrop(lunesAddress, proof);
      await fetchStatus();
      return txHash;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to claim airdrop';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, [lunesAddress, lunesConnected, fetchStatus]);

  return {
    status,
    userData,
    loading,
    error,
    fetchStatus,
    claim,
  };
}

/**
 * Hook for airdrop configuration
 */
export function useAirdropConfig() {
  const [config, setConfig] = useState<AirdropConfig>({
    isActive: true,
    minBalance: BigInt(1000) * BigInt(10 ** 8),
    pointsPerFiapo: 1,
    pointsPerStake: 2,
    pointsPerBurn: 5,
    affiliateMultiplier: 10,
    maxParticipants: 10000,
    distributionRates: {
      holders: 30,
      stakers: 35,
      burners: 20,
      affiliates: 15,
    },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const contract = await loadContract();
      if (!contract) return;
      const airdropConfig = await contract.getAirdropConfig();
      setConfig(airdropConfig);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch airdrop config');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    config,
    loading,
    error,
    fetchConfig,
  };
}

/**
 * Hook for affiliate operations
 */
export function useAffiliate() {
  const [info, setInfo] = useState<AffiliateInfo>({
    referralCode: '',
    referredBy: null,
    totalReferrals: 0,
    totalEarnings: BigInt(0),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { lunesAddress, lunesConnected } = useWalletStore();

  const fetchInfo = useCallback(async () => {
    if (!lunesConnected || !lunesAddress) {
      setInfo({ referralCode: '', referredBy: null, totalReferrals: 0, totalEarnings: BigInt(0) });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const contract = await loadContract();
      if (!contract) throw new Error('Contract not available');
      const affiliateInfo = await contract.getAffiliateInfo(lunesAddress);
      setInfo(affiliateInfo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch affiliate info');
    } finally {
      setLoading(false);
    }
  }, [lunesAddress, lunesConnected]);

  const registerWithReferral = useCallback(async (referralCode: string) => {
    if (!lunesConnected || !lunesAddress) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      const contract = await loadContract();
      if (!contract) throw new Error('Contract not available');
      const txHash = await contract.registerWithReferral(lunesAddress, referralCode);
      await fetchInfo();
      return txHash;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to register with referral';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, [lunesAddress, lunesConnected, fetchInfo]);

  return {
    info,
    loading,
    error,
    fetchInfo,
    registerWithReferral,
  };
}

/**
 * Hook for staking pool configuration
 */
export function useStakingPoolConfig(stakingType: string) {
  const [config, setConfig] = useState<StakingPoolConfig>({
    apy: API_CONFIG.stakingPools[stakingType]?.apy || 10,
    minStake: BigInt(API_CONFIG.stakingPools[stakingType]?.minStake || 100000) * BigInt(10 ** API_CONFIG.token.decimals),
    lockPeriod: API_CONFIG.stakingPools[stakingType]?.lockDays || 90,
    totalStaked: BigInt(0),
    totalStakers: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const contract = await loadContract();
      if (!contract) {
        // Use fallback from config
        const poolConfig = API_CONFIG.stakingPools[stakingType];
        if (poolConfig) {
          setConfig({
            apy: poolConfig.apy,
            minStake: BigInt(poolConfig.minStake) * BigInt(10 ** API_CONFIG.token.decimals),
            lockPeriod: poolConfig.lockDays,
            totalStaked: BigInt(0),
            totalStakers: 0,
          });
        }
        return;
      }
      const poolConfig = await contract.getStakingPoolConfig(stakingType);
      setConfig(poolConfig);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch pool config');
      // Use fallback on error
      const poolConfig = API_CONFIG.stakingPools[stakingType];
      if (poolConfig) {
        setConfig({
          apy: poolConfig.apy,
          minStake: BigInt(poolConfig.minStake) * BigInt(10 ** API_CONFIG.token.decimals),
          lockPeriod: poolConfig.lockDays,
          totalStaked: BigInt(0),
          totalStakers: 0,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [stakingType]);

  return {
    config,
    loading,
    error,
    fetchConfig,
  };
}

/**
 * Hook for global airdrop statistics
 */
export function useAirdropStats() {
  // Initial state: all zeros until real data is fetched from contract
  const [stats, setStats] = useState<AirdropGlobalStats>({
    totalAmount: BigInt(0),
    totalClaimed: BigInt(0),
    eligibleWallets: 0,
    claimedWallets: 0,
    endTime: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const contract = await loadContract();
      if (!contract) {
        console.info('[Airdrop] Using initial stats (contract not deployed yet)');
        return;
      }
      const airdropStats = await contract.getAirdropStats();
      setStats(airdropStats);
    } catch (err) {
      console.info('[Airdrop] Using initial stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch airdrop stats');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    stats,
    loading,
    error,
    fetchStats,
  };
}

