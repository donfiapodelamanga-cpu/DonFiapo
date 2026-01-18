"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { PiggyBank, TrendingUp, Flame, UserPlus } from "lucide-react";

interface CalculatorProps {
    config: {
        pointsPerFiapo: number;
        pointsPerStake: number;
        pointsPerBurn: number;
        affiliateMultiplier: number;
        secondLevelAffiliateMultiplier: number;
        distributionRates: {
            holders: number;
            stakers: number;
            burners: number;
            affiliates: number;
        };
    };
}

export function AirdropCalculator({ config }: CalculatorProps) {
    const [holding, setHolding] = useState(10000);
    const [staking, setStaking] = useState(5000);
    const [burning, setBurning] = useState(1000);
    const [affiliatesL1, setAffiliatesL1] = useState(3);
    const [affiliatesL2, setAffiliatesL2] = useState(10);

    // Calculate points
    const holdingPoints = holding * config.pointsPerFiapo;
    const stakingPoints = staking * config.pointsPerStake;
    const burningPoints = burning * config.pointsPerBurn;
    const affiliatePoints = (affiliatesL1 * config.affiliateMultiplier) +
        (affiliatesL2 * config.secondLevelAffiliateMultiplier);

    const totalPoints = holdingPoints + stakingPoints + burningPoints + affiliatePoints;

    // Estimate rewards (assuming 1M total points as example)
    const EXAMPLE_TOTAL_POINTS = 1_000_000;
    const TOTAL_AIRDROP = 21_000_000_000; // 21B tokens

    const estimatedHolding = (holdingPoints / EXAMPLE_TOTAL_POINTS) * (TOTAL_AIRDROP * config.distributionRates.holders / 100);
    const estimatedStaking = (stakingPoints / EXAMPLE_TOTAL_POINTS) * (TOTAL_AIRDROP * config.distributionRates.stakers / 100);
    const estimatedBurning = (burningPoints / EXAMPLE_TOTAL_POINTS) * (TOTAL_AIRDROP * config.distributionRates.burners / 100);
    const estimatedAffiliates = (affiliatePoints / EXAMPLE_TOTAL_POINTS) * (TOTAL_AIRDROP * config.distributionRates.affiliates / 100);

    const totalEstimated = estimatedHolding + estimatedStaking + estimatedBurning + estimatedAffiliates;

    return (
        <Card className="bg-card border-golden/30">
            <CardHeader>
                <CardTitle className="text-2xl text-golden">🧮 Airdrop Calculator</CardTitle>
                <CardDescription>
                    Estimate your potential rewards based on your activity
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Input Sliders */}
                <div className="space-y-4">
                    {/* Holding */}
                    <div>
                        <div className="flex justify-between mb-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <PiggyBank className="w-4 h-4 text-blue-400" />
                                Holding
                            </label>
                            <span className="text-sm text-golden">{holding.toLocaleString()} FIAPO</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="1000000"
                            step="1000"
                            value={holding}
                            onChange={(e) => setHolding(Number(e.target.value))}
                            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer slider-thumb-golden"
                        />
                        <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                            <span>0</span>
                            <span>1M</span>
                        </div>
                    </div>

                    {/* Staking */}
                    <div>
                        <div className="flex justify-between mb-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-green-400" />
                                Staking
                            </label>
                            <span className="text-sm text-golden">{staking.toLocaleString()} FIAPO</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="1000000"
                            step="1000"
                            value={staking}
                            onChange={(e) => setStaking(Number(e.target.value))}
                            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer slider-thumb-golden"
                        />
                        <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                            <span>0</span>
                            <span>1M</span>
                        </div>
                    </div>

                    {/* Burning */}
                    <div>
                        <div className="flex justify-between mb-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <Flame className="w-4 h-4 text-orange-400" />
                                Burning
                            </label>
                            <span className="text-sm text-golden">{burning.toLocaleString()} FIAPO</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100000"
                            step="100"
                            value={burning}
                            onChange={(e) => setBurning(Number(e.target.value))}
                            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer slider-thumb-golden"
                        />
                        <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                            <span>0</span>
                            <span>100K</span>
                        </div>
                    </div>

                    {/* Affiliates L1 */}
                    <div>
                        <div className="flex justify-between mb-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <UserPlus className="w-4 h-4 text-purple-400" />
                                Direct Affiliates
                            </label>
                            <span className="text-sm text-golden">{affiliatesL1}</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            step="1"
                            value={affiliatesL1}
                            onChange={(e) => setAffiliatesL1(Number(e.target.value))}
                            className="w-full h-2 bg-muted  rounded-lg appearance-none cursor-pointer slider-thumb-golden"
                        />
                        <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                            <span>0</span>
                            <span>100</span>
                        </div>
                    </div>

                    {/* Affiliates L2 */}
                    <div>
                        <div className="flex justify-between mb-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <UserPlus className="w-4 h-4 text-purple-300" />
                                2nd Level Affiliates
                            </label>
                            <span className="text-sm text-golden">{affiliatesL2}</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="1000"
                            step="1"
                            value={affiliatesL2}
                            onChange={(e) => setAffiliatesL2(Number(e.target.value))}
                            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer slider-thumb-golden"
                        />
                        <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                            <span>0</span>
                            <span>1000</span>
                        </div>
                    </div>
                </div>

                {/* Points Breakdown */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <p className="text-sm font-medium text-muted-foreground mb-3">Points Breakdown</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Holding:</span>
                            <span className="font-mono">{holdingPoints.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Staking:</span>
                            <span className="font-mono">{stakingPoints.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Burning:</span>
                            <span className="font-mono">{burningPoints.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Affiliates:</span>
                            <span className="font-mono">{affiliatePoints.toLocaleString()}</span>
                        </div>
                    </div>
                    <div className="pt-3 border-t border-border">
                        <div className="flex justify-between items-center">
                            <span className="font-bold text-foreground">Total Points:</span>
                            <span className="text-2xl font-bold text-golden">{totalPoints.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* Estimated Rewards */}
                <div className="bg-golden/10 border border-golden/30 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-3">
                        Estimated Rewards*
                    </p>
                    <div className="space-y-2 text-sm mb-3">
                        <div className="flex justify-between">
                            <span>From Holding Pool:</span>
                            <span className="font-mono">{(estimatedHolding / 1_000_000).toFixed(2)}M</span>
                        </div>
                        <div className="flex justify-between">
                            <span>From Staking Pool:</span>
                            <span className="font-mono">{(estimatedStaking / 1_000_000).toFixed(2)}M</span>
                        </div>
                        <div className="flex justify-between">
                            <span>From Burning Pool:</span>
                            <span className="font-mono">{(estimatedBurning / 1_000_000).toFixed(2)}M</span>
                        </div>
                        <div className="flex justify-between">
                            <span>From Affiliates Pool:</span>
                            <span className="font-mono">{(estimatedAffiliates / 1_000_000).toFixed(2)}M</span>
                        </div>
                    </div>
                    <div className="pt-3 border-t border-golden/30">
                        <div className="flex justify-between items-center">
                            <span className="font-bold">Total Estimated:</span>
                            <span className="text-2xl font-bold text-golden">
                                {(totalEstimated / 1_000_000).toFixed(2)}M $FIAPO
                            </span>
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3 text-center">
                        *Based on example scenario of 1M total points. Actual rewards depend on community participation.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
