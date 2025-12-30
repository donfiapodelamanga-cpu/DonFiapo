"use client";

import { motion } from 'framer-motion';
import { TrendingDown, Lock, Users, Flame, TrendingUp, Shield, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function TokenomicsPage() {
    // Data aligned with Whitepaper (source of truth)
    const supplyData = [
        { label: 'Staking Fund', percent: 80, tokens: '240Bi', color: 'bg-golden' },
        { label: 'Airdrop', percent: 7, tokens: '21Bi', color: 'bg-pink-500' },
        { label: 'Marketing', percent: 5, tokens: '15Bi', color: 'bg-cyan-500' },
        { label: 'Charity Donations', percent: 5, tokens: '15Bi', color: 'bg-green-500' },
        { label: 'IEO/ICO', percent: 2, tokens: '6Bi', color: 'bg-blue-500' },
        { label: 'Team', percent: 1, tokens: '3Bi', color: 'bg-purple-500' },
    ];

    const deflationaryMechanisms = [
        {
            icon: Flame,
            title: 'NFT Evolution Burns',
            description: 'Burn 2 NFTs → Create 1 higher tier',
            impact: '50% NFT supply reduction over time',
            color: 'text-orange-500'
        },
        {
            icon: TrendingDown,
            title: 'Transaction Fees',
            description: '0.6% fee on all transfers',
            breakdown: '30% Burn • 50% Staking • 20% Rewards',
            color: 'text-red-500'
        },
        {
            icon: Lock,
            title: 'Governance Fees',
            description: '$100 proposal + $10 vote fees',
            impact: '50% of fees burned permanently',
            color: 'text-yellow-500'
        },
    ];

    const metrics = [
        { label: 'Max Supply', value: '300', suffix: 'Billion FIAPO' },
        { label: 'Initial Supply', value: '100', suffix: 'Million FIAPO' },
        { label: 'Decimals', value: '8', suffix: '' },
        { label: 'Max Staking APY', value: '300', suffix: '%' },
        { label: 'Max NFT Mining', value: '2,500', suffix: 'FIAPO/day' },
        { label: 'Affiliate Commission', value: '10', suffix: '%' },
    ];

    // NFT Tiers with correct contract data
    const nftTiers = [
        { id: 0, name: 'Free Peasant', price: '$0', daily: '5' },
        { id: 1, name: 'Bronze Miner', price: '$10', daily: '50' },
        { id: 2, name: 'Silver Excavator', price: '$30', daily: '150' },
        { id: 3, name: 'Gold Prospector', price: '$55', daily: '300' },
        { id: 4, name: 'Platinum Tycoon', price: '$100', daily: '500' },
        { id: 5, name: 'Diamond Baron', price: '$250', daily: '1,200' },
        { id: 6, name: 'Royal Crown', price: '$500', daily: '2,500' },
    ];

    const utilityFeatures = [
        {
            icon: Zap,
            title: 'NFT Mining',
            description: 'NFTs generate daily FIAPO based on tier (5-2,500/day)',
            benefit: 'Passive income stream'
        },
        {
            icon: TrendingUp,
            title: 'Staking Rewards',
            description: 'Earn 5-15% APY based on lock period',
            benefit: 'Yield generation'
        },
        {
            icon: Users,
            title: 'Governance Rights',
            description: 'Vote on protocol changes with staked tokens',
            benefit: 'Community control'
        },
        {
            icon: Shield,
            title: 'Evolution Bonuses',
            description: '+10% mining per evolution (cumulative)',
            benefit: 'Compounding returns'
        },
    ];

    const comparativeAdvantages = [
        {
            metric: 'Supply Model',
            donFiapo: 'Deflationary (→100M)',
            dogecoin: 'Inflationary (∞)',
            shiba: 'Static (1Q)',
            color: 'text-green-400'
        },
        {
            metric: 'Utility',
            donFiapo: 'Mining + Staking + DAO',
            dogecoin: 'None',
            shiba: 'Swap only',
            color: 'text-green-400'
        },
        {
            metric: 'Technology',
            donFiapo: 'Rust/Ink! (Lunes L1)',
            dogecoin: 'Scrypt',
            shiba: 'ERC-20',
            color: 'text-golden'
        },
        {
            metric: 'Governance',
            donFiapo: 'On-chain DAO',
            dogecoin: 'None',
            shiba: 'Multisig',
            color: 'text-green-400'
        },
    ];

    return (
        <div className="min-h-screen pt-24 pb-16">
            <div className="container mx-auto px-4">
                {/* Hero */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-16"
                >
                    <h1 className="text-4xl md:text-6xl font-bold font-display text-golden mb-4">
                        📊 $FIAPO Economics
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                        A deflationary memecoin with <span className="text-golden font-bold">real utility</span>,
                        backed by Rust-based smart contracts on Lunes Network.
                    </p>
                </motion.div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-16">
                    {metrics.map((metric, idx) => (
                        <Card key={idx} className="bg-card/50 backdrop-blur border-golden/20 text-center">
                            <CardContent className="pt-6">
                                <div className="text-3xl font-bold text-golden mb-1">
                                    {metric.value}
                                </div>
                                <div className="text-sm text-muted-foreground">{metric.label}</div>
                                {metric.suffix && <div className="text-xs text-golden mt-1">{metric.suffix}</div>}
                                {metric.subtext && <div className="text-xs text-green-400 mt-1">{metric.subtext}</div>}
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Supply Distribution */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="mb-16"
                >
                    <h2 className="text-3xl font-bold text-golden mb-8 text-center">Token Distribution</h2>

                    <div className="max-w-4xl mx-auto">
                        <Card className="bg-card/50 backdrop-blur border-golden/20 mb-6">
                            <CardContent className="pt-6">
                                <div className="space-y-4">
                                    {supplyData.map((item, idx) => (
                                        <div key={idx}>
                                            <div className="flex justify-between mb-2">
                                                <span className="font-medium">{item.label}</span>
                                                <span className="text-golden font-bold">{item.percent}% ({item.tokens})</span>
                                            </div>
                                            <div className="h-3 bg-background rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full ${item.color}`}
                                                    style={{ width: `${item.percent}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <div className="grid md:grid-cols-2 gap-4">
                            <Card className="bg-golden/10 border border-golden/30">
                                <CardContent className="pt-6">
                                    <div className="text-sm text-golden font-bold mb-1">Staking Fund (80%)</div>
                                    <p className="text-xs text-muted-foreground">
                                        Primary source for staking rewards. Distributed based on APY tiers.
                                    </p>
                                </CardContent>
                            </Card>
                            <Card className="bg-pink-500/10 border border-pink-500/30">
                                <CardContent className="pt-6">
                                    <div className="text-sm text-pink-400 font-bold mb-1">Airdrop (7%)</div>
                                    <p className="text-xs text-muted-foreground">
                                        Community airdrops for early adopters and active participants.
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </motion.section>

                {/* NFT Tiers Table */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="mb-16"
                >
                    <h2 className="text-3xl font-bold text-golden mb-2 text-center">⛏️ NFT Mining Tiers</h2>
                    <p className="text-center text-muted-foreground mb-8">
                        Each NFT tier provides different daily mining rewards
                    </p>

                    <div className="max-w-4xl mx-auto">
                        <Card className="bg-card/50 backdrop-blur border-golden/20 overflow-x-auto">
                            <CardContent className="pt-6">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-golden/20">
                                            <th className="text-left py-3 px-4">Tier</th>
                                            <th className="text-left py-3 px-4">Name</th>
                                            <th className="text-right py-3 px-4">Price</th>
                                            <th className="text-right py-3 px-4 text-golden">Daily Mining</th>
                                            <th className="text-right py-3 px-4 text-green-400">Monthly</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {nftTiers.map((tier) => (
                                            <tr key={tier.id} className="border-b border-golden/10 hover:bg-golden/5">
                                                <td className="py-3 px-4 font-bold text-golden">{tier.id}</td>
                                                <td className="py-3 px-4">{tier.name}</td>
                                                <td className="py-3 px-4 text-right">{tier.price}</td>
                                                <td className="py-3 px-4 text-right font-bold text-golden">
                                                    {tier.daily} FIAPO
                                                </td>
                                                <td className="py-3 px-4 text-right text-green-400">
                                                    {(parseInt(tier.daily.replace(',', '')) * 30).toLocaleString()} FIAPO
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>
                    </div>
                </motion.section>

                {/* Deflationary Mechanisms */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="mb-16"
                >
                    <h2 className="text-3xl font-bold text-golden mb-2 text-center">🔥 Deflationary Mechanisms</h2>
                    <p className="text-center text-muted-foreground mb-8">
                        Multiple burn mechanisms drive supply from <span className="text-golden">1B → 100M</span> over time
                    </p>

                    <div className="grid md:grid-cols-3 gap-6">
                        {deflationaryMechanisms.map((mech, idx) => (
                            <Card key={idx} className="bg-card/50 backdrop-blur border-golden/20 hover:border-golden/50 transition-colors">
                                <CardHeader>
                                    <mech.icon className={`w-12 h-12 mb-4 ${mech.color}`} />
                                    <h3 className="text-xl font-bold">{mech.title}</h3>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground mb-4">{mech.description}</p>
                                    {mech.breakdown && (
                                        <p className="text-xs text-golden mb-2">{mech.breakdown}</p>
                                    )}
                                    {mech.impact && (
                                        <p className="text-xs text-green-400 font-bold">{mech.impact}</p>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <div className="mt-8 max-w-3xl mx-auto bg-red-500/10 border border-red-500/30 rounded-lg p-6">
                        <h4 className="font-bold text-red-400 mb-2 text-center">🔥 Projected Supply Reduction</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                            <div>
                                <div className="text-2xl font-bold text-golden">-10%</div>
                                <div className="text-xs text-muted-foreground">Month 1</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-golden">-24%</div>
                                <div className="text-xs text-muted-foreground">Month 3</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-golden">-40%</div>
                                <div className="text-xs text-muted-foreground">Month 6</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-green-400">-70%</div>
                                <div className="text-xs text-muted-foreground">Year 1</div>
                            </div>
                        </div>
                    </div>
                </motion.section>

                {/* Utility Features */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="mb-16"
                >
                    <h2 className="text-3xl font-bold text-golden mb-8 text-center">⚡ Real Utility</h2>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {utilityFeatures.map((feature, idx) => (
                            <Card key={idx} className="bg-card/50 backdrop-blur border-golden/20">
                                <CardHeader>
                                    <feature.icon className="w-10 h-10 mb-3 text-golden" />
                                    <h3 className="font-bold text-lg">{feature.title}</h3>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground mb-3">{feature.description}</p>
                                    <p className="text-xs text-green-400 font-bold">✓ {feature.benefit}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </motion.section>

                {/* Comparative Analysis */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="mb-16"
                >
                    <h2 className="text-3xl font-bold text-golden mb-2 text-center">⚔️ Why Don Fiapo Wins</h2>
                    <p className="text-center text-muted-foreground mb-8">
                        Head-to-head comparison with legacy memecoins
                    </p>

                    <div className="max-w-4xl mx-auto">
                        <Card className="bg-card/50 backdrop-blur border-golden/20 overflow-x-auto">
                            <CardContent className="pt-6">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-golden/20">
                                            <th className="text-left py-3 px-4">Feature</th>
                                            <th className="text-left py-3 px-4 text-golden">$FIAPO</th>
                                            <th className="text-left py-3 px-4 text-muted-foreground">Dogecoin</th>
                                            <th className="text-left py-3 px-4 text-muted-foreground">Shiba Inu</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {comparativeAdvantages.map((row, idx) => (
                                            <tr key={idx} className="border-b border-golden/10">
                                                <td className="py-3 px-4 font-medium">{row.metric}</td>
                                                <td className={`py-3 px-4 font-bold ${row.color}`}>{row.donFiapo}</td>
                                                <td className="py-3 px-4 text-muted-foreground">{row.dogecoin}</td>
                                                <td className="py-3 px-4 text-muted-foreground">{row.shiba}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>
                    </div>
                </motion.section>

                {/* Call to Action */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center"
                >
                    <Card className="bg-gradient-to-r from-golden/10 to-golden/5 border-golden/30 max-w-3xl mx-auto">
                        <CardContent className="pt-8 pb-8">
                            <h3 className="text-2xl font-bold mb-4">Join the Revolution</h3>
                            <p className="text-muted-foreground mb-6">
                                Don Fiapo combines the viral potential of memecoins with the sustainability of real utility.
                                <br />
                                <span className="text-sm text-yellow-500 mt-4 block">
                                    ⚠️ Participation involves risk. This is not financial advice. Always DYOR.
                                </span>
                            </p>
                            <div className="flex gap-4 justify-center">
                                <a
                                    href="/ico/mint"
                                    className="px-6 py-3 bg-golden text-background rounded-lg font-bold hover:bg-golden/90 transition-colors"
                                >
                                    Mint NFT
                                </a>
                                <a
                                    href="/staking"
                                    className="px-6 py-3 border border-golden text-golden rounded-lg font-bold hover:bg-golden/10 transition-colors"
                                >
                                    Start Staking
                                </a>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </div>
    );
}
