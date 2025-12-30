"use client";

import { Sparkles, Star, Calendar, Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { formatAddress } from "@/lib/utils/format";
import { useMonthlyLotteryRanking, useChristmasLotteryRanking, formatRankingReward } from "@/hooks/use-ranking";

export function LotteryRanking() {
  const { data: monthlyData, loading: monthlyLoading } = useMonthlyLotteryRanking();
  const { data: christmasData, loading: christmasLoading } = useChristmasLotteryRanking();

  const hasChristmasWinners = christmasData && christmasData.winners.length > 0;

  return (
    <div className="space-y-6">
      {/* Monthly Lottery */}
      <Card className="bg-gradient-to-br from-purple-500/5 to-pink-500/5 border-purple-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-500">
            <Sparkles className="w-6 h-6" /> Monthly Lottery - &quot;God Looked at You&quot; 🙏
          </CardTitle>
          <CardDescription>
            3 random winners every month! 5% of transaction fees distributed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {monthlyLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
          ) : monthlyData?.winners.map((winner) => (
            <div
              key={winner.rank}
              className="flex items-center gap-4 p-4 rounded-xl border border-purple-500/30 bg-purple-500/10"
            >
              <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Star className="w-6 h-6 text-purple-500" />
              </div>
              <div className="flex-1">
                <p className="font-medium">{formatAddress(winner.address, 8)}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(winner.lastUpdated).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-purple-500">+{formatRankingReward(winner.rewardAmount)}</p>
                <p className="text-xs text-muted-foreground">FIAPO</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Christmas Lottery */}
      <Card className="bg-gradient-to-br from-red-500/5 to-green-500/5 border-red-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-500">
            🎄 Christmas Lottery - Annual Special
          </CardTitle>
          <CardDescription>
            12 winners on December 25th! 5% of annual fees distributed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {christmasLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-green-500" />
            </div>
          ) : hasChristmasWinners ? (
            <div className="space-y-3">
              {christmasData.winners.map((winner) => (
                <div
                  key={winner.rank}
                  className="flex items-center gap-4 p-4 rounded-xl border border-green-500/30 bg-green-500/10"
                >
                  <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                    🎁
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{formatAddress(winner.address, 8)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-500">+{formatRankingReward(winner.rewardAmount)}</p>
                    <p className="text-xs text-muted-foreground">FIAPO</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <p className="text-2xl font-bold text-golden mb-2">Coming December 25th</p>
              <p className="text-muted-foreground">Special prizes for the holiday season!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
