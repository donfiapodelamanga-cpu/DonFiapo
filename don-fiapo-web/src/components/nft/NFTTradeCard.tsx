"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { ArrowLeftRight, User, Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TradeOffer } from "@/lib/api/contract-abi";
import { API_CONFIG } from "@/lib/api/config";
import { useState } from "react";
import { acceptTrade, cancelTrade } from "@/lib/api/marketplace-api";
import { useWalletStore } from "@/lib/stores";
import { useToast } from "@/components/ui/toast";

interface NFTTradeCardProps {
    trade: TradeOffer;
    nftOfferedData: any;
    onRefresh: () => void;
}

export function NFTTradeCard({ trade, nftOfferedData, onRefresh }: NFTTradeCardProps) {
    const { lunesAddress, lunesConnected } = useWalletStore();
    const { addToast } = useToast();
    const [loading, setLoading] = useState(false);

    const offeredTier = nftOfferedData?.nftType ?? 0;
    const tierConfig = API_CONFIG.nftTiers[offeredTier] || API_CONFIG.nftTiers[0];
    const isOfferer = lunesAddress === trade.offerer;
    const isTargeted = trade.counterparty && trade.counterparty === lunesAddress;
    const wantedTierConfig = trade.wantedTier != null ? API_CONFIG.nftTiers[trade.wantedTier] : null;

    const handleAccept = async () => {
        if (!lunesConnected || !lunesAddress) {
            addToast("info", "Carteira Necessária", "Conecte sua carteira para aceitar a troca.");
            return;
        }

        let acceptorNftId: number;
        if (trade.nftIdWanted > 0) {
            acceptorNftId = trade.nftIdWanted;
        } else {
            const input = prompt("Digite o ID do seu NFT para trocar:");
            if (!input) return;
            acceptorNftId = parseInt(input, 10);
            if (isNaN(acceptorNftId)) {
                addToast("error", "ID Inválido", "Digite um número válido.");
                return;
            }
        }

        setLoading(true);
        try {
            await acceptTrade(lunesAddress, trade.tradeId, acceptorNftId);
            addToast("success", "Troca Realizada!", "Os NFTs foram trocados com sucesso.");
            onRefresh();
        } catch (e: any) {
            addToast("error", "Erro na Troca", e.message || "Erro desconhecido");
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async () => {
        if (!lunesConnected || !lunesAddress) return;
        setLoading(true);
        try {
            await cancelTrade(lunesAddress, trade.tradeId);
            addToast("success", "Troca Cancelada", "Sua oferta foi removida.");
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
            <Card className="bg-card border-border border-2 overflow-hidden h-full flex flex-col group hover:border-cyan-500/50 transition-all duration-300">
                <div className="relative aspect-square">
                    <Image
                        src={tierConfig.image}
                        alt={tierConfig.name}
                        fill
                        className="object-contain p-4 group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-2 left-2 flex gap-2">
                        <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-cyan-600 text-white">
                            Troca P2P
                        </span>
                        {trade.counterparty && (
                            <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-yellow-600/80 text-white flex items-center gap-1">
                                <Shield className="w-2.5 h-2.5" /> Privada
                            </span>
                        )}
                    </div>
                    <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 backdrop-blur-md rounded border border-cyan-500/30 flex items-center gap-1.5">
                        <ArrowLeftRight className="w-3 h-3 text-cyan-400" />
                        <span className="text-xs font-mono text-cyan-400">
                            #{trade.nftIdOffered}
                        </span>
                    </div>
                </div>

                <CardContent className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-start mb-1">
                            <h3 className="font-bold text-lg leading-tight">{tierConfig.shortName}</h3>
                            <span className="text-xs text-muted-foreground font-mono">#{trade.nftIdOffered}</span>
                        </div>

                        <div className="flex items-center gap-2 mb-4">
                            <User className="w-3 h-3 text-muted-foreground" />
                            <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                                {trade.offerer}
                            </span>
                        </div>

                        <div className="p-3 bg-cyan-500/5 border border-cyan-500/20 rounded-lg mb-4">
                            <p className="text-[10px] text-cyan-400 uppercase mb-1 font-semibold">Procura</p>
                            {trade.nftIdWanted > 0 ? (
                                <p className="text-sm font-bold text-foreground">
                                    NFT #{trade.nftIdWanted}
                                </p>
                            ) : wantedTierConfig ? (
                                <p className="text-sm font-bold text-foreground">
                                    Qualquer {wantedTierConfig.shortName}
                                </p>
                            ) : (
                                <p className="text-sm font-bold text-foreground">
                                    Qualquer NFT
                                </p>
                            )}
                        </div>

                        {isTargeted && !isOfferer && (
                            <div className="flex items-center gap-2 mb-3 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                                <Shield className="w-3.5 h-3.5 text-yellow-400" />
                                <span className="text-xs text-yellow-400 font-medium">Oferta direcionada para você!</span>
                            </div>
                        )}
                    </div>

                    {isOfferer ? (
                        <Button
                            variant="outline"
                            className="w-full border-destructive/30 text-destructive hover:bg-destructive/10"
                            onClick={handleCancel}
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Cancelar Troca"}
                        </Button>
                    ) : (
                        <Button
                            className="w-full gap-2 bg-cyan-600 hover:bg-cyan-700"
                            onClick={handleAccept}
                            disabled={loading || (!!trade.counterparty && !isTargeted)}
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                                <><ArrowLeftRight className="w-4 h-4" /> Aceitar Troca</>
                            )}
                        </Button>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}
