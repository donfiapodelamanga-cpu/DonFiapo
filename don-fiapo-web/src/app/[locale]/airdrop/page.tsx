"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Gift, CheckCircle2, Clock, Users, Coins, Loader2, Wallet, TrendingUp, Flame, UserPlus, PiggyBank, Target, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWalletStore } from "@/lib/stores";
import { useAirdrop, useAirdropStats, useAirdropConfig } from "@/hooks/useContract";
import { useToast } from "@/components/ui/toast";
import { API_CONFIG } from "@/lib/api/config";
import { AirdropTimeline } from "@/components/sections/AirdropTimeline";
import { AirdropCalculator } from "@/components/sections/AirdropCalculator";
import { RoyalMissions } from "@/components/sections/airdrop/RoyalMissions";
import { Leaderboard } from "@/components/sections/airdrop/Leaderboard";
import { EarlyBirdBanner } from "@/components/sections/airdrop/EarlyBirdBanner";

export default function AirdropPage() {
  const t = useTranslations("airdrop");
  const { addToast } = useToast();
  const { lunesConnected, lunesAddress } = useWalletStore();
  const { status, userData, loading, error, fetchStatus, claim } = useAirdrop();
  const { stats: globalStats, fetchStats } = useAirdropStats();
  const { config, fetchConfig } = useAirdropConfig();

  const [activeTab, setActiveTab] = useState("overview");
  const searchParams = useSearchParams();

  useEffect(() => {
    fetchStats();
    fetchConfig();
    if (lunesConnected && lunesAddress) {
      fetchStatus();
    }
  }, [lunesConnected, lunesAddress, fetchStatus, fetchStats, fetchConfig]);

  // Handle Twitter OAuth callback query params
  useEffect(() => {
    const xConnected = searchParams.get("x_connected");
    const xError = searchParams.get("x_error");
    const tab = searchParams.get("tab");

    if (tab === "missions") setActiveTab("missions");

    if (xConnected === "1") {
      addToast("success", "X Connected!", "Your X account is now linked. You can verify X quests.");
    } else if (xError) {
      const errorMessages: Record<string, string> = {
        denied: "You cancelled the X authorization.",
        session_expired: "OAuth session expired. Please try again.",
        state_mismatch: "Security check failed. Please try again.",
        account_already_linked: "This X account is already linked to another wallet.",
        not_configured: "X integration is not configured yet. Coming soon!",
        internal: "An internal error occurred. Please try again later.",
      };
      addToast("error", "X Connection Failed", errorMessages[xError] ?? "Unknown error.");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const springTransition = { type: "spring" as const, stiffness: 380, damping: 22 };
  const hoverCard = { scale: 1.03, y: -3 };
  const tapCard = { scale: 0.97 };
  const staggerContainer = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };
  const staggerItem = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: springTransition },
  };

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
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-6xl font-bold font-display text-golden mb-4">
            🎁 {t("title")}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-6">
            {t("subtitle")}
          </p>

          <motion.div
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 260, damping: 20 }}
            className="mb-8"
          >
            <motion.div
              className="relative inline-block cursor-default"
              whileHover={{ scale: 1.02 }}
              transition={springTransition}
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-golden/40 via-yellow-500/30 to-golden/40 blur-lg rounded-2xl animate-pulse" />
              <div className="relative bg-card border-2 border-golden/60 rounded-2xl px-8 py-5 shadow-2xl shadow-golden/20">
                <p className="text-sm uppercase tracking-widest text-golden/70 font-bold mb-1">The King Decrees</p>
                <p className="text-2xl md:text-4xl font-black text-foreground leading-tight">
                  Millions of Dollars in <span className="text-golden">$FIAPO</span>
                </p>
                <p className="text-2xl md:text-4xl font-black text-golden leading-tight">
                  Will Rain Upon the Kingdom
                </p>
                <p className="text-sm text-muted-foreground mt-2 max-w-lg mx-auto">
                  Over <strong className="text-foreground">30.5 billion $FIAPO</strong> tokens will be distributed for free to loyal holders, stakers, and active community members. No purchase required.
                </p>
              </div>
            </motion.div>
          </motion.div>

          <div className="inline-flex items-center gap-3 bg-golden/10 border-2 border-golden/50 rounded-full px-6 py-3">
            <Gift className="w-6 h-6 text-golden" />
            <div className="text-left">
              <p className="text-sm text-muted-foreground">Total Airdrop Pool</p>
              <p className="text-2xl font-bold text-golden">30,500,000,000 $FIAPO</p>
            </div>
            <div className="h-8 w-px bg-golden/30" />
            <div className="text-left">
              <p className="text-sm text-muted-foreground">Allocation</p>
              <p className="text-2xl font-bold text-golden">5.08% of Supply</p>
            </div>
          </div>
        </motion.div>

        {/* Early Bird Banner — always visible */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mb-8"
        >
          <EarlyBirdBanner />
        </motion.div>

        {/* Tabs Navigation */}
        <Tabs defaultValue="overview" className="w-full" onValueChange={setActiveTab}>
          <div className="flex justify-center mb-8">
            <TabsList className="bg-card border border-border p-1 h-auto rounded-full">
              <TabsTrigger value="overview" className="rounded-full px-6 py-3 data-[state=active]:bg-golden/20 data-[state=active]:text-golden text-base">
                <Gift className="w-4 h-4 mr-2" /> Overview
              </TabsTrigger>
              <TabsTrigger value="missions" className="rounded-full px-6 py-3 data-[state=active]:bg-golden/20 data-[state=active]:text-golden text-base">
                <Target className="w-4 h-4 mr-2" /> Royal Missions
              </TabsTrigger>
              <TabsTrigger value="leaderboard" className="rounded-full px-6 py-3 data-[state=active]:bg-golden/20 data-[state=active]:text-golden text-base">
                <Trophy className="w-4 h-4 mr-2" /> Leaderboard
              </TabsTrigger>
            </TabsList>
          </div>

          {/* TAB: OVERVIEW (Current content) */}
          <TabsContent value="overview" className="mt-0 outline-none">
            {/* Stats */}
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12"
            >
              {[
                { icon: Coins, label: "Total Airdrop", value: `${(Number(globalStats.totalAmount) / 10 ** API_CONFIG.token.decimals / 1_000_000_000).toFixed(1)}B $FIAPO` },
                { icon: Users, label: "Eligible Wallets", value: globalStats.eligibleWallets.toLocaleString() },
                { icon: Gift, label: "Claimed", value: `${(Number(globalStats.totalClaimed) / 10 ** API_CONFIG.token.decimals / 1_000_000_000).toFixed(1)}B` },
                { icon: Clock, label: "Time Remaining", value: `${Math.max(0, Math.ceil((globalStats.endTime - Date.now()) / (24 * 60 * 60 * 1000)))} Days` },
              ].map((stat, i) => (
                <motion.div key={i} variants={staggerItem}>
                  <motion.div
                    whileHover={hoverCard}
                    whileTap={tapCard}
                    transition={springTransition}
                    className="cursor-default"
                  >
                    <Card className="bg-card border-white/5 hover:border-golden/30 transition-colors">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3 mb-2">
                          <stat.icon className="w-5 h-5 text-golden" />
                          <span className="text-sm text-muted-foreground">{stat.label}</span>
                        </div>
                        <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                </motion.div>
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
                  <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3, ...springTransition }}
                  className={`p-4 rounded-xl ${isEligible ? 'bg-green-500/10 border border-green-500/30' : 'bg-muted'}`}
                >
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
                  </motion.div>
                  {/* Amount */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, ...springTransition }}
                    whileHover={hoverCard}
                    whileTap={tapCard}
                    className="bg-card rounded-xl p-6 text-center border border-golden/10 hover:border-golden/30 transition-colors"
                  >
                    <p className="text-muted-foreground mb-2">{t("amount")}</p>
                    <motion.p
                      className="text-4xl font-bold text-golden"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.5, type: "spring", stiffness: 300, damping: 18 }}
                    >
                      {availableAmount.toLocaleString()} $FIAPO
                    </motion.p>
                  </motion.div>

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
                      <span className="text-muted-foreground font-medium">Distribution Progress</span>
                      <span className="text-golden">
                        {globalStats.totalAmount > BigInt(0)
                          ? `${((Number(globalStats.totalClaimed) / Number(globalStats.totalAmount)) * 100).toFixed(1)}%`
                          : '0%'}
                      </span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-golden rounded-full relative overflow-hidden"
                        initial={{ width: 0 }}
                        animate={{
                          width: globalStats.totalAmount > BigInt(0)
                            ? `${(Number(globalStats.totalClaimed) / Number(globalStats.totalAmount)) * 100}%`
                            : '0%'
                        }}
                        transition={{ duration: 1.5, ease: "easeOut", delay: 0.6 }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-pulse" />
                      </motion.div>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      {globalStats.claimedWallets.toLocaleString()} / {globalStats.eligibleWallets.toLocaleString()} wallets claimed
                    </p>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                  {!lunesConnected ? (
                    <motion.div className="w-full" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} transition={springTransition}>
                      <Button size="xl" className="w-full" variant="outline">
                        <Wallet className="w-5 h-5 mr-2" />
                        Connect Wallet to Check
                      </Button>
                    </motion.div>
                  ) : hasClaimed ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 18 }}
                      className="w-full text-center py-4"
                    >
                      <motion.div
                        initial={{ rotate: -10, scale: 0 }}
                        animate={{ rotate: 0, scale: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.1 }}
                      >
                        <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
                      </motion.div>
                      <p className="text-green-500 font-bold">Airdrop Already Claimed!</p>
                    </motion.div>
                  ) : (
                    <motion.div className="w-full" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} transition={springTransition}>
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
                    </motion.div>
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
                secondLevelAffiliateMultiplier: 5,
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
                  <CardTitle className="text-3xl text-golden">💰 31.5 Billion $FIAPO Distribution</CardTitle>
                  <CardDescription className="text-base">
                    5.25% of total supply (600B) allocated across four reward categories
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, margin: "-80px" }}
                    className="grid md:grid-cols-2 gap-4"
                  >
                    {[
                      { icon: PiggyBank, label: "Holders Pool", amount: "5.25B $FIAPO", pct: 25, color: "blue", bar: "bg-blue-400" },
                      { icon: TrendingUp, label: "Stakers Pool", amount: "6.3B $FIAPO", pct: 30, color: "green", bar: "bg-green-400" },
                      { icon: Flame, label: "Burners Pool", amount: "4.2B $FIAPO", pct: 20, color: "orange", bar: "bg-orange-400" },
                      { icon: UserPlus, label: "Affiliates Pool", amount: "2.1B $FIAPO", pct: 10, color: "purple", bar: "bg-purple-400" },
                    ].map((pool, i) => (
                      <motion.div
                        key={i}
                        variants={staggerItem}
                        whileHover={{ ...hoverCard, borderColor: "rgba(201,166,91,0.4)" }}
                        whileTap={tapCard}
                        transition={springTransition}
                        className="bg-background/50 rounded-lg p-4 border border-golden/20 cursor-default"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`w-10 h-10 rounded-full bg-${pool.color}-500/20 flex items-center justify-center`}>
                            <pool.icon className={`w-5 h-5 text-${pool.color}-400`} />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-muted-foreground">{pool.label}</p>
                            <p className="text-xl font-bold text-foreground">{pool.amount}</p>
                          </div>
                          <span className="text-2xl font-bold text-golden">{pool.pct}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full ${pool.bar} rounded-full`}
                            initial={{ width: 0 }}
                            whileInView={{ width: `${pool.pct}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 1, ease: "easeOut", delay: i * 0.1 }}
                          />
                        </div>
                      </motion.div>
                    ))}

                    <motion.div
                      variants={staggerItem}
                      whileHover={hoverCard}
                      whileTap={tapCard}
                      transition={springTransition}
                      className="bg-background/50 rounded-lg p-4 border border-golden/20 md:col-span-2 cursor-default"
                    >
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
                        <motion.div
                          className="h-full bg-golden rounded-full"
                          initial={{ width: 0 }}
                          whileInView={{ width: "15%" }}
                          viewport={{ once: true }}
                          transition={{ duration: 1, ease: "easeOut", delay: 0.4 }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Points awarded for NFT tier (Free 1x → $500 60x) + 500pts per evolution
                      </p>
                    </motion.div>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* TAB: MISSIONS */}
          <TabsContent value="missions" className="mt-0 outline-none">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <RoyalMissions />
            </motion.div>
          </TabsContent>

          {/* TAB: LEADERBOARD */}
          <TabsContent value="leaderboard" className="mt-0 outline-none">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <Leaderboard />
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

