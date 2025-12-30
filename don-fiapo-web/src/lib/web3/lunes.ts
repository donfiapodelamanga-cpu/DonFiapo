"use client";

import { ApiPromise, WsProvider } from '@polkadot/api';
import { web3Enable, web3Accounts, web3FromAddress, web3EnablePromise } from '@polkadot/extension-dapp';
import type { InjectedAccountWithMeta, InjectedExtension } from '@polkadot/extension-inject/types';
import type { PolkadotWalletProvider } from '@/lib/stores/wallet-store';

// Lunes Network configuration
export const LUNES_CONFIG = {
  name: 'Lunes Network',
  rpc: [
    'wss://ws.lunes.io',
    'wss://ws-lunes-main-01.lunes.io',
    'wss://ws-lunes-main-02.lunes.io',
    'wss://ws-archive.lunes.io'
  ],
  symbol: 'LUNES',
  decimals: 8,
  ss58Format: 42,
};

// Contract addresses
export const CONTRACTS = {
  FIAPO_TOKEN: '5...', // Replace with actual contract address
  STAKING: '5...',
  ICO: '5...',
  AIRDROP: '5...',
  AFFILIATE: '5...',
};

// Wallet extension IDs
const WALLET_EXTENSION_IDS: Record<NonNullable<PolkadotWalletProvider>, string> = {
  'polkadot-js': 'polkadot-js',
  'talisman': 'talisman',
  'subwallet': 'subwallet-js',
};

let api: ApiPromise | null = null;
let enabledExtensions: InjectedExtension[] = [];

/**
 * Initialize connection to Lunes Network
 * Returns null if connection fails (network offline)
 */
export async function connectToLunes(): Promise<ApiPromise | null> {
  if (api && api.isConnected) {
    return api;
  }

  try {
    const provider = new WsProvider(LUNES_CONFIG.rpc, 1000); // 1 second timeout

    // Add connection timeout
    const connectionPromise = ApiPromise.create({ provider });
    const timeoutPromise = new Promise<null>((_, reject) =>
      setTimeout(() => reject(new Error('Connection timeout')), 5000)
    );

    api = await Promise.race([connectionPromise, timeoutPromise]) as ApiPromise;
    return api;
  } catch (error) {
    console.warn('Failed to connect to Lunes Network:', error);
    return null;
  }
}

/**
 * Disconnect from Lunes Network
 */
export async function disconnectFromLunes(): Promise<void> {
  if (api) {
    await api.disconnect();
    api = null;
  }
}

/**
 * Check if a specific wallet extension is installed
 */
export async function isWalletInstalled(provider: PolkadotWalletProvider): Promise<boolean> {
  if (!provider || typeof window === 'undefined') return false;

  const extensionId = WALLET_EXTENSION_IDS[provider];

  // Check in window.injectedWeb3
  if ((window as any).injectedWeb3) {
    return !!(window as any).injectedWeb3[extensionId];
  }

  return false;
}

/**
 * Get list of available wallet extensions
 */
export async function getAvailableWallets(): Promise<{
  provider: PolkadotWalletProvider;
  name: string;
  installed: boolean;
}[]> {
  const wallets: { provider: PolkadotWalletProvider; name: string; installed: boolean }[] = [];

  for (const [provider, extensionId] of Object.entries(WALLET_EXTENSION_IDS)) {
    const installed = await isWalletInstalled(provider as PolkadotWalletProvider);
    wallets.push({
      provider: provider as PolkadotWalletProvider,
      name: provider === 'polkadot-js' ? 'Polkadot.js' :
        provider === 'talisman' ? 'Talisman' : 'SubWallet',
      installed,
    });
  }

  return wallets;
}

/**
 * Enable all wallet extensions
 */
export async function enableAllWallets(): Promise<InjectedExtension[]> {
  if (enabledExtensions.length > 0) {
    return enabledExtensions;
  }

  enabledExtensions = await web3Enable('Don Fiapo');
  return enabledExtensions;
}

/**
 * Enable a specific wallet extension and get accounts
 */
