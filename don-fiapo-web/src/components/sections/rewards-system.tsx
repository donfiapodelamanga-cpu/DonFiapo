"use client";

import { motion } from "framer-motion";
import { Gift, Flame, ArrowRightLeft, TrendingUp, Users, Sparkles, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const rewardCategories = [
  {
    icon: Flame,
    title: "Burn Rewards",
    periods: ["7 days", "30 days", "12 months"],
    description: "Earn bonus APY by burning tokens",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
  {
    icon: ArrowRightLeft,
    title: "Transaction Rewards",
    periods: ["7 days", "30 days", "12 months"],
    description: "Get rewarded for ecosystem activity",
    color: "text-blue-400",
    bgColor: "bg-blue-400/10",
  },
  {
    icon: TrendingUp,
    title: "Staking Rewards",
    periods: ["7 days", "30 days", "12 months"],
    description: "Top stakers earn bonus multipliers",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    icon: Users,
    title: "Affiliate Rewards",
    periods: ["7 days", "30 days", "12 months"],
    description: "Commission from your referrals",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
];

const lotteries = [
  {
    icon: Sparkles,
    title: "God Looked at You",
    emoji: "🙏",
    frequency: "Monthly",
    prize: "5% of monthly fees",
    winners: "3 random wallets",
    description: "Random monthly lottery - any holder can win!",
    color: "from-purple-500/20 to-pink-500/20",
    borderColor: "border-purple-500/30",
  },
  {
    icon: Calendar,
    title: "God Looked at You - Christmas",
    emoji: "🎄",
    frequency: "December 25th",
    prize: "5% of annual fees",
    winners: "12 lucky wallets",
    description: "Annual Christmas special lottery with bigger prizes!",
    color: "from-red-500/20 to-green-500/20",
    borderColor: "border-red-500/30",
  },
];

export function RewardsSystemSection() {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold font-display text-golden mb-4">
            🎁 Rewards & Lotteries
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Multiple ways to earn rewards in the Don Fiapo ecosystem
          </p>
        </motion.div>

        {/* Reward Categories */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {rewardCategories.map((reward, index) => (
            <motion.div
              key={reward.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="h-full bg-card hover:border-golden/30 transition-colors">
                <CardHeader>
                  <div className={`w-12 h-12 rounded-xl ${reward.bgColor} flex items-center justify-center mb-3`}>
                    <reward.icon className={`w-6 h-6 ${reward.color}`} />
                  </div>
                  <CardTitle className="text-lg">{reward.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{reward.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {reward.periods.map((period) => (
                      <span
                        key={period}
                        className="text-xs px-2 py-1 rounded-full bg-background border border-border"
                      >
                        {period}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Lotteries */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          <h3 className="text-2xl font-bold text-center mb-8">
            <span className="text-golden">✨</span> Special Lotteries <span className="text-golden">✨</span>
          </h3>
          
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {lotteries.map((lottery, index) => (
              <motion.div
                key={lottery.title}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={`h-full bg-gradient-to-br ${lottery.color} ${lottery.borderColor} border-2`}>
                  <CardContent className="pt-6 space-y-4">
                    <div className="text-center">
                      <span className="text-5xl">{lottery.emoji}</span>
                      <h4 className="text-xl font-bold mt-3">{lottery.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{lottery.description}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-background/50 rounded-lg text-center">
                        <p className="text-xs text-muted-foreground">Frequency</p>
                        <p className="font-bold">{lottery.frequency}</p>
                      </div>
                      <div className="p-3 bg-background/50 rounded-lg text-center">
                        <p className="text-xs text-muted-foreground">Winners</p>
                        <p className="font-bold">{lottery.winners}</p>
                      </div>
                    </div>

                    <div className="p-4 bg-golden/20 rounded-xl text-center">
                      <p className="text-sm text-muted-foreground">Prize Pool</p>
                      <p className="text-xl font-bold text-golden">{lottery.prize}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* First Year Note */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto"
        >
          <Card className="bg-gradient-to-r from-golden/10 to-orange-500/10 border-golden/30">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-golden/20 flex items-center justify-center flex-shrink-0">
                  <Gift className="w-6 h-6 text-golden" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-golden mb-2">🎉 First Year Bonus Program</h4>
                  <p className="text-muted-foreground">
                    In the first year, we will subsidize rewards from the fund for wallets that 
                    actively engage in token burning. The more you burn, the more you earn!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}
