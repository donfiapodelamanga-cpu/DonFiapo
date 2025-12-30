"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Flame, Moon, Crown, TrendingUp, Clock, Wallet, AlertTriangle, Percent, Info, Gift, Zap, Shield, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Link } from "@/lib/navigation";
import { useStakingPoolConfig } from "@/hooks/useContract";
import { API_CONFIG } from "@/lib/api/config";

type PoolId = "don-burn" | "don-lunes" | "don-fiapo";

// Entry fee tiers based on FIAPO amount (NEW VALUES)
const entryFeeTiers = [
  { min: 1, max: 1000, fee: 2, label: "1 - 1,000 FIAPO" },
  { min: 1001, max: 10000, fee: 1, label: "1,001 - 10,000 FIAPO" },
  { min: 10001, max: 100000, fee: 0.5, label: "10,001 - 100,000 FIAPO" },
  { min: 100001, max: 500000, fee: 0.25, label: "100,001 - 500,000 FIAPO" },
  { min: 500001, max: Infinity, fee: 0.1, label: "500,001+ FIAPO" },
];

// Pool-specific configurations
const poolDetails: Record<PoolId, {
  apyRange: string;
  paymentFrequency: string;
  minInvestment: string;
  type: string;
  cancelFee: string;
  earlyWithdrawPenalty: string;
  benefits: string[];
  destination: string;
}> = {
  "don-burn": {
    apyRange: "10% - 300%",
    paymentFrequency: "Daily",
    minInvestment: "100 FIAPO",
    type: "Long-term (Staking Burn)",
    cancelFee: "10 USDT + 50% capital + 80% interest",
    earlyWithdrawPenalty: "High penalty for burn staking",
    benefits: [
      "Highest APY potential (up to 300%)",
      "Daily interest payments",
      "Burns tokens for deflation",
      "Rewards engaged burners",
    ],
    destination: "20% Burn + 50% Staking Fund + 30% Ranking Rewards",
  },
  "don-lunes": {
    apyRange: "6% - 37%",
    paymentFrequency: "Weekly",
    minInvestment: "50 FIAPO",
    type: "Flexible (Staking $LUNES)",
    cancelFee: "2.5% of capital",
    earlyWithdrawPenalty: "Low penalty",
    benefits: [
      "Flexible withdrawal",
      "Lower minimum investment",
      "Weekly interest payments",
      "Supports $LUNES ecosystem",
    ],
    destination: "10% Team + 40% Staking Fund + 40% Ranking Rewards",
  },
  "don-fiapo": {
    apyRange: "7% - 70%",
    paymentFrequency: "Monthly",
    minInvestment: "75 FIAPO",
    type: "Medium-term (Staking $FIAPO)",
    cancelFee: "1% interest withdrawal fee",
    earlyWithdrawPenalty: "Medium penalty",
    benefits: [
      "Balanced risk/reward",
      "Monthly interest payments",
      "Moderate lock period",
      "Direct $FIAPO rewards",
    ],
    destination: "20% Burn + 50% Staking Fund + 30% Ranking Rewards",
  },
};

const stakingPoolsUI: Array<{
  key: string;
  poolId: PoolId;
  icon: typeof Crown;
  color: string;
  bgColor: string;
  borderColor: string;
  href: string;
}> = [
    {
      key: "donBurn",
      poolId: "don-burn",
      icon: Flame,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      borderColor: "border-orange-500/50",
      href: "/staking/don-burn",
    },
    {
      key: "donLunes",
      poolId: "don-lunes",
      icon: Moon,
      color: "text-blue-400",
      bgColor: "bg-blue-400/10",
      borderColor: "border-blue-400/50",
      href: "/staking/don-lunes",
    },
    {
      key: "donFiapo",
      poolId: "don-fiapo",
      icon: Crown,
      color: "text-golden",
      bgColor: "bg-golden/10",
      borderColor: "border-golden/50",
      href: "/staking/don-fiapo",
    },
  ];

