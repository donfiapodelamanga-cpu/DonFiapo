"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import Image from "next/image";
import { 
  ArrowLeft, 
  Flame, 
  ArrowRight, 
  Calendar, 
  TrendingUp,
  Sparkles,
  Crown,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/lib/navigation";
import { useWalletStore } from "@/lib/stores";
import { API_CONFIG, getRarityConfig } from "@/lib/api/config";
import { useEvolutionAndRarityStats } from "@/hooks/useEvolution";

// Mock evolution history data (in production, this would come from the contract)
interface EvolutionRecord {
  id: number;
  timestamp: number;
  burnedNftIds: number[];
  burnedTier: number;
  resultNftId: number;
  resultTier: number;
  bonusBps: number;
  rarity: string;
}

// Mock data for demo
const mockEvolutionHistory: EvolutionRecord[] = [
  {
    id: 1,
    timestamp: Date.now() - 86400000 * 2,
    burnedNftIds: [101, 102],
    burnedTier: 1,
    resultNftId: 201,
    resultTier: 2,
    bonusBps: 1000,
    rarity: 'rare',
  },
  {
    id: 2,
    timestamp: Date.now() - 86400000 * 5,
    burnedNftIds: [45, 67, 89],
    burnedTier: 0,
    resultNftId: 150,
    resultTier: 1,
    bonusBps: 1000,
    rarity: 'uncommon',
  },
];

export default function EvolutionHistoryPage() {
  const t = useTranslations("ico");
  const { lunesConnected } = useWalletStore();
  const { stats, loading: statsLoading, fetchStats } = useEvolutionAndRarityStats();
  const [evolutionHistory, setEvolutionHistory] = useState<EvolutionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    // In production, fetch actual evolution history from contract
    // For now, use mock data
    setTimeout(() => {
      setEvolutionHistory(mockEvolutionHistory);
      setLoading(false);
    }, 1000);
  }, [fetchStats]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4">
        <Link href="/ico/my-nfts" className="inline-flex items-center gap-2 text-muted-foreground hover:text-golden mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to My NFTs
        </Link>

        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold font-display text-golden mb-4">
            🔥 Evolution History
          </h1>
          <p className="text-xl text-muted-foreground">
            Track your NFT evolution journey
          </p>
        </motion.div>

        {/* Global Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          <Card className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/30">
            <CardContent className="pt-6 text-center">
              <Flame className="w-8 h-8 text-orange-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-orange-500">
                {statsLoading ? '-' : stats.evolution.totalEvolutions}
              </p>
              <p className="text-sm text-muted-foreground">Total Evolutions</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-red-500/10 to-purple-500/10 border-red-500/30">
            <CardContent className="pt-6 text-center">
              <TrendingUp className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-red-500">
                {statsLoading ? '-' : stats.evolution.totalBurned}
              </p>
              <p className="text-sm text-muted-foreground">NFTs Burned</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-yellow-500/10 to-golden/10 border-yellow-500/30">
            <CardContent className="pt-6 text-center">
              <Sparkles className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-yellow-500">
                {statsLoading ? '-' : stats.rarity.legendary}
              </p>
              <p className="text-sm text-muted-foreground">Legendary NFTs</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-500/30">
            <CardContent className="pt-6 text-center">
              <Crown className="w-8 h-8 text-purple-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-purple-500">
                {statsLoading ? '-' : `${stats.rarity.epic + stats.rarity.legendary}`}
              </p>
              <p className="text-sm text-muted-foreground">Epic+ NFTs</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Rarity Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-golden" />
                Rarity Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { key: 'common', label: 'Common', count: stats.rarity.common },
                  { key: 'uncommon', label: 'Uncommon', count: stats.rarity.uncommon },
                  { key: 'rare', label: 'Rare', count: stats.rarity.rare },
                  { key: 'epic', label: 'Epic', count: stats.rarity.epic },
                  { key: 'legendary', label: 'Legendary', count: stats.rarity.legendary },
                ].map(({ key, label, count }) => {
                  const config = getRarityConfig(key);
                  const total = stats.rarity.total || 1;
                  const percentage = (count / total) * 100;
                  
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <span className={`w-24 text-sm font-medium ${config.color}`}>
                        {label}
                      </span>
                      <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 1, delay: 0.3 }}
                          className={`h-full ${config.bgColor.replace('/20', '')} opacity-70`}
                        />
                      </div>
                      <span className="w-16 text-right text-sm text-muted-foreground">
                        {count} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Evolution History List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-500" />
                Your Evolution History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!lunesConnected ? (
                <div className="text-center py-12">
                  <Crown className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">Connect your wallet to view evolution history</p>
                  <Button>Connect Wallet</Button>
                </div>
              ) : loading ? (
                <div className="text-center py-12">
                  <Loader2 className="w-12 h-12 text-golden mx-auto animate-spin mb-4" />
                  <p className="text-muted-foreground">Loading evolution history...</p>
                </div>
              ) : evolutionHistory.length === 0 ? (
                <div className="text-center py-12">
                  <Flame className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No evolutions yet</p>
                  <Button asChild>
                    <Link href="/ico/my-nfts">Start Evolving</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {evolutionHistory.map((record, index) => {
                    const burnedTierConfig = API_CONFIG.nftTiers[record.burnedTier];
                    const resultTierConfig = API_CONFIG.nftTiers[record.resultTier];
                    const rarityConfig = getRarityConfig(record.rarity);
                    
                    return (
                      <motion.div
                        key={record.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        {/* Burned NFTs */}
                        <div className="flex items-center gap-2">
                          <div className="relative w-16 h-16 rounded-lg overflow-hidden border-2 border-red-500/50">
                            <Image
                              src={burnedTierConfig?.image || '/nfts/tier1-free.png'}
                              alt="Burned NFT"
                              fill
                              className="object-contain opacity-50"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-red-500/30">
                              <span className="text-xs font-bold">x{record.burnedNftIds.length}</span>
                            </div>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {burnedTierConfig?.shortName}
                          </span>
                        </div>

                        {/* Arrow */}
                        <ArrowRight className="w-6 h-6 text-golden flex-shrink-0" />

                        {/* Result NFT */}
                        <div className="flex items-center gap-2">
                          <div className="relative w-16 h-16 rounded-lg overflow-hidden border-2 border-golden">
                            <Image
                              src={resultTierConfig?.image || '/nfts/tier2-bronze.png'}
                              alt="Result NFT"
                              fill
                              className="object-contain"
                            />
                          </div>
                          <div>
                            <p className="font-medium">{resultTierConfig?.shortName}</p>
                            <p className="text-xs text-green-500">+{record.bonusBps / 100}% bonus</p>
                          </div>
                        </div>

                        {/* Rarity Badge */}
                        <span className={`px-3 py-1 ${rarityConfig.bgColor} ${rarityConfig.color} text-xs font-medium rounded-full ml-auto`}>
                          {rarityConfig.name}
                        </span>

                        {/* Date */}
                        <div className="text-right text-sm text-muted-foreground hidden md:block">
                          <Calendar className="w-4 h-4 inline mr-1" />
                          {formatDate(record.timestamp)}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
