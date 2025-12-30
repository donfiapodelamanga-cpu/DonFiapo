"use client";

import { motion } from "framer-motion";
import { Gift, Crown, Medal, Info, Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { formatAddress } from "@/lib/utils/format";
import { useMonthlyRewardsRanking, formatRankingBalance, formatRankingReward } from "@/hooks/use-ranking";

function getRankIcon(rank: number) {
  if (rank === 1) return <Crown className="w-6 h-6 text-yellow-500" />;
  if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />;
  if (rank === 3) return <Medal className="w-6 h-6 text-amber-600" />;
  return <span className="w-6 h-6 flex items-center justify-center font-bold text-muted-foreground">#{rank}</span>;
}

export function MonthlyRewardsRanking() {
  const { data, loading, error } = useMonthlyRewardsRanking({ autoRefresh: true, refreshInterval: 120000 });

  const totalRewards = data ? formatRankingBalance(data.totalRewards) : "0";
  const hasWinners = data?.winners && data.winners.length > 0;

  return (
    <Card className="bg-gradient-to-br from-golden/5 to-yellow-500/5 border-golden/30">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-golden">
              <Gift className="w-6 h-6" /> Monthly Rewards - Top 7
            </CardTitle>
            <CardDescription>
              Top 7 wallets by balance receive 20% of the staking fund monthly (excluding top 100 whales)
            </CardDescription>
          </div>
          <span className="px-3 py-1 bg-golden/20 text-golden text-sm font-medium rounded-full">
            {totalRewards} FIAPO Pool
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-golden" />
          </div>
        ) : error ? (
          <div className="text-center py-8 text-muted-foreground">
            Failed to load ranking data
          </div>
        ) : !hasWinners ? (
          <div className="text-center py-8">
            <Gift className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">No ranking data yet</p>
            <p className="text-sm text-muted-foreground/70">Rewards will appear after the first distribution</p>
          </div>
        ) : data.winners.map((winner) => (
          <motion.div
            key={winner.rank}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: winner.rank * 0.05 }}
            className={`flex items-center gap-4 p-4 rounded-xl border ${winner.rank <= 3 ? 'border-golden/30 bg-golden/10' : 'border-border bg-background/50'
              }`}
          >
            {getRankIcon(winner.rank)}
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{formatAddress(winner.address, 8)}</p>
              <p className="text-sm text-muted-foreground">Balance: {formatRankingBalance(winner.balance)} FIAPO</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-golden">+{formatRankingReward(winner.rewardAmount)}</p>
              <p className="text-xs text-muted-foreground">FIAPO</p>
            </div>
          </motion.div>
        ))}
      </CardContent>

      <CardFooter className="text-sm text-muted-foreground">
        <Info className="w-4 h-4 mr-2" />
        Rewards distributed on the 1st of each month
      </CardFooter>
    </Card>
  );
}
