"use client";

import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import Image from "next/image";
import { Crown, ArrowLeft, Pickaxe, Loader2, Sparkles, Flame, TrendingUp, Check, X, AlertCircle, PartyPopper, History, Trophy, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/lib/navigation";
import { useWalletStore } from "@/lib/stores";
import { useNFTs } from "@/hooks/useContract";
import { useEvolution, type VisualRarity } from "@/hooks/useEvolution";
import { API_CONFIG, getRarityConfig } from "@/lib/api/config";
import { useToast } from "@/components/ui/toast";
import { ListNFTModal } from "@/components/nft/ListNFTModal";
import { getNFTVisualAttributes } from "@/lib/api/contract";

// NFT tier rarity labels (tier-based)
const tierRarityLabels: Record<number, string> = {
  0: "Common",
  1: "Common",
  2: "Uncommon",
  3: "Rare",
  4: "Epic",
  5: "Legendary",
  6: "Mythic",
};

export default function MyNFTsPage() {
  const t = useTranslations("ico");
  const { lunesConnected, lunesAddress } = useWalletStore();
  const { nfts, loading, fetchNFTs } = useNFTs();

  // Visual rarity cache
  const [visualRarities, setVisualRarities] = useState<Record<number, VisualRarity>>({});

  // Use evolution hook
  const evolution = useEvolution();
  const evolutionPreview = evolution.getEvolutionPreview(nfts);
  const { addToast } = useToast();
  const [selectedForListing, setSelectedForListing] = useState<any | null>(null);

  useEffect(() => {
    if (lunesConnected && lunesAddress) {
      fetchNFTs();
    }
  }, [lunesConnected, lunesAddress, fetchNFTs]);

  // Fetch visual rarities for all NFTs
  useEffect(() => {
    const fetchRarities = async () => {
      if (typeof window === 'undefined') return;

      const contract = await import('@/lib/api/contract');
      const rarities: Record<number, VisualRarity> = {};
      for (const nft of nfts) {
        const attrs = await contract.getNFTVisualAttributes(nft.tokenId);
        if (attrs) {
          rarities[nft.tokenId] = attrs.rarity as VisualRarity;
        }
      }
      setVisualRarities(rarities);
    };

    if (nfts.length > 0) {
      fetchRarities();
    }
  }, [nfts]);

  // Handle evolution execution
  const handleEvolve = async () => {
    addToast("info", "Evolution Started", "Processing your NFT evolution...");

    const result = await evolution.executeEvolution();
    if (result) {
      const newTierName = API_CONFIG.nftTiers[result.newTier]?.shortName || 'NFT';
      addToast(
        "success",
        "Evolution Complete! 🎉",
        `Your NFTs evolved into a ${newTierName} with +${result.bonusBps / 100}% mining bonus!`
      );
      // Refresh NFTs after successful evolution
      await fetchNFTs();
    } else if (evolution.error) {
      addToast("error", "Evolution Failed", evolution.error);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4">
        <Link href="/ico" className="inline-flex items-center gap-2 text-muted-foreground hover:text-golden mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to NFTs
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold font-display text-golden mb-4">👑 My NFTs</h1>
          <p className="text-xl text-muted-foreground">Your royal NFT collection</p>
        </motion.div>

        {!lunesConnected ? (
          <Card className="max-w-md mx-auto bg-card">
            <CardContent className="pt-6 text-center">
              <Crown className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">Connect your wallet to view your NFTs</p>
              <Button>Connect Wallet</Button>
            </CardContent>
          </Card>
        ) : loading ? (
          <div className="text-center py-12">
            <Loader2 className="w-12 h-12 text-golden mx-auto animate-spin mb-4" />
            <p className="text-muted-foreground">Loading your NFTs...</p>
          </div>
        ) : nfts.length === 0 ? (
          <Card className="max-w-md mx-auto bg-card">
            <CardContent className="pt-6 text-center py-12">
              <Crown className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">You don&apos;t have any NFTs yet</p>
              <Button asChild>
                <Link href="/ico/mint">Mint Your First NFT</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Evolution Success Modal */}
            <AnimatePresence>
              {evolution.result && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
                  onClick={evolution.clearResult}
                >
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className="bg-card p-8 rounded-xl max-w-md text-center"
                    onClick={e => e.stopPropagation()}
                  >
                    <PartyPopper className="w-16 h-16 text-golden mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-golden mb-2">Evolution Complete!</h2>
                    <p className="text-muted-foreground mb-4">
                      Your NFTs have been evolved into a new {API_CONFIG.nftTiers[evolution.result.newTier]?.shortName || 'NFT'}!
                    </p>
                    <p className="text-green-500 font-bold mb-6">
                      +{evolution.result.bonusBps / 100}% Mining Bonus
                    </p>
                    <Button onClick={evolution.clearResult}>View New NFT</Button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error Alert */}
            {evolution.error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3"
              >
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-red-400 flex-1">{evolution.error}</p>
                <Button variant="ghost" size="sm" onClick={evolution.clearError}>
                  <X className="w-4 h-4" />
                </Button>
              </motion.div>
            )}

            {/* Evolution Panel */}
            {evolution.isEvolutionMode && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-gradient-to-r from-purple-500/10 to-golden/10 border border-purple-500/30 rounded-lg"
              >
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <Flame className="w-6 h-6 text-orange-500" />
                    <div>
                      <h3 className="font-bold text-lg">Evolution Mode</h3>
                      <p className="text-sm text-muted-foreground">
                        Select 2+ NFTs of the same type to evolve
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="px-3 py-1 bg-purple-500/20 rounded-full text-sm">
                      {evolution.selectedNFTs.length} selected
                    </span>

                    {evolutionPreview && (
                      <div className="flex items-center gap-2 px-3 py-1 bg-golden/20 rounded-full">
                        <TrendingUp className="w-4 h-4 text-golden" />
                        <span className="text-sm">
                          {evolutionPreview.currentTierName} → {evolutionPreview.nextTierName} (+{evolutionPreview.bonusPercent}% mining)
                        </span>
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={evolution.exitEvolutionMode}
                    >
                      <X className="w-4 h-4 mr-1" /> Cancel
                    </Button>

                    <Button
                      disabled={evolution.selectedNFTs.length < 2 || !evolutionPreview || evolution.isLoading}
                      size="sm"
                      className="bg-gradient-to-r from-purple-500 to-golden"
                      onClick={handleEvolve}
                    >
                      {evolution.isLoading ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4 mr-1" />
                      )}
                      {evolution.isLoading ? 'Evolving...' : 'Evolve NFTs'}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            <div className="flex justify-between items-center mb-6">
              <p className="text-muted-foreground">{nfts.length} NFTs in collection</p>
              <div className="flex gap-2">
                {!evolution.isEvolutionMode && (
                  <Button
                    variant="outline"
                    onClick={evolution.enterEvolutionMode}
                    className="border-purple-500/50 hover:bg-purple-500/10"
                  >
                    <Flame className="w-4 h-4 mr-2 text-orange-500" />
                    Evolve NFTs
                  </Button>
                )}
                <Button variant="outline" asChild>
                  <Link href="/ico/mining">
                    <Pickaxe className="w-4 h-4 mr-2" />
                    Mining
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/ico/evolution-history">
                    <History className="w-4 h-4 mr-2" />
                    History
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/ico/leaderboard">
                    <Trophy className="w-4 h-4 mr-2" />
                    Leaderboard
                  </Link>
                </Button>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {nfts.map((nft, i) => {
                const tierConfig = API_CONFIG.nftTiers[nft.nftType] || API_CONFIG.nftTiers[0];
                const tierRarity = tierRarityLabels[nft.nftType] || "Common";
                const minedTokens = Number(nft.minedTokens) / 10 ** API_CONFIG.token.decimals;
                const isSelected = evolution.selectedNFTs.includes(nft.tokenId);

                // Visual rarity from contract or fallback
                const visualRarityKey = visualRarities[nft.tokenId] || 'common';
                const visualRarity = getRarityConfig(visualRarityKey);

                // Check if selectable (same type as already selected)
                const firstSelected = evolution.selectedNFTs.length > 0
                  ? nfts.find(n => n.tokenId === evolution.selectedNFTs[0])
                  : null;
                const isSelectable = !evolution.isEvolutionMode || !firstSelected || firstSelected.nftType === nft.nftType;
                const isMaxTier = nft.nftType >= 6;

                return (
                  <motion.div
                    key={nft.tokenId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => !isMaxTier && evolution.toggleNFTSelection(nft.tokenId, nft.nftType, nfts)}
                    className={evolution.isEvolutionMode && !isMaxTier ? 'cursor-pointer' : ''}
                  >
                    <Card className={`bg-card overflow-hidden card-hover group border-2 transition-all duration-200 ${isSelected
                      ? 'border-purple-500 ring-2 ring-purple-500/50'
                      : evolution.isEvolutionMode && !isSelectable
                        ? 'opacity-50 cursor-not-allowed border-border'
                        : 'hover:border-golden border-border'
                      }`}>
                      <div className="relative aspect-[3/4]">
                        <Image
                          src={tierConfig.image}
                          alt={tierConfig.name}
                          fill
                          className="object-contain group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                          unoptimized={true}
                        />
                        {/* Selection indicator */}
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                            <Check className="w-5 h-5 text-white" />
                          </div>
                        )}
                        {/* Legendary glow effect */}
                        {visualRarityKey === 'legendary' && (
                          <div className="absolute inset-0 bg-gradient-to-t from-yellow-500/30 to-transparent animate-pulse" />
                        )}
                        {/* Max tier indicator */}
                        {evolution.isEvolutionMode && isMaxTier && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <span className="px-3 py-1 bg-golden/90 text-black text-xs font-bold rounded">MAX TIER</span>
                          </div>
                        )}
                        <div className={`absolute bottom-0 left-0 right-0 h-1 ${tierConfig.color}`} />
                      </div>
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-bold text-sm leading-tight">{tierConfig.shortName}</h3>
                            <p className="text-xs text-muted-foreground">#{nft.tokenId.toString().padStart(4, '0')}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {/* Visual Rarity Badge */}
                            <span className={`px-2 py-0.5 ${visualRarity.bgColor} ${visualRarity.color} text-xs font-medium rounded flex items-center gap-1`}>
                              {visualRarityKey !== 'common' && <Sparkles className="w-3 h-3" />}
                              {visualRarity.name}
                            </span>
                            {/* Tier Rarity Badge */}
                            <span className="px-2 py-0.5 bg-golden/20 text-golden text-xs font-medium rounded">
                              {tierRarity}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-2 pt-3 border-t border-border">
                          <div className="flex justify-between">
                            <p className="text-xs text-muted-foreground">Mining Rate</p>
                            <p className="font-bold text-green-500 text-sm">+{tierConfig.dailyMining.toLocaleString()}/day</p>
                          </div>
                          <div className="flex justify-between">
                            <p className="text-xs text-muted-foreground">Mined</p>
                            <p className="font-medium text-sm">{minedTokens.toLocaleString()} FIAPO</p>
                          </div>
                        </div>

                        {!evolution.isEvolutionMode && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-4 border-golden/30 text-golden hover:bg-golden/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedForListing({ id: nft.tokenId, name: tierConfig.shortName });
                            }}
                          >
                            <Tag className="w-4 h-4 mr-2" /> Sell
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            {/* Marketplace Modal */}
            <ListNFTModal
              isOpen={!!selectedForListing}
              onClose={() => setSelectedForListing(null)}
              tokenId={selectedForListing?.id}
              nftName={selectedForListing?.name}
              onSuccess={() => {
                fetchNFTs();
                setSelectedForListing(null);
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
