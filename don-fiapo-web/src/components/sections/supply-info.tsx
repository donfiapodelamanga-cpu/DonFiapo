"use client";

import { motion } from "framer-motion";
import { Coins, Flame, ArrowDown, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const supplyStats = [
  {
    icon: Coins,
    label: "Max Supply",
    value: "300 Billion",
    subtext: "$FIAPO",
    color: "text-golden",
    bgColor: "bg-golden/10",
  },
  {
    icon: Flame,
    label: "Min Supply (Burn Target)",
    value: "100 Million",
    subtext: "$FIAPO",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
  {
    icon: ArrowDown,
    label: "Decimals",
    value: "8",
    subtext: "digits",
    color: "text-blue-400",
    bgColor: "bg-blue-400/10",
  },
  {
    icon: Wallet,
    label: "Burn Wallet",
    value: "Active",
    subtext: "Deflationary",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
];

const fundDistribution = [
  { label: "Staking Fund", value: "80%", color: "bg-green-500" },
  { label: "Airdrop", value: "7%", color: "bg-purple-500" },
  { label: "Marketing", value: "5%", color: "bg-blue-400" },
  { label: "Donations", value: "5%", color: "bg-pink-500" },
  { label: "IEO/ICO", value: "2%", color: "bg-golden" },
  { label: "Team", value: "1%", color: "bg-gray-500" },
];

export function SupplyInfoSection() {
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
            📈 Token Supply
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Deflationary tokenomics designed for long-term value
          </p>
        </motion.div>

        {/* Supply Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          {supplyStats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="h-full bg-background border-border hover:border-golden/30 transition-colors">
                <CardContent className="pt-6 text-center">
                  <div className={`w-14 h-14 rounded-2xl ${stat.bgColor} flex items-center justify-center mx-auto mb-4`}>
                    <stat.icon className={`w-7 h-7 ${stat.color}`} />
                  </div>
                  <p className={`text-2xl md:text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.subtext}</p>
                  <p className="text-xs text-muted-foreground mt-2">{stat.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Fund Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto"
        >
          <h3 className="text-2xl font-bold text-center mb-8">Fund Distribution</h3>
          
          <Card className="bg-background border-golden/30">
            <CardContent className="pt-6">
              {/* Progress Bar */}
              <div className="h-8 rounded-full overflow-hidden flex mb-6">
                {fundDistribution.map((fund) => (
                  <div
                    key={fund.label}
                    className={`${fund.color} h-full flex items-center justify-center text-xs font-bold text-white`}
                    style={{ width: fund.value }}
                  >
                    {parseInt(fund.value) > 5 && fund.value}
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {fundDistribution.map((fund, index) => (
                  <motion.div
                    key={fund.label}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-3"
                  >
                    <div className={`w-4 h-4 rounded-full ${fund.color}`} />
                    <div>
                      <p className="font-medium text-sm">{fund.label}</p>
                      <p className="text-lg font-bold text-golden">{fund.value}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-muted-foreground mt-4">
            🔥 80% of funds go directly to staking rewards - the highest in the industry!
          </p>
        </motion.div>
      </div>
    </section>
  );
}
