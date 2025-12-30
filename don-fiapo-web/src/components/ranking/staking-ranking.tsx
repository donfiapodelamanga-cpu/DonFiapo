"use client";

import { TrendingUp, Crown, Medal, Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { formatAddress } from "@/lib/utils/format";
import { useStakingRanking, formatRankingBalance } from "@/hooks/use-ranking";

function getRankIcon(rank: number) {
  if (rank === 1) return <Crown className="w-6 h-6 text-yellow-500" />;
  if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />;
  if (rank === 3) return <Medal className="w-6 h-6 text-amber-600" />;
  return <span className="w-6 h-6 flex items-center justify-center font-bold text-muted-foreground">#{rank}</span>;
}

function getApyBonus(rank: number): { apy: string; bonus: string } {
  const apyBonuses: Record<number, { apy: string; bonus: string }> = {
    1: { apy: "300%", bonus: "+5%" },
    2: { apy: "250%", bonus: "+4%" },
    3: { apy: "220%", bonus: "+3%" },
    4: { apy: "180%", bonus: "+2%" },
    5: { apy: "150%", bonus: "+1%" },
    6: { apy: "120%", bonus: "+0.5%" },
    7: { apy: "100%", bonus: "+0.5%" },
  };
  return apyBonuses[rank] || { apy: "100%", bonus: "+0.5%" };
}

export function StakingRanking() {
  const { data, loading, error } = useStakingRanking({ autoRefresh: true, refreshInterval: 120000 });

  return (
    <Card className="bg-gradient-to-br from-green-500/5 to-emerald-500/5 border-green-500/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-500">
          <TrendingUp className="w-6 h-6" /> Staking Leaders - Weekly Top 7
        </CardTitle>
        <CardDescription>
          Top stakers receive bonus APY on their positions. Updated every week.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-green-500" />
          </div>
        ) : error ? (
          <div className="text-center py-8 text-muted-foreground">
            Failed to load ranking data
          </div>
        ) : data?.winners.map((winner) => {
          const { apy, bonus } = getApyBonus(winner.rank);
          return (
            <div
              key={winner.rank}
              className={`flex items-center gap-4 p-4 rounded-xl border ${
                winner.rank <= 3 ? 'border-green-500/30 bg-green-500/10' : 'border-border bg-background/50'
              }`}
            >
              {getRankIcon(winner.rank)}
              <div className="flex-1">
                <p className="font-medium">{formatAddress(winner.address, 6)}</p>
                <p className="text-sm text-green-500">{apy} APY</p>
              </div>
              <div className="text-right">
                <p className="font-bold">{formatRankingBalance(winner.stakingBalance)}</p>
                <p className="text-xs text-green-500">{bonus} Bonus</p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
