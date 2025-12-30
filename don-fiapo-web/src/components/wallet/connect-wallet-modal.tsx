"use client";

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { X, Wallet, ExternalLink, Check, Loader2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWalletStore, type PolkadotWalletProvider } from '@/lib/stores';
import { formatAddress } from '@/lib/utils/format';

// Portal component to render modal outside DOM hierarchy
function ModalPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted || typeof window === 'undefined') return null;

  return createPortal(children, document.body);
}

interface ConnectWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface WalletAccount {
  address: string;
  name: string;
  source: string;
}

// Wallet configuration
const WALLETS: Array<{
  id: 'polkadot-js' | 'talisman' | 'subwallet';
  name: string;
  color: string;
  downloadUrl: string;
  extensionKey: string;
}> = [
  { id: 'polkadot-js', name: 'Polkadot.js', color: '#E6007A', downloadUrl: 'https://polkadot.js.org/extension/', extensionKey: 'polkadot-js' },
  { id: 'talisman', name: 'Talisman', color: '#D5FF5C', downloadUrl: 'https://talisman.xyz/', extensionKey: 'talisman' },
  { id: 'subwallet', name: 'SubWallet', color: '#004BFF', downloadUrl: 'https://subwallet.app/', extensionKey: 'subwallet-js' },
];

// Simple wallet icons
function WalletIcon({ id, className }: { id: string; className?: string }) {
  if (id === 'polkadot-js') {
    return (
      <svg viewBox="0 0 32 32" className={className}>
        <circle cx="16" cy="16" r="16" fill="#E6007A"/>
        <ellipse cx="16" cy="16" rx="6" ry="10" fill="white"/>
        <circle cx="16" cy="10" r="2" fill="#E6007A"/>
        <circle cx="16" cy="22" r="2" fill="#E6007A"/>
      </svg>
    );
  }
  if (id === 'talisman') {
    return (
      <svg viewBox="0 0 32 32" className={className}>
        <rect width="32" height="32" rx="8" fill="#D5FF5C"/>
        <circle cx="16" cy="16" r="6" fill="#1A1A1A"/>
      </svg>
    );
  }
  if (id === 'subwallet') {
    return (
      <svg viewBox="0 0 32 32" className={className}>
        <rect width="32" height="32" rx="8" fill="#004BFF"/>
        <path d="M8 16l8-8 8 8-8 8-8-8z" fill="white"/>
      </svg>
    );
  }
  return <Wallet className={className} />;
}

