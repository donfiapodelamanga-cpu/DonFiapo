"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { useState } from "react";
import { Trophy, Gift, TrendingUp, Flame, Users, Sparkles, DollarSign, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  MonthlyRewardsRanking,
  LotteryRanking,
  StakingRanking,
  BurnRanking,
  AffiliateRanking
} from "@/components/ranking";
import { useRankingStats, useNextDistributionDate, formatRankingBalance } from "@/hooks/use-ranking";

type RankingTab = 'monthly' | 'lottery' | 'staking' | 'burn' | 'affiliates';

export default function RankingPage() {
  const t = useTranslations("ranking");
  const [activeTab, setActiveTab] = useState<RankingTab>('monthly');
  const { stats } = useRankingStats();
  const { daysUntil } = useNextDistributionDate('MonthlyRewards');

  const tabs = [
    { id: 'monthly' as RankingTab, label: 'Monthly Rewards', icon: Gift, color: 'text-golden' },
    { id: 'lottery' as RankingTab, label: 'Lottery', icon: Sparkles, color: 'text-purple-500' },
    { id: 'staking' as RankingTab, label: 'Staking', icon: TrendingUp, color: 'text-green-500' },
    { id: 'burn' as RankingTab, label: 'Burn', icon: Flame, color: 'text-orange-500' },
    { id: 'affiliates' as RankingTab, label: 'Affiliates', icon: Users, color: 'text-blue-400' },
  ];

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold font-display text-golden mb-4">🏆 {t("title")}</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">{t("subtitle")}</p>
        </motion.div>

        {/* Stats Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          <Card className="bg-gradient-to-br from-golden/10 to-yellow-500/10 border-golden/30">
            <CardContent className="pt-6 text-center">
              <DollarSign className="w-8 h-8 text-golden mx-auto mb-2" />
              <p className="text-2xl font-bold text-golden">
                {stats ? formatRankingBalance(stats.totalRewardsDistributed) : "0"}
              </p>
              <p className="text-sm text-muted-foreground">Total Rewards Pool</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30">
            <CardContent className="pt-6 text-center">
              <Trophy className="w-8 h-8 text-purple-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-purple-500">
                {stats?.totalRankings ?? 0}
              </p>
              <p className="text-sm text-muted-foreground">Rankings Executed</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30">
            <CardContent className="pt-6 text-center">
              <Users className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-500">
                {stats?.totalUniqueParticipants?.toLocaleString() ?? "0"}
              </p>
              <p className="text-sm text-muted-foreground">Unique Winners</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/30">
            <CardContent className="pt-6 text-center">
              <Clock className="w-8 h-8 text-orange-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-orange-500">{daysUntil}</p>
              <p className="text-sm text-muted-foreground">Next Distribution</p>
            </CardContent>
          </Card>
        </motion.div>


        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap justify-center gap-2 mb-8"
        >
          {tabs.map(tab => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'default' : 'outline'}
              onClick={() => setActiveTab(tab.id)}
              className={activeTab === tab.id ? 'bg-golden text-black' : ''}
            >
              <tab.icon className={`w-4 h-4 mr-2 ${activeTab === tab.id ? '' : tab.color}`} />
              {tab.label}
            </Button>
          ))}
        </motion.div>

        {/* Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          {activeTab === 'monthly' && <MonthlyRewardsRanking />}
          {activeTab === 'lottery' && <LotteryRanking />}
          {activeTab === 'staking' && <StakingRanking />}
          {activeTab === 'burn' && <BurnRanking />}
          {activeTab === 'affiliates' && <AffiliateRanking />}
        </motion.div>

        {/* Reward Distribution Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-12"
        >
          <Card className="bg-gradient-to-r from-golden/5 to-purple-500/5 border-golden/30">
            <CardContent className="pt-6">
              <h3 className="text-xl font-bold text-golden mb-4 flex items-center gap-2">
                <Gift className="w-5 h-5" /> How Rewards Are Distributed
              </h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { type: "Monthly Rewards", pool: "20%", freq: "Monthly", winners: 7 },
                  { type: "Monthly Lottery", pool: "5%", freq: "Monthly", winners: 3 },
                  { type: "Christmas Lottery", pool: "5%", freq: "Yearly", winners: 12 },
                  { type: "Staking Bonus", pool: "APY+", freq: "Weekly", winners: 7 },
                  { type: "Burn Bonus", pool: "APY+", freq: "Weekly", winners: 7 },
                  { type: "Affiliate Rewards", pool: "Commissions", freq: "Realtime", winners: "∞" },
                ].map((item, i) => (
                  <div key={i} className="p-3 bg-background/50 rounded-lg border border-border">
                    <p className="font-medium text-sm">{item.type}</p>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>{item.pool}</span>
                      <span>{item.freq}</span>
                      <span>Top {item.winners}</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                💡 Top 100 whales are excluded from monthly rewards to ensure fair distribution.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
