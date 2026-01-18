"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import Image from "next/image";
import { Crown, Gem, Sparkles, Timer, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Link } from "@/lib/navigation";
import { API_CONFIG } from "@/lib/api/config";
import { formatNumber } from "@/lib/utils/format";
import { getICOStats, getIcoNftConfigs, type ICOStats } from "@/lib/api/contract";
import { useEffect, useState } from "react";

// Use NFT tiers from config
const initialNftTiers = API_CONFIG.nftTiers.map((tier, index) => ({
  key: `tier${index}`,
  ...tier,
  minted: 0, // Will come from contract
}));

export default function ICOPage() {
  const t = useTranslations("ico");
  const [stats, setStats] = useState<ICOStats | null>(null);
  const [nftTiers, setNftTiers] = useState(initialNftTiers);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [statsData, configsData] = await Promise.all([
          getICOStats(),
          getIcoNftConfigs()
        ]);

        if (statsData) {
          setStats(statsData);
        }

        if (configsData) {
          setNftTiers(prev => prev.map((tier, index) => {
            // Determine if we have a matching config for this tier
            // configsData should be in order of NFT Types (0..6)
            // tier.id should match the index if sorted
            const config = configsData[index];
            if (config) {
              return {
                ...tier,
                minted: config.minted,
              };
            }
            return tier;
          }));
        }

      } catch (error) {
        console.error("Failed to fetch ICO stats:", error);
      }
    };
    fetchStats();
  }, []);

  // Use fetched total if available, otherwise 0
  const totalMinted = stats ? stats.totalNftsMinted : 0;
  const totalSupply = nftTiers.reduce((acc, tier) => acc + tier.supply, 0);

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4 flex flex-col">
        {/* Header */}
        <div
          className="text-center mb-12 order-1"
        >
          <h1 className="text-4xl md:text-6xl font-bold font-display text-golden mb-4">
            👑 {t("title")}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-6">
            {t("subtitle")}
          </p>
          {/* Quick Action Buttons */}
          <div className="flex flex-wrap justify-center gap-4">
            <Button variant="outline" size="lg" asChild className="border-golden/50 hover:border-golden hover:bg-golden/10">
              <Link href="/ico/my-nfts">
                <Crown className="w-4 h-4 mr-2" />
                {t("myNfts")}
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild className="border-golden/50 hover:border-golden hover:bg-golden/10">
              <Link href="/ico/mining">
                <Gem className="w-4 h-4 mr-2" />
                {t("mining")}
              </Link>
            </Button>
          </div>
        </div >

        {/* Stats */}
        <div
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12 order-2"
        >
          {[
            { icon: Crown, label: "Total NFTs", value: formatNumber(totalSupply) },
            { icon: Gem, label: "Minted", value: formatNumber(totalMinted) },
            { icon: Sparkles, label: "Available", value: formatNumber(totalSupply - totalMinted) },
            { icon: Timer, label: "Mining Days", value: "112" },
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
        </div >

        {/* Progress Bar */}
        <div
          className="mb-12 order-3"
        >
          <Card className="bg-card">
            <CardContent className="pt-6">
              <div className="flex justify-between mb-2">
                <span className="text-muted-foreground">Total Progress</span>
                <span className="font-bold text-golden">
                  {((totalMinted / totalSupply) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="h-4 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-golden to-orange-500 rounded-full transition-all duration-500"
                  style={{ width: `${(totalMinted / totalSupply) * 100}%` }}
                />
              </div>
            </CardContent>
          </Card>
        </div >

        {/* NFT Tiers */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 order-4">
          {nftTiers.map((tier, i) => {
            const available = tier.supply - tier.minted;
            const progress = (tier.minted / tier.supply) * 100;

            return (
              <div
                key={tier.key}
              >
                <Card className={`h-full card-hover bg-background border-2 hover:border-golden ${available === 0 ? 'opacity-60' : ''}`}>
                  <CardHeader className="p-0">
                    <div className="relative w-full aspect-[3/4] overflow-hidden rounded-t-xl bg-gradient-to-br from-amber-900/30 to-amber-950/50">
                      <Image
                        src={tier.image}
                        alt={tier.name}
                        fill
                        className="object-contain hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      />
                      {tier.price === 0 && (
                        <div className="absolute top-3 right-3 px-3 py-1.5 bg-green-500 text-white text-sm font-bold rounded-full shadow-lg">
                          FREE
                        </div>
                      )}
                      <div className={`absolute bottom-0 left-0 right-0 h-1 ${tier.color}`} />
                    </div>

                    <div className="p-4 pb-0">
                      <CardTitle className="text-foreground text-lg leading-tight">{tier.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {available > 0 ? `${formatNumber(available)} available` : 'Sold Out'}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 px-4 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Price</span>
                      <span className="text-xl font-bold text-golden">
                        {tier.price === 0 ? 'FREE' : `$${tier.price} USDT`}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Daily Mining</span>
                      <span className="font-medium text-green-500">+{formatNumber(tier.dailyMining)} FIAPO</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Total ({tier.miningDays} days)</span>
                      <span className="font-medium">{formatNumber(tier.totalMining)} FIAPO</span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Minted</span>
                        <span>{formatNumber(tier.minted)}/{formatNumber(tier.supply)}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full ${tier.color} rounded-full transition-all duration-500`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      className="w-full"
                      disabled={available === 0}
                      asChild={available > 0}
                    >
                      {available > 0 ? (
                        <Link href="/ico/mint">
                          <ShoppingCart className="w-4 h-4 mr-2" />
                          {t("mint")}
                        </Link>
                      ) : (
                        <span>Sold Out</span>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              </div >
            );
          })}
        </div>


      </div>
    </div>
  );
}
