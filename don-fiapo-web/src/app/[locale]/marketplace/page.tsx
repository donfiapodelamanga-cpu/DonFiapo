"use client";

import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useCallback } from "react";
import { Store, Tag, Gavel, Filter, Search, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useWalletStore } from "@/lib/stores";
import { getActiveListings, getListing, areAllNFTsSold, getNFT } from "@/lib/api/contract";
import { NFTMarketplaceCard } from "@/components/nft/NFTMarketplaceCard";
import { Listing } from "@/lib/api/contract-abi";

export default function MarketplacePage() {
    const [loading, setLoading] = useState(true);
    const [isSoldOut, setIsSoldOut] = useState(false);
    const [listings, setListings] = useState<{ listing: Listing, nft: any }[]>([]);
    const [filter, setFilter] = useState<"all" | "sale" | "auction">("all");
    const [search, setSearch] = useState("");

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // 1. Check if ICO is sold out
            const soldOut = await areAllNFTsSold();
            setIsSoldOut(soldOut);

            // 2. Fetch all active IDs
            const activeIds = await getActiveListings();

            // 3. Fetch details for each ID
            const results = [];
            for (const id of activeIds) {
                const [listingDetails, nftDetails] = await Promise.all([
                    getListing(id),
                    getNFT(id)
                ]);
                if (listingDetails && nftDetails) {
                    results.push({ listing: listingDetails, nft: nftDetails });
                }
            }
            setListings(results);
        } catch (e) {
            console.error("Failed to fetch marketplace data:", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filteredListings = listings.filter(item => {
        const matchesFilter = filter === "all" ||
            (filter === "sale" && !item.listing.isAuction) ||
            (filter === "auction" && item.listing.isAuction);
        const matchesSearch = item.nft.tokenId.toString().includes(search) ||
            item.listing.seller.toLowerCase().includes(search.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    return (
        <div className="min-h-screen pt-24 pb-16 bg-[url('/grid-bg.svg')] bg-fixed">
            <div className="container mx-auto px-4">
                {/* Header Aligned with Staking Page */}
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
                        Buy and auction Don Fiapo NFTs directly from other holders 👑
                    </p>
                </motion.div>

                {/* Marketplace Restricted Alert */}
                {!isSoldOut && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="mb-12 max-w-3xl mx-auto"
                    >
                        <Card className="bg-gradient-to-r from-red-500/10 to-transparent border-red-500/30">
                            <CardContent className="pt-6 flex items-start gap-4">
                                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                                    <AlertCircle className="w-6 h-6 text-red-500" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-lg mb-1 text-red-500">Marketplace Restricted</h3>
                                    <p className="text-muted-foreground text-sm">
                                        Trading is currently paused. The marketplace will officially open immediately after the ICO allocation is fully sold out.
                                    </p>
                                </div>
                                <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-500/10" asChild>
                                    <a href="/ico">Go to ICO</a>
                                </Button>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {/* Stats / Controls Bar */}
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
                            placeholder="Search by ID or address..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full h-10 bg-background/50 border border-border focus:border-golden outline-none rounded-lg pl-10 pr-4 transition-all"
                        />
                    </div>

                    {/* Filters */}
                    <div className="flex bg-background/50 border border-border p-1 rounded-lg w-full md:w-auto overflow-x-auto">
                        {[
                            { id: "all", label: "All Assets", icon: Filter },
                            { id: "sale", label: "Fixed Price", icon: Tag },
                            { id: "auction", label: "Auctions", icon: Gavel }
                        ].map((btn) => (
                            <button
                                key={btn.id}
                                onClick={() => setFilter(btn.id as any)}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-all whitespace-nowrap ${filter === btn.id
                                    ? "bg-golden text-black shadow-sm"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                    }`}
                            >
                                <btn.icon className="w-3.5 h-3.5" />
                                {btn.label}
                            </button>
                        ))}
                    </div>

                    {/* Refresh */}
                    <Button variant="outline" size="icon" onClick={fetchData} disabled={loading} className="w-10 h-10 rounded-lg border-border hover:border-golden transition-colors shrink-0">
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </motion.div>

                {/* Listings Grid */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                        <Loader2 className="w-12 h-12 text-golden animate-spin" />
                        <p className="text-muted-foreground font-medium">Scanning the Lunes Network...</p>
                    </div>
                ) : filteredListings.length === 0 ? (
                    <Card className="bg-card border-dashed border-2 border-border max-w-lg mx-auto py-16">
                        <CardContent className="flex flex-col items-center text-center">
                            <Store className="w-16 h-16 text-muted-foreground mb-4 opacity-20" />
                            <h3 className="text-xl font-bold mb-2">No active listings</h3>
                            <p className="text-muted-foreground mb-6">Be the first to list an NFT for trade!</p>
                            <Button variant="outline" asChild>
                                <a href="/ico/my-nfts">List my NFT</a>
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        <AnimatePresence mode="popLayout">
                            {filteredListings.map((item) => (
                                <NFTMarketplaceCard
                                    key={item.listing.tokenId}
                                    listing={item.listing}
                                    nftData={item.nft}
                                    onRefresh={fetchData}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    );
}
