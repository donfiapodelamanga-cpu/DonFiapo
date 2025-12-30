"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import Image from "next/image";
import { 
  ArrowLeft, 
  Trophy, 
  Crown,
  Sparkles,
  Medal,
  Star,
  Flame,
  TrendingUp,
  Users,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/lib/navigation";
import { API_CONFIG, getRarityConfig } from "@/lib/api/config";

// Leaderboard entry type
interface LeaderboardEntry {
  rank: number;
  address: string;
  nftId: number;
  tierId: number;
  rarity: string;
  evolutionCount: number;
  miningBonus: number;
  totalMined: number;
}

// Mock leaderboard data
const mockLeaderboard: LeaderboardEntry[] = [
  { rank: 1, address: '5GrwvaEF5zXb26F...utQY', nftId: 777, tierId: 6, rarity: 'legendary', evolutionCount: 3, miningBonus: 30, totalMined: 450000 },
  { rank: 2, address: '5FHneW46xGXgs5m...7sEY', nftId: 888, tierId: 5, rarity: 'legendary', evolutionCount: 2, miningBonus: 20, totalMined: 380000 },
  { rank: 3, address: '5DAAnrj7VHTznn2...ZJwC', nftId: 999, tierId: 6, rarity: 'epic', evolutionCount: 2, miningBonus: 20, totalMined: 350000 },
  { rank: 4, address: '5HGjWAeFDfFCWP...2dZw', nftId: 555, tierId: 5, rarity: 'epic', evolutionCount: 1, miningBonus: 10, totalMined: 280000 },
  { rank: 5, address: '5CiPPseXPECbkjW...NqKv', nftId: 444, tierId: 4, rarity: 'epic', evolutionCount: 1, miningBonus: 10, totalMined: 220000 },
  { rank: 6, address: '5GNJqTPyNqANBkU...PzLA', nftId: 333, tierId: 4, rarity: 'rare', evolutionCount: 2, miningBonus: 20, totalMined: 180000 },
  { rank: 7, address: '5HpG9w8EBLe5XCr...Dn7o', nftId: 222, tierId: 3, rarity: 'rare', evolutionCount: 1, miningBonus: 10, totalMined: 150000 },
  { rank: 8, address: '5Ck5SLSHYac6WFt...yRxs', nftId: 111, tierId: 3, rarity: 'rare', evolutionCount: 0, miningBonus: 0, totalMined: 120000 },
  { rank: 9, address: '5FLSigC9HGRKVhB...YLzX', nftId: 666, tierId: 2, rarity: 'uncommon', evolutionCount: 1, miningBonus: 10, totalMined: 90000 },
  { rank: 10, address: '5DAAnrj7VHTznn...JwC2', nftId: 123, tierId: 2, rarity: 'uncommon', evolutionCount: 0, miningBonus: 0, totalMined: 75000 },
];

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1: return <Trophy className="w-6 h-6 text-yellow-500" />;
    case 2: return <Medal className="w-6 h-6 text-gray-400" />;
    case 3: return <Medal className="w-6 h-6 text-amber-600" />;
    default: return <span className="w-6 h-6 flex items-center justify-center font-bold text-muted-foreground">#{rank}</span>;
  }
};

const getRankBgColor = (rank: number) => {
  switch (rank) {
    case 1: return 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/50';
    case 2: return 'bg-gradient-to-r from-gray-400/20 to-gray-500/20 border-gray-400/50';
    case 3: return 'bg-gradient-to-r from-amber-600/20 to-amber-700/20 border-amber-600/50';
    default: return 'bg-card border-border';
  }
};

