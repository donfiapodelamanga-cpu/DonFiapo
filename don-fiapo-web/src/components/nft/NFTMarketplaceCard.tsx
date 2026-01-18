"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Tag, Gavel, Clock, ExternalLink, User, Loader2, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Listing } from "@/lib/api/contract-abi";
import { API_CONFIG } from "@/lib/api/config";
import { useState, useEffect } from "react";
import { buyNFT, bidNFT, settleAuction, cancelListing } from "@/lib/api/contract";
import { useWalletStore } from "@/lib/stores";
import { useToast } from "@/components/ui/toast";

interface NFTMarketplaceCardProps {
    listing: Listing;
    nftData: any; // Simplified NFT data from ICO mapping
    onRefresh: () => void;
}

export function NFTMarketplaceCard({ listing, nftData, onRefresh }: NFTMarketplaceCardProps) {
    const { lunesAddress, lunesConnected } = useWalletStore();
    const { addToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [timeLeft, setTimeLeft] = useState("");

    const tierConfig = API_CONFIG.nftTiers[nftData.nftType] || API_CONFIG.nftTiers[0];
    const isSeller = lunesAddress === listing.seller;

    // Format price
    const formattedPrice = (Number(listing.price) / 10 ** 8).toLocaleString();
    const formattedBid = (Number(listing.highestBid) / 10 ** 8).toLocaleString();

    // Auction timer
    useEffect(() => {
        if (!listing.isAuction || !listing.isActive) return;

        const timer = setInterval(() => {
            const now = Date.now();
            const end = listing.auctionEnd;
            const diff = end - now;

            if (diff <= 0) {
                setTimeLeft("Ended");
                clearInterval(timer);
            } else {
                const h = Math.floor(diff / 3600000);
                const m = Math.floor((diff % 3600000) / 60000);
                const s = Math.floor((diff % 60000) / 1000);
                setTimeLeft(`${h}h ${m}m ${s}s`);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [listing]);

    const handleAction = async () => {
        if (!lunesConnected || !lunesAddress) {
            addToast("info", "Wallet Required", "Please connect your wallet to interact.");
            return;
        }

        setLoading(true);
        try {
            if (isSeller) {
                // Cancel listing
                await cancelListing(lunesAddress, listing.tokenId);
                addToast("success", "Listing Cancelled", "Your NFT has been returned to your wallet.");
            } else if (listing.isAuction) {
                if (timeLeft === "Ended") {
                    // Settle
                    await settleAuction(lunesAddress, listing.tokenId);
                    addToast("success", "Auction Settled", "The trade has been finalized.");
                } else {
                    // Bid
                    const minBid = listing.highestBid > BigInt(0) ? listing.highestBid + BigInt(10000000) : listing.price;
                    const bidAmount = prompt(`Enter bid amount (Min: ${(Number(minBid) / 10 ** 8).toFixed(2)} Lunes):`, (Number(minBid) / 10 ** 8).toString());
                    if (!bidAmount) return;

                    const scaledBid = (BigInt(Math.floor(parseFloat(bidAmount) * 10 ** 8))).toString();
                    await bidNFT(lunesAddress, listing.tokenId, scaledBid);
                    addToast("success", "Bid Placed", "You are currently the highest bidder!");
                }
            } else {
                // Buy
                await buyNFT(lunesAddress, listing.tokenId, listing.price.toString());
                addToast("success", "Purchase Successful!", "The NFT has been transferred to your wallet.");
            }
            onRefresh();
        } catch (e: any) {
            addToast("error", "Transaction Failed", e.message || "Unknown error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="h-full"
        >
            <Card className="bg-card border-border border-2 overflow-hidden h-full flex flex-col group hover:border-golden/50 transition-all duration-300">
                <div className="relative aspect-square">
                    <Image
                        src={tierConfig.image}
                        alt={tierConfig.name}
                        fill
                        className="object-contain p-4 group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-2 left-2 flex gap-2">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${listing.isAuction ? "bg-purple-600 text-white" : "bg-green-600 text-white"
                            }`}>
                            {listing.isAuction ? "Auction" : "Direct Sale"}
                        </span>
                    </div>
                    {listing.isAuction && (
                        <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 backdrop-blur-md rounded border border-golden/30 flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-golden" />
                            <span className="text-xs font-mono text-golden">{timeLeft}</span>
                        </div>
                    )}
                </div>

                <CardContent className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-start mb-1">
                            <h3 className="font-bold text-lg leading-tight">{tierConfig.shortName}</h3>
                            <span className="text-xs text-muted-foreground font-mono">#{listing.tokenId}</span>
                        </div>

                        <div className="flex items-center gap-2 mb-4">
                            <User className="w-3 h-3 text-muted-foreground" />
                            <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                                {listing.seller}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="p-2 bg-muted/30 rounded-lg">
                                <p className="text-[10px] text-muted-foreground uppercase mb-0.5">
                                    {listing.isAuction ? "Min. Price" : "Fixed Price"}
                                </p>
                                <div className="flex items-center gap-1">
                                    <span className="font-bold text-sm text-golden">{formattedPrice}</span>
                                    <span className="text-[8px] text-golden/60">LUNES</span>
                                </div>
                            </div>
                            {listing.isAuction && (
                                <div className="p-2 bg-muted/30 rounded-lg bg-golden/5 border border-golden/10">
                                    <p className="text-[10px] text-golden uppercase mb-0.5">Highest Bid</p>
                                    <div className="flex items-center gap-1">
                                        <span className="font-bold text-sm text-golden">{formattedBid > "0" ? formattedBid : "No bids"}</span>
                                        <span className="text-[8px] text-golden/60">LUNES</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <Button
                        className={`w-full gap-2 ${isSeller ? "variant-outline border-destructive/30 text-destructive hover:bg-destructive/10" : ""}`}
                        onClick={handleAction}
                        disabled={loading}
                    >
                        {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : isSeller ? (
                            <>Cancel Listing</>
                        ) : listing.isAuction ? (
                            timeLeft === "Ended" ? <>Settle Auction</> : <><Gavel className="w-4 h-4" /> Place Bid</>
                        ) : (
                            <><CreditCard className="w-4 h-4" /> Buy Now</>
                        )}
                    </Button>
                </CardContent>
            </Card>
        </motion.div>
    );
}
