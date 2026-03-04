/**
 * Fetch system wallet addresses from the admin panel.
 * Falls back to env vars if admin is unreachable.
 * Results are cached in memory for 60 seconds.
 */

import { API_CONFIG } from './config';

interface WalletInfo {
  address: string;
  network: string;
  symbol: string;
}

type WalletMap = Record<string, WalletInfo>;

let cachedWallets: WalletMap | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60_000; // 60 seconds

const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3001';

async function fetchSystemWallets(): Promise<WalletMap> {
  const now = Date.now();
  if (cachedWallets && now - cacheTimestamp < CACHE_TTL) {
    return cachedWallets;
  }

  try {
    const res = await fetch(`${ADMIN_URL}/api/admin/wallets/public`, {
      next: { revalidate: 60 },
    });
    if (res.ok) {
      const data = await res.json();
      cachedWallets = data;
      cacheTimestamp = now;
      return data;
    }
  } catch (error) {
    console.warn('[SystemWallets] Failed to fetch from admin, using env fallback:', error);
  }

  return {};
}

/**
 * Get a specific system wallet address by key.
 * Falls back to env var or empty string.
 */
export async function getSystemWalletAddress(key: string): Promise<string> {
  const wallets = await fetchSystemWallets();
  if (wallets[key]?.address) {
    return wallets[key].address;
  }

  // Fallback to env vars for backward compatibility
  const envFallbacks: Record<string, string> = {
    spin_fiapo: process.env.NEXT_PUBLIC_SPIN_FIAPO_WALLET || '',
    spin_usdt: process.env.NEXT_PUBLIC_SPIN_USDT_WALLET || '',
    spin_lunes: process.env.NEXT_PUBLIC_SPIN_LUNES_WALLET || '',
    spin_revenue: process.env.NEXT_PUBLIC_SPIN_REVENUE_WALLET || '',
    treasury_solana: process.env.NEXT_PUBLIC_TREASURY_SOLANA || '',
    ico_receiver: API_CONFIG.solana.receiverWallet || '',
    migration_treasury: process.env.NEXT_PUBLIC_TREASURY_SOLANA || '',
  };

  return envFallbacks[key] || '';
}

/**
 * Get all system wallets (for display purposes).
 */
export async function getAllSystemWallets(): Promise<WalletMap> {
  return fetchSystemWallets();
}

/**
 * Invalidate the wallet cache (e.g. after admin updates).
 */
export function invalidateWalletCache() {
  cachedWallets = null;
  cacheTimestamp = 0;
}
