"use client";

import { useState, useEffect } from "react";

export interface NobleInfo {
  id: string;
  name: string;
  tier: string;
  status: string;
  referralCode: string | null;
  solanaWallet: string | null;
  totalSales: number;
  totalReferrals: number;
}

interface NobleStatus {
  isNoble: boolean;
  isActive: boolean;
  noble: NobleInfo | null;
  loading: boolean;
}

/**
 * Hook to check if a connected Lunes wallet is registered
 * as a Noble/Parceiro by the Don Fiapo commercial team.
 */
export function useNobleStatus(walletAddress: string | null): NobleStatus {
  const [status, setStatus] = useState<NobleStatus>({
    isNoble: false,
    isActive: false,
    noble: null,
    loading: true,
  });

  useEffect(() => {
    if (!walletAddress) {
      setStatus({ isNoble: false, isActive: false, noble: null, loading: false });
      return;
    }

    let cancelled = false;

    fetch(`/api/noble/status?walletAddress=${encodeURIComponent(walletAddress)}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setStatus({
          isNoble: data.isNoble ?? false,
          isActive: data.isActive ?? false,
          noble: data.noble ?? null,
          loading: false,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setStatus({ isNoble: false, isActive: false, noble: null, loading: false });
      });

    return () => {
      cancelled = true;
    };
  }, [walletAddress]);

  return status;
}
