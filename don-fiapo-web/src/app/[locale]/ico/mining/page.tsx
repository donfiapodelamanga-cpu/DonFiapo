"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { useEffect } from "react";
import { Crown, Pickaxe, Clock, Coins, TrendingUp, Gift, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Link } from "@/lib/navigation";
import { useWalletStore } from "@/lib/stores";
import { useNFTs } from "@/hooks/useContract";
import { useToast } from "@/components/ui/toast";
import { API_CONFIG } from "@/lib/api/config";

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

export default function MiningPage() {
  const t = useTranslations("ico");
  const { addToast } = useToast();
  const { lunesConnected, lunesAddress } = useWalletStore();
  const { nfts, loading, claimMinedTokens } = useNFTs();

  useEffect(() => {
    // NFTs are already loaded from the hook
  }, []);

  // Calculate totals from real NFT data
  const totalMined = nfts.reduce((acc, nft) => acc + Number(nft.minedTokens), 0) / 10 ** API_CONFIG.token.decimals;
  const totalClaimed = nfts.reduce((acc, nft) => acc + Number(nft.claimedTokens), 0) / 10 ** API_CONFIG.token.decimals;
  const totalDaily = nfts.reduce((acc, nft) => {
    const rate = API_CONFIG.nftTiers[nft.nftType]?.dailyMining || 100;
    return acc + rate;
  }, 0);
  const claimableAmount = totalMined - totalClaimed;
  
  // Calculate average days remaining (112 days total mining period)
  const avgDaysRemaining = nfts.length > 0 
    ? Math.max(0, Math.round(nfts.reduce((acc, nft) => {
        const daysSinceMint = Math.floor((Date.now() - nft.mintedAt) / (1000 * 60 * 60 * 24));
        return acc + Math.max(0, API_CONFIG.miningDuration - daysSinceMint);
      }, 0) / nfts.length))
    : 0;

  const handleClaimAll = async () => {
    try {
      for (const nft of nfts) {
        const claimable = Number(nft.minedTokens) - Number(nft.claimedTokens);
        if (claimable > 0) {
          await claimMinedTokens(nft.tokenId);
        }
      }
      addToast("success", "Tokens Claimed!", `You received ${claimableAmount.toLocaleString()} FIAPO`);
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
              {[
                { icon: Coins, label: "Total Mined", value: totalMined >= 1000 ? `${(totalMined / 1000).toFixed(1)}K` : totalMined.toFixed(0), color: "text-golden" },
                { icon: TrendingUp, label: "Daily Rate", value: totalDaily.toLocaleString(), color: "text-green-500" },
                { icon: Clock, label: "Days Left", value: avgDaysRemaining.toString(), color: "text-blue-400" },
                { icon: Gift, label: "Claimable", value: claimableAmount >= 1000 ? `${(claimableAmount / 1000).toFixed(1)}K` : claimableAmount.toFixed(0), color: "text-purple-500" },
              ].map((stat, i) => (
                <Card key={i} className="bg-card">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-2">
                      <stat.icon className={`w-5 h-5 ${stat.color}`} />
                      <span className="text-sm text-muted-foreground">{stat.label}</span>
                    </div>
                    <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                  </CardContent>
                </Card>
              ))}
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
                      <p className="text-muted-foreground mb-1">Available to Claim</p>
                      <p className="text-4xl font-bold text-golden">{claimableAmount.toLocaleString()} FIAPO</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Mining ends in ~{avgDaysRemaining} days
                      </p>
                    </div>
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
                  </div>
                </CardContent>
              </Card>
            </motion.div>

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
                                <p className="font-bold">{minedTokens.toLocaleString()}</p>
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
