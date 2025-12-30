"use client";

import { Users, Crown, Medal, Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { formatAddress } from "@/lib/utils/format";
import { useAffiliateRanking, formatRankingReward } from "@/hooks/use-ranking";

function getRankIcon(rank: number) {
  if (rank === 1) return <Crown className="w-6 h-6 text-yellow-500" />;
  if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />;
  if (rank === 3) return <Medal className="w-6 h-6 text-amber-600" />;
  return <span className="w-6 h-6 flex items-center justify-center font-bold text-muted-foreground">#{rank}</span>;
}

export function AffiliateRanking() {
  const { data, loading, error } = useAffiliateRanking({ autoRefresh: true, refreshInterval: 120000 });

  return (
    <Card className="bg-gradient-to-br from-blue-500/5 to-cyan-500/5 border-blue-500/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-400">
          <Users className="w-6 h-6" /> Top Affiliates - Weekly Top 7
        </CardTitle>
        <CardDescription>
          Earn commissions by referring new users to the Kingdom of Don Fiapo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
          </div>
        ) : error ? (
          <div className="text-center py-8 text-muted-foreground">
            Failed to load ranking data
          </div>
        ) : data?.winners.map((winner) => (
          <div
            key={winner.rank}
            className={`flex items-center gap-4 p-4 rounded-xl border ${
              winner.rank <= 3 ? 'border-blue-500/30 bg-blue-500/10' : 'border-border bg-background/50'
            }`}
          >
            {getRankIcon(winner.rank)}
            <div className="flex-1">
              <p className="font-medium">{formatAddress(winner.address, 6)}</p>
              <p className="text-sm text-blue-400">{winner.affiliateCount} referrals</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-blue-400">+{formatRankingReward(winner.rewardAmount)}</p>
              <p className="text-xs text-muted-foreground">FIAPO earned</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
