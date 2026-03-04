"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Tag, User, Loader2, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Listing } from "@/lib/api/contract-abi";
import { API_CONFIG } from "@/lib/api/config";
import { useState } from "react";
import { buyNFT, cancelListing, currencyLabel } from "@/lib/api/marketplace-api";
import { useWalletStore } from "@/lib/stores";
import { useToast } from "@/components/ui/toast";

interface NFTMarketplaceCardProps {
    listing: Listing;
    nftData: any;
    onRefresh: () => void;
}

export function NFTMarketplaceCard({ listing, nftData, onRefresh }: NFTMarketplaceCardProps) {
    const currency = currencyLabel(listing.currency);
    const { lunesAddress, lunesConnected } = useWalletStore();
    const { addToast } = useToast();
    const [loading, setLoading] = useState(false);

    const tierConfig = API_CONFIG.nftTiers[listing.nftTier] || API_CONFIG.nftTiers[0];
    const isSeller = lunesAddress === listing.seller;

    const formattedPrice = (Number(listing.price) / 10 ** 8).toLocaleString();

    const handleBuy = async () => {
        if (!lunesConnected || !lunesAddress) {
            addToast("info", "Carteira Necessária", "Conecte sua carteira para comprar.");
            return;
        }
        setLoading(true);
        try {
            await buyNFT(lunesAddress, listing.nftId, listing.price.toString(), listing.currency);
            addToast("success", "Compra Realizada!", "O NFT foi transferido para sua carteira.");
            onRefresh();
        } catch (e: any) {
            addToast("error", "Erro na Transação", e.message || "Erro desconhecido");
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async () => {
        if (!lunesConnected || !lunesAddress) return;
        setLoading(true);
        try {
            await cancelListing(lunesAddress, listing.nftId);
            addToast("success", "Listagem Cancelada", "Seu NFT foi devolvido.");
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
            <Card className="bg-card border-border border-2 overflow-hidden h-full flex flex-col group hover:border-golden/50 transition-all duration-300">
                <div className="relative aspect-square">
                    <Image
                        src={tierConfig.image}
                        alt={tierConfig.name}
                        fill
                        className="object-contain p-4 group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-2 left-2 flex gap-2">
                        <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-green-600 text-white">
                            Venda Direta
                        </span>
                    </div>
                </div>

                <CardContent className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-start mb-1">
                            <h3 className="font-bold text-lg leading-tight">{tierConfig.shortName}</h3>
                            <span className="text-xs text-muted-foreground font-mono">#{listing.nftId}</span>
                        </div>

                        <div className="flex items-center gap-2 mb-4">
                            <User className="w-3 h-3 text-muted-foreground" />
                            <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                                {listing.seller}
                            </span>
                        </div>

                        <div className="p-2 bg-muted/30 rounded-lg mb-4">
                            <p className="text-[10px] text-muted-foreground uppercase mb-0.5">
                                <Tag className="w-3 h-3 inline mr-1" />Preço Fixo
                            </p>
                            <div className="flex items-center gap-1">
                                <span className="font-bold text-sm text-golden">{formattedPrice}</span>
                                <span className="text-[8px] text-golden/60">{currency}</span>
                            </div>
                        </div>
                    </div>

                    {isSeller ? (
                        <Button
                            variant="outline"
                            className="w-full border-destructive/30 text-destructive hover:bg-destructive/10"
                            onClick={handleCancel}
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Cancelar Listagem"}
                        </Button>
                    ) : (
                        <Button
                            className="w-full gap-2"
                            onClick={handleBuy}
                            disabled={loading}
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <><CreditCard className="w-4 h-4" /> Comprar Agora</>
                            )}
                        </Button>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}
