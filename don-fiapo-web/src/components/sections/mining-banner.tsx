"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pickaxe, Crown, ArrowRight, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/navigation";
import { API_CONFIG } from "@/lib/api/config";

export function MiningBanner() {
    const [isVisible, setIsVisible] = useState(false);
    const [hasFreeMint, setHasFreeMint] = useState(false);

    useEffect(() => {
        // Check for free mint availability
        const freeTier = API_CONFIG.nftTiers.find(t => t.price === 0);
        setHasFreeMint(!!freeTier && freeTier.supply > 0);

        // Show after a small delay
        const timer = setTimeout(() => setIsVisible(true), 1500);
        return () => clearTimeout(timer);
    }, []);

    if (!isVisible) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 100, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 100, scale: 0.9 }}
                className="fixed bottom-4 right-4 z-50 w-full max-w-md px-4 md:px-0"
            >
                <div className="bg-card/95 backdrop-blur-md border border-golden/30 rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.5)] p-6 relative overflow-hidden">
                    {/* Close Button */}
                    <button
                        onClick={() => setIsVisible(false)}
                        className="absolute top-2 right-2 p-2 hover:bg-white/10 rounded-full transition-colors z-20"
                    >
                        <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                    </button>

                    {/* Background decoration */}
                    <div className="absolute -top-4 -right-4 p-4 opacity-5 pointer-events-none">
                        <Crown className="w-32 h-32 text-golden rotate-12" />
                    </div>

                    <div className="space-y-4 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${hasFreeMint ? "bg-green-500/20 text-green-500 border-green-500/30" : "bg-golden/20 text-golden border-golden/30"} text-xs font-bold border shadow-sm`}>
                                {hasFreeMint ? <Sparkles className="w-3 h-3" /> : <Crown className="w-3 h-3" />}
                                <span>{hasFreeMint ? "Limit Time Offer" : "Decree #777"}</span>
                            </div>
                            <h3 className="text-xl font-display font-bold text-foreground">
                                {hasFreeMint ? (
                                    <>
                                        <span className="text-green-500">Free Mint</span> Available!
                                    </>
                                ) : (
                                    <>
                                        <span className="text-golden">Stop Being Poor.</span>
                                    </>
                                )}
                            </h3>
                        </div>

                        <p className="text-muted-foreground text-sm leading-relaxed">
                            {hasFreeMint
                                ? "Claim your Royal NFT for free and start mining tokens immediately. Don't miss this opportunity."
                                : "Peasants save money. Kings mint miners. Your wallet is crying for a Royal NFT."
                            }
                        </p>

                        <Link href="/ico/mint" className="block">
                            <Button size="lg" className="w-full group bg-golden hover:bg-golden/80 text-black font-bold shadow-[0_0_15px_rgba(255,215,0,0.2)] hover:shadow-[0_0_25px_rgba(255,215,0,0.4)] transition-all">
                                <Pickaxe className="w-4 h-4 mr-2 group-hover:-translate-y-1 group-hover:rotate-12 transition-transform" />
                                {hasFreeMint ? "Claim Free NFT" : "Start Mining Now"}
                                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