export default function LeaderboardPage() {
  const t = useTranslations("ico");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'rarity' | 'mining' | 'evolution'>('rarity');

  useEffect(() => {
    // In production, fetch from contract
    setTimeout(() => {
      setLeaderboard(mockLeaderboard);
      setLoading(false);
    }, 1000);
  }, []);

  // Sort based on active tab
  const sortedLeaderboard = [...leaderboard].sort((a, b) => {
    switch (activeTab) {
      case 'mining':
        return b.totalMined - a.totalMined;
      case 'evolution':
        return b.evolutionCount - a.evolutionCount || b.miningBonus - a.miningBonus;
      case 'rarity':
      default:
        const rarityOrder = { legendary: 5, epic: 4, rare: 3, uncommon: 2, common: 1 };
        const aRarity = rarityOrder[a.rarity as keyof typeof rarityOrder] || 0;
        const bRarity = rarityOrder[b.rarity as keyof typeof rarityOrder] || 0;
        return bRarity - aRarity || b.tierId - a.tierId;
    }
  }).map((entry, index) => ({ ...entry, rank: index + 1 }));

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4">
        <Link href="/ico" className="inline-flex items-center gap-2 text-muted-foreground hover:text-golden mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to ICO
        </Link>

        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold font-display text-golden mb-4">
            🏆 NFT Leaderboard
          </h1>
          <p className="text-xl text-muted-foreground">
            The rarest and most powerful NFTs in the kingdom
          </p>
        </motion.div>

        {/* Stats Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          <Card className="bg-gradient-to-br from-yellow-500/10 to-golden/10 border-yellow-500/30">
            <CardContent className="pt-6 text-center">
              <Crown className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-yellow-500">
                {leaderboard.filter(e => e.rarity === 'legendary').length}
              </p>
              <p className="text-sm text-muted-foreground">Legendary NFTs</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30">
            <CardContent className="pt-6 text-center">
              <Sparkles className="w-8 h-8 text-purple-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-purple-500">
                {leaderboard.filter(e => e.rarity === 'epic').length}
              </p>
              <p className="text-sm text-muted-foreground">Epic NFTs</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/30">
            <CardContent className="pt-6 text-center">
              <Flame className="w-8 h-8 text-orange-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-orange-500">
                {leaderboard.reduce((acc, e) => acc + e.evolutionCount, 0)}
              </p>
              <p className="text-sm text-muted-foreground">Total Evolutions</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30">
            <CardContent className="pt-6 text-center">
              <TrendingUp className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-500">
                {(leaderboard.reduce((acc, e) => acc + e.totalMined, 0) / 1000000).toFixed(1)}M
              </p>
              <p className="text-sm text-muted-foreground">Total Mined</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tab Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex justify-center gap-2 mb-6"
        >
          {[
            { id: 'rarity', label: 'By Rarity', icon: Sparkles },
            { id: 'mining', label: 'By Mining', icon: TrendingUp },
            { id: 'evolution', label: 'By Evolution', icon: Flame },
          ].map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              variant={activeTab === id ? 'default' : 'outline'}
              onClick={() => setActiveTab(id as typeof activeTab)}
              className={activeTab === id ? 'bg-golden text-black' : ''}
            >
              <Icon className="w-4 h-4 mr-2" />
              {label}
            </Button>
          ))}
        </motion.div>

        {/* Leaderboard Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-golden" />
                Top NFTs
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-12">
                  <Loader2 className="w-12 h-12 text-golden mx-auto animate-spin mb-4" />
                  <p className="text-muted-foreground">Loading leaderboard...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedLeaderboard.map((entry, index) => {
                    const tierConfig = API_CONFIG.nftTiers[entry.tierId];
                    const rarityConfig = getRarityConfig(entry.rarity);
                    
                    return (
                      <motion.div
                        key={entry.nftId}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`flex items-center gap-4 p-4 rounded-lg border ${getRankBgColor(entry.rank)} hover:scale-[1.01] transition-transform`}
                      >
                        {/* Rank */}
                        <div className="w-10 flex-shrink-0">
                          {getRankIcon(entry.rank)}
                        </div>

                        {/* NFT Image */}
                        <div className="relative w-14 h-14 rounded-lg overflow-hidden border-2 border-border flex-shrink-0">
                          <Image
                            src={tierConfig?.image || '/nfts/tier1-free.png'}
                            alt={tierConfig?.name || 'NFT'}
                            fill
                            className="object-contain"
                          />
                          {entry.rarity === 'legendary' && (
                            <div className="absolute inset-0 bg-gradient-to-t from-yellow-500/30 to-transparent animate-pulse" />
                          )}
                        </div>

                        {/* NFT Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{tierConfig?.shortName}</span>
                            <span className={`px-2 py-0.5 ${rarityConfig.bgColor} ${rarityConfig.color} text-xs font-medium rounded`}>
                              {rarityConfig.name}
                            </span>
                            {entry.evolutionCount > 0 && (
                              <span className="px-2 py-0.5 bg-orange-500/20 text-orange-500 text-xs font-medium rounded flex items-center gap-1">
                                <Flame className="w-3 h-3" />
                                +{entry.miningBonus}%
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            #{entry.nftId} • {entry.address}
                          </p>
                        </div>

                        {/* Stats */}
                        <div className="hidden md:flex items-center gap-6 text-right">
                          <div>
                            <p className="text-sm font-bold text-green-500">
                              {(entry.totalMined / 1000).toFixed(0)}K
                            </p>
                            <p className="text-xs text-muted-foreground">Mined</p>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-orange-500">
                              {entry.evolutionCount}
                            </p>
                            <p className="text-xs text-muted-foreground">Evolutions</p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Your Position */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8"
        >
          <Card className="bg-gradient-to-r from-golden/10 to-purple-500/10 border-golden/30">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <Users className="w-8 h-8 text-golden" />
                  <div>
                    <h3 className="font-bold text-lg">Your Best NFT</h3>
                    <p className="text-sm text-muted-foreground">Connect wallet to see your ranking</p>
                  </div>
                </div>
                <Button asChild>
                  <Link href="/ico/my-nfts">View My NFTs</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
