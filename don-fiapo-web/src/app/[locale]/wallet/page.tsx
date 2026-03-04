"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useWalletStore } from '@/lib/stores';
import { LayoutDashboard, Coins, Pickaxe, Send, ArrowDownLeft, Crown, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import WalletOverview from '@/components/wallet/WalletOverview';
import MyNFTsPage from '@/app/[locale]/ico/my-nfts/page';
import MiningPage from '@/app/[locale]/ico/mining/page';
import { useNobleStatus } from '@/hooks/use-noble-status';
import NobleDashboard from '@/components/noble/NobleDashboard';
import AirdropProgress from '@/components/wallet/AirdropProgress';

export default function WalletPage() {
  const { lunesAddress, lunesConnected } = useWalletStore();
  const { isNoble, isActive, noble } = useNobleStatus(lunesAddress);
  const [activeTab, setActiveTab] = useState<'overview' | 'nfts' | 'mining' | 'airdrop' | 'noble'>('overview');

  if (!lunesConnected || !lunesAddress) {
    return (
      <div className="min-h-screen pt-24 pb-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="text-4xl font-bold text-golden mb-4">👑 Royal Dashboard</h1>
            <p className="text-muted-foreground mb-8">Connect your wallet to access the dashboard.</p>
            <Card className="max-w-md mx-auto bg-card/50 backdrop-blur border-golden/20">
              <CardContent className="pt-6 text-center">
                <LayoutDashboard className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Please connect your Lunes wallet to continue.</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold font-display text-golden mb-4">
            👑 Royal Dashboard
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Manage your assets, NFTs, and mining rewards all in one place.
          </p>
        </motion.div>

        {/* Tabs - Following Simulations Pattern */}
        <div className="flex gap-2 mb-8 overflow-x-auto justify-center">
          {[
            { id: 'overview' as const, label: 'Overview', icon: LayoutDashboard },
            { id: 'nfts' as const, label: 'My NFTs', icon: Coins },
            { id: 'mining' as const, label: 'Mining', icon: Pickaxe },
            { id: 'airdrop' as const, label: 'Airdrop', icon: Gift },
            // Noble tab: only visible if wallet is registered as Parceiro by commercial team
            ...(isNoble ? [{ id: 'noble' as const, label: 'Noble', icon: Crown }] : []),
          ].map(tab => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'default' : 'outline'}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2"
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'overview' && <WalletOverview />}

          {activeTab === 'nfts' && (
            <Card className="bg-card/50 backdrop-blur border-golden/20">
              <CardContent className="pt-6">
                <MyNFTsPage />
              </CardContent>
            </Card>
          )}

          {activeTab === 'mining' && (
            <Card className="bg-card/50 backdrop-blur border-golden/20">
              <CardContent className="pt-6">
                <MiningPage />
              </CardContent>
            </Card>
          )}

          {activeTab === 'airdrop' && <AirdropProgress />}

          {activeTab === 'noble' && isNoble && (
            <NobleDashboard embedded nobleInfo={noble} />
          )}
        </motion.div>
      </div>
    </div>
  );
}
