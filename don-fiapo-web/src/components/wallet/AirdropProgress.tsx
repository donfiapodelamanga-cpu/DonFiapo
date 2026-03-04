"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Gift,
  Trophy,
  Target,
  CheckCircle2,
  Zap,
  Users,
  Coins,
  Loader2,
  ExternalLink,
  TrendingUp,
  Flame,
  UserPlus,
  PiggyBank,
  Shield,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWalletStore } from "@/lib/stores";
import { useMissions, useLeaderboard } from "@/hooks/useMissions";

interface EarlyBirdStatus {
  totalAmount: number;
  maxSlots: number;
  slotsClaimed: number;
  slotsRemaining: number;
  percentFilled: number;
  lunesPerSlot: number;
  isFull: boolean;
  isActive: boolean;
  userClaim: {
    slotNumber: number;
    lunesAmount: number;
    claimedAt: string;
  } | null;
}

const RANK_COLORS: Record<string, string> = {
  ALPHA: "bg-red-500/10 text-red-500 border-red-500/30",
  GENERAL: "bg-purple-500/10 text-purple-500 border-purple-500/30",
  NOBRE: "bg-golden/10 text-golden border-golden/30",
  CAVALEIRO: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  PLEBEU: "bg-muted text-muted-foreground border-border",
};

