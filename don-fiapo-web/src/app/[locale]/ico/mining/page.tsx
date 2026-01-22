"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Crown, Pickaxe, Clock, Coins, TrendingUp, Gift, ArrowLeft, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Link } from "@/lib/navigation";
import { useWalletStore } from "@/lib/stores";
import { useNFTs, usePrestige, useICOStats } from "@/hooks/useContract";
import { useToast } from "@/components/ui/toast";
import { API_CONFIG } from "@/lib/api/config";
import { Sparkles } from "lucide-react";

// NFT tier info
const tierInfo: Record<number, { name: string; image: string }> = {
  0: { name: "Free", image: "🎁" },
  1: { name: "Bronze", image: "🥉" },
  2: { name: "Silver", image: "🥈" },
  3: { name: "Gold", image: "🥇" },
  4: { name: "Platinum", image: "💎" },
  5: { name: "Diamond", image: "💠" },
  6: { name: "Royal", image: "👑" },
};

// Real-time counter component for "falling coins" effect
const MiningCounter = ({
  baseValue,
  lastUpdate,
  dailyRate,
  bonusBps = 0,
  maxTotal,
  decimals = 4,
  className = ""
}: {
  baseValue: number;
  lastUpdate: number;
  dailyRate: number;
  bonusBps?: number;
  maxTotal: number;
  decimals?: number;
  className?: string;
}) => {
  const [displayValue, setDisplayValue] = useState(baseValue);
  const [initialRenderTime] = useState(() => Date.now());

  useEffect(() => {
    if (dailyRate <= 0) {
      setDisplayValue(baseValue);
      return;
    }

    const timer = setInterval(() => {
      const now = Date.now();
      // Use lastUpdate if available, otherwise use the time the component was mounted.
      const startTime = lastUpdate > 0 ? lastUpdate : initialRenderTime;
      const elapsedMs = Math.max(0, now - startTime);

      // Calculate accrual with bonus (bps is /10000)
      const multiplier = 1 + (bonusBps / 10000);
      const msRate = (dailyRate * multiplier) / (24 * 60 * 60 * 1000);
      const accrued = elapsedMs * msRate;

      const current = Math.min(maxTotal, baseValue + accrued);
      setDisplayValue(current);
    }, 100);

    return () => clearInterval(timer);
  }, [baseValue, lastUpdate, dailyRate, bonusBps, maxTotal, initialRenderTime]);

  return (
    <span className={`font-mono tabular-nums ${className}`}>
      {displayValue.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      })}
    </span>
  );
};

