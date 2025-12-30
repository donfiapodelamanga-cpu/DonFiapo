"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { useState } from "react";
import { Users, Copy, Check, Gift, TrendingUp, Coins, Share2, Loader2, Crown, Medal, Zap, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useWalletStore } from "@/lib/stores";
import { formatAddress } from "@/lib/utils/format";
import { useToast } from "@/components/ui/toast";
import {
  useAffiliateInfo,
  useAffiliateStats,
  useReferrals,
  useAffiliateLeaderboard,
  useValidateReferralCode,
  formatAffiliateBalance,
  formatBoostPercentage,
  getTierColor,
  getTierCommission,
} from "@/hooks/use-affiliate";

export default function AffiliatePage() {
  const t = useTranslations("affiliate");
  const { addToast } = useToast();
  const [copied, setCopied] = useState(false);
  const [referralInput, setReferralInput] = useState("");
  const [registering, setRegistering] = useState(false);
  const { lunesConnected, lunesAddress } = useWalletStore();

  // API Hooks
  const { info, loading: infoLoading, refetch: refetchInfo } = useAffiliateInfo(lunesAddress, { autoRefresh: true });
  const { stats } = useAffiliateStats({ autoRefresh: true });
  const { referrals, loading: referralsLoading } = useReferrals(lunesAddress);
  const { leaderboard, loading: leaderboardLoading } = useAffiliateLeaderboard(5);
  const { validate, validating, result: validationResult, reset: resetValidation } = useValidateReferralCode();

  // Generate referral link
  const referralLink = info?.referralCode
    ? `https://donfiapo.com/ref/${info.referralCode}`
    : lunesAddress
      ? `https://donfiapo.com/ref/REF-${lunesAddress.slice(0, 8).toUpperCase()}`
      : '';

  const handleCopy = async () => {
    if (referralLink) {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      addToast("success", "Copied!", "Referral link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleValidateCode = async () => {
    if (!referralInput.trim()) return;
    await validate(referralInput);
  };

  const handleRegisterReferral = async () => {
    if (!referralInput || !validationResult?.valid) return;

    setRegistering(true);
    try {
      // Register referral via direct contract call
      console.log("[Affiliate] Registering with referral:", referralInput);
      const contract = await import('@/lib/api/contract');
      await contract.registerWithReferral(lunesAddress!, referralInput);

      addToast("success", "Registered!", "You're now part of the affiliate program");
      setReferralInput("");
      resetValidation();
      refetchInfo();
    } catch (err) {
      addToast("error", "Registration Failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setRegistering(false);
    }
  };

  const handleClaimRewards = async () => {
    if (!info?.pendingRewards || info.pendingRewards <= BigInt(0)) return;

    try {
      // Claim rewards via direct contract call
      console.log("[Affiliate] Claiming rewards:", info.pendingRewards.toString());
      const contract = await import('@/lib/api/contract');
      await contract.claimAffiliateRewards(lunesAddress!);

      addToast("success", "Rewards Claimed!", `Successfully claimed ${formatAffiliateBalance(info.pendingRewards)} FIAPO`);
      refetchInfo();
    } catch (err) {
      addToast("error", "Claim Failed", err instanceof Error ? err.message : "Unknown error");
    }
  };

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
            👥 {t("title")}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t("subtitle")}
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12"
        >
          <Card className="bg-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-2">
                <Users className="w-5 h-5 text-golden" />
                <span className="text-sm text-muted-foreground">Total Referrals</span>
              </div>
              <p className="text-2xl font-bold">{info?.totalReferrals || 0}</p>
              <p className="text-xs text-muted-foreground">
                {info?.directReferrals || 0} direct • {info?.secondLevelReferrals || 0} L2
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-5 h-5 text-golden" />
                <span className="text-sm text-muted-foreground">Your Tier</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-sm font-bold ${getTierColor(info?.tier || 'Bronze')}`}>
                  {info?.tier || 'Bronze'}
                </span>
                <span className="text-sm text-muted-foreground">
                  {getTierCommission(info?.tier || 'Bronze')}%
                </span>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-2">
                <Coins className="w-5 h-5 text-golden" />
                <span className="text-sm text-muted-foreground">Total Earned</span>
              </div>
              <p className="text-2xl font-bold">{formatAffiliateBalance(info?.totalEarnings || BigInt(0))}</p>
              <p className="text-xs text-golden">
                {info?.pendingRewards && info.pendingRewards > BigInt(0)
                  ? `+${formatAffiliateBalance(info.pendingRewards)} pending`
                  : 'FIAPO'}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-2">
                <Zap className="w-5 h-5 text-golden" />
                <span className="text-sm text-muted-foreground">APY Boost</span>
              </div>
              <p className="text-2xl font-bold text-green-500">
                +{formatBoostPercentage(info?.currentBoostBps || 0)}
              </p>
              <p className="text-xs text-muted-foreground">Max: {formatBoostPercentage(stats?.maxBoostBps || 500)}</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Claim Rewards Banner */}
        {info?.pendingRewards && info.pendingRewards > BigInt(0) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-8"
          >
            <Card className="bg-gradient-to-r from-golden/20 to-yellow-500/10 border-golden/30">
              <CardContent className="py-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Gift className="w-8 h-8 text-golden" />
                    <div>
                      <p className="font-bold">Pending Rewards Available!</p>
                      <p className="text-sm text-muted-foreground">
                        You have {formatAffiliateBalance(info.pendingRewards)} FIAPO ready to claim
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handleClaimRewards}
                    className="bg-golden text-black hover:bg-golden/90"
                    disabled={!lunesConnected}
                  >
                    Claim Rewards
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Referral Link Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-background border-2 border-golden h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Share2 className="w-6 h-6 text-golden" />
                  {t("referralLink")}
                </CardTitle>
                <CardDescription>
                  Share your unique link and earn 5% of all referral purchases
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!lunesConnected ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      Connect your wallet to get your referral link
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={referralLink}
                        readOnly
                        className="flex-1 px-4 py-3 bg-card border border-border rounded-xl text-sm truncate"
                      />
                      <Button onClick={handleCopy} variant="outline" className="shrink-0">
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>

                    {/* Share buttons */}
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        className="flex-1"
                        onClick={() => window.open(`https://twitter.com/intent/tweet?text=Join%20Don%20Fiapo%20and%20earn%20rewards!&url=${encodeURIComponent(referralLink)}`, '_blank')}
                      >
                        Share on X
                      </Button>
                      <Button
                        variant="secondary"
                        className="flex-1"
                        onClick={() => window.open(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=Join%20Don%20Fiapo!`, '_blank')}
                      >
                        Share on Telegram
                      </Button>
                    </div>

                    {/* Register with Referral Code */}
                    {!info?.referredBy && (
                      <div className="pt-4 border-t border-border">
                        <p className="text-sm font-medium mb-2">Have a referral code?</p>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={referralInput}
                            onChange={(e) => {
                              setReferralInput(e.target.value);
                              resetValidation();
                            }}
                            placeholder="Enter referral code"
                            className="flex-1 px-4 py-2 bg-card border border-border rounded-lg text-sm"
                          />
                          <Button
                            variant="outline"
                            onClick={handleValidateCode}
                            disabled={!referralInput.trim() || validating}
                          >
                            {validating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Validate"}
                          </Button>
                        </div>
                        {validationResult && (
                          <div className={`mt-2 p-2 rounded text-sm flex items-center gap-2 ${validationResult.valid
                            ? "bg-green-500/10 text-green-500"
                            : "bg-red-500/10 text-red-500"
                            }`}>
                            {validationResult.valid ? (
                              <>
                                <CheckCircle2 className="w-4 h-4" />
                                Valid code!
                                <Button
                                  size="sm"
                                  onClick={handleRegisterReferral}
                                  disabled={registering}
                                  className="ml-auto bg-green-600 hover:bg-green-700"
                                >
                                  {registering ? <Loader2 className="w-4 h-4 animate-spin" /> : "Register"}
                                </Button>
                              </>
                            ) : (
                              <>
                                <AlertCircle className="w-4 h-4" />
                                {validationResult.error}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* How it works */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-card h-full">
              <CardHeader>
                <CardTitle>{t("howItWorks")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {[
                    { step: "1", title: "Share Your Link", desc: "Copy and share your unique referral link" },
                    { step: "2", title: "Friends Join", desc: "When someone uses your link to buy NFTs or tokens" },
                    { step: "3", title: "Earn Rewards", desc: "Receive 5% of their purchase amount in FIAPO" },
                    { step: "4", title: "Claim Anytime", desc: "Withdraw your rewards to your wallet" },
                  ].map((item, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="w-10 h-10 rounded-full bg-golden text-background font-bold flex items-center justify-center shrink-0">
                        {item.step}
                      </div>
                      <div>
                        <h4 className="font-bold mb-1">{item.title}</h4>
                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Referral Tiers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-12"
        >
          <h2 className="text-2xl font-bold text-golden text-center mb-8">Referral Tiers</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { tier: "Bronze", referrals: "1-10", bonus: "5%", color: "bg-orange-600", boostBps: "+0.5%/ref" },
              { tier: "Silver", referrals: "11-50", bonus: "7%", color: "bg-gray-400", boostBps: "+0.5%/ref" },
              { tier: "Gold", referrals: "50+", bonus: "10%", color: "bg-golden", boostBps: "+0.5%/ref" },
            ].map((tier, i) => (
              <Card key={i} className={`bg-card text-center ${info?.tier === tier.tier ? 'ring-2 ring-golden' : ''}`}>
                <CardContent className="pt-6">
                  <div className={`w-16 h-16 rounded-full ${tier.color} flex items-center justify-center mx-auto mb-4`}>
                    {tier.tier === 'Gold' ? <Crown className="w-8 h-8 text-background" /> :
                      tier.tier === 'Silver' ? <Medal className="w-8 h-8 text-background" /> :
                        <Users className="w-8 h-8 text-background" />}
                  </div>
                  <h3 className="text-xl font-bold mb-2">{tier.tier}</h3>
                  <p className="text-muted-foreground mb-2">{tier.referrals} referrals</p>
                  <p className="text-3xl font-bold text-golden">{tier.bonus}</p>
                  <p className="text-sm text-muted-foreground">Commission</p>
                  <p className="text-xs text-green-500 mt-2">APY Boost: {tier.boostBps}</p>
                  {info?.tier === tier.tier && (
                    <p className="text-xs text-golden mt-2 font-bold">← Your Tier</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* Leaderboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-12"
        >
          <h2 className="text-2xl font-bold text-golden text-center mb-8">🏆 Top Affiliates</h2>
          <Card className="bg-card">
            <CardContent className="pt-6">
              {leaderboardLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-golden" />
                </div>
              ) : (
                <div className="space-y-3">
                  {leaderboard.map((entry, i) => (
                    <div
                      key={entry.rank}
                      className={`flex items-center gap-4 p-4 rounded-lg ${i < 3 ? 'bg-golden/10 border border-golden/30' : 'bg-background/50'
                        }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${i === 0 ? 'bg-yellow-500 text-black' :
                        i === 1 ? 'bg-gray-400 text-black' :
                          i === 2 ? 'bg-orange-600 text-white' :
                            'bg-muted text-muted-foreground'
                        }`}>
                        {entry.rank}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{formatAddress(entry.address, 6)}</p>
                        <p className="text-sm text-muted-foreground">{entry.referralCount} referrals</p>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${getTierColor(entry.tier)}`}>
                          {entry.tier}
                        </span>
                        <p className="text-sm text-golden mt-1">
                          {formatAffiliateBalance(entry.totalEarnings)} FIAPO
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Your Referrals */}
        {lunesConnected && referrals.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-12"
          >
            <h2 className="text-2xl font-bold text-golden text-center mb-8">👥 Your Referrals</h2>
            <Card className="bg-card">
              <CardContent className="pt-6">
                {referralsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-golden" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {referrals.map((ref, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-4 p-4 rounded-lg bg-background/50"
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${ref.level === 1 ? 'bg-blue-500 text-white' : 'bg-purple-500 text-white'
                          }`}>
                          L{ref.level}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{formatAddress(ref.address, 8)}</p>
                          <p className="text-xs text-muted-foreground">
                            Joined {new Date(ref.joinedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {formatAffiliateBalance(ref.totalStaked)} staked
                          </p>
                          <p className="text-xs text-green-500">
                            +{formatAffiliateBalance(ref.rewardsGenerated)} earned
                          </p>
                        </div>
                        <div className={`w-3 h-3 rounded-full ${ref.isActive ? 'bg-green-500' : 'bg-gray-500'}`}
                          title={ref.isActive ? 'Active' : 'Inactive'}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
