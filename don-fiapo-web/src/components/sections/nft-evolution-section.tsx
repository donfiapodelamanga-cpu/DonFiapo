"use client";

import { motion } from "framer-motion";
import { Flame, ArrowRight, Sparkles } from "lucide-react";
import { Link } from "@/lib/navigation";

export function NFTEvolutionSection() {
    const evolutionSteps = [
        { step: 1, title: "Select 2+ NFTs", desc: "Same tier required" },
        { step: 2, title: "Burn & Forge", desc: "NFTs are permanently burned" },
        { step: 3, title: "Receive Evolved NFT", desc: "Higher tier + bonus" },
    ];

    return (
        <section className="py-20 bg-gradient-to-b from-orange-500/5 to-background">
            <div className="container mx-auto px-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-12"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/20 rounded-full text-orange-500 text-sm font-medium mb-4">
                        <Flame className="w-4 h-4" />
                        Deflationary Mechanism
                    </div>
                    <h2 className="text-3xl md:text-4xl font-bold font-display text-golden mb-4">
                        🔥 NFT Evolution System
                    </h2>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        Burn multiple NFTs to forge a higher-tier NFT with{" "}
                        <span className="text-golden font-bold">permanent mining bonuses</span>.
                        Each evolution increases your daily rewards by +10%.
                    </p>
                </motion.div>

                {/* Evolution Steps */}
                <div className="grid md:grid-cols-3 gap-6 mb-12">
                    {evolutionSteps.map((item, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.1 }}
                            className="relative"
                        >
                            <div className="bg-card rounded-xl p-6 border border-orange-500/20 hover:border-orange-500/50 transition-colors text-center">
                                <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-xl font-bold text-orange-500">{item.step}</span>
                                </div>
                                <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                                <p className="text-sm text-muted-foreground">{item.desc}</p>
                            </div>
                            {idx < 2 && (
                                <div className="hidden md:block absolute top-1/2 -right-3 transform -translate-y-1/2">
                                    <ArrowRight className="w-6 h-6 text-orange-500/50" />
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>

                {/* Benefits Grid */}
                <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-8">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-6"
                    >
                        <h3 className="font-bold text-orange-500 flex items-center gap-2 mb-3">
                            <Flame className="w-5 h-5" />
                            Deflationary Impact
                        </h3>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li>• Burn 2 NFTs → Receive 1 NFT = <strong className="text-golden">-1 NFT supply</strong></li>
                            <li>• Projected <strong>-70% NFT supply</strong> in Year 1</li>
                            <li>• Increased scarcity = Higher value</li>
                        </ul>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="bg-green-500/10 border border-green-500/30 rounded-xl p-6"
                    >
                        <h3 className="font-bold text-green-500 flex items-center gap-2 mb-3">
                            <Sparkles className="w-5 h-5" />
                            +10% Permanent Bonus
                        </h3>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li>• Each evolution = <strong className="text-golden">+10% mining bonus</strong></li>
                            <li>• Bonus is <strong>cumulative</strong> (up to +50%)</li>
                            <li>• Example: Royal Crown + 3 evos = <strong>3,250 FIAPO/day</strong></li>
                        </ul>
                    </motion.div>
                </div>

                {/* CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center"
                >
                    <Link
                        href="/ico/my-nfts"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-lg font-bold hover:bg-orange-600 transition-colors"
                    >
                        <Flame className="w-5 h-5" />
                        Start Evolving NFTs
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                    <p className="text-xs text-muted-foreground mt-4">
                        Requires 2+ NFTs of the same tier. Evolution burns source NFTs permanently.
                    </p>
                </motion.div>
            </div>
        </section>
    );
}