export function ConnectWalletModal({ isOpen, onClose }: ConnectWalletModalProps) {
  const t = useTranslations('wallet');
  const [step, setStep] = useState<'select' | 'accounts' | 'connecting'>('select');
  const [accounts, setAccounts] = useState<WalletAccount[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<PolkadotWalletProvider>(null);
  const [installedWallets, setInstalledWallets] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<PolkadotWalletProvider>(null);

  const { 
    setLunesWallet, 
    setLunesBalance, 
    lunesConnected, 
    lunesAddress,
    lunesProvider,
    lunesAccountName,
    disconnectAll 
  } = useWalletStore();

  // Check which wallets are installed
  useEffect(() => {
    const checkWallets = async () => {
      if (typeof window === 'undefined') return;
      
      // Wait a bit for extensions to inject
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const installed: Record<string, boolean> = {};
      const injectedWeb3 = (window as any).injectedWeb3;
      
      if (injectedWeb3) {
        installed['polkadot-js'] = !!injectedWeb3['polkadot-js'];
        installed['talisman'] = !!injectedWeb3['talisman'];
        installed['subwallet'] = !!injectedWeb3['subwallet-js'];
      }
      
      setInstalledWallets(installed);
    };
    
    if (isOpen) {
      checkWallets();
    }
  }, [isOpen]);

  // Handle wallet connection
  const handleConnectWallet = async (provider: NonNullable<PolkadotWalletProvider>) => {
    setLoadingProvider(provider);
    setIsLoading(true);
    setError(null);
    setSelectedProvider(provider);
    
    try {
      const { enableSpecificWallet, getProviderFromSource } = await import('@/lib/web3/lunes');
      const walletAccounts = await enableSpecificWallet(provider);
      setAccounts(walletAccounts);
      setStep('accounts');
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setIsLoading(false);
      setLoadingProvider(null);
    }
  };

  // Select account
  const handleSelectAccount = async (account: WalletAccount) => {
    setIsLoading(true);
    setStep('connecting');
    
    try {
      const { getBalance, getProviderFromSource } = await import('@/lib/web3/lunes');
      const balance = await getBalance(account.address);
      const provider = getProviderFromSource(account.source);
      setLunesWallet(account.address, true, provider, account.name);
      setLunesBalance(balance);
      onClose();
      setStep('select');
    } catch (err: any) {
      setError(err.message || 'Failed to get balance');
      setStep('accounts');
    } finally {
      setIsLoading(false);
    }
  };

  // Open download link
  const handleDownloadWallet = (providerId: string) => {
    const wallet = WALLETS.find(w => w.id === providerId);
    if (wallet) {
      window.open(wallet.downloadUrl, '_blank');
    }
  };

  // Handle disconnect
  const handleDisconnect = () => {
    disconnectAll();
    onClose();
  };

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep('select');
      setError(null);
      setAccounts([]);
      setSelectedProvider(null);
    }
  }, [isOpen]);

  const selectedWallet = WALLETS.find(w => w.id === selectedProvider);
  const connectedWallet = WALLETS.find(w => w.id === lunesProvider);

  if (!isOpen) return null;

  return (
    <ModalPortal>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-[9999] bg-black/80"
        onClick={onClose}
        style={{ backdropFilter: 'blur(4px)' }}
      />
      
      {/* Modal Container */}
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
        <div 
          className="w-full max-w-md bg-[#1a1a1a] border-2 border-golden/50 rounded-2xl shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-golden/20 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-golden" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">{t('connect')}</h2>
                {step === 'accounts' && selectedWallet && (
                  <p className="text-xs text-muted-foreground">{selectedWallet.name}</p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-5 max-h-[70vh] overflow-y-auto">
            {error && (
              <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
                {error}
              </div>
            )}

            {step === 'select' && (
              <div className="space-y-4">
                {/* Connected status */}
                {lunesConnected && lunesAddress && (
                  <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Check className="w-5 h-5 text-green-500" />
                        <div>
                          <p className="text-sm text-green-500 font-medium">
                            {lunesAccountName || 'Connected'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatAddress(lunesAddress)} • {connectedWallet?.name || 'Wallet'}
                          </p>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" onClick={handleDisconnect}>
                        Disconnect
                      </Button>
                    </div>
                  </div>
                )}

                <p className="text-muted-foreground text-sm mb-4">
                  {t('selectWallet')}
                </p>

                {/* Polkadot Wallet Options */}
                {WALLETS.map((wallet) => {
                  const isInstalled = installedWallets[wallet.extensionKey];
                  const isConnectedWith = lunesProvider === wallet.id && lunesConnected;
                  
                  return (
                    <button
                      key={wallet.id}
                      onClick={() => isInstalled ? handleConnectWallet(wallet.id) : handleDownloadWallet(wallet.id)}
                      disabled={isLoading || isConnectedWith}
                      className="w-full p-4 bg-background border border-border rounded-xl hover:border-golden hover:bg-golden/5 transition-all flex items-center gap-4 disabled:opacity-50"
                    >
                      <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${wallet.color}20` }}
                      >
                        <WalletIcon id={wallet.id} className="w-6 h-6" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <p className="font-bold">{wallet.name}</p>
                          {!isInstalled && (
                            <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-500 rounded">
                              Install
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {isConnectedWith ? 'Connected' : 
                           isInstalled ? 'Click to connect' : 'Click to install'}
                        </p>
                      </div>
                      {loadingProvider === wallet.id && <Loader2 className="w-5 h-5 animate-spin" />}
                      {isConnectedWith && <Check className="w-5 h-5 text-green-500" />}
                      {!isInstalled && !isLoading && <Download className="w-5 h-5 text-muted-foreground" />}
                    </button>
                  );
                })}

                <p className="text-xs text-muted-foreground text-center mt-4">
                  By connecting, you agree to our Terms of Service
                </p>
              </div>
            )}

            {step === 'accounts' && (
              <div className="space-y-4">
                <button
                  onClick={() => setStep('select')}
                  className="text-sm text-golden hover:underline"
                >
                  ← Back to wallets
                </button>

                <p className="text-muted-foreground text-sm">
                  Select an account from {selectedWallet?.name}:
                </p>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {accounts.map((account) => (
                    <button
                      key={account.address}
                      onClick={() => handleSelectAccount(account)}
                      disabled={isLoading}
                      className="w-full p-4 bg-background border border-border rounded-xl hover:border-golden transition-all flex items-center justify-between"
                    >
                      <div className="text-left">
                        <p className="font-medium">{account.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatAddress(account.address, 8)}
                        </p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>

                {accounts.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground space-y-3">
                    <div className="w-12 h-12 mx-auto bg-yellow-500/20 rounded-full flex items-center justify-center">
                      <Wallet className="w-6 h-6 text-yellow-500" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">No accounts found</p>
                      <p className="text-sm mt-1">Open your {selectedWallet?.name} extension and:</p>
                    </div>
                    <ol className="text-sm text-left space-y-2 bg-muted/50 p-4 rounded-lg">
                      <li>1. Create or import an account</li>
                      <li>2. Authorize this website when prompted</li>
                      <li>3. Click the button below to try again</li>
                    </ol>
                    <Button 
                      variant="outline" 
                      onClick={() => selectedProvider && handleConnectWallet(selectedProvider)}
                      className="mt-2"
                    >
                      <Loader2 className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : 'hidden'}`} />
                      Try Again
                    </Button>
                  </div>
                )}
              </div>
            )}

            {step === 'connecting' && (
              <div className="py-8 text-center">
                <Loader2 className="w-12 h-12 text-golden animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Connecting to Lunes Network...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