export async function enableWallet(
  provider?: PolkadotWalletProvider
): Promise<{ address: string; name: string; source: string }[]> {
  // Enable all extensions first
  const extensions = await enableAllWallets();

  if (extensions.length === 0) {
    throw new Error('No wallet extension found. Please install Polkadot.js, Talisman, or SubWallet.');
  }

  // Get all accounts
  const allAccounts = await web3Accounts();

  if (allAccounts.length === 0) {
    throw new Error('No accounts found. Please create an account in your wallet.');
  }

  // Filter by provider if specified
  let filteredAccounts: InjectedAccountWithMeta[] = allAccounts;

  if (provider) {
    const extensionId = WALLET_EXTENSION_IDS[provider];
    filteredAccounts = allAccounts.filter(acc => acc.meta.source === extensionId);

    if (filteredAccounts.length === 0) {
      throw new Error(`No accounts found in ${provider}. Please make sure you have accounts in the wallet.`);
    }
  }

  return filteredAccounts.map((acc) => ({
    address: acc.address,
    name: acc.meta.name || 'Unknown',
    source: acc.meta.source || 'unknown',
  }));
}

/**
 * Enable wallet and get accounts for a specific provider only
 */
export async function enableSpecificWallet(
  provider: NonNullable<PolkadotWalletProvider>
): Promise<{ address: string; name: string; source: string }[]> {
  const extensionId = WALLET_EXTENSION_IDS[provider];

  // Check if wallet is installed
  const installed = await isWalletInstalled(provider);
  if (!installed) {
    throw new Error(`${provider === 'polkadot-js' ? 'Polkadot.js' : provider === 'talisman' ? 'Talisman' : 'SubWallet'} wallet not detected. Please install it first.`);
  }

  // Enable extensions
  const extensions = await web3Enable('Don Fiapo');

  // Find the specific extension
  const targetExtension = extensions.find(ext => ext.name === extensionId);

  if (!targetExtension) {
    throw new Error(`Could not connect to ${provider}. Please unlock your wallet and try again.`);
  }

  // Get accounts from this specific wallet
  const allAccounts = await web3Accounts();
  const walletAccounts = allAccounts.filter(acc => acc.meta.source === extensionId);

  if (walletAccounts.length === 0) {
    throw new Error(`No accounts found in ${provider}. Please create or import an account.`);
  }

  return walletAccounts.map((acc) => ({
    address: acc.address,
    name: acc.meta.name || 'Unknown',
    source: acc.meta.source || extensionId,
  }));
}

/**
 * Get the wallet provider name from source
 */
export function getProviderFromSource(source: string): PolkadotWalletProvider {
  if (source === 'polkadot-js') return 'polkadot-js';
  if (source === 'talisman') return 'talisman';
  if (source === 'subwallet-js') return 'subwallet';
  return null;
}

/**
 * Get account balance
 * Returns "0" if network is offline
 */
export async function getBalance(address: string): Promise<string> {
  try {
    const chainApi = await connectToLunes();

    if (!chainApi) {
      console.warn('Network offline - returning 0 balance');
      return '0';
    }

    const { data: { free } } = await chainApi.query.system.account(address) as any;

    // Convert to human-readable format
    const balance = free.toBigInt() / BigInt(10 ** LUNES_CONFIG.decimals);
    return balance.toString();
  } catch (error) {
    console.warn('Error getting balance:', error);
    return '0';
  }
}

/**
 * Get FIAPO token balance
 * Returns "0" if network is offline
 */
export async function getFiapoBalance(address: string): Promise<string> {
  try {
    const chainApi = await connectToLunes();

    if (!chainApi) {
      return '0';
    }

    // This would call the PSP22 balanceOf method on the token contract
    // Implementation depends on your contract ABI
    // Placeholder - replace with actual contract call
    const result = await chainApi.query.contracts.contractInfoOf(CONTRACTS.FIAPO_TOKEN);
    return '0';
  } catch (error) {
    console.warn('Error getting FIAPO balance:', error);
    return '0';
  }
}

/**
 * Sign and send a transaction
 */
export async function signAndSend(
  address: string,
  extrinsic: any,
  onStatus?: (status: string) => void
): Promise<string> {
  const injector = await web3FromAddress(address);

  return new Promise((resolve, reject) => {
    extrinsic
      .signAndSend(address, { signer: injector.signer }, ({ status, txHash, dispatchError }: any) => {
        if (status.isInBlock) {
          onStatus?.('In Block');
        }
        if (status.isFinalized) {
          if (dispatchError) {
            reject(new Error(dispatchError.toString()));
          } else {
            resolve(txHash.toHex());
          }
        }
      })
      .catch(reject);
  });
}

/**
 * Format address for display
 */
export function formatAddress(address: string, chars = 6): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/**
 * Format balance with symbol
 */
export function formatBalance(balance: string, symbol = 'FIAPO'): string {
  const num = parseFloat(balance);
  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(2)}B ${symbol}`;
  }
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(2)}M ${symbol}`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(2)}K ${symbol}`;
  }
  return `${num.toLocaleString()} ${symbol}`;
}
