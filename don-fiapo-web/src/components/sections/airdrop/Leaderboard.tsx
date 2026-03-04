"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy, Medal, Crown, Shield, Loader2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useWalletStore } from "@/lib/stores";
import { useLeaderboard } from "@/hooks/useMissions";
import type { LeaderboardEntry } from "@/lib/missions/types";

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1: return <Crown className="w-6 h-6 text-yellow-400" />;
    case 2: return <Medal className="w-6 h-6 text-gray-400" />;
    case 3: return <Medal className="w-6 h-6 text-amber-600" />;
    default: return <span className="font-bold text-muted-foreground w-6 text-center">{rank}</span>;
  }
};

const getLevelColor = (level: string) => {
  switch (level) {
    case 'ALPHA': return 'bg-red-500/10 text-red-500 border-red-500/30';
    case 'GENERAL': return 'bg-purple-500/10 text-purple-500 border-purple-500/30';
    case 'NOBRE': return 'bg-golden/10 text-golden border-golden/30';
    case 'CAVALEIRO': return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    default: return 'bg-muted text-muted-foreground border-border';
  }
};

export function Leaderboard() {
  const { lunesAddress } = useWalletStore();
  const { top, currentUser, totalParticipants, loading, fetchLeaderboard } = useLeaderboard(lunesAddress || undefined);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Combine top list + current user (if not already in top)
  const displayData: LeaderboardEntry[] = [...top];
  if (currentUser && !top.some((t) => t.isCurrentUser)) {
    displayData.push(currentUser);
  }

  return (
    <div className="space-y-8">
      <div className="text-center max-w-2xl mx-auto">
        <Trophy className="w-12 h-12 text-golden mx-auto mb-4" />
        <h2 className="text-3xl font-bold font-display text-foreground mb-2">Royal Rankings</h2>
        <p className="text-muted-foreground">
          Top 500 wallets will receive an exclusive multiplier bonus. Top 50 win a Royal NFT drop!
        </p>
        {totalParticipants > 0 && (
          <div className="flex items-center justify-center gap-2 mt-3 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>{totalParticipants.toLocaleString()} participants</span>
          </div>
        )}
      </div>

      {loading && displayData.length === 0 ? (
        <div className="text-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-golden mx-auto mb-4" />
          <p className="text-muted-foreground">Loading rankings...</p>
        </div>
      ) : displayData.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-lg">No rankings yet. Complete quests to appear here!</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 text-left font-medium text-muted-foreground">Rank</th>
                  <th className="px-6 py-4 text-left font-medium text-muted-foreground">Player</th>
                  <th className="px-6 py-4 text-left font-medium text-muted-foreground">Level</th>
                  <th className="px-6 py-4 text-right font-medium text-muted-foreground">Total Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {displayData.map((user, idx) => (
                  <motion.tr
                    key={`${user.rank}-${user.userId}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`
                      ${user.isCurrentUser ? 'bg-golden/5 border-l-4 border-l-golden' : 'hover:bg-muted/50'}
                      transition-colors
                    `}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center w-8">
                        {getRankIcon(user.rank)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${user.isCurrentUser ? 'bg-golden text-background' : 'bg-muted'}`}>
                          {user.isCurrentUser ? <Shield className="w-4 h-4" /> : user.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className={`font-bold ${user.isCurrentUser ? 'text-golden' : 'text-foreground'}`}>
                            {user.isCurrentUser ? "You" : user.displayName}
                          </p>
                          <p className="text-xs text-muted-foreground">{user.address}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className={getLevelColor(user.level)}>
                        {user.level}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="font-bold text-lg">{user.totalScore.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">PTS</p>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