// Hook to get all pool configs
function useAllPoolConfigs() {
  const burnConfig = useStakingPoolConfig("don-burn");
  const lunesConfig = useStakingPoolConfig("don-lunes");
  const fiapoConfig = useStakingPoolConfig("don-fiapo");

  useEffect(() => {
    burnConfig.fetchConfig();
    lunesConfig.fetchConfig();
    fiapoConfig.fetchConfig();
  }, []);

  return {
    "don-burn": burnConfig.config,
    "don-lunes": lunesConfig.config,
    "don-fiapo": fiapoConfig.config,
  };
}

export default function StakingPage() {
  const t = useTranslations("staking");
  const poolConfigs = useAllPoolConfigs();

  // Calculate totals from all pools
  const totalStaked = Object.values(poolConfigs).reduce((acc, c) => acc + Number(c.totalStaked), 0);
  const totalStakers = Object.values(poolConfigs).reduce((acc, c) => acc + c.totalStakers, 0);
  const avgApy = Object.values(poolConfigs).reduce((acc, c) => acc + c.apy, 0) / 3;

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-6xl font-bold font-display text-golden mb-4">
            🏰 {t("title")}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t("subtitle")}
          </p>
        </motion.div>

        {/* Stats Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12"
        >
          {[
            { icon: Wallet, label: "Total Value Locked", value: totalStaked > 0 ? `${(totalStaked / 10 ** API_CONFIG.token.decimals / 1_000_000).toFixed(1)}M FIAPO` : "0 FIAPO" },
            { icon: TrendingUp, label: "Average APY", value: `${avgApy.toFixed(2)}%` },
            { icon: Crown, label: "Total Stakers", value: totalStakers.toLocaleString() },
            { icon: Clock, label: "Mining Duration", value: `${API_CONFIG.miningDuration} days` },
          ].map((stat, i) => (
            <Card key={i} className="bg-card">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-2">
                  <stat.icon className="w-5 h-5 text-golden" />
                  <span className="text-sm text-muted-foreground">{stat.label}</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Staking Pools */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {stakingPoolsUI.map((pool, i) => {
            const Icon = pool.icon;
            const config = poolConfigs[pool.poolId];
            const details = poolDetails[pool.poolId];
            const tvlFormatted = Number(config.totalStaked) > 0
              ? `${(Number(config.totalStaked) / 10 ** API_CONFIG.token.decimals / 1_000_000).toFixed(1)}M`
              : "0";

            return (
              <motion.div
                key={pool.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
              >
                <Card className={`h-full card-hover bg-background border-2 ${pool.borderColor} hover:border-golden`}>
                  <CardHeader>
                    <div className={`w-16 h-16 rounded-2xl ${pool.bgColor} flex items-center justify-center mb-4`}>
                      <Icon className={`w-8 h-8 ${pool.color}`} />
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-xl text-foreground">{t(`${pool.key}.title`)}</CardTitle>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${pool.bgColor} ${pool.color}`}>
                      {details.type}
                    </span>
                    <CardDescription className="text-sm mt-2">{t(`${pool.key}.description`)}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* APY Range */}
                    <div className={`${pool.bgColor} rounded-xl p-4`}>
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className={`w-5 h-5 ${pool.color}`} />
                        <span className="text-sm font-medium">APY Range</span>
                      </div>
                      <span className={`text-3xl font-bold ${pool.color}`}>{details.apyRange}</span>
                      <p className="text-xs text-muted-foreground mt-1">per year</p>
                    </div>

                    {/* Key Info */}
                    <div className="bg-card rounded-xl p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="w-4 h-4" /> Payment
                        </span>
                        <span className="font-medium text-sm">{details.paymentFrequency}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Wallet className="w-4 h-4" /> Minimum
                        </span>
                        <span className="font-medium text-sm">{details.minInvestment}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Shield className="w-4 h-4" /> Lock Period
                        </span>
                        <span className="font-medium text-sm">{config.lockPeriod} days</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">TVL</span>
                        <span className="font-medium text-sm">{tvlFormatted} FIAPO</span>
                      </div>
                    </div>

                    {/* Benefits */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium flex items-center gap-1">
                        <Gift className={`w-4 h-4 ${pool.color}`} /> Benefits
                      </h4>
                      <ul className="space-y-1">
                        {details.benefits.map((benefit, idx) => (
                          <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                            <span className={`${pool.color}`}>✓</span>
                            {benefit}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Fees Warning */}
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                      <h4 className="text-xs font-medium text-yellow-500 flex items-center gap-1 mb-1">
                        <AlertTriangle className="w-3 h-3" /> Cancel Fee
                      </h4>
                      <p className="text-xs text-muted-foreground">{details.cancelFee}</p>
                    </div>
                  </CardContent>
                  <CardFooter className="flex gap-3">
                    <Button asChild className="flex-1">
                      <Link href={pool.href}>
                        {t("stake")}
                      </Link>
                    </Button>
                    <Button variant="outline" asChild className="flex-1">
                      <Link href="/staking/my-positions">
                        {t("myPositions")}
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Entry Fee Tiers Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-16"
        >
          <Card className="bg-gradient-to-r from-purple-500/10 to-golden/10 border-purple-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="w-6 h-6 text-purple-500" />
                Entry Fee Tiers
              </CardTitle>
              <CardDescription>
                The more you stake, the lower your entry fee! Fee paid in USDT (Solana) or LUSDT (Lunes).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {entryFeeTiers.map((tier, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl text-center ${idx === entryFeeTiers.length - 1
                      ? 'bg-golden/20 border-2 border-golden'
                      : 'bg-card border border-border'
                      }`}
                  >
                    <p className="text-2xl font-bold text-golden mb-1">{tier.fee}%</p>
                    <p className="text-xs text-muted-foreground">{tier.label}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-4 text-center">
                <Info className="w-3 h-3 inline mr-1" />
                Fee destination: 10% Team + 40% Staking Fund + 50% Ranking & Performance Rewards
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Fee Structure Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-center mb-8 flex items-center justify-center gap-2">
            <DollarSign className="w-6 h-6 text-golden" />
            Fee Structure & Destinations
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                title: "Transaction Fee",
                fee: "0.6%",
                currency: "$FIAPO",
                destination: "30% Burn + 50% Staking Fund + 20% Ranking Rewards",
                icon: Zap,
                color: "text-blue-400",
              },
              {
                title: "Interest Withdrawal",
                fee: "1%",
                currency: "$FIAPO",
                destination: "20% Burn + 50% Staking Fund + 30% Ranking Rewards",
                icon: TrendingUp,
                color: "text-green-500",
              },
              {
                title: "USDT Rewards Withdrawal",
                fee: "0.3%",
                currency: "USDT/LUSDT",
                destination: "10% Team + 40% Staking Fund + 40% Ranking Rewards",
                icon: DollarSign,
                color: "text-golden",
              },
              {
                title: "Burn-Re-Boost Fee",
                fee: "0.8 USDT + 10% FIAPO",
                currency: "Mixed",
                destination: "10% Team + 50% Staking Fund + 40% Ranking Rewards",
                icon: Flame,
                color: "text-orange-500",
              },
              {
                title: "Early Withdrawal (Burn)",
                fee: "10 USDT + 50% capital + 80% interest",
                currency: "$FIAPO",
                destination: "20% Burn + 50% Staking Fund + 30% Ranking Rewards",
                icon: AlertTriangle,
                color: "text-red-500",
              },
              {
                title: "Cancel Staking ($LUNES)",
                fee: "2.5%",
                currency: "Capital",
                destination: "10% Team + 40% Staking Fund + 40% Ranking Rewards",
                icon: Moon,
                color: "text-blue-400",
              },
            ].map((item, idx) => (
              <Card key={idx} className="bg-card">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center`}>
                      <item.icon className={`w-5 h-5 ${item.color}`} />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">{item.title}</h4>
                      <p className="text-xs text-muted-foreground">{item.currency}</p>
                    </div>
                  </div>
                  <p className={`text-xl font-bold ${item.color} mb-2`}>{item.fee}</p>
                  <p className="text-xs text-muted-foreground">{item.destination}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* Important Notice */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card className="bg-gradient-to-r from-golden/5 to-orange-500/5 border-golden/30">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-golden/20 flex items-center justify-center flex-shrink-0">
                  <Info className="w-6 h-6 text-golden" />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2">First Year Bonus Program</h3>
                  <p className="text-muted-foreground">
                    In the first year, we will subsidize rewards from the fund for wallets that actively engage in
                    token burning. Mentors and engaged community members who participate in burn campaigns will
                    receive priority rewards and higher APY rates.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
