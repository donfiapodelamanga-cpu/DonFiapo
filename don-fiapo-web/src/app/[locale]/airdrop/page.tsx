"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { useEffect } from "react";
import { Gift, CheckCircle2, Clock, Users, Coins, Loader2, Wallet, TrendingUp, Flame, UserPlus, PiggyBank } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { useWalletStore } from "@/lib/stores";
import { useAirdrop, useAirdropStats, useAirdropConfig } from "@/hooks/useContract";
import { useToast } from "@/components/ui/toast";
import { API_CONFIG } from "@/lib/api/config";
import { AirdropTimeline } from "@/components/sections/AirdropTimeline";
import { AirdropCalculator } from "@/components/sections/AirdropCalculator";

export default function AirdropPage() {
  const t = useTranslations("airdrop");
  const { addToast } = useToast();
  const { lunesConnected, lunesAddress } = useWalletStore();
  const { status, userData, loading, error, fetchStatus, claim } = useAirdrop();
  const { stats: globalStats, fetchStats } = useAirdropStats();
  const { config, fetchConfig } = useAirdropConfig();

  useEffect(() => {
    fetchStats();
    fetchConfig();
    if (lunesConnected && lunesAddress) {
      fetchStatus();
    }
  }, [lunesConnected, lunesAddress, fetchStatus, fetchStats, fetchConfig]);

  const handleClaim = async () => {
    try {
      const proof: string[] = []; // In production, get from API
      const txHash = await claim(proof);
      addToast("success", "Airdrop Claimed!", `You received ${Number(status.amount) / 10 ** API_CONFIG.token.decimals} FIAPO`);
    } catch (err) {
      addToast("error", "Claim Failed", err instanceof Error ? err.message : "Unknown error");
    }
  };

  const isEligible = userData.eligible || status.eligible;
  const availableAmount = Number(userData.estimatedTokens || status.amount) / 10 ** API_CONFIG.token.decimals;
  const hasClaimed = userData.claimed || status.claimed;

  // Calculate points percentages for visual breakdown
  const totalPoints = Number(userData.totalPoints);
  const balancePercent = totalPoints > 0 ? (Number(userData.balancePoints) / totalPoints) * 100 : 0;
  const stakingPercent = totalPoints > 0 ? (Number(userData.stakingPoints) / totalPoints) * 100 : 0;
  const burningPercent = totalPoints > 0 ? (Number(userData.burningPoints) / totalPoints) * 100 : 0;
  const affiliatePercent = totalPoints > 0 ? (Number(userData.affiliatePoints) / totalPoints) * 100 : 0;

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
            🎁 {t("title")}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-4">
            {t("subtitle")}
          </p>
          <div className="inline-flex items-center gap-3 bg-golden/10 border-2 border-golden/50 rounded-full px-6 py-3">
            <Gift className="w-6 h-6 text-golden" />
            <div className="text-left">
              <p className="text-sm text-muted-foreground">Total Airdrop Pool</p>
              <p className="text-2xl font-bold text-golden">21,000,000,000 $FIAPO</p>
            </div>
            <div className="h-8 w-px bg-golden/30" />
            <div className="text-left">
              <p className="text-sm text-muted-foreground">Allocation</p>
              <p className="text-2xl font-bold text-golden">7% of Supply</p>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12"
        >
          {[
            { icon: Coins, label: "Total Airdrop", value: `${(Number(globalStats.totalAmount) / 10 ** API_CONFIG.token.decimals / 1_000_000_000).toFixed(1)}B $FIAPO` },
            { icon: Users, label: "Eligible Wallets", value: globalStats.eligibleWallets.toLocaleString() },
            { icon: Gift, label: "Claimed", value: `${(Number(globalStats.totalClaimed) / 10 ** API_CONFIG.token.decimals / 1_000_000_000).toFixed(1)}B` },
            { icon: Clock, label: "Time Remaining", value: `${Math.max(0, Math.ceil((globalStats.endTime - Date.now()) / (24 * 60 * 60 * 1000)))} Days` },
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

        {/* Main Claim Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="max-w-2xl mx-auto"
        >
          <Card className="bg-background border-2 border-golden glow-gold">
            <CardHeader className="text-center">
              <div className="w-24 h-24 rounded-full bg-golden/20 flex items-center justify-center mx-auto mb-4">
                <Gift className="w-12 h-12 text-golden" />
              </div>
              <CardTitle className="text-3xl">{t("title")}</CardTitle>
              <CardDescription className="text-lg">
                Check your eligibility and claim your royal tokens
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Eligibility Status */}
              <div className={`p-4 rounded-xl ${isEligible ? 'bg-green-500/10 border border-green-500/30' : 'bg-muted'}`}>
                <div className="flex items-center gap-3">
                  {isEligible ? (
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                  ) : (
                    <Clock className="w-6 h-6 text-muted-foreground" />
                  )}
                  <span className={`font-medium ${isEligible ? 'text-green-500' : 'text-muted-foreground'}`}>
                    {isEligible ? t("eligible") : t("notEligible")}
                  </span>
                </div>
              </div>

              {/* Amount */}
              <div className="bg-card rounded-xl p-6 text-center">
                <p className="text-muted-foreground mb-2">{t("amount")}</p>
                <p className="text-4xl font-bold text-golden">
                  {availableAmount.toLocaleString()} $FIAPO
                </p>
              </div>

              {/* Points Breakdown - Only show if connected and has points */}
              {lunesConnected && totalPoints > 0 && (
                <div className="space-y-4">
                  <p className="text-sm font-medium text-muted-foreground">Your Points Breakdown</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <PiggyBank className="w-4 h-4 text-blue-400" />
                        <span className="text-xs text-muted-foreground">Holding</span>
                      </div>
                      <p className="font-bold">{Number(userData.balancePoints).toLocaleString()}</p>
                      <div className="h-1 bg-muted rounded-full mt-1 overflow-hidden">
                        <div className="h-full bg-blue-400 rounded-full" style={{ width: `${balancePercent}%` }} />
                      </div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="w-4 h-4 text-green-400" />
                        <span className="text-xs text-muted-foreground">Staking</span>
                      </div>
                      <p className="font-bold">{Number(userData.stakingPoints).toLocaleString()}</p>
                      <div className="h-1 bg-muted rounded-full mt-1 overflow-hidden">
                        <div className="h-full bg-green-400 rounded-full" style={{ width: `${stakingPercent}%` }} />
                      </div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Flame className="w-4 h-4 text-orange-400" />
                        <span className="text-xs text-muted-foreground">Burning</span>
                      </div>
                      <p className="font-bold">{Number(userData.burningPoints).toLocaleString()}</p>
                      <div className="h-1 bg-muted rounded-full mt-1 overflow-hidden">
                        <div className="h-full bg-orange-400 rounded-full" style={{ width: `${burningPercent}%` }} />
                      </div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <UserPlus className="w-4 h-4 text-purple-400" />
                        <span className="text-xs text-muted-foreground">Affiliates</span>
                      </div>
                      <p className="font-bold">{Number(userData.affiliatePoints).toLocaleString()}</p>
                      <div className="h-1 bg-muted rounded-full mt-1 overflow-hidden">
                        <div className="h-full bg-purple-400 rounded-full" style={{ width: `${affiliatePercent}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="bg-golden/10 border border-golden/30 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">Total Points</p>
                    <p className="text-2xl font-bold text-golden">{totalPoints.toLocaleString()}</p>
                  </div>
                </div>
              )}

              {/* Distribution Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Distribution Progress</span>
                  <span className="text-golden">
                    {globalStats.totalAmount > BigInt(0)
                      ? `${((Number(globalStats.totalClaimed) / Number(globalStats.totalAmount)) * 100).toFixed(1)}%`
                      : '0%'}
                  </span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-golden rounded-full transition-all duration-500"
                    style={{
                      width: globalStats.totalAmount > BigInt(0)
                        ? `${(Number(globalStats.totalClaimed) / Number(globalStats.totalAmount)) * 100}%`
                        : '0%'
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  {globalStats.claimedWallets.toLocaleString()} / {globalStats.eligibleWallets.toLocaleString()} wallets claimed
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              {!lunesConnected ? (
                <Button size="xl" className="w-full" variant="outline">
                  <Wallet className="w-5 h-5 mr-2" />
                  Connect Wallet to Check
                </Button>
              ) : hasClaimed ? (
                <div className="w-full text-center py-4">
                  <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
                  <p className="text-green-500 font-bold">Airdrop Already Claimed!</p>
                </div>
              ) : (
                <Button
                  size="xl"
                  className="w-full glow-gold"
                  disabled={!isEligible || loading}
                  onClick={handleClaim}
                >
                  {loading ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processing...</>
                  ) : (
                    <><Gift className="w-5 h-5 mr-2" /> {t("claim")}</>
                  )}
                </Button>
              )}
              {!lunesConnected && (
                <p className="text-sm text-muted-foreground text-center">
                  Connect your wallet to check eligibility
                </p>
              )}
            </CardFooter>
          </Card>
        </motion.div>

        {/* Timeline Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-16 max-w-4xl mx-auto"
        >
          <AirdropTimeline />
        </motion.div>

        {/* Calculator Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-16 max-w-4xl mx-auto"
        >
          <AirdropCalculator config={{
            pointsPerFiapo: config.pointsPerFiapo || 1,
            pointsPerStake: config.pointsPerStake || 2,
            pointsPerBurn: config.pointsPerBurn || 5,
            affiliateMultiplier: config.affiliateMultiplier || 10,
            secondLevelAffiliateMultiplier: 5, // From contract: second level multiplier
            distributionRates: config.distributionRates || {
              holders: 30,
              stakers: 35,
              burners: 20,
              affiliates: 15
            }
          }} />
        </motion.div>

        {/* Distribution Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-16 max-w-4xl mx-auto"
        >
          <Card className="bg-gradient-to-br from-golden/5 to-golden/10 border-golden/30">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl text-golden">💰 21 Billion $FIAPO Distribution</CardTitle>
              <CardDescription className="text-base">
                7% of total supply (300B) allocated across four reward categories
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-background/50 rounded-lg p-4 border border-golden/20">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <PiggyBank className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Holders Pool</p>
                      <p className="text-xl font-bold text-foreground">5.25B $FIAPO</p>
                    </div>
                    <span className="text-2xl font-bold text-golden">25%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-blue-400 rounded-full" style={{ width: '25%' }} />
                  </div>
                </div>

                <div className="bg-background/50 rounded-lg p-4 border border-golden/20">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-green-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Stakers Pool</p>
                      <p className="text-xl font-bold text-foreground">6.3B $FIAPO</p>
                    </div>
                    <span className="text-2xl font-bold text-golden">30%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-green-400 rounded-full" style={{ width: '30%' }} />
                  </div>
                </div>

                <div className="bg-background/50 rounded-lg p-4 border border-golden/20">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                      <Flame className="w-5 h-5 text-orange-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Burners Pool</p>
                      <p className="text-xl font-bold text-foreground">4.2B $FIAPO</p>
                    </div>
                    <span className="text-2xl font-bold text-golden">20%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-orange-400 rounded-full" style={{ width: '20%' }} />
                  </div>
                </div>

                <div className="bg-background/50 rounded-lg p-4 border border-golden/20">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <UserPlus className="w-5 h-5 text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Affiliates Pool</p>
                      <p className="text-xl font-bold text-foreground">2.1B $FIAPO</p>
                    </div>
                    <span className="text-2xl font-bold text-golden">10%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-purple-400 rounded-full" style={{ width: '10%' }} />
                  </div>
                </div>

                <div className="bg-background/50 rounded-lg p-4 border border-golden/20 md:col-span-2">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-golden/20 flex items-center justify-center">
                      <Gift className="w-5 h-5 text-golden" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">NFT Holders Pool 🆕</p>
                      <p className="text-xl font-bold text-foreground">3.15B $FIAPO</p>
                    </div>
                    <span className="text-2xl font-bold text-golden">15%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-golden rounded-full" style={{ width: '15%' }} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Points awarded for NFT tier (Free 1x → $500 60x) + 500pts per evolution
                  </p>
                </div>
              </div>

              <div className="mt-6 bg-golden/10 border border-golden/30 rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground mb-1">Your reward is proportional to your points in each category</p>
                <p className="text-lg font-bold text-golden">
                  More Points = Bigger Share of the Pool 🎯
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* How to Earn Points */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-16 max-w-4xl mx-auto"
        >
          <h2 className="text-2xl font-bold text-golden text-center mb-8">How to Earn Points</h2>
          <div className="grid md:grid-cols-4 gap-4">
            {[
              {
                icon: PiggyBank,
                title: "Hold $FIAPO",
                desc: `${config.pointsPerFiapo}x points per FIAPO`,
                rate: `${config.distributionRates.holders}%`,
                color: "text-blue-400"
              },
              {
                icon: TrendingUp,
                title: "Stake Tokens",
                desc: `${config.pointsPerStake}x points per staked`,
                rate: `${config.distributionRates.stakers}%`,
                color: "text-green-400"
              },
              {
                icon: Flame,
                title: "Burn Tokens",
                desc: `${config.pointsPerBurn}x points per burned`,
                rate: `${config.distributionRates.burners}%`,
                color: "text-orange-400"
              },
              {
                icon: UserPlus,
                title: "Refer Friends",
                desc: `${config.affiliateMultiplier}x per referral`,
                rate: `${config.distributionRates.affiliates}%`,
                color: "text-purple-400"
              },
            ].map((item, i) => (
              <Card key={i} className="bg-card">
                <CardContent className="pt-6 text-center">
                  <div className={`w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3 ${item.color}`}>
                    <item.icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-foreground mb-1">{item.title}</h3>
                  <p className="text-xs text-muted-foreground mb-2">{item.desc}</p>
                  <span className="text-xs px-2 py-1 bg-golden/20 text-golden rounded-full">
                    {item.rate} pool
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Minimum Requirements */}
          <div className="mt-8 bg-card rounded-xl p-6 border border-border">
            <h3 className="font-bold text-foreground mb-4 text-center">Minimum Requirements</h3>
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-lg">
                <Coins className="w-4 h-4 text-golden" />
                <span>Min Balance: {(Number(config.minBalance) / 10 ** 8).toLocaleString()} FIAPO</span>
              </div>
              <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-lg">
                <Users className="w-4 h-4 text-golden" />
                <span>Max Participants: {config.maxParticipants?.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
