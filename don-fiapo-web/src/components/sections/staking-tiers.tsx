"use client";

import { motion } from "framer-motion";
import { Layers, TrendingDown, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const stakingTiers = [
  { range: "1 - 1,000", fee: "10%", example: "100 FIAPO = 10 USDT", highlight: false },
  { range: "1,001 - 10,000", fee: "5%", example: "5,000 FIAPO = 250 USDT", highlight: false },
  { range: "10,001 - 100,000", fee: "2.5%", example: "50,000 FIAPO = 1,250 USDT", highlight: true },
  { range: "100,001 - 500,000", fee: "1%", example: "250,000 FIAPO = 2,500 USDT", highlight: false },
  { range: "500,001+", fee: "0.5%", example: "1M FIAPO = 5,000 USDT", highlight: false },
];

const stakingTypes = [
  {
    name: "Don Burn",
    emoji: "🔥",
    apy: "10% - 300%",
    payment: "Daily",
    minInvest: "100 FIAPO",
    lockPeriod: "Variable",
    color: "from-orange-500/20 to-red-500/20",
    borderColor: "border-orange-500/30",
    textColor: "text-orange-500",
    benefits: ["Highest APY potential", "Daily compound interest", "Burn bonus multiplier"],
  },
  {
    name: "Don Lunes",
    emoji: "🌙",
    apy: "6% - 37%",
    payment: "Weekly",
    minInvest: "50 FIAPO",
    lockPeriod: "Flexible",
    color: "from-purple-500/20 to-blue-500/20",
    borderColor: "border-purple-500/30",
    textColor: "text-purple-500",
    benefits: ["Earn in Lunes Network", "Cross-chain rewards", "Lower entry barrier"],
  },
  {
    name: "Don Fiapo",
    emoji: "👑",
    apy: "7% - 70%",
    payment: "Monthly",
    minInvest: "75 FIAPO",
    lockPeriod: "30 days",
    color: "from-golden/20 to-yellow-500/20",
    borderColor: "border-golden/30",
    textColor: "text-golden",
    benefits: ["Balanced risk/reward", "Weekly payouts", "Governance voting power"],
  },
];

export function StakingTiersSection() {
  return (
    <section className="py-24 bg-card">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold font-display text-golden mb-4">
            💎 Staking Options
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose the staking pool that fits your strategy
          </p>
        </motion.div>

        {/* Staking Types */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {stakingTypes.map((staking, index) => (
            <motion.div
              key={staking.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={`h-full bg-gradient-to-br ${staking.color} ${staking.borderColor} border-2`}>
                <CardContent className="pt-6 space-y-4">
                  <div className="text-center">
                    <span className="text-4xl">{staking.emoji}</span>
                    <h3 className={`text-2xl font-bold mt-2 ${staking.textColor}`}>{staking.name}</h3>
                  </div>

                  <div className="text-center py-4 bg-background/50 rounded-xl">
                    <p className="text-3xl font-bold text-golden">{staking.apy}</p>
                    <p className="text-sm text-muted-foreground">APY per Year</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between p-2 bg-background/30 rounded-lg">
                      <span className="text-muted-foreground">Payment</span>
                      <span className="font-medium">{staking.payment}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-background/30 rounded-lg">
                      <span className="text-muted-foreground">Min. Investment</span>
                      <span className="font-medium">{staking.minInvest}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-background/30 rounded-lg">
                      <span className="text-muted-foreground">Lock Period</span>
                      <span className="font-medium">{staking.lockPeriod}</span>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    {staking.benefits.map((benefit, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <Check className={`w-4 h-4 ${staking.textColor}`} />
                        <span>{benefit}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Entry Fee Tiers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto"
        >
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-golden/10 rounded-full mb-4">
              <TrendingDown className="w-5 h-5 text-golden" />
              <span className="text-golden font-medium">The more you stake, the lower the fee!</span>
            </div>
            <h3 className="text-2xl font-bold">Entry Fee Tiers</h3>
            <p className="text-muted-foreground mt-2">Paid in USDT (Solana) or LUSDT (Lunes)</p>
          </div>

          <Card className="bg-background border-golden/30">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-4 text-muted-foreground font-medium">FIAPO Amount</th>
                      <th className="text-center p-4 text-muted-foreground font-medium">Fee Rate</th>
                      <th className="text-right p-4 text-muted-foreground font-medium">Example</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stakingTiers.map((tier, index) => (
                      <motion.tr
                        key={tier.range}
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.05 }}
                        className={`border-b border-border last:border-0 ${tier.highlight ? 'bg-golden/10' : ''
                          }`}
                      >
                        <td className="p-4 font-medium">{tier.range}</td>
                        <td className="p-4 text-center">
                          <span className={`px-3 py-1 rounded-full ${tier.highlight
                              ? 'bg-golden text-black font-bold'
                              : 'bg-muted text-foreground'
                            }`}>
                            {tier.fee}
                          </span>
                        </td>
                        <td className="p-4 text-right text-muted-foreground text-sm">{tier.example}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-muted-foreground mt-4">
            💡 Fees are distributed: 10% Team + 40% Staking Fund + 50% Rewards Program
          </p>
        </motion.div>
      </div>
    </section>
  );
}
