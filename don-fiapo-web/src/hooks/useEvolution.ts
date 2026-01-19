"use client";

import { useState, useCallback } from 'react';
import { useWalletStore } from '@/lib/stores';
import { API_CONFIG, getNextTier } from '@/lib/api/config';

// Type definitions (mirrors contract types)
export type VisualRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface NFTVisualAttributes {
  rarity: VisualRarity;
  attributes: string[];
  seedHash: number;
  revealed: boolean;
}

export interface EvolutionResult {
  newNftId: number;
  newTier: number;
  bonusBps: number;
  burnedNftIds: number[];
}

export interface EvolutionState {
  isEvolutionMode: boolean;
  selectedNFTs: number[];
  isLoading: boolean;
  error: string | null;
  result: EvolutionResult | null;
}

export interface EvolutionPreview {
  currentTierName: string;
  nextTierName: string;
  nextTierImage: string;
  bonusPercent: number;
  nftCount: number;
  requiredCount: number;
  burnReward: number;
  prestigeBonus?: { first: number; last: number };
}

export function useEvolution() {
  const { lunesAddress } = useWalletStore();
  const [state, setState] = useState<EvolutionState>({
    isEvolutionMode: false,
    selectedNFTs: [],
    isLoading: false,
    error: null,
    result: null,
  });

  // Enter evolution mode
  const enterEvolutionMode = useCallback(() => {
    setState(prev => ({
      ...prev,
      isEvolutionMode: true,
      selectedNFTs: [],
      error: null,
      result: null,
    }));
  }, []);

  // Exit evolution mode
  const exitEvolutionMode = useCallback(() => {
    setState(prev => ({
      ...prev,
      isEvolutionMode: false,
      selectedNFTs: [],
      error: null,
    }));
  }, []);

  // Toggle NFT selection
  const toggleNFTSelection = useCallback((
    tokenId: number,
    nftType: number,
    allNFTs: Array<{ tokenId: number; nftType: number }>
  ) => {
    setState(prev => {
      if (!prev.isEvolutionMode) return prev;

      // Check if NFT is already selected
      const isSelected = prev.selectedNFTs.includes(tokenId);

      if (isSelected) {
        // Deselect
        return {
          ...prev,
          selectedNFTs: prev.selectedNFTs.filter(id => id !== tokenId),
          error: null,
        };
      }

      // Check if this type matches already selected
      if (prev.selectedNFTs.length > 0) {
        const firstSelectedId = prev.selectedNFTs[0];
        const firstSelected = allNFTs.find(n => n.tokenId === firstSelectedId);
        if (firstSelected && firstSelected.nftType !== nftType) {
          return {
            ...prev,
            error: 'All NFTs must be the same type to evolve',
          };
        }
      }

      // Check if max tier
      if (nftType >= 6) {
        return {
          ...prev,
          error: 'Royal tier NFTs cannot evolve further',
        };
      }

      // Select
      return {
        ...prev,
        selectedNFTs: [...prev.selectedNFTs, tokenId],
        error: null,
      };
    });
  }, []);

  // Get evolution preview
  const getEvolutionPreview = useCallback((
    allNFTs: Array<{ tokenId: number; nftType: number }>
  ): EvolutionPreview | null => {
    if (state.selectedNFTs.length === 0) return null;

    const firstSelectedId = state.selectedNFTs[0];
    const firstSelected = allNFTs.find(n => n.tokenId === firstSelectedId);
    if (!firstSelected) return null;

    const currentTier = API_CONFIG.nftTiers[firstSelected.nftType];
    const nextTier = getNextTier(firstSelected.nftType);

    if (!currentTier || !nextTier) return null;

    return {
      currentTierName: currentTier.shortName,
      nextTierName: nextTier.shortName,
      nextTierImage: nextTier.image,
      bonusPercent: API_CONFIG.evolution.bonusPerEvolution,
      nftCount: state.selectedNFTs.length,
      requiredCount: (currentTier as any).evolutionRequirement || 2,
      burnReward: (currentTier as any).burnReward || 0,
      prestigeBonus: (nextTier as any).prestigeBonus,
    };
  }, [state.selectedNFTs]);

  // Execute evolution
  const executeEvolution = useCallback(async (allNFTs: Array<{ tokenId: number; nftType: number }>) => {
    if (!lunesAddress) {
      setState(prev => ({ ...prev, error: 'Wallet not connected' }));
      return null;
    }

    const preview = getEvolutionPreview(allNFTs);
    if (!preview || preview.nftCount < preview.requiredCount) {
      setState(prev => ({
        ...prev,
        error: `Select exactly ${preview?.requiredCount || 2} NFTs to evolve`
      }));
      return null;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Dynamic import to avoid SSR issues
      const contract = await import('@/lib/api/contract');

      // First check if evolution is possible
      const check = await contract.canEvolveNFTs(state.selectedNFTs, lunesAddress);
      if (!check.canEvolve) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: check.error || 'Evolution not possible'
        }));
        return null;
      }

      // Execute evolution
      const result = await contract.evolveNFTs(state.selectedNFTs, lunesAddress);

      setState(prev => ({
        ...prev,
        isLoading: false,
        result,
        isEvolutionMode: false,
        selectedNFTs: [],
      }));

      return result;
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Evolution failed';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
      return null;
    }
  }, [lunesAddress, state.selectedNFTs]);

  // Clear result
  const clearResult = useCallback(() => {
    setState(prev => ({ ...prev, result: null }));
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    enterEvolutionMode,
    exitEvolutionMode,
    toggleNFTSelection,
    getEvolutionPreview,
    executeEvolution,
    clearResult,
    clearError,
  };
}

// Hook for fetching visual attributes
export function useNFTVisualAttributes(nftId: number | null) {
  const [attributes, setAttributes] = useState<NFTVisualAttributes | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchAttributes = useCallback(async () => {
    if (nftId === null || typeof window === 'undefined') return;

    setLoading(true);
    try {
      const contract = await import('@/lib/api/contract');
      const attrs = await contract.getNFTVisualAttributes(nftId);
      if (attrs) {
        setAttributes(attrs as NFTVisualAttributes);
      }
    } catch (e) {
      console.error('Failed to fetch visual attributes:', e);
    } finally {
      setLoading(false);
    }
  }, [nftId]);

  return { attributes, loading, fetchAttributes };
}

// Hook for fetching global stats and user history
export function useEvolutionAndRarityStats() {
  const { lunesAddress } = useWalletStore();
  const [stats, setStats] = useState<{
    evolution: { totalEvolutions: number; totalBurned: number };
    rarity: { common: number; uncommon: number; rare: number; epic: number; legendary: number; total: number };
  }>({
    evolution: { totalEvolutions: 0, totalBurned: 0 },
    rarity: { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0, total: 0 },
  });
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    if (typeof window === 'undefined') return;

    setLoading(true);
    try {
      const contract = await import('@/lib/api/contract');
      const [evolutionStats, rarityStats, userHistory] = await Promise.all([
        contract.getEvolutionStats(),
        contract.getRarityStats(),
        lunesAddress ? contract.getUserEvolutions(lunesAddress) : Promise.resolve([]),
      ]);

      setStats({
        evolution: evolutionStats,
        rarity: rarityStats,
      });
      setHistory(userHistory);
    } catch (e) {
      console.error('Failed to fetch stats:', e);
    } finally {
      setLoading(false);
    }
  }, [lunesAddress]);

  return { stats, history, loading, fetchStats };
}
