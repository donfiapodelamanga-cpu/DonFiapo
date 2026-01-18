"use client";

import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Clock, Rocket, Gift, CheckCircle2 } from "lucide-react";

export function AirdropTimeline() {
    const timeline = [
        {
            icon: "🎯",
            title: "Point Scoring Begins!",
            desc: "First NFT sold - Start accumulating points now",
            status: "current",
            color: "text-golden"
        },
        {
            icon: "⛏️",
            title: "NFT Mining Period",
            desc: "112 days of automatic token mining",
            status: "upcoming",
            color: "text-golden-deep"
        },
        {
            icon: "🏁",
            title: "All NFTs Sold",
            desc: "Last of 157,000 NFTs minted - Scoring continues",
            status: "upcoming",
            color: "text-sand"
        },
        {
            icon: "⏰",
            title: "6-Month Waiting Period",
            desc: "Still accumulating points for fair distribution",
            status: "upcoming",
            color: "text-cream"
        },
        {
            icon: "🎁",
            title: "AIRDROP DISTRIBUTION!",
            desc: "Tokens distributed based on accumulated points!",
            status: "future",
            color: "text-golden glow-gold"
        }
    ];

    return (
        <div className="space-y-8">
            {/* Important Notice */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-golden/10 border-2 border-golden/50 rounded-2xl p-6 text-center"
            >
                <Clock className="w-12 h-12 text-golden mx-auto mb-3" />
                <h3 className="text-2xl font-bold text-golden mb-2">
                    ⏰ IMPORTANT: Airdrop Timeline
                </h3>
                <p className="text-lg text-foreground mb-2">
                    <span className="font-bold text-golden">Scoring STARTS</span> at first NFT sale ·{" "}
                    <span className="font-bold text-golden">Distribution HAPPENS</span> 6 months after{" "}
                    <span className="font-bold">ALL 157,000 NFTs</span> are sold
                </p>
                <p className="text-sm text-muted-foreground">
                    Everyone has equal time to accumulate points · No negative impact on future sales or price
                </p>
            </motion.div>

            {/* Timeline */}
            <Card className="bg-card">
                <CardHeader>
                    <CardTitle className="text-2xl text-golden">🗓️ Airdrop Timeline</CardTitle>
                    <CardDescription>
                        Complete journey from ICO to your first airdrop rewards
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="relative">
                        {/* Vertical Line */}
                        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

                        {/* Timeline Items */}
                        <div className="space-y-8">
                            {timeline.map((item, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="relative pl-16"
                                >
                                    {/* Icon Circle */}
                                    <div className={`absolute left-0 w-12 h-12 rounded-full flex items-center justify-center text-2xl ${item.status === 'current' ? 'bg-golden/20 ring-2 ring-golden' :
                                        item.status === 'upcoming' ? 'bg-muted ring-2 ring-border' :
                                            'bg-golden/10 ring-2 ring-golden/30'
                                        }`}>
                                        {item.icon}
                                    </div>

                                    {/* Content */}
                                    <div className={`bg-muted/50 rounded-lg p-4 border ${item.status === 'future' ? 'border-golden' : 'border-border'
                                        }`}>
                                        <div className="flex items-start justify-between mb-1">
                                            <h4 className={`font-bold ${item.color}`}>
                                                {item.title}
                                            </h4>
                                            {item.status === 'current' && (
                                                <span className="text-xs px-2 py-1 bg-golden/20 text-golden rounded-full">
                                                    Now
                                                </span>
                                            )}
                                            {item.status === 'future' && (
                                                <span className="text-xs px-2 py-1 bg-golden/20 text-golden rounded-full">
                                                    Goal
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Why Wait 6 Months? */}
                    <div className="mt-8 bg-golden/5 border border-golden/20 rounded-lg p-6">
                        <h4 className="font-bold text-golden mb-4 flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5" />
                            Why Wait 6 Months?
                        </h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li className="flex items-start gap-2">
                                <span className="text-green-500 mt-0.5">✓</span>
                                <span><strong className="text-foreground">Equal Opportunity:</strong> Everyone has equal time to accumulate points from the start</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-green-500 mt-0.5">✓</span>
                                <span><strong className="text-foreground">Mining Completed:</strong> All NFTs finish their 112-day mining period</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-green-500 mt-0.5">✓</span>
                                <span><strong className="text-foreground">Tokens in Circulation:</strong> Mature market ready to absorb distribution</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-green-500 mt-0.5">✓</span>
                                <span><strong className="text-foreground">No Price Impact:</strong> Distribution doesn't negatively affect future sales or token price</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-green-500 mt-0.5">✓</span>
                                <span><strong className="text-foreground">Reward Early Adopters:</strong> More time accumulating = more points = bigger rewards</span>
                            </li>
                        </ul>
                    </div>

                    {/* Example Timeline */}
                    <div className="mt-6 bg-card-foreground/5 rounded-lg p-4">
                        <p className="text-sm font-medium text-muted-foreground mb-3">Example Timeline:</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                            <div className="bg-muted/50 rounded p-3">
                                <p className="text-muted-foreground">Jan 2026</p>
                                <p className="font-bold text-foreground">🎯 First NFT = Points Start!</p>
                            </div>
                            <div className="bg-muted/50 rounded p-3">
                                <p className="text-muted-foreground">Mar 2026</p>
                                <p className="font-bold text-foreground">🏁 Last NFT Sold</p>
                            </div>
                            <div className="bg-golden/20 border border-golden rounded p-3">
                                <p className="text-muted-foreground">Sep 2026</p>
                                <p className="font-bold text-golden">🎁 DISTRIBUTION!</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