export default function AirdropProgress() {
  const { lunesAddress } = useWalletStore();
  const { missions, score, loading: missionsLoading, fetchMissions } = useMissions(lunesAddress || undefined);
  const { top, currentUser, totalParticipants, loading: lbLoading, fetchLeaderboard } = useLeaderboard(lunesAddress || undefined);

  const [earlyBird, setEarlyBird] = useState<EarlyBirdStatus | null>(null);
  const [ebLoading, setEbLoading] = useState(true);

  const fetchEarlyBird = useCallback(async () => {
    try {
      const url = lunesAddress
        ? `/api/airdrop/early-bird-status?wallet=${encodeURIComponent(lunesAddress)}`
        : "/api/airdrop/early-bird-status";
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data.slotsClaimed === "number") setEarlyBird(data);
      }
    } catch {
      // silent
    } finally {
      setEbLoading(false);
    }
  }, [lunesAddress]);

  useEffect(() => {
    fetchMissions();
    fetchLeaderboard();
    fetchEarlyBird();
  }, [fetchMissions, fetchLeaderboard, fetchEarlyBird]);

  const completedMissions = missions.filter((m) => m.userStatus === "VERIFIED").length;
  const pendingMissions = missions.filter((m) => m.userStatus === "PENDING").length;
  const totalMissions = missions.length;
  const completionPct = totalMissions > 0 ? Math.round((completedMissions / totalMissions) * 100) : 0;

  const isLoading = missionsLoading && lbLoading && ebLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-golden" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Score Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 backdrop-blur border-golden/20">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-4 h-4 text-golden" />
              <span className="text-xs text-muted-foreground">Total Score</span>
            </div>
            <p className="text-2xl font-bold text-golden">
              {score?.totalScore?.toLocaleString() ?? "0"}
            </p>
            {score?.multiplier && score.multiplier > 1 && (
              <p className="text-[10px] text-green-400 mt-1">×{score.multiplier} multiplier</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-golden/20">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-muted-foreground">Rank</span>
            </div>
            <Badge
              variant="outline"
              className={`text-sm font-bold ${RANK_COLORS[score?.rank ?? "PLEBEU"] ?? RANK_COLORS.PLEBEU}`}
            >
              {score?.rank ?? "PLEBEU"}
            </Badge>
            {currentUser && (
              <p className="text-[10px] text-muted-foreground mt-2">
                #{currentUser.rank.toLocaleString()} of {totalParticipants.toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-golden/20">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-muted-foreground">Missions</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {completedMissions}<span className="text-sm text-muted-foreground font-normal">/{totalMissions}</span>
            </p>
            {pendingMissions > 0 && (
              <p className="text-[10px] text-orange-400 mt-1">{pendingMissions} pending review</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-golden/20">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-xs text-muted-foreground">Early Bird</span>
            </div>
            {earlyBird?.userClaim ? (
              <>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-bold text-green-400">Secured</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Slot #{earlyBird.userClaim.slotNumber} · ≈{earlyBird.userClaim.lunesAmount.toFixed(2)} LUNES
                </p>
              </>
            ) : earlyBird?.isFull ? (
              <p className="text-sm font-bold text-red-400">Closed</p>
            ) : (
              <p className="text-sm font-bold text-muted-foreground">Not claimed</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Points Breakdown */}
      {score && score.totalScore > 0 && (
        <Card className="bg-card/50 backdrop-blur border-golden/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Coins className="w-4 h-4 text-golden" />
              Points Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { icon: PiggyBank, label: "Off-chain", value: score.offchainScore, color: "text-blue-400", bar: "bg-blue-400" },
                { icon: TrendingUp, label: "On-chain", value: score.onchainScore, color: "text-green-400", bar: "bg-green-400" },
              ].map((item) => (
                <div key={item.label} className="bg-background/50 rounded-lg p-3 border border-border">
                  <div className="flex items-center gap-2 mb-1">
                    <item.icon className={`w-4 h-4 ${item.color}`} />
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                  </div>
                  <p className="font-bold">{item.value.toLocaleString()}</p>
                  <div className="h-1 bg-muted rounded-full mt-2 overflow-hidden">
                    <div
                      className={`h-full ${item.bar} rounded-full`}
                      style={{ width: `${score.totalScore > 0 ? (item.value / score.totalScore) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
              <div className="bg-background/50 rounded-lg p-3 border border-border">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-4 h-4 text-orange-400" />
                  <span className="text-xs text-muted-foreground">Completed</span>
                </div>
                <p className="font-bold">{score.completedMissions}/{score.totalMissions}</p>
                <div className="h-1 bg-muted rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-orange-400 rounded-full"
                    style={{ width: `${score.totalMissions > 0 ? (score.completedMissions / score.totalMissions) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <div className="bg-golden/10 rounded-lg p-3 border border-golden/30">
                <div className="flex items-center gap-2 mb-1">
                  <Trophy className="w-4 h-4 text-golden" />
                  <span className="text-xs text-golden/70">Total</span>
                </div>
                <p className="font-bold text-golden text-lg">{score.totalScore.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mission Progress Bar */}
      <Card className="bg-card/50 backdrop-blur border-golden/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-400" />
              Mission Progress
            </CardTitle>
            <span className="text-sm text-muted-foreground">{completionPct}%</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-2 bg-muted rounded-full overflow-hidden mb-4">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-golden rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${completionPct}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-green-400" />
              {completedMissions} completed
            </span>
            {pendingMissions > 0 && (
              <span className="flex items-center gap-1">
                <Loader2 className="w-3 h-3 text-orange-400" />
                {pendingMissions} pending
              </span>
            )}
            <span>{totalMissions - completedMissions - pendingMissions} remaining</span>
          </div>
        </CardContent>
      </Card>

      {/* Early Bird Status */}
      {earlyBird && (
        <Card className="bg-card/50 backdrop-blur border-golden/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              Early Bird Distribution
              {earlyBird.userClaim && (
                <Badge className="bg-green-500/10 text-green-400 border-green-500/30 text-[10px]">
                  Secured
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {earlyBird.slotsClaimed.toLocaleString()} claimed
                </span>
                <span>{earlyBird.slotsRemaining.toLocaleString()} remaining</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${
                    earlyBird.percentFilled >= 90
                      ? "bg-red-500"
                      : earlyBird.percentFilled >= 70
                      ? "bg-orange-500"
                      : "bg-golden"
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, earlyBird.percentFilled)}%` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                />
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-background/50 rounded-lg p-2 border border-border">
                  <p className="text-[10px] text-muted-foreground">Pool</p>
                  <p className="text-sm font-bold">100K LUNES</p>
                </div>
                <div className="bg-background/50 rounded-lg p-2 border border-border">
                  <p className="text-[10px] text-muted-foreground">Per Slot</p>
                  <p className="text-sm font-bold">≈{earlyBird.lunesPerSlot.toFixed(2)}</p>
                </div>
                <div className="bg-background/50 rounded-lg p-2 border border-border">
                  <p className="text-[10px] text-muted-foreground">Filled</p>
                  <p className="text-sm font-bold">{earlyBird.percentFilled.toFixed(1)}%</p>
                </div>
              </div>
              {earlyBird.userClaim && (
                <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    Slot <span className="text-foreground font-bold">#{earlyBird.userClaim.slotNumber}</span> — 
                    you will receive <span className="text-golden font-bold">≈{earlyBird.userClaim.lunesAmount.toFixed(2)} LUNES</span>
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leaderboard Position */}
      {currentUser && (
        <Card className="bg-card/50 backdrop-blur border-golden/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="w-4 h-4 text-golden" />
              Your Ranking
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-golden/10 border border-golden/30 flex items-center justify-center">
                <span className="text-2xl font-black text-golden">#{currentUser.rank}</span>
              </div>
              <div className="flex-1">
                <p className="font-bold text-foreground">{currentUser.displayName}</p>
                <p className="text-xs text-muted-foreground">{currentUser.address}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-golden">{currentUser.totalScore.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">
                  of {totalParticipants.toLocaleString()} players
                </p>
              </div>
            </div>
            {top.length > 0 && currentUser.rank > 1 && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-[10px] text-muted-foreground mb-2">Top 3</p>
                <div className="space-y-1.5">
                  {top.slice(0, 3).map((entry) => (
                    <div key={entry.userId} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2">
                        <span className={`font-bold ${entry.rank === 1 ? "text-yellow-400" : entry.rank === 2 ? "text-gray-400" : "text-amber-600"}`}>
                          #{entry.rank}
                        </span>
                        <span className="text-muted-foreground">{entry.displayName}</span>
                      </span>
                      <span className="font-bold">{entry.totalScore.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 justify-center">
        <Link href="/airdrop?tab=missions">
          <Button variant="outline" size="sm" className="border-golden/30 text-golden hover:bg-golden/10">
            <Target className="w-4 h-4 mr-2" />
            Complete Missions
            <ExternalLink className="w-3 h-3 ml-2 opacity-50" />
          </Button>
        </Link>
        <Link href="/airdrop">
          <Button variant="outline" size="sm" className="border-golden/30 text-golden hover:bg-golden/10">
            <Gift className="w-4 h-4 mr-2" />
            Full Airdrop Page
            <ExternalLink className="w-3 h-3 ml-2 opacity-50" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
