"use client";

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Wallet, ChevronDown, Copy, ExternalLink, LogOut, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWalletStore } from '@/lib/stores';
import { formatAddress, formatBalance } from '@/lib/utils/format';
import { ConnectWalletModal } from './connect-wallet-modal';

export function WalletButton() {
  const t = useTranslations('wallet');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const { lunesConnected, lunesAddress, lunesBalance, disconnectAll } = useWalletStore();

  const handleCopyAddress = async () => {
    if (lunesAddress) {
      await navigator.clipboard.writeText(lunesAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDisconnect = () => {
    disconnectAll();
    setIsDropdownOpen(false);
  };

  if (!lunesConnected) {
    return (
      <>
        <Button onClick={() => setIsModalOpen(true)}>
          <Wallet className="w-4 h-4 mr-2" />
          {t('connect')}
        </Button>
        <ConnectWalletModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </>
    );
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="gap-2"
      >
        <div className="w-2 h-2 rounded-full bg-green-500" />
        <span className="hidden sm:inline">{formatAddress(lunesAddress!, 4)}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
      </Button>

      {isDropdownOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsDropdownOpen(false)} 
          />
          <div className="absolute right-0 top-full mt-2 w-72 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
            {/* Balance */}
            <div className="p-4 border-b border-border">
              <p className="text-sm text-muted-foreground mb-1">Balance</p>
              <p className="text-2xl font-bold text-golden">
                {formatBalance(lunesBalance)}
              </p>
            </div>

            {/* Address */}
            <div className="p-4 border-b border-border">
              <p className="text-sm text-muted-foreground mb-2">Address</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-muted p-2 rounded truncate">
                  {lunesAddress}
                </code>
                <button
                  onClick={handleCopyAddress}
                  className="p-2 hover:bg-muted rounded transition-colors"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="p-2">
              <button
                onClick={() => window.open(`https://explorer.lunes.io/account/${lunesAddress}`, '_blank')}
                className="w-full p-3 text-left text-sm flex items-center gap-3 hover:bg-muted rounded-lg transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                View on Explorer
              </button>
              <button
                onClick={handleDisconnect}
                className="w-full p-3 text-left text-sm flex items-center gap-3 hover:bg-muted rounded-lg transition-colors text-red-400"
              >
                <LogOut className="w-4 h-4" />
                Disconnect
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
