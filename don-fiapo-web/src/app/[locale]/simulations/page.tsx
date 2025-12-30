"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calculator, TrendingUp, Users, Zap, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function SimulationsPage() {
    const [activeTab, setActiveTab] = useState<'nft' | 'staking' | 'evolution' | 'affiliate'>('nft');

    // NFT Calculator State
    const [nftTier, setNftTier] = useState(1); // Bronze
    const [nftQuantity, setNftQuantity] = useState(1);
    const [nftPeriod, setNftPeriod] = useState(12); // months

    // Staking Calculator State
    const [stakeAmount, setStakeAmount] = useState(100000);
    const [stakePool, setStakePool] = useState('don-fiapo'); // 15% APY
    const [stakePeriod, setStakePeriod] = useState(12);

    const nftTiers = [
        { id: 0, name: 'Free Peasant', daily: 5, price: 0 },
        { id: 1, name: 'Bronze Miner', daily: 50, price: 50 },
        { id: 2, name: 'Silver Excavator', daily: 150, price: 150 },
        { id: 3, name: 'Gold Prospector', daily: 400, price: 400 },
        { id: 4, name: 'Platinum Tycoon', daily: 1000, price: 1000 },
        { id: 5, name: 'Diamond Baron', daily: 2500, price: 2500 },
        { id: 6, name: 'Royal Crown', daily: 7000, price: 7000 },
    ];

    const stakingPools = [
        { id: 'moon-mission', name: 'Moon Mission', apy: 5, lockDays: 7 },
        { id: 'diamond-hands', name: 'Diamond Hands', apy: 10, lockDays: 30 },
        { id: 'don-fiapo', name: 'Don Fiapo', apy: 15, lockDays: 90 },
    ];

    // Calculations
    const selectedTier = nftTiers[nftTier];
    const nftDailyMining = selectedTier.daily * nftQuantity;
    const nftMonthlyTotal = nftDailyMining * 30;
    const nftYearlyTotal = nftDailyMining * 365;
    const nftTotalPeriod = nftDailyMining * 30 * nftPeriod;

    const selectedPool = stakingPools.find(p => p.id === stakePool) || stakingPools[2];
    const stakingDailyRate = (selectedPool.apy / 365 / 100) * stakeAmount;
    const stakingMonthlyRewards = stakingDailyRate * 30;
    const stakingTotalRewards = stakingDailyRate * 30 * stakePeriod;
    const stakingFinalBalance = stakeAmount + stakingTotalRewards;

    const scenarios = [
        {
            name: 'Modest Participant',
            desc: '1 Bronze NFT + 50K FIAPO staked',
            monthly: 50 * 30 + (50000 * 0.15 / 12),
            yearly: 50 * 365 + (50000 * 0.15),
        },
        {
            name: 'Active Participant',
            desc: '1 Silver NFT (evolved +10%) + 200K staked',
            monthly: 165 * 30 + (200000 * 0.15 / 12),
            yearly: 165 * 365 + (200000 * 0.15),
        },
        {
            name: 'Power User',
            desc: '2 Gold NFTs (evolved +20%) + 1M staked + 10 affiliates',
            monthly: (480 * 2 * 30) + (1000000 * 0.15 / 12) + (5000), // ~5K from affiliates
            yearly: (480 * 2 * 365) + (1000000 * 0.15) + (60000),
        },
        {
            name: 'Kingdom Lord',
            desc: 'Royal Crown (3x evolutions) + 10M staked + 50 affiliates',
            monthly: (9100 * 30) + (10000000 * 0.15 / 12) + (50000),
            yearly: (9100 * 365) + (10000000 * 0.15) + (600000),
        },
    ];

    return (
        <div className="min-h-screen pt-24 pb-16">
            <div className="container mx-auto px-4">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12"
                >
                    <h1 className="text-4xl md:text-5xl font-bold font-display text-golden mb-4">
                        💰 Participation Simulations
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        Calculate your potential returns from mining, staking, and affiliate activities.
                    </p>
                    <p className="text-sm text-yellow-500 mt-4">
                        ⚠️ For educational purposes only. Not financial advice.
                    </p>
                </motion.div>

                {/* Tabs */}
                <div className="flex gap-2 mb-8 overflow-x-auto">
                    {[
                        { id: 'nft' as const, label: 'NFT Mining', icon: Zap },
                        { id: 'staking' as const, label: 'Staking', icon: TrendingUp },
                        { id: 'evolution' as const, label: 'Evolution', icon: Calculator },
                        { id: 'affiliate' as const, label: 'Affiliate', icon: Users },
                    ].map(tab => (
                        <Button
                            key={tab.id}
                            variant={activeTab === tab.id ? 'default' : 'outline'}
                            onClick={() => setActiveTab(tab.id)}
                            className="flex items-center gap-2"
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </Button>
                    ))}
                </div>

                {/* NFT Mining Calculator */}
                {activeTab === 'nft' && (
                    <Card className="bg-card/50 backdrop-blur border-golden/20">
                        <CardHeader>
                            <h2 className="text-2xl font-bold text-golden">NFT Mining Calculator</h2>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid md:grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-sm font-medium mb-2">NFT Tier</label>
                                    <select
                                        value={nftTier}
                                        onChange={(e) => setNftTier(Number(e.target.value))}
                                        className="w-full bg-background border border-golden/30 rounded-lg px-4 py-2"
                                    >
                                        {nftTiers.map(tier => (
                                            <option key={tier.id} value={tier.id}>
                                                {tier.name} - {tier.daily} FIAPO/day
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Quantity</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="100"
                                        value={nftQuantity}
                                        onChange={(e) => setNftQuantity(Number(e.target.value))}
                                        className="w-full bg-background border border-golden/30 rounded-lg px-4 py-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Period (months)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="60"
                                        value={nftPeriod}
                                        onChange={(e) => setNftPeriod(Number(e.target.value))}
                                        className="w-full bg-background border border-golden/30 rounded-lg px-4 py-2"
                                    />
                                </div>
                            </div>

                            <div className="grid md:grid-cols-4 gap-4">
                                <div className="bg-background/50 p-4 rounded-lg border border-golden/10">
                                    <div className="text-sm text-muted-foreground">Daily Mining</div>
                                    <div className="text-2xl font-bold text-golden">{nftDailyMining.toLocaleString()} FIAPO</div>
                                    <div className="text-xs text-muted-foreground">${nftDailyMining.toLocaleString()} USD</div>
                                </div>
                                <div className="bg-background/50 p-4 rounded-lg border border-golden/10">
                                    <div className="text-sm text-muted-foreground">Monthly Total</div>
                                    <div className="text-2xl font-bold text-golden">{nftMonthlyTotal.toLocaleString()} FIAPO</div>
                                    <div className="text-xs text-muted-foreground">${nftMonthlyTotal.toLocaleString()} USD</div>
                                </div>
                                <div className="bg-background/50 p-4 rounded-lg border border-golden/10">
                                    <div className="text-sm text-muted-foreground">Yearly Total</div>
                                    <div className="text-2xl font-bold text-golden">{nftYearlyTotal.toLocaleString()} FIAPO</div>
                                    <div className="text-xs text-muted-foreground">${nftYearlyTotal.toLocaleString()} USD</div>
                                </div>
                                <div className="bg-background/50 p-4 rounded-lg border border-green-500/30">
                                    <div className="text-sm text-muted-foreground">{nftPeriod}-Month Total</div>
                                    <div className="text-2xl font-bold text-green-400">{nftTotalPeriod.toLocaleString()} FIAPO</div>
                                    <div className="text-xs text-green-400">${nftTotalPeriod.toLocaleString()} USD</div>
                                </div>
                            </div>

                            <div className="text-sm text-muted-foreground">
                                💡 Initial investment: ${selectedTier.price * nftQuantity} USD
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Staking Calculator */}
                {activeTab === 'staking' && (
                    <Card className="bg-card/50 backdrop-blur border-golden/20">
                        <CardHeader>
                            <h2 className="text-2xl font-bold text-golden">Staking Returns Calculator</h2>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid md:grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Stake Amount (FIAPO)</label>
                                    <input
                                        type="number"
                                        min="10000"
                                        step="10000"
                                        value={stakeAmount}
                                        onChange={(e) => setStakeAmount(Number(e.target.value))}
                                        className="w-full bg-background border border-golden/30 rounded-lg px-4 py-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Staking Pool</label>
                                    <select
                                        value={stakePool}
                                        onChange={(e) => setStakePool(e.target.value)}
                                        className="w-full bg-background border border-golden/30 rounded-lg px-4 py-2"
                                    >
                                        {stakingPools.map(pool => (
                                            <option key={pool.id} value={pool.id}>
                                                {pool.name} - {pool.apy}% APY ({pool.lockDays}d lock)
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Period (months)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="60"
                                        value={stakePeriod}
                                        onChange={(e) => setStakePeriod(Number(e.target.value))}
                                        className="w-full bg-background border border-golden/30 rounded-lg px-4 py-2"
                                    />
                                </div>
                            </div>

                            <div className="grid md:grid-cols-4 gap-4">
                                <div className="bg-background/50 p-4 rounded-lg border border-golden/10">
                                    <div className="text-sm text-muted-foreground">Current APY</div>
                                    <div className="text-2xl font-bold text-golden">{selectedPool.apy}%</div>
                                </div>
                                <div className="bg-background/50 p-4 rounded-lg border border-golden/10">
                                    <div className="text-sm text-muted-foreground">Daily Rewards</div>
                                    <div className="text-2xl font-bold text-golden">{stakingDailyRate.toFixed(2)} FIAPO</div>
                                </div>
                                <div className="bg-background/50 p-4 rounded-lg border border-golden/10">
                                    <div className="text-sm text-muted-foreground">Total Rewards</div>
                                    <div className="text-2xl font-bold text-golden">{stakingTotalRewards.toLocaleString()} FIAPO</div>
                                </div>
                                <div className="bg-background/50 p-4 rounded-lg border border-green-500/30">
                                    <div className="text-sm text-muted-foreground">Final Balance</div>
                                    <div className="text-2xl font-bold text-green-400">{stakingFinalBalance.toLocaleString()} FIAPO</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Evolution ROI */}
                {activeTab === 'evolution' && (
                    <Card className="bg-card/50 backdrop-blur border-golden/20">
                        <CardHeader>
                            <h2 className="text-2xl font-bold text-golden">Evolution ROI Calculator</h2>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="text-center py-12">
                                <Calculator className="w-16 h-16 mx-auto mb-4 text-golden" />
                                <h3 className="text-xl font-bold mb-2">Evolution Impact</h3>
                                <p className="text-muted-foreground mb-6">
                                    Each evolution grants <span className="text-golden font-bold">+10% permanent mining bonus</span>
                                </p>

                                <div className="grid md:grid-cols-3 gap-4 max-w-3xl mx-auto">
                                    <div className="bg-background/50 p-4 rounded-lg">
                                        <div className="text-sm text-muted-foreground mb-2">1 Evolution</div>
                                        <div className="text-2xl font-bold text-green-400">+10%</div>
                                        <div className="text-xs text-muted-foreground mt-2">Bronze → Silver</div>
                                    </div>
                                    <div className="bg-background/50 p-4 rounded-lg">
                                        <div className="text-sm text-muted-foreground mb-2">2 Evolutions</div>
                                        <div className="text-2xl font-bold text-green-400">+20%</div>
                                        <div className="text-xs text-muted-foreground mt-2">Silver → Gold</div>
                                    </div>
                                    <div className="bg-background/50 p-4 rounded-lg">
                                        <div className="text-sm text-muted-foreground mb-2">3 Evolutions</div>
                                        <div className="text-2xl font-bold text-green-400">+30%</div>
                                        <div className="text-xs text-muted-foreground mt-2">Gold → Platinum</div>
                                    </div>
                                </div>

                                <div className="mt-8 text-left max-w-2xl mx-auto bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-6">
                                    <h4 className="font-bold text-yellow-500 mb-2">💡 Example</h4>
                                    <p className="text-sm text-muted-foreground">
                                        Royal Crown NFT with 3 evolutions:<br />
                                        Base: 7,000 FIAPO/day → <span className="text-golden">9,100 FIAPO/day (+30%)</span><br />
                                        Extra per year: +766,000 FIAPO = <span className="text-green-400">$766,000 USD</span>
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Affiliate Simulator */}
                {activeTab === 'affiliate' && (
                    <Card className="bg-card/50 backdrop-blur border-golden/20">
                        <CardHeader>
                            <h2 className="text-2xl font-bold text-golden">Affiliate Earnings Simulator</h2>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="text-center py-12">
                                <Users className="w-16 h-16 mx-auto mb-4 text-golden" />
                                <h3 className="text-xl font-bold mb-2">Build Your Royal Court</h3>
                                <p className="text-muted-foreground mb-6">
                                    Earn <span className="text-golden font-bold">10% of your referrals' mining output</span>
                                </p>

                                <div className="grid md:grid-cols-3 gap-4 max-w-3xl mx-auto">
                                    <div className="bg-background/50 p-4 rounded-lg">
                                        <div className="text-sm text-muted-foreground mb-2">10 Referrals</div>
                                        <div className="text-xl font-bold text-golden">~$500/month</div>
                                        <div className="text-xs text-muted-foreground mt-2">Avg. Bronze miners</div>
                                    </div>
                                    <div className="bg-background/50 p-4 rounded-lg">
                                        <div className="text-sm text-muted-foreground mb-2">50 Referrals</div>
                                        <div className="text-xl font-bold text-golden">~$5,000/month</div>
                                        <div className="text-xs text-muted-foreground mt-2">Mixed tiers</div>
                                    </div>
                                    <div className="bg-background/50 p-4 rounded-lg">
                                        <div className="text-sm text-muted-foreground mb-2">100 Referrals</div>
                                        <div className="text-xl font-bold text-green-400">~$15,000/month</div>
                                        <div className="text-xs text-muted-foreground mt-2">Active community</div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Pre-defined Scenarios */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-12"
                >
                    <h2 className="text-3xl font-bold text-golden mb-6 text-center">📊 Common Participation Scenarios</h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {scenarios.map((scenario, idx) => (
                            <Card key={idx} className="bg-card/50 backdrop-blur border-golden/20 hover:border-golden/50 transition-colors">
                                <CardHeader>
                                    <h3 className="font-bold text-lg">{scenario.name}</h3>
                                    <p className="text-sm text-muted-foreground">{scenario.desc}</p>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <div>
                                            <div className="text-xs text-muted-foreground">Monthly</div>
                                            <div className="text-xl font-bold text-golden">
                                                ${scenario.monthly.toLocaleString()}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-muted-foreground">Yearly</div>
                                            <div className="text-2xl font-bold text-green-400">
                                                ${scenario.yearly.toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <div className="mt-8 text-center">
                        <p className="text-sm text-yellow-500">
                            ⚠️ Calculations assume $1 per FIAPO. Actual returns depend on token price, network conditions, and participation levels.
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
