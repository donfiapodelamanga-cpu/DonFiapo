"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Gavel, Clock, User, Loader2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Auction } from "@/lib/api/contract-abi";
import { API_CONFIG } from "@/lib/api/config";
import { useState, useEffect } from "react";
import { placeBid, finalizeAuction, cancelAuction, currencyLabel } from "@/lib/api/marketplace-api";
import { useWalletStore } from "@/lib/stores";
import { useToast } from "@/components/ui/toast";

interface NFTAuctionCardProps {
    auction: Auction;
    nftData: any;
    onRefresh: () => void;
}

export function NFTAuctionCard({ auction, nftData, onRefresh }: NFTAuctionCardProps) {
    const currency = currencyLabel(auction.currency);
    const { lunesAddress, lunesConnected } = useWalletStore();
    const { addToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [timeLeft, setTimeLeft] = useState("");
    const [isEnded, setIsEnded] = useState(false);

    const tierConfig = API_CONFIG.nftTiers[auction.nftTier] || API_CONFIG.nftTiers[0];
    const isSeller = lunesAddress === auction.seller;
    const isWinner = lunesAddress === auction.highestBidder;

    const formattedMinPrice = (Number(auction.minPrice) / 10 ** 8).toLocaleString();
    const formattedBid = (Number(auction.highestBid) / 10 ** 8).toLocaleString();

    // Auction timer
    useEffect(() => {
        if (!auction.active) return;

        const timer = setInterval(() => {
            const now = Date.now();
            const end = auction.endTime;
            const diff = end - now;

            if (diff <= 0) {
                setTimeLeft("Encerrado");
                setIsEnded(true);
                clearInterval(timer);
            } else {
                const h = Math.floor(diff / 3600000);
                const m = Math.floor((diff % 3600000) / 60000);
                const s = Math.floor((diff % 60000) / 1000);
                setTimeLeft(`${h}h ${m}m ${s}s`);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [auction]);

    const handlePlaceBid = async () => {
        if (!lunesConnected || !lunesAddress) {
            addToast("info", "Carteira Necessária", "Conecte sua carteira para dar lances.");
            return;
        }

        const minBid = auction.highestBid > BigInt(0)
            ? Number(auction.highestBid) / 10 ** 8 + 0.1
            : Number(auction.minPrice) / 10 ** 8;

        const bidAmount = prompt(
            `Digite o valor do lance (Mínimo: ${minBid.toFixed(2)} ${currency}):`,
            minBid.toFixed(2)
        );
        if (!bidAmount) return;

        setLoading(true);
        try {
            const scaledBid = BigInt(Math.floor(parseFloat(bidAmount) * 10 ** 8)).toString();
            await placeBid(lunesAddress, auction.auctionId, scaledBid, auction.currency);
            addToast("success", "Lance Realizado!", "Você é o maior licitante!");
            onRefresh();
        } catch (e: any) {
            addToast("error", "Erro no Lance", e.message || "Erro desconhecido");
        } finally {
            setLoading(false);
        }
    };

    const handleFinalize = async () => {
        if (!lunesConnected || !lunesAddress) return;
        setLoading(true);
        try {
            await finalizeAuction(lunesAddress, auction.auctionId);
            addToast("success", "Leilão Finalizado", "A transação foi concluída.");
            onRefresh();
        } catch (e: any) {
            addToast("error", "Erro", e.message || "Erro desconhecido");
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async () => {
        if (!lunesConnected || !lunesAddress) return;
        setLoading(true);
        try {
            await cancelAuction(lunesAddress, auction.auctionId);
            addToast("success", "Leilão Cancelado", "Seu NFT foi devolvido.");
            onRefresh();
        } catch (e: any) {
            addToast("error", "Erro", e.message || "Erro desconhecido");
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
            <Card className="bg-card border-border border-2 overflow-hidden h-full flex flex-col group hover:border-purple-500/50 transition-all duration-300">
                <div className="relative aspect-square">
                    <Image
                        src={tierConfig.image}
                        alt={tierConfig.name}
                        fill
                        className="object-contain p-4 group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-2 left-2 flex gap-2">
                        <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-600 text-white">
                            Leilão
                        </span>
                    </div>
                    <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 backdrop-blur-md rounded border border-purple-500/30 flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-purple-400" />
                        <span className="text-xs font-mono text-purple-400">{timeLeft || "..."}</span>
                    </div>
                </div>

                <CardContent className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-start mb-1">
                            <h3 className="font-bold text-lg leading-tight">{tierConfig.shortName}</h3>
                            <span className="text-xs text-muted-foreground font-mono">#{auction.nftId}</span>
                        </div>

                        <div className="flex items-center gap-2 mb-4">
                            <User className="w-3 h-3 text-muted-foreground" />
                            <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                                {auction.seller}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="p-2 bg-muted/30 rounded-lg">
                                <p className="text-[10px] text-muted-foreground uppercase mb-0.5">Preço Mín.</p>
                                <div className="flex items-center gap-1">
                                    <span className="font-bold text-sm text-golden">{formattedMinPrice}</span>
                                    <span className="text-[8px] text-golden/60">{currency}</span>
                                </div>
                            </div>
                            <div className="p-2 bg-muted/30 rounded-lg bg-purple-500/5 border border-purple-500/10">
                                <p className="text-[10px] text-purple-400 uppercase mb-0.5">Maior Lance</p>
                                <div className="flex items-center gap-1">
                                    <span className="font-bold text-sm text-purple-400">
                                        {Number(auction.highestBid) > 0 ? formattedBid : "—"}
                                    </span>
                                    {Number(auction.highestBid) > 0 && (
                                        <span className="text-[8px] text-purple-400/60">{currency}</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {isWinner && !isEnded && (
                            <div className="flex items-center gap-2 mb-3 p-2 bg-green-500/10 border border-green-500/20 rounded-lg">
                                <Trophy className="w-3.5 h-3.5 text-green-400" />
                                <span className="text-xs text-green-400 font-medium">Você está ganhando!</span>
                            </div>
                        )}
                    </div>

                    {isSeller && !auction.highestBidder ? (
                        <Button
                            variant="outline"
                            className="w-full border-destructive/30 text-destructive hover:bg-destructive/10"
                            onClick={handleCancel}
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Cancelar Leilão"}
                        </Button>
                    ) : isEnded ? (
                        <Button
                            className="w-full gap-2 bg-purple-600 hover:bg-purple-700"
                            onClick={handleFinalize}
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                                <><Trophy className="w-4 h-4" /> Finalizar Leilão</>
                            )}
                        </Button>
                    ) : (
                        <Button
                            className="w-full gap-2 bg-purple-600 hover:bg-purple-700"
                            onClick={handlePlaceBid}
                            disabled={loading || isSeller}
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                                <><Gavel className="w-4 h-4" /> Dar Lance</>
                            )}
                        </Button>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}
