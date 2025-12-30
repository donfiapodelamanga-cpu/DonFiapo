"use client";

import { motion } from "framer-motion";
import { ArrowRightLeft, Wallet, AlertTriangle, Flame, DollarSign, Percent, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const fees = [
  {
    id: 1,
    icon: ArrowRightLeft,
    title: "Transaction Fee",
    rate: "0.6%",
    payment: "$FIAPO",
    distribution: [
      { label: "Burn", value: "30%", color: "text-orange-500" },
      { label: "Staking Fund", value: "50%", color: "text-green-500" },
      { label: "Rewards", value: "20%", color: "text-purple-500" },
    ],
  },
  {
    id: 2,
    icon: Wallet,
    title: "Staking Entry Fee",
    rate: "0.5% - 10%",
    payment: "USDT/LUSDT",
    distribution: [
      { label: "Team", value: "10%", color: "text-blue-400" },
      { label: "Staking Fund", value: "40%", color: "text-green-500" },
      { label: "Rewards", value: "50%", color: "text-purple-500" },
    ],
  },
  {
    id: 3,
    icon: AlertTriangle,
    title: "Early Withdrawal (Don Burn)",
    rate: "10 USDT + 50% capital + 80% interest",
    payment: "$FIAPO",
    distribution: [
      { label: "Burn", value: "20%", color: "text-orange-500" },
      { label: "Staking Fund", value: "50%", color: "text-green-500" },
      { label: "Rewards", value: "30%", color: "text-purple-500" },
    ],
  },
  {
    id: 4,
    icon: DollarSign,
    title: "Interest Withdrawal",
    rate: "1%",
    payment: "$FIAPO",
    distribution: [
      { label: "Burn", value: "20%", color: "text-orange-500" },
      { label: "Staking Fund", value: "50%", color: "text-green-500" },
      { label: "Rewards", value: "30%", color: "text-purple-500" },
    ],
  },
  {
    id: 5,
    icon: Flame,
    title: "Burn-Re-Boost Fee",
    rate: "0.8 USDT + 10% FIAPO",
    payment: "USDT + FIAPO",
    distribution: [
      { label: "Team", value: "10%", color: "text-blue-400" },
      { label: "Staking Fund", value: "50%", color: "text-green-500" },
      { label: "Rewards", value: "40%", color: "text-purple-500" },
    ],
  },
  {
    id: 6,
    icon: Percent,
    title: "USDT Rewards Withdrawal",
    rate: "0.3%",
    payment: "USDT/LUSDT",
    distribution: [
      { label: "Team", value: "10%", color: "text-blue-400" },
      { label: "Staking Fund", value: "40%", color: "text-green-500" },
      { label: "Rewards", value: "40%", color: "text-purple-500" },
    ],
  },
];

export function FeeStructureSection() {
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
            📊 Fee Structure
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Transparent fee system that funds the ecosystem
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {fees.map((fee, index) => (
            <motion.div
              key={fee.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="h-full bg-card border-border hover:border-golden/50 transition-colors">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-golden/10 flex items-center justify-center">
                      <fee.icon className="w-5 h-5 text-golden" />
                    </div>
                    <span className="text-lg">{fee.title}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-background rounded-lg">
                    <span className="text-muted-foreground">Rate</span>
                    <span className="font-bold text-golden">{fee.rate}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-background rounded-lg">
                    <span className="text-muted-foreground">Payment</span>
                    <span className="font-medium">{fee.payment}</span>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Distribution:</p>
                    <div className="flex flex-wrap gap-2">
                      {fee.distribution.map((dist, i) => (
                        <span
                          key={i}
                          className={`text-xs px-2 py-1 rounded-full bg-background ${dist.color}`}
                        >
                          {dist.label}: {dist.value}
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
