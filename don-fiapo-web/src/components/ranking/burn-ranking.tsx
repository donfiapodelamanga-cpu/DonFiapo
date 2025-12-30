"use client";

import { Flame, Crown, Medal, Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { formatAddress } from "@/lib/utils/format";
import { useBurnRanking, formatRankingBalance } from "@/hooks/use-ranking";

function getRankIcon(rank: number) {
  if (rank === 1) return <Crown className="w-6 h-6 text-yellow-500" />;
  if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />;
  if (rank === 3) return <Medal className="w-6 h-6 text-amber-600" />;
  return <span className="w-6 h-6 flex items-center justify-center font-bold text-muted-foreground">#{rank}</span>;
}

function getBurnBonus(rank: number): string {
  const bonuses: Record<number, string> = {
    1: "+15% APY",
    2: "+12% APY",
    3: "+10% APY",
    4: "+8% APY",
    5: "+5% APY",
    6: "+3% APY",
    7: "+2% APY",
  };
  return bonuses[rank] || "+2% APY";
}

export function BurnRanking() {
  const { data, loading, error } = useBurnRanking({ autoRefresh: true, refreshInterval: 120000 });

  return (
    <Card className="bg-gradient-to-br from-orange-500/5 to-red-500/5 border-orange-500/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-500">
          <Flame className="w-6 h-6" /> Top Burners - Weekly Top 7
        </CardTitle>
        <CardDescription>
          Burn tokens to earn enhanced APY bonuses on your staking positions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : error ? (
          <div className="text-center py-8 text-muted-foreground">
            Failed to load ranking data
          </div>
        ) : data?.winners.map((winner) => (
          <div
            key={winner.rank}
            className={`flex items-center gap-4 p-4 rounded-xl border ${
              winner.rank <= 3 ? 'border-orange-500/30 bg-orange-500/10' : 'border-border bg-background/50'
            }`}
          >
            {getRankIcon(winner.rank)}
            <div className="flex-1">
              <p className="font-medium">{formatAddress(winner.address, 6)}</p>
              <p className="text-sm text-orange-500">{getBurnBonus(winner.rank)}</p>
            </div>
            <p className="font-bold text-orange-500">{formatRankingBalance(winner.burnVolume)} 🔥</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
