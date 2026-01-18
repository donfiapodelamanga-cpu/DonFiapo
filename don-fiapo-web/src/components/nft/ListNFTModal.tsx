"use client";

import { useState } from "react";
import { X, Tag, Gavel, Calendar, Info, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useWalletStore } from "@/lib/stores";
import { useToast } from "@/components/ui/toast";
import { listNFTForSale, listNFTForAuction } from "@/lib/api/contract";

interface ListNFTModalProps {
    isOpen: boolean;
    onClose: () => void;
    tokenId: number;
    nftName: string;
    onSuccess: () => void;
}

export function ListNFTModal({ isOpen, onClose, tokenId, nftName, onSuccess }: ListNFTModalProps) {
    const { lunesAddress } = useWalletStore();
    const { addToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [listType, setListType] = useState<"sale" | "auction">("sale");
    const [price, setPrice] = useState("");
    const [duration, setDuration] = useState("24"); // Hours

    if (!isOpen) return null;

    const handleList = async () => {
        if (!lunesAddress) return;
        if (!price || parseFloat(price) <= 0) {
            addToast("error", "Invalid Price", "Please enter a valid amount.");
            return;
        }

        setLoading(true);
        try {
            // Standardize to small units (8 decimals)
            const priceScaled = (BigInt(Math.floor(parseFloat(price) * 10 ** 8))).toString();

            let tx;
            if (listType === "sale") {
                tx = await listNFTForSale(lunesAddress, tokenId, priceScaled);
            } else {
                const durationSeconds = parseInt(duration) * 3600;
                tx = await listNFTForAuction(lunesAddress, tokenId, priceScaled, durationSeconds);
            }

            if (tx) {
                addToast("success", "Listing Created!", `NFT #${tokenId} is now on the marketplace.`);
                onSuccess();
                onClose();
            }
        } catch (e: any) {
            console.error("Listing failed:", e);
            addToast("error", "Listing Failed", e.message || "An error occurred.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-card border-border border-2 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl shadow-golden/10"
            >
                <div className="p-6 border-b border-border flex justify-between items-center bg-muted/30">
                    <h2 className="text-xl font-bold font-display text-golden flex items-center gap-2">
                        <Tag className="w-5 h-5" /> List NFT for Trade
                    </h2>
                    <button onClick={onClose} className="text-muted-foreground hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="flex bg-muted rounded-lg p-1">
                        <button
                            onClick={() => setListType("sale")}
                            className={`flex-1 py-2 rounded-md transition-all flex items-center justify-center gap-2 font-medium ${listType === "sale" ? "bg-card text-golden shadow-sm" : "text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            <Tag className="w-4 h-4" /> Fixed Price
                        </button>
                        <button
                            onClick={() => setListType("auction")}
                            className={`flex-1 py-2 rounded-md transition-all flex items-center justify-center gap-2 font-medium ${listType === "auction" ? "bg-card text-golden shadow-sm" : "text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            <Gavel className="w-4 h-4" /> Auction
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                                {listType === "sale" ? "Sale Price (Lunes)" : "Minimum Bid (Lunes)"}
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full bg-muted/50 border-border border rounded-xl px-4 py-3 outline-none focus:border-golden/50 transition-colors font-mono"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-golden font-bold text-sm">LUNES</span>
                            </div>
                        </div>

                        {listType === "auction" && (
                            <div>
                                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                                    Auction Duration
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {["24", "72", "168"].map((hours) => (
                                        <button
                                            key={hours}
                                            onClick={() => setDuration(hours)}
                                            className={`py-2 rounded-lg border flex flex-col items-center justify-center transition-all ${duration === hours
                                                    ? "border-golden bg-golden/10 text-golden"
                                                    : "border-border text-muted-foreground hover:border-muted-foreground/50"
                                                }`}
                                        >
                                            <span className="font-bold">{hours}h</span>
                                            <span className="text-[10px]">
                                                {hours === "24" ? "1 Day" : hours === "72" ? "3 Days" : "1 Week"}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="p-4 bg-golden/5 border border-golden/20 rounded-xl flex items-start gap-3">
                            <Info className="w-5 h-5 text-golden flex-shrink-0 mt-0.5" />
                            <div className="text-xs text-muted-foreground space-y-1">
                                <p>• A 5% transaction fee applies upon successful sale.</p>
                                <p>• Your NFT will be held in escrow by the contract.</p>
                                <p>• You can cancel your listing at any time to regain your NFT.</p>
                            </div>
                        </div>
                    </div>

                    <Button
                        className="w-full h-12 text-lg font-bold"
                        onClick={handleList}
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                Confirming Transaction...
                            </>
                        ) : (
                            `List ${nftName} #${tokenId}`
                        )}
                    </Button>
                </div>
            </motion.div>
        </div>
    );
}
