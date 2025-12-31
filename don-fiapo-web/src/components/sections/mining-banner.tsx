"use client";

import { motion } from "framer-motion";
import { Pickaxe, Crown, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/navigation";

export function MiningBanner() {
    return (
        <section className="py-8 bg-background relative overflow-hidden">
            <div className="container mx-auto px-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="bg-gradient-to-r from-golden/20 via-golden/10 to-transparent border border-golden/30 rounded-2xl p-6 md:p-8 relative overflow-hidden"
                >
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Crown className="w-48 h-48 text-golden rotate-12" />
                    </div>

                    <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                        <div className="flex-1 space-y-4 text-center md:text-left">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-golden/20 text-golden text-sm font-bold border border-golden/30">
                                <Crown className="w-4 h-4" />
                                <span>Royal Decree #777</span>
                            </div>

                            <h3 className="text-2xl md:text-3xl font-display font-bold text-foreground">
                                <span className="text-golden">Stop Being Poor.</span> Start Mining.
                            </h3>

                            <p className="text-muted-foreground text-lg max-w-xl">
                                Peasants save money. Kings mint miners. Your wallet is crying for a Royal NFT to start earning passive income. Do not disappoint the Don.
                            </p>
                        </div>

                        <div className="shrink-0">
                            <Link href="/ico/mint">
                                <Button size="xl" className="group bg-golden hover:bg-golden/80 text-black font-bold text-lg px-8 h-14 shadow-[0_0_20px_rgba(255,215,0,0.3)] hover:shadow-[0_0_40px_rgba(255,215,0,0.5)] transition-all">
                                    <Pickaxe className="w-5 h-5 mr-2 group-hover:-translate-y-1 group-hover:rotate-12 transition-transform" />
                                    Start Mining Now
                                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