export default function MiningPage() {
  const t = useTranslations("ico");
  const { addToast } = useToast();
  const { lunesConnected, lunesAddress } = useWalletStore();
  const { nfts, loading, fetchNFTs, claimMinedTokens } = useNFTs();
  const { data: prestigeData, fetchPrestige, claimPrestige } = usePrestige();
  const { stats: icoStats, fetchStats: fetchICOStats } = useICOStats();

  useEffect(() => {
    fetchICOStats();
    if (lunesConnected) {
      fetchNFTs();
    }
  }, [lunesConnected, fetchNFTs, fetchICOStats]);

  // Fetch prestige when NFTs are loaded
  useEffect(() => {
    if (nfts.length > 0) {
      fetchPrestige(nfts.map(n => n.tokenId));
    }
  }, [nfts, fetchPrestige]);

  // Calculate totals from real NFT data
  // Calculate totals from real NFT data with real-time accumulation for UI
  const totalMined = nfts.reduce((acc, nft) => {
    // Base mined from contract (static)
    const storedMined = Number(nft.minedTokens) / 10 ** API_CONFIG.token.decimals;

    // Calculate real-time accrued since last update
    const rate = API_CONFIG.nftTiers[nft.nftType]?.dailyMining || 100;
    const bonusMultiplier = 1 + (nft.miningBonusBps / 10000);
    const lastUpdate = nft.lastMiningTimestamp || Date.now();
    const elapsedMs = Math.max(0, Date.now() - lastUpdate);
    const accrued = (elapsedMs * (rate * bonusMultiplier)) / (24 * 60 * 60 * 1000); // Daily rate to ms

    // Calculate total spec
    const totalSpec = API_CONFIG.nftTiers[nft.nftType]?.totalMining || 11200;

    // Cap at maxTotal to respect 112-day vesting limit
    return acc + Math.min(totalSpec, storedMined + accrued);
  }, 0);

  const totalClaimed = nfts.reduce((acc, nft) => acc + Number(nft.claimedTokens), 0) / 10 ** API_CONFIG.token.decimals;
  const totalDaily = nfts.reduce((acc, nft) => {
    const rate = API_CONFIG.nftTiers[nft.nftType]?.dailyMining || 100;
    return acc + rate;
  }, 0);

  // Ensure we don't show negative claimable
  const claimableAmount = Math.max(0, totalMined - totalClaimed);

  // Prestige calculations
  const totalPrestige = Object.values(prestigeData).reduce((acc, p) => acc + (Number(p.amount)), 0) / 10 ** API_CONFIG.token.decimals;
  const totalPrestigeVested = Object.values(prestigeData).reduce((acc, p) => acc + (Number(p.vestedAmount)), 0) / 10 ** API_CONFIG.token.decimals;
  const totalPrestigeClaimable = Object.values(prestigeData).reduce((acc, p) => !p.claimed ? acc + (Number(p.vestedAmount)) : acc, 0) / 10 ** API_CONFIG.token.decimals;

  const handleClaimPrestige = async () => {
    try {
      let claimed = 0;
      for (const nftIdStr of Object.keys(prestigeData)) {
        const nftId = Number(nftIdStr);
        const p = prestigeData[nftId];
        if (p && !p.claimed && p.vestedAmount > BigInt(0)) {
          await claimPrestige(nftId);
          claimed++;
        }
      }
      if (claimed > 0) {
        addToast("success", "Prestige Bonus Claimed!", `Claimed bonus for ${claimed} NFTs`);
        fetchPrestige(nfts.map(n => n.tokenId));
      } else {
        addToast("info", "No Claimable Bonus", "Wait for vesting period or no eligible NFTs");
      }
    } catch (err) {
      addToast("error", "Claim Failed", err instanceof Error ? err.message : "Unknown error");
    }
  };

  // Calculate average days remaining (112 days total mining period)
  const avgDaysRemaining = nfts.length > 0
    ? Math.max(0, Math.round(nfts.reduce((acc, nft) => {
      const daysSinceMint = Math.floor((Date.now() - nft.mintedAt) / (1000 * 60 * 60 * 24));
      return acc + Math.max(0, API_CONFIG.miningDuration - daysSinceMint);
    }, 0) / nfts.length))
    : 0;

  const handleClaimAll = async () => {
    try {
      let anyCliamed = false;
      for (const nft of nfts) {
        // Calculate real-time claimable for this NFT
        const storedMined = Number(nft.minedTokens) / 10 ** API_CONFIG.token.decimals;
        const rate = API_CONFIG.nftTiers[nft.nftType]?.dailyMining || 100;
        const bonusMultiplier = 1 + (nft.miningBonusBps / 10000);
        const lastUpdate = nft.lastMiningTimestamp || Date.now();
        const elapsedMs = Math.max(0, Date.now() - lastUpdate);
        const accrued = (elapsedMs * (rate * bonusMultiplier)) / (24 * 60 * 60 * 1000);

        const totalSpec = API_CONFIG.nftTiers[nft.nftType]?.totalMining || 11200;
        const totalMinedNft = Math.min(totalSpec, storedMined + accrued);

        const claimedNft = Number(nft.claimedTokens) / 10 ** API_CONFIG.token.decimals;
        const claimable = totalMinedNft - claimedNft;

        if (claimable > 0) { // Try to claim anything > 0
          await claimMinedTokens(nft.tokenId);
          anyCliamed = true;
        }
      }
      if (anyCliamed) {
        addToast("success", "Tokens Claimed!", `Claim transaction submitted.`);
      } else {
        addToast("info", "Nothing to Claim", `Wait for more tokens to mine.`);
      }
    } catch (err) {
      addToast("error", "Claim Failed", err instanceof Error ? err.message : "Unknown error");
    }
  };

  const handleClaimSingle = async (tokenId: number, amount: number) => {
    try {
      await claimMinedTokens(tokenId);
      addToast("success", "Tokens Claimed!", `You received ${amount.toLocaleString()} FIAPO`);
    } catch (err) {
      addToast("error", "Claim Failed", err instanceof Error ? err.message : "Unknown error");
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4">
        <Link href="/ico" className="inline-flex items-center gap-2 text-muted-foreground hover:text-golden mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to NFTs
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold font-display text-golden mb-4">⛏️ Mining Dashboard</h1>
          <p className="text-xl text-muted-foreground">Track your NFT mining rewards</p>
        </motion.div>

        {!lunesConnected ? (
          <Card className="max-w-md mx-auto bg-card">
            <CardContent className="pt-6 text-center">
              <Pickaxe className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">Connect your wallet to view mining stats</p>
              <Button>Connect Wallet</Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Stats Overview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
            >
              <Card className="bg-card">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Coins className="w-5 h-5 text-golden" />
                    <span className="text-sm text-muted-foreground">Total Mined</span>
                  </div>
                  <div className="text-2xl font-bold text-golden">
                    {nfts.length > 0 ? (
                      <MiningCounter
                        baseValue={nfts.reduce((acc, nft) => acc + (Number(nft.minedTokens) / 10 ** API_CONFIG.token.decimals), 0)}
                        lastUpdate={Math.min(...nfts.map(n => n.lastMiningTimestamp || Date.now()))}
                        dailyRate={totalDaily}
                        maxTotal={nfts.reduce((acc, nft) => acc + (API_CONFIG.nftTiers[nft.nftType]?.totalMining || 0), 0)}
                        decimals={2}
                      />
                    ) : "0"}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-2">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                    <span className="text-sm text-muted-foreground">Daily Rate</span>
                  </div>
                  <p className="text-2xl font-bold text-green-500">{totalDaily.toLocaleString()}</p>
                </CardContent>
              </Card>

              <Card className="bg-card">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Clock className="w-5 h-5 text-blue-400" />
                    <span className="text-sm text-muted-foreground">Days Left</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-400">{avgDaysRemaining}</p>
                </CardContent>
              </Card>

              <Card className="bg-card">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Gift className="w-5 h-5 text-purple-500" />
                    <span className="text-sm text-muted-foreground">Vested/Claimable</span>
                  </div>
                  <div className="text-2xl font-bold text-purple-500">
                    {nfts.length > 0 ? (
                      <MiningCounter
                        baseValue={claimableAmount}
                        lastUpdate={Math.min(...nfts.map(n => n.lastMiningTimestamp || Date.now()))}
                        dailyRate={totalDaily}
                        maxTotal={nfts.reduce((acc, nft) => acc + (API_CONFIG.nftTiers[nft.nftType]?.totalMining || 0), 0) - totalClaimed}
                        decimals={2}
                      />
                    ) : "0"}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Claim Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-8"
            >
              <Card className="bg-gradient-to-r from-golden/20 to-purple-500/20 border-golden">
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                      <div className="text-muted-foreground mb-1 flex items-center gap-2">
                        Earned (Vesting Locked)
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-[10px] rounded-full font-bold uppercase tracking-wider border border-purple-500/30 flex items-center gap-1 cursor-help">
                                112 Days Vesting
                                <Info className="w-3 h-3" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Tokens mined are subject to a 112-day linear vesting period.<br />You can claim your vested tokens at any time.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div className="text-4xl font-bold text-golden">
                        <MiningCounter
                          baseValue={claimableAmount}
                          lastUpdate={Math.min(...nfts.map(n => n.lastMiningTimestamp || Date.now()))}
                          dailyRate={totalDaily}
                          maxTotal={nfts.reduce((acc, nft) => acc + (API_CONFIG.nftTiers[nft.nftType]?.totalMining || 0), 0) - totalClaimed}
                          decimals={4}
                        />
                        <span className="ml-2 text-xl">FIAPO</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        Mining active • Tokens are released daily into your vesting balance
                      </p>
                    </div>
                    {avgDaysRemaining > 0 ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span tabIndex={0} className="inline-block">
                              <Button
                                size="xl"
                                className="glow-gold opacity-80 cursor-not-allowed"
                                disabled
                              >
                                <Clock className="w-5 h-5 mr-2" /> Vesting ({avgDaysRemaining} days left)
                              </Button>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Tokens are locked for 112 days. Claiming will be enabled after the vesting period ends.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <Button
                        size="xl"
                        className="glow-gold"
                        onClick={handleClaimAll}
                        disabled={claimableAmount <= 0 || loading}
                      >
                        {loading ? (
                          <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processing...</>
                        ) : (
                          <><Gift className="w-5 h-5 mr-2" /> Claim All Tokens</>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Prestige Bonus Card */}
            {totalPrestige > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="mb-8"
              >
                <Card className="bg-gradient-to-r from-purple-500/20 to-pink-500/10 border-purple-500/50">
                  <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                      <div>
                        <div className="text-muted-foreground mb-1 flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-purple-400" />
                          <span className="text-purple-300 font-bold">Prestige Bonus (First 100 / Early Adopters)</span>
                        </div>
                        <div className="flex items-baseline gap-4">
                          <div className="text-3xl font-bold text-white">
                            {totalPrestigeVested > 0
                              ? totalPrestigeVested.toLocaleString(undefined, { maximumFractionDigits: 2 })
                              : "Locked"
                            }
                            <span className="ml-1 text-sm text-muted-foreground">
                              / {totalPrestige.toLocaleString()} {totalPrestigeVested > 0 ? "Vested" : "Total Bonus"}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {totalPrestigeVested > 0
                            ? "30-Day Vesting Period • Full amount unlocks daily"
                            : "Bonus will start vesting after ICO Finalization"
                          }
                        </p>
                      </div>
                      {icoStats?.icoActive ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span tabIndex={0} className="inline-block">
                                <Button
                                  size="lg"
                                  className="bg-purple-600/50 text-white/50 cursor-not-allowed border border-purple-500/30"
                                  disabled
                                >
                                  <Sparkles className="w-4 h-4 mr-2" />
                                  Bonus Locked (ICO Active)
                                </Button>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Prestige Bonus can only be claimed after the ICO is fully sold out.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <Button
                          size="lg"
                          className="bg-purple-600 hover:bg-purple-700 text-white"
                          onClick={handleClaimPrestige}
                          disabled={totalPrestigeClaimable <= 0}
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          Claim {totalPrestigeClaimable.toLocaleString(undefined, { maximumFractionDigits: 2 })} Bonus
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* NFT Mining Progress */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h2 className="text-2xl font-bold text-golden mb-6">Your Mining NFTs</h2>

              {nfts.length === 0 ? (
                <Card className="bg-card">
                  <CardContent className="pt-6 text-center py-12">
                    <Crown className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">You don&apos;t have any mining NFTs yet</p>
                    <Button asChild>
                      <Link href="/ico/mint">Mint Your First NFT</Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  {nfts.map((nft, i) => {
                    const tier = tierInfo[nft.nftType] || tierInfo[0];
                    const miningRate = API_CONFIG.nftTiers[nft.nftType]?.dailyMining || 100;
                    const totalTokens = API_CONFIG.nftTiers[nft.nftType]?.totalMining || 11200;
                    const minedTokens = Number(nft.minedTokens) / 10 ** API_CONFIG.token.decimals;
                    const claimedTokens = Number(nft.claimedTokens) / 10 ** API_CONFIG.token.decimals;
                    const claimable = minedTokens - claimedTokens;
                    const progress = Math.min(100, (minedTokens / totalTokens) * 100);

                    return (
                      <motion.div
                        key={nft.tokenId}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + i * 0.1 }}
                      >
                        <Card className="bg-card overflow-hidden">
                          <div className="bg-gradient-to-br from-golden/20 to-transparent p-6">
                            <div className="flex items-center gap-4">
                              <div className="w-20 h-20 rounded-2xl bg-golden/20 flex items-center justify-center text-4xl">
                                {tier.image}
                              </div>
                              <div>
                                <h3 className="text-xl font-bold">{tier.name} NFT</h3>
                                <p className="text-sm text-muted-foreground">#{nft.tokenId.toString().padStart(4, '0')}</p>
                              </div>
                            </div>
                          </div>
                          <CardContent className="pt-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-background rounded-xl p-3">
                                <p className="text-xs text-muted-foreground">Daily Rate</p>
                                <p className="font-bold text-golden">{miningRate.toLocaleString()}</p>
                              </div>
                              <div className="bg-background rounded-xl p-3">
                                <p className="text-xs text-muted-foreground">Total Mined</p>
                                <div className="font-bold flex items-center gap-1">
                                  <MiningCounter
                                    baseValue={minedTokens}
                                    lastUpdate={nft.lastMiningTimestamp || Date.now()}
                                    dailyRate={miningRate}
                                    bonusBps={nft.miningBonusBps}
                                    maxTotal={totalTokens}
                                    decimals={4}
                                  />
                                </div>
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between text-sm mb-2">
                                <span className="text-muted-foreground">Mining Progress</span>
                                <span className="text-golden">{progress.toFixed(1)}%</span>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-golden rounded-full" style={{ width: `${progress}%` }} />
                              </div>
                            </div>
                          </CardContent>
                          <CardFooter>
                            <Button
                              variant="outline"
                              className="w-full"
                              disabled={claimable <= 0 || loading}
                              onClick={() => handleClaimSingle(nft.tokenId, claimable)}
                            >
                              <Coins className="w-4 h-4 mr-2" />
                              Claim {claimable.toLocaleString()} FIAPO
                            </Button>
                          </CardFooter>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
