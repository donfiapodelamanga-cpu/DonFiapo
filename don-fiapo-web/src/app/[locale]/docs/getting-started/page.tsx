"use client";

import { motion } from "framer-motion";
import { Wallet, Coins, Pickaxe, TrendingUp, ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/navigation";

export default function GettingStartedPage() {
    const steps = [
        {
            icon: Wallet,
            title: "1. Connect Your Wallet",
            description: "Start by connecting your Lunes or Solana wallet to the dashboard.",
            content: "Don Fiapo supports both Lunes Network and Solana wallets. Click the 'Connect Wallet' button in the top right corner provided by the interface.",
            action: { label: "Go to Dashboard", href: "/" }
        },
        {
            icon: Coins,
            title: "2. Get $FIAPO Tokens",
            description: "Participate in the ICO or buy from supported exchanges.",
            content: "You need $FIAPO tokens to interact with the ecosystem. Check the ICO page for current rounds and pricing.",
            action: { label: "View ICO", href: "/ico" }
        },
        {
            icon: Pickaxe,
            title: "3. Mint NFTs",
            description: "Mint your character to start mining.",
            content: "Choose from different NFT tiers, starting from Free to Royal. Higher tiers offer better mining power and rewards.",
            action: { label: "Mint NFT", href: "/ico/mint" }
        },
        {
            icon: TrendingUp,
            title: "4. Stake & Earn",
            description: "Stake your tokens or NFTs to earn passive rewards.",
            content: "Lock your $FIAPO tokens in staking pools to earn up to 70% APY. Different pools offer different lock-up periods and rewards.",
            action: { label: "Start Staking", href: "/staking" }
        }
    ];

    return (
        <div className="min-h-screen pt-24 pb-16">
            <div className="container mx-auto px-4 max-w-4xl">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
                    <div className="flex items-center gap-2 text-green-500 mb-4">
                        <TrendingUp className="w-8 h-8" />
                        <span className="font-display text-xl">Quick Start Guide</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold font-display text-foreground mb-4">
                        Getting Started
                    </h1>
                    <p className="text-xl text-muted-foreground">
                        Everything you need to know to start your journey with Don Fiapo.
                    </p>
                </motion.div>

                <div className="space-y-8">
                    {steps.map((step, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <Card className="bg-card border-golden/10 overflow-hidden relative">
                                {index < steps.length - 1 && (
                                    <div className="absolute left-8 top-20 bottom-0 w-0.5 bg-golden/10 hidden md:block -z-10 translate-y-4" />
                                )}
                                <CardContent className="p-6 md:p-8 flex flex-col md:flex-row gap-6">
                                    <div className="shrink-0">
                                        <div className="w-16 h-16 rounded-2xl bg-golden/10 flex items-center justify-center text-golden">
                                            <step.icon className="w-8 h-8" />
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-2xl font-bold font-display text-golden mb-2">{step.title}</h3>
                                        <p className="text-foreground font-medium mb-2">{step.description}</p>
                                        <p className="text-muted-foreground mb-6 leading-relaxed">{step.content}</p>
                                        <Link href={step.action.href}>
                                            <Button variant="outline" className="group border-golden/30 text-golden hover:bg-golden/10">
                                                {step.action.label}
                                                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                            </Button>
                                        </Link>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}
