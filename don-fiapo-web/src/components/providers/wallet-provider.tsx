"use client";

import { ReactNode, useMemo, useCallback } from 'react';
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { WalletError } from '@solana/wallet-adapter-base';
import { API_CONFIG } from '@/lib/api/config';

// Import wallet adapter styles
import '@solana/wallet-adapter-react-ui/styles.css';

interface WalletProviderProps {
  children: ReactNode;
}

/**
 * Combined wallet provider for both Lunes and Solana wallets
 * - Lunes: Primary wallet for receiving NFTs and tokens (via Polkadot.js extension)
 * - Solana: Secondary wallet for USDT/USDC payments
 * 
 * Uses Wallet Standard which auto-detects installed wallets (Phantom, Solflare, etc.)
 */
export function WalletProvider({ children }: WalletProviderProps) {
  // Solana RPC endpoint
  const endpoint = useMemo(() => API_CONFIG.solana.rpc, []);

  // Empty array - Wallet Standard will auto-detect installed wallets
  const wallets = useMemo(() => [], []);

  // Error handler for wallet connection issues
  const onError = useCallback((error: WalletError) => {
    console.error('[Solana Wallet Error]:', error.name, error.message);
    // You could also show a toast notification here
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider
        wallets={wallets}
        autoConnect={false}
        onError={onError}
      >
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}
