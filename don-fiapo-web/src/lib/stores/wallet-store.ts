import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type WalletType = 'lunes' | 'solana' | null;

// Supported Polkadot/Substrate wallet providers
export type PolkadotWalletProvider = 'polkadot-js' | 'talisman' | 'subwallet' | null;

// Wallet provider metadata
export const WALLET_PROVIDERS = {
  'polkadot-js': {
    id: 'polkadot-js',
    name: 'Polkadot.js',
    icon: '/wallets/polkadot-js.svg',
    downloadUrl: 'https://polkadot.js.org/extension/',
    extensionId: 'polkadot-js',
    color: '#E6007A',
  },
  'talisman': {
    id: 'talisman',
    name: 'Talisman',
    icon: '/wallets/talisman.svg',
    downloadUrl: 'https://talisman.xyz/',
    extensionId: 'talisman',
    color: '#D5FF5C',
  },
  'subwallet': {
    id: 'subwallet-js',
    name: 'SubWallet',
    icon: '/wallets/subwallet.svg',
    downloadUrl: 'https://subwallet.app/',
    extensionId: 'subwallet-js',
    color: '#004BFF',
  },
} as const;

interface WalletState {
  // Lunes (Polkadot-based) wallet
  lunesAddress: string | null;
  lunesConnected: boolean;
  lunesBalance: string;
  lunesProvider: PolkadotWalletProvider;
  lunesAccountName: string | null;
  
  // Solana wallet (for payments)
  solanaAddress: string | null;
  solanaConnected: boolean;
  solanaBalance: string;
  
  // Active wallet for UI
  activeWallet: WalletType;
  
  // Actions
  setLunesWallet: (address: string | null, connected: boolean, provider?: PolkadotWalletProvider, accountName?: string) => void;
  setLunesBalance: (balance: string) => void;
  setSolanaWallet: (address: string | null, connected: boolean) => void;
  setSolanaBalance: (balance: string) => void;
  setActiveWallet: (type: WalletType) => void;
  disconnectAll: () => void;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set) => ({
      // Initial state
      lunesAddress: null,
      lunesConnected: false,
      lunesBalance: '0',
      lunesProvider: null,
      lunesAccountName: null,
      solanaAddress: null,
      solanaConnected: false,
      solanaBalance: '0',
      activeWallet: null,

      // Actions
      setLunesWallet: (address, connected, provider, accountName) =>
        set({ 
          lunesAddress: address, 
          lunesConnected: connected, 
          lunesProvider: provider ?? null,
          lunesAccountName: accountName ?? null,
          activeWallet: connected ? 'lunes' : null 
        }),
      
      setLunesBalance: (balance) => set({ lunesBalance: balance }),
      
      setSolanaWallet: (address, connected) =>
        set({ solanaAddress: address, solanaConnected: connected }),
      
      setSolanaBalance: (balance) => set({ solanaBalance: balance }),
      
      setActiveWallet: (type) => set({ activeWallet: type }),
      
      disconnectAll: () =>
        set({
          lunesAddress: null,
          lunesConnected: false,
          lunesBalance: '0',
          lunesProvider: null,
          lunesAccountName: null,
          solanaAddress: null,
          solanaConnected: false,
          solanaBalance: '0',
          activeWallet: null,
        }),
    }),
    {
      name: 'don-fiapo-wallet',
      partialize: (state) => ({
        lunesAddress: state.lunesAddress,
        lunesProvider: state.lunesProvider,
        lunesAccountName: state.lunesAccountName,
        solanaAddress: state.solanaAddress,
      }),
      skipHydration: true,
    }
  )
);
