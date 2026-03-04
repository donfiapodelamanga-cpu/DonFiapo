"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useCallback } from "react";
import { Store, Tag, Gavel, ArrowLeftRight, Search, Loader2, AlertCircle, RefreshCw, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useWalletStore } from "@/lib/stores";
import { getNFT } from "@/lib/api/contract";
import {
    getActiveListings, getListing,
    getActiveAuctions, getAuction,
    getActiveTrades, getTrade,
    isIcoSalesCompleted, getMarketplaceStats,
    getPaymentMode
} from "@/lib/api/marketplace-api";
import { NFTMarketplaceCard } from "@/components/nft/NFTMarketplaceCard";
import { NFTAuctionCard } from "@/components/nft/NFTAuctionCard";
import { NFTTradeCard } from "@/components/nft/NFTTradeCard";
import type { Listing, Auction, TradeOffer, MarketplaceStats } from "@/lib/api/contract-abi";

type TabId = "sale" | "auction" | "trade";

export default function MarketplacePage() {
    const [loading, setLoading] = useState(true);
    const [icoCompleted, setIcoCompleted] = useState(false);
    const [tab, setTab] = useState<TabId>("sale");
    const [search, setSearch] = useState("");
    const [stats, setStats] = useState<MarketplaceStats | null>(null);
    const [paymentMode, setPaymentMode] = useState<0 | 2>(0); // 0=só LUNES, 2=LUNES+FIAPO

    // Data per tab
    const [listings, setListings] = useState<{ listing: Listing; nft: any }[]>([]);
    const [auctions, setAuctions] = useState<{ auction: Auction; nft: any }[]>([]);
    const [trades, setTrades] = useState<{ trade: TradeOffer; nft: any }[]>([]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [completed, mktStats, mode] = await Promise.all([
                isIcoSalesCompleted(),
                getMarketplaceStats(),
                getPaymentMode(),
            ]);
            setIcoCompleted(completed);
            setStats(mktStats);
            setPaymentMode(mode);

            // Fetch listings
            const listingIds = await getActiveListings();
            const listingResults = await Promise.all(
                listingIds.map(async (id) => {
                    const [l, n] = await Promise.all([getListing(id), getNFT(id)]);
                    return l && n ? { listing: l, nft: n } : null;
                })
            );
            setListings(listingResults.filter(Boolean) as any[]);

            // Fetch auctions
            const auctionIds = await getActiveAuctions();
            const auctionResults = await Promise.all(
                auctionIds.map(async (id) => {
                    const a = await getAuction(id);
                    if (!a) return null;
                    const n = await getNFT(a.nftId);
                    return a && n ? { auction: a, nft: n } : null;
                })
            );
            setAuctions(auctionResults.filter(Boolean) as any[]);

            // Fetch trades
            const tradeIds = await getActiveTrades();
            const tradeResults = await Promise.all(
                tradeIds.map(async (id) => {
                    const t = await getTrade(id);
                    if (!t) return null;
                    const n = await getNFT(t.nftIdOffered);
                    return t && n ? { trade: t, nft: n } : null;
                })
            );
            setTrades(tradeResults.filter(Boolean) as any[]);
        } catch (e) {
            console.error("Failed to fetch marketplace data:", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Search filter
    const filteredListings = listings.filter(
        (item) =>
            item.listing.nftId.toString().includes(search) ||
            item.listing.seller.toLowerCase().includes(search.toLowerCase())
    );
    const filteredAuctions = auctions.filter(
        (item) =>
            item.auction.nftId.toString().includes(search) ||
            item.auction.seller.toLowerCase().includes(search.toLowerCase())
    );
    const filteredTrades = trades.filter(
        (item) =>
            item.trade.nftIdOffered.toString().includes(search) ||
            item.trade.offerer.toLowerCase().includes(search.toLowerCase())
    );

    const tabs: { id: TabId; label: string; icon: any; count: number }[] = [
        { id: "sale", label: "Vendas", icon: Tag, count: listings.length },
        { id: "auction", label: "Leilões", icon: Gavel, count: auctions.length },
        { id: "trade", label: "Trocas P2P", icon: ArrowLeftRight, count: trades.length },
    ];

    const formatVolume = (v: bigint) => (Number(v) / 10 ** 8).toLocaleString(undefined, { maximumFractionDigits: 0 });

    return (
        <div className="min-h-screen pt-24 pb-16 bg-[url('/grid-bg.svg')] bg-fixed">
            <div className="container mx-auto px-4">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12"
                >
                    <h1 className="text-4xl md:text-6xl font-bold font-display text-golden mb-4 flex items-center justify-center gap-3">
                        <Store className="w-10 h-10 md:w-16 md:h-16" />
                        NFT Marketplace
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        Compre, venda, leiloe e troque NFTs Don Fiapo diretamente entre holders
                    </p>
                    <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-muted/50 border border-border">
                        <span className="text-xs text-muted-foreground">Moedas aceitas:</span>
                        <span className="text-sm font-bold text-golden">
                            {paymentMode === 2 ? 'LUNES + FIAPO' : 'LUNES'}
                        </span>
                    </div>
                </motion.div>

                {/* ICO Active Alert */}
                {!icoCompleted && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="mb-8 max-w-3xl mx-auto"
                    >
                        <Card className="bg-gradient-to-r from-amber-500/10 to-transparent border-amber-500/30">
                            <CardContent className="pt-6 flex items-start gap-4">
                                <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                                    <AlertCircle className="w-6 h-6 text-amber-500" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-lg mb-1 text-amber-500">Preço Mínimo Ativo</h3>
                                    <p className="text-muted-foreground text-sm">
                                        Enquanto a ICO estiver ativa, NFTs devem ser listadas com preço mínimo de 150% do valor da ICO (Free: mín. $15).
                                        Após todas as NFTs serem vendidas, o preço será livre.
                                    </p>
                                </div>
                                <Button size="sm" variant="ghost" className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10" asChild>
                                    <a href="/ico">Ver ICO</a>
                                </Button>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {/* Stats Bar */}
                {stats && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
                    >
                        {[
                            { label: "Volume Total", value: `${formatVolume(stats.totalVolume)}`, icon: BarChart3 },
                            { label: "Taxas Coletadas", value: `${formatVolume(stats.totalFeesCollected)}`, icon: Tag },
                            { label: "Leilões Finalizados", value: stats.totalAuctionsCompleted.toString(), icon: Gavel },
                            { label: "Trocas Realizadas", value: stats.totalTradesCompleted.toString(), icon: ArrowLeftRight },
                        ].map((stat, i) => (
                            <Card key={i} className="bg-card/50 backdrop-blur-sm border-border">
                                <CardContent className="pt-4 pb-3 px-4 flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-golden/10 flex items-center justify-center">
                                        <stat.icon className="w-4 h-4 text-golden" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-muted-foreground uppercase">{stat.label}</p>
                                        <p className="text-sm font-bold">{stat.value}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </motion.div>
                )}

                {/* Controls Bar: Search + Tabs + Refresh */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex flex-col md:flex-row gap-4 mb-8 items-center bg-card/50 backdrop-blur-sm p-4 rounded-2xl border border-border"
                >
                    {/* Search */}
                    <div className="relative flex-1 w-full md:w-auto group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-golden transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar por ID ou endereço..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full h-10 bg-background/50 border border-border focus:border-golden outline-none rounded-lg pl-10 pr-4 transition-all"
                        />
                    </div>

                    {/* Tabs */}
                    <div className="flex bg-background/50 border border-border p-1 rounded-lg w-full md:w-auto overflow-x-auto">
                        {tabs.map((t) => (
                            <button
                                key={t.id}
                                onClick={() => setTab(t.id)}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-all whitespace-nowrap ${tab === t.id
                                    ? "bg-golden text-black shadow-sm"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                    }`}
                            >
                                <t.icon className="w-3.5 h-3.5" />
                                {t.label}
                                {t.count > 0 && (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tab === t.id ? "bg-black/20 text-black" : "bg-muted text-muted-foreground"}`}>
                                        {t.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Refresh */}
                    <Button variant="outline" size="icon" onClick={fetchData} disabled={loading} className="w-10 h-10 rounded-lg border-border hover:border-golden transition-colors shrink-0">
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </motion.div>

                {/* Content */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                        <Loader2 className="w-12 h-12 text-golden animate-spin" />
                        <p className="text-muted-foreground font-medium">Buscando na Lunes Network...</p>
                    </div>
                ) : (
                    <>
                        {/* Tab: Vendas */}
                        {tab === "sale" && (
                            filteredListings.length === 0 ? (
                                <EmptyState icon={Tag} title="Nenhuma venda ativa" subtitle="Seja o primeiro a listar um NFT!" />
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    <AnimatePresence mode="popLayout">
                                        {filteredListings.map((item) => (
                                            <NFTMarketplaceCard
                                                key={item.listing.nftId}
                                                listing={item.listing}
                                                nftData={item.nft}
                                                onRefresh={fetchData}
                                            />
                                        ))}
                                    </AnimatePresence>
                                </div>
                            )
                        )}

                        {/* Tab: Leilões */}
                        {tab === "auction" && (
                            filteredAuctions.length === 0 ? (
                                <EmptyState icon={Gavel} title="Nenhum leilão ativo" subtitle="Crie o primeiro leilão de NFT!" />
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    <AnimatePresence mode="popLayout">
                                        {filteredAuctions.map((item) => (
                                            <NFTAuctionCard
                                                key={item.auction.auctionId}
                                                auction={item.auction}
                                                nftData={item.nft}
                                                onRefresh={fetchData}
                                            />
                                        ))}
                                    </AnimatePresence>
                                </div>
                            )
                        )}

                        {/* Tab: Trocas */}
                        {tab === "trade" && (
                            filteredTrades.length === 0 ? (
                                <EmptyState icon={ArrowLeftRight} title="Nenhuma troca ativa" subtitle="Ofereça uma troca P2P de NFTs!" />
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    <AnimatePresence mode="popLayout">
                                        {filteredTrades.map((item) => (
                                            <NFTTradeCard
                                                key={item.trade.tradeId}
                                                trade={item.trade}
                                                nftOfferedData={item.nft}
                                                onRefresh={fetchData}
                                            />
                                        ))}
                                    </AnimatePresence>
                                </div>
                            )
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

function EmptyState({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle: string }) {
    return (
        <Card className="bg-card border-dashed border-2 border-border max-w-lg mx-auto py-16">
            <CardContent className="flex flex-col items-center text-center">
                <Icon className="w-16 h-16 text-muted-foreground mb-4 opacity-20" />
                <h3 className="text-xl font-bold mb-2">{title}</h3>
                <p className="text-muted-foreground mb-6">{subtitle}</p>
                <Button variant="outline" asChild>
                    <a href="/ico/my-nfts">Meus NFTs</a>
                </Button>
            </CardContent>
        </Card>
    );
}
