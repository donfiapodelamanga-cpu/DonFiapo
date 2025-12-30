"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { Flame, Moon, Crown, ArrowLeft, Info, TrendingUp, Lock, Gift, Loader2, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Link } from "@/lib/navigation";
import { useWalletStore } from "@/lib/stores";
import { useStaking, useBalance, useStakingPoolConfig } from "@/hooks/useContract";
import { useStakingFee } from "@/hooks/use-staking-fee";
import { StakingPaymentModal } from "@/components/staking/StakingPaymentModal";
import { useToast } from "@/components/ui/toast";
import { API_CONFIG } from "@/lib/api/config";

// UI styling config for pools
const poolsUI: Record<string, {
  icon: typeof Crown;
  color: string;
  bgColor: string;
  key: string;
}> = {
  "don-burn": {
    icon: Flame,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    key: "donBurn",
  },
  "don-lunes": {
    icon: Moon,
    color: "text-blue-400",
    bgColor: "bg-blue-400/10",
    key: "donLunes",
  },
  "don-fiapo": {
    icon: Crown,
    color: "text-golden",
    bgColor: "bg-golden/10",
    key: "donFiapo",
  },
};

export default function StakingPoolPage() {
  const t = useTranslations("staking");
  const params = useParams();
  const pool = params.pool as string;
  const poolUI = poolsUI[pool];
  const { addToast } = useToast();

  const [amount, setAmount] = useState("");
  const [activeTab, setActiveTab] = useState<"stake" | "unstake">("stake");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingPaymentId, setPendingPaymentId] = useState<string | null>(null);

  const { lunesConnected, lunesAddress } = useWalletStore();
  const { balance, fetchBalance, formatBalance } = useBalance();
  const { config: poolConfig, fetchConfig } = useStakingPoolConfig(pool);
  const { calculateEntryFee } = useStakingFee();
  const {
    position,
    loading: stakingLoading,
    error: stakingError,
    fetchPosition,
    stake,
    unstake,
    claimRewards
  } = useStaking(pool);

  // Fetch data on mount and when wallet is connected
  useEffect(() => {
    fetchConfig();
    if (lunesConnected && lunesAddress) {
      fetchBalance();
      fetchPosition();
    }
  }, [lunesConnected, lunesAddress, fetchBalance, fetchPosition, fetchConfig]);

  // Calculate entry fee based on amount
  const entryFee = useMemo(() => {
    const numAmount = parseFloat(amount || "0");
    if (numAmount <= 0) return null;
    return calculateEntryFee(numAmount);
  }, [amount, calculateEntryFee]);

  // Handle staking - opens payment modal first
  const handleStake = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    // Open payment modal to collect entry fee
    setShowPaymentModal(true);
  };

  // Handle payment confirmed - execute the actual stake
  const handlePaymentConfirmed = async (paymentId: string) => {
    setPendingPaymentId(paymentId);
    setShowPaymentModal(false);

    try {
      const amountBigInt = BigInt(Math.floor(parseFloat(amount) * 10 ** API_CONFIG.token.decimals));
      const txHash = await stake(amountBigInt);
      addToast("success", "Staking Successful!", `Transaction: ${txHash.slice(0, 10)}...`);
      setAmount("");
      setPendingPaymentId(null);
    } catch (err) {
      addToast("error", "Staking Failed", err instanceof Error ? err.message : "Unknown error");
      setPendingPaymentId(null);
    }
  };

  // Handle unstaking
  const handleUnstake = async () => {
    try {
      const txHash = await unstake();
      addToast("success", "Unstaking Successful!", `Transaction: ${txHash.slice(0, 10)}...`);
    } catch (err) {
      addToast("error", "Unstaking Failed", err instanceof Error ? err.message : "Unknown error");
    }
  };

  // Handle claim rewards
  const handleClaimRewards = async () => {
    try {
      const txHash = await claimRewards();
      addToast("success", "Rewards Claimed!", `Transaction: ${txHash.slice(0, 10)}...`);
    } catch (err) {
      addToast("error", "Claim Failed", err instanceof Error ? err.message : "Unknown error");
    }
  };

  const lunesBalance = formatBalance();

  if (!poolUI) {
    return (
      <div className="min-h-screen pt-24 pb-16 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Pool not found</p>
            <Button asChild className="mt-4">
              <Link href="/staking">Back to Staking</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const Icon = poolUI.icon;

  // Format config values for display
  const apyDisplay = `${poolConfig.apy}%`;
  const minStakeDisplay = (Number(poolConfig.minStake) / 10 ** API_CONFIG.token.decimals).toLocaleString();
  const lockPeriodDisplay = `${poolConfig.lockPeriod} days`;

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4">
        {/* Back button */}
        <Link
          href="/staking"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-golden transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Pools
        </Link>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Pool Info */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1"
          >
            <Card className="bg-card sticky top-24">
              <CardHeader>
                <div className={`w-20 h-20 rounded-2xl ${poolUI.bgColor} flex items-center justify-center mb-4`}>
                  <Icon className={`w-10 h-10 ${poolUI.color}`} />
                </div>
                <CardTitle className="text-2xl">{t(`${poolUI.key}.title`)}</CardTitle>
                <CardDescription>{t(`${poolUI.key}.description`)}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-border">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    APY
                  </span>
                  <span className="text-2xl font-bold text-golden">{apyDisplay}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-border">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Lock Period
                  </span>
                  <span className="font-medium">{lockPeriodDisplay}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-border">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Min Stake
                  </span>
                  <span className="font-medium">{minStakeDisplay} FIAPO</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Gift className="w-4 h-4" />
                    Rewards
                  </span>
                  <span className="font-medium">{t(`${poolUI.key}.frequency`)}</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Staking Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2"
          >
            <Card className="bg-background">
              <CardHeader>
                <div className="flex gap-2">
                  <Button
                    variant={activeTab === "stake" ? "default" : "outline"}
                    onClick={() => setActiveTab("stake")}
                    className="flex-1"
                  >
                    Stake
                  </Button>
                  <Button
                    variant={activeTab === "unstake" ? "default" : "outline"}
                    onClick={() => setActiveTab("unstake")}
                    className="flex-1"
                  >
                    Unstake
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {!lunesConnected ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground mb-4">
                      Connect your wallet to stake
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Balance */}
                    <div className="bg-card rounded-xl p-4">
                      <div className="flex justify-between mb-2">
                        <span className="text-muted-foreground">Available Balance</span>
                        <span className="font-medium">{lunesBalance} FIAPO</span>
                      </div>
                    </div>

                    {/* Amount Input */}
                    <div>
                      <label className="text-sm text-muted-foreground mb-2 block">
                        Amount to {activeTab}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full h-14 px-4 pr-24 bg-card border border-border rounded-xl text-xl font-bold focus:outline-none focus:border-golden"
                        />
                        <button
                          onClick={() => setAmount(lunesBalance)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 px-3 py-1 bg-golden/20 text-golden text-sm font-medium rounded-lg hover:bg-golden/30 transition-colors"
                        >
                          MAX
                        </button>
                      </div>
                    </div>

                    {/* Summary */}
                    {amount && parseFloat(amount) > 0 && (
                      <div className="bg-golden/10 border border-golden/30 rounded-xl p-4 space-y-2">
                        {/* Entry Fee */}
                        {entryFee && activeTab === "stake" && (
                          <div className="flex justify-between text-sm border-b border-golden/20 pb-2 mb-2">
                            <span className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3" />
                              Entry Fee ({entryFee.feePercent}%)
                            </span>
                            <span className="font-bold text-golden">
                              {entryFee.feeAmountLusdt.toLocaleString()} LUSDT
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm">
                          <span>Estimated Daily Reward</span>
                          <span className="text-golden">
                            {((parseFloat(amount) * (poolConfig.apy / 100)) / 365).toFixed(2)} FIAPO
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Estimated Monthly Reward</span>
                          <span className="text-golden">
                            {((parseFloat(amount) * (poolConfig.apy / 100)) / 12).toFixed(2)} FIAPO
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
              <CardFooter>
                <Button
                  size="xl"
                  className="w-full"
                  disabled={!lunesConnected || stakingLoading || (activeTab === "stake" && (!amount || parseFloat(amount) <= 0))}
                  onClick={activeTab === "stake" ? handleStake : handleUnstake}
                >
                  {stakingLoading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                  ) : (
                    activeTab === "stake" ? "Stake FIAPO" : "Unstake FIAPO"
                  )}
                </Button>
              </CardFooter>
            </Card>

            {/* Your Position */}
            <Card className="mt-8 bg-background">
              <CardHeader>
                <CardTitle>Your Position</CardTitle>
              </CardHeader>
              <CardContent>
                {!lunesConnected ? (
                  <p className="text-muted-foreground text-center py-8">
                    Connect wallet to view your position
                  </p>
                ) : (
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="bg-card rounded-xl p-4 text-center">
                      <p className="text-sm text-muted-foreground">Staked</p>
                      <p className="text-2xl font-bold">
                        {position ? (Number(position.amount) / 10 ** API_CONFIG.token.decimals).toLocaleString() : '0'}
                      </p>
                      <p className="text-xs text-muted-foreground">FIAPO</p>
                    </div>
                    <div className="bg-card rounded-xl p-4 text-center">
                      <p className="text-sm text-muted-foreground">Pending Rewards</p>
                      <p className="text-2xl font-bold text-golden">
                        {position ? (Number(position.pendingRewards) / 10 ** API_CONFIG.token.decimals).toLocaleString() : '0'}
                      </p>
                      <p className="text-xs text-muted-foreground">FIAPO</p>
                    </div>
                    <div className="bg-card rounded-xl p-4 text-center">
                      <p className="text-sm text-muted-foreground">Current APY</p>
                      <p className="text-lg font-bold text-golden">
                        {position ? `${(position.currentApy / 100).toFixed(2)}%` : '--'}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
              {lunesConnected && position && Number(position.pendingRewards) > 0 && (
                <CardFooter>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleClaimRewards}
                    disabled={stakingLoading}
                  >
                    {stakingLoading ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                    ) : (
                      'Claim Rewards'
                    )}
                  </Button>
                </CardFooter>
              )}
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Payment Modal */}
      {poolUI && (
        <StakingPaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onPaymentConfirmed={handlePaymentConfirmed}
          fiapoAmount={parseFloat(amount || "0")}
          stakingType={pool}
          stakingTypeName={t(`${poolUI.key}.title`)}
        />
      )}
    </div>
  );
}
