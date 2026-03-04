"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Download, Crown, Coins, Shield, Users, Pickaxe, Vote, Flame, Gift, Percent, AlertTriangle, Scale, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/navigation";

const sections = [
  { id: "intro", title: "Introduction", icon: Crown },
  { id: "comparison", title: "Why Don Fiapo?", icon: Scale },
  { id: "tokenomics", title: "Tokenomics", icon: Coins },
  { id: "fees", title: "Fee Structure", icon: Percent },
  { id: "staking", title: "Staking System", icon: Shield },
  { id: "rewards", title: "Rewards & Lottery", icon: Gift },
  { id: "nfts", title: "NFT Mining", icon: Pickaxe },
  { id: "governance", title: "Governance", icon: Vote },
  { id: "team", title: "Team & Roadmap", icon: Users },
];

export default function WhitepaperPage() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <Link href="/docs" className="inline-flex items-center gap-2 text-muted-foreground hover:text-golden">
            <ArrowLeft className="w-4 h-4" /> Back to Docs
          </Link>

        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <motion.aside
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1"
          >
            <div className="sticky top-24 bg-card rounded-xl p-4 border border-border">
              <h3 className="font-bold text-golden mb-4">Contents</h3>
              <nav className="space-y-1">
                {sections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors"
                  >
                    <section.icon className="w-4 h-4 text-golden" />
                    {section.title}
                  </a>
                ))}
              </nav>
            </div>
          </motion.aside>

          {/* Content */}
          <motion.main
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-3 prose prose-invert max-w-none"
          >
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold font-display text-golden mb-4">
                📜 Royal Whitepaper
              </h1>
              <p className="text-xl text-muted-foreground">Don Fiapo de Manga - Technical Documentation v1.0</p>
            </div>

            <section id="intro" className="mb-12 scroll-mt-24">
              <h2 className="text-2xl font-bold text-golden flex items-center gap-2 mb-4">
                <Crown className="w-6 h-6" /> Introduction
              </h2>
              <div className="bg-card rounded-xl p-6 border border-border space-y-4">
                <p className="text-muted-foreground">
                  Don Fiapo de Manga is a memecoin that combines humor with real utility on the Lunes blockchain.
                  Our mission is to create a sustainable ecosystem where community members can earn rewards
                  through staking, NFT mining, and active participation in governance.
                </p>
                <p className="text-muted-foreground">
                  &quot;He doesn&apos;t bark — he decrees. The blockchain now has a monarchy.&quot;
                </p>
                <div className="bg-golden/10 border border-golden/30 rounded-lg p-4">
                  <p className="text-golden text-sm italic">
                    Don Fiapo represents the evolution of memecoins: from pure speculation to genuine utility
                    with transparent tokenomics and community-driven development.
                  </p>
                </div>
              </div>
            </section>

            {/* Comparison Section */}
            <section id="comparison" className="mb-12 scroll-mt-24">
              <h2 className="text-2xl font-bold text-golden flex items-center gap-2 mb-4">
                <Scale className="w-6 h-6" /> Why Don Fiapo? A Comparative Analysis
              </h2>
              <div className="bg-card rounded-xl p-6 border border-border space-y-6">
                <p className="text-muted-foreground">
                  While most memecoins rely solely on hype and speculation, Don Fiapo delivers a complete
                  ecosystem with real utility, sustainable rewards, and long-term value creation.
                </p>

                {/* Feature Comparison Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-2">Feature</th>
                        <th className="text-center py-3 px-2 text-golden">Don Fiapo</th>
                        <th className="text-center py-3 px-2">DOGE</th>
                        <th className="text-center py-3 px-2">SHIB</th>
                        <th className="text-center py-3 px-2">PEPE</th>
                        <th className="text-center py-3 px-2">BONK</th>
                      </tr>
                    </thead>
                    <tbody className="text-muted-foreground">
                      <tr className="border-b border-border/50">
                        <td className="py-3 px-2 font-medium">Staking Rewards</td>
                        <td className="text-center"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                        <td className="text-center"><X className="w-5 h-5 text-red-500/50 mx-auto" /></td>
                        <td className="text-center"><Check className="w-5 h-5 text-green-500/50 mx-auto" /></td>
                        <td className="text-center"><X className="w-5 h-5 text-red-500/50 mx-auto" /></td>
                        <td className="text-center"><X className="w-5 h-5 text-red-500/50 mx-auto" /></td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-3 px-2 font-medium">APY up to 300%</td>
                        <td className="text-center"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                        <td className="text-center"><X className="w-5 h-5 text-red-500/50 mx-auto" /></td>
                        <td className="text-center"><X className="w-5 h-5 text-red-500/50 mx-auto" /></td>
                        <td className="text-center"><X className="w-5 h-5 text-red-500/50 mx-auto" /></td>
                        <td className="text-center"><X className="w-5 h-5 text-red-500/50 mx-auto" /></td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-3 px-2 font-medium">NFT Mining System</td>
                        <td className="text-center"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                        <td className="text-center"><X className="w-5 h-5 text-red-500/50 mx-auto" /></td>
                        <td className="text-center"><X className="w-5 h-5 text-red-500/50 mx-auto" /></td>
                        <td className="text-center"><X className="w-5 h-5 text-red-500/50 mx-auto" /></td>
                        <td className="text-center"><X className="w-5 h-5 text-red-500/50 mx-auto" /></td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-3 px-2 font-medium">Burn Mechanism</td>
                        <td className="text-center"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                        <td className="text-center"><X className="w-5 h-5 text-red-500/50 mx-auto" /></td>
                        <td className="text-center"><Check className="w-5 h-5 text-green-500/50 mx-auto" /></td>
                        <td className="text-center"><X className="w-5 h-5 text-red-500/50 mx-auto" /></td>
                        <td className="text-center"><Check className="w-5 h-5 text-green-500/50 mx-auto" /></td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-3 px-2 font-medium">Monthly Lottery</td>
                        <td className="text-center"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                        <td className="text-center"><X className="w-5 h-5 text-red-500/50 mx-auto" /></td>
                        <td className="text-center"><X className="w-5 h-5 text-red-500/50 mx-auto" /></td>
                        <td className="text-center"><X className="w-5 h-5 text-red-500/50 mx-auto" /></td>
                        <td className="text-center"><X className="w-5 h-5 text-red-500/50 mx-auto" /></td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-3 px-2 font-medium">Affiliate Program</td>
                        <td className="text-center"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                        <td className="text-center"><X className="w-5 h-5 text-red-500/50 mx-auto" /></td>
                        <td className="text-center"><X className="w-5 h-5 text-red-500/50 mx-auto" /></td>
                        <td className="text-center"><X className="w-5 h-5 text-red-500/50 mx-auto" /></td>
                        <td className="text-center"><X className="w-5 h-5 text-red-500/50 mx-auto" /></td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-3 px-2 font-medium">Ranking Rewards</td>
                        <td className="text-center"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                        <td className="text-center"><X className="w-5 h-5 text-red-500/50 mx-auto" /></td>
                        <td className="text-center"><X className="w-5 h-5 text-red-500/50 mx-auto" /></td>
                        <td className="text-center"><X className="w-5 h-5 text-red-500/50 mx-auto" /></td>
                        <td className="text-center"><X className="w-5 h-5 text-red-500/50 mx-auto" /></td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-3 px-2 font-medium">Governance</td>
                        <td className="text-center"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                        <td className="text-center"><X className="w-5 h-5 text-red-500/50 mx-auto" /></td>
                        <td className="text-center"><Check className="w-5 h-5 text-green-500/50 mx-auto" /></td>
                        <td className="text-center"><X className="w-5 h-5 text-red-500/50 mx-auto" /></td>
                        <td className="text-center"><X className="w-5 h-5 text-red-500/50 mx-auto" /></td>
                      </tr>
                      <tr>
                        <td className="py-3 px-2 font-medium">Whale Protection</td>
                        <td className="text-center"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                        <td className="text-center"><X className="w-5 h-5 text-red-500/50 mx-auto" /></td>
                        <td className="text-center"><X className="w-5 h-5 text-red-500/50 mx-auto" /></td>
                        <td className="text-center"><X className="w-5 h-5 text-red-500/50 mx-auto" /></td>
                        <td className="text-center"><X className="w-5 h-5 text-red-500/50 mx-auto" /></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Key Differentiators */}
                <div>
                  <h4 className="font-bold mb-4">🏆 Key Differentiators</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-golden/10 to-yellow-500/5 p-4 rounded-lg border border-golden/30">
                      <h5 className="font-bold text-golden mb-2">💰 Multiple Income Streams</h5>
                      <p className="text-sm text-muted-foreground">
                        Earn through staking (up to 300% APY), NFT mining, affiliate commissions,
                        ranking rewards, and lottery prizes - all from a single token.
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/5 p-4 rounded-lg border border-purple-500/30">
                      <h5 className="font-bold text-purple-500 mb-2">🎰 Fair Lottery System</h5>
                      <p className="text-sm text-muted-foreground">
                        Monthly and annual lotteries exclude large wallets, ensuring fair distribution
                        to regular community members. 5% of fees go to lottery pools.
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-orange-500/10 to-red-500/5 p-4 rounded-lg border border-orange-500/30">
                      <h5 className="font-bold text-orange-500 mb-2">🔥 Deflationary by Design</h5>
                      <p className="text-sm text-muted-foreground">
                        30% of every transaction fee is burned. Burn-for-Boost feature rewards
                        users who actively reduce supply with enhanced APY bonuses.
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 p-4 rounded-lg border border-green-500/30">
                      <h5 className="font-bold text-green-500 mb-2">🛡️ Whale Protection</h5>
                      <p className="text-sm text-muted-foreground">
                        Top 100 wallets are excluded from monthly rewards ranking, preventing
                        concentration and ensuring fair rewards for active community members.
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/5 p-4 rounded-lg border border-blue-500/30">
                      <h5 className="font-bold text-blue-400 mb-2">⛏️ NFT Mining</h5>
                      <p className="text-sm text-muted-foreground">
                        Unique NFT-based mining system where each NFT mines tokens daily for 112 days.
                        No other memecoin offers passive income through NFT ownership.
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-cyan-500/10 to-teal-500/5 p-4 rounded-lg border border-cyan-500/30">
                      <h5 className="font-bold text-cyan-400 mb-2">👥 Affiliate Rewards</h5>
                      <p className="text-sm text-muted-foreground">
                        Earn commissions by referring new users. Multi-level affiliate system
                        with real-time payouts - unprecedented in the memecoin space.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bottom Line */}
                <div className="bg-golden/10 border border-golden/30 rounded-lg p-4">
                  <p className="text-golden font-medium text-center">
                    &quot;While other memecoins promise the moon, Don Fiapo builds the rocket.&quot; 🚀
                  </p>
                  <p className="text-sm text-muted-foreground text-center mt-2">
                    Real utility. Real rewards. Real community value.
                  </p>
                </div>
              </div>
            </section>

            <section id="tokenomics" className="mb-12 scroll-mt-24">
              <h2 className="text-2xl font-bold text-golden flex items-center gap-2 mb-4">
                <Coins className="w-6 h-6" /> Tokenomics
              </h2>
              <div className="bg-card rounded-xl p-6 border border-border space-y-6">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-background rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">Max Supply</p>
                    <p className="text-2xl font-bold text-golden">600 Bi</p>
                  </div>
                  <div className="bg-background rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">Initial Supply</p>
                    <p className="text-2xl font-bold">100 Mi</p>
                  </div>
                  <div className="bg-background rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">Decimals</p>
                    <p className="text-2xl font-bold">8</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold mb-3">Token Distribution</h4>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="flex justify-between items-center p-3 bg-amber-500/10 rounded-lg border border-amber-500/30">
                      <span className="text-amber-400 font-medium">Pre-sale</span>
                      <span className="text-2xl font-bold text-amber-400">25%</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-golden/10 rounded-lg border border-golden/30">
                      <span className="text-golden font-medium">Staking Fund</span>
                      <span className="text-2xl font-bold text-golden">51.67%</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-background rounded-lg">
                      <span>Airdrop</span>
                      <span className="font-bold">5.08%</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-background rounded-lg">
                      <span>Marketing</span>
                      <span className="font-bold">3.42%</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-background rounded-lg">
                      <span>Charity Donations</span>
                      <span className="font-bold">3.42%</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-background rounded-lg">
                      <span>IEO/ICO</span>
                      <span className="font-bold">10.67%</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-background rounded-lg">
                      <span>Team</span>
                      <span className="font-bold">0.75%</span>
                    </div>
                  </div>
                </div>

                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Flame className="w-5 h-5 text-orange-500" />
                    <h4 className="font-bold text-orange-500">Burn Wallet</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    A dedicated burn wallet receives and permanently removes tokens from circulation,
                    creating deflationary pressure over time.
                  </p>
                </div>
              </div>
            </section>

            {/* Fee Structure Section */}
            <section id="fees" className="mb-12 scroll-mt-24">
              <h2 className="text-2xl font-bold text-golden flex items-center gap-2 mb-4">
                <Percent className="w-6 h-6" /> Fee Structure
              </h2>
              <div className="bg-card rounded-xl p-6 border border-border space-y-6">
                {/* Transaction Fee */}
                <div>
                  <h4 className="font-bold mb-3">Transaction Fee: 0.6%</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Every transaction incurs a 0.6% fee, distributed as follows:
                  </p>
                  <div className="grid md:grid-cols-3 gap-3">
                    <div className="p-3 bg-orange-500/10 rounded-lg border border-orange-500/30 text-center">
                      <p className="text-2xl font-bold text-orange-500">30%</p>
                      <p className="text-sm text-muted-foreground">Burn</p>
                    </div>
                    <div className="p-3 bg-golden/10 rounded-lg border border-golden/30 text-center">
                      <p className="text-2xl font-bold text-golden">50%</p>
                      <p className="text-sm text-muted-foreground">Staking Fund</p>
                    </div>
                    <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/30 text-center">
                      <p className="text-2xl font-bold text-purple-500">20%</p>
                      <p className="text-sm text-muted-foreground">Ranking & Rewards</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    * After supply reaches 300Mi through burning, transaction fee increases to 1%
                  </p>
                </div>

                {/* Entry Fee */}
                <div>
                  <h4 className="font-bold mb-3">Staking Entry Fee (Variable)</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Fee is calculated in USDT/LUSDT based on the $FIAPO value being staked:
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2">Deposit Amount</th>
                          <th className="text-right py-2">Fee Rate</th>
                        </tr>
                      </thead>
                      <tbody className="text-muted-foreground">
                        <tr className="border-b border-border/50"><td className="py-2">Up to 1,000 $FIAPO</td><td className="text-right font-bold">10%</td></tr>
                        <tr className="border-b border-border/50"><td className="py-2">1,001 - 10,000 $FIAPO</td><td className="text-right font-bold">5%</td></tr>
                        <tr className="border-b border-border/50"><td className="py-2">10,001 - 100,000 $FIAPO</td><td className="text-right font-bold">2.5%</td></tr>
                        <tr className="border-b border-border/50"><td className="py-2">100,001 - 500,000 $FIAPO</td><td className="text-right font-bold">1%</td></tr>
                        <tr><td className="py-2">Above 500,000 $FIAPO</td><td className="text-right font-bold text-green-500">0.5%</td></tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Fee Distribution: 10% Team + 40% Staking Fund + 50% Ranking & Rewards by Performance
                  </p>
                </div>

                {/* Other Fees */}
                <div>
                  <h4 className="font-bold mb-3">Other Fees</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between p-3 bg-background rounded-lg">
                      <span className="text-muted-foreground">Early Withdrawal Penalty (Don Burn)</span>
                      <span className="font-bold text-red-500">10 LUSDT + 50% capital + 80% interest</span>
                    </div>
                    <div className="flex justify-between p-3 bg-background rounded-lg">
                      <span className="text-muted-foreground">Cancellation Fee (Don $LUNES)</span>
                      <span className="font-bold">2.5% capital</span>
                    </div>
                    <div className="flex justify-between p-3 bg-background rounded-lg">
                      <span className="text-muted-foreground">Interest Withdrawal Fee</span>
                      <span className="font-bold">1% of withdrawn value</span>
                    </div>
                    <div className="flex justify-between p-3 bg-background rounded-lg">
                      <span className="text-muted-foreground">Burn-for-Boost Fee</span>
                      <span className="font-bold">0.8 USDT/LUSDT + 10% of $FIAPO burned</span>
                    </div>
                    <div className="flex justify-between p-3 bg-background rounded-lg">
                      <span className="text-muted-foreground">Rewards Withdrawal Fee</span>
                      <span className="font-bold">0.3% of withdrawn value</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section id="staking" className="mb-12 scroll-mt-24">
              <h2 className="text-2xl font-bold text-golden flex items-center gap-2 mb-4">
                <Shield className="w-6 h-6" /> Staking System
              </h2>
              <div className="bg-card rounded-xl p-6 border border-border space-y-6">
                <p className="text-muted-foreground">Three unique staking pools with different strategies and reward mechanisms:</p>

                {/* Staking Pools */}
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-lg p-4 border border-orange-500/30">
                    <h4 className="font-bold text-orange-500 mb-2">🔥 Don Burn</h4>
                    <p className="text-2xl font-bold text-golden">10% - 300% APY</p>
                    <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                      <li>• Daily interest payments</li>
                      <li>• Minimum: 100 GMC</li>
                      <li>• Earns $FIAPO</li>
                      <li>• Long-term staking</li>
                    </ul>
                  </div>
                  <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-lg p-4 border border-blue-500/30">
                    <h4 className="font-bold text-blue-400 mb-2">🌙 Don $LUNES</h4>
                    <p className="text-2xl font-bold text-golden">6% - 37% APY</p>
                    <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                      <li>• Weekly interest payments</li>
                      <li>• Earns $FIAPO with Lunes</li>
                      <li>• Powered by Lunes Network</li>
                    </ul>
                  </div>
                  <div className="bg-gradient-to-br from-golden/10 to-yellow-500/10 rounded-lg p-4 border border-golden/30">
                    <h4 className="font-bold text-golden mb-2">👑 Don $FIAPO</h4>
                    <p className="text-2xl font-bold text-golden">6% - 37% APY</p>
                    <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                      <li>• Monthly payments (every 30 days)</li>
                      <li>• Minimum: 50 GMC</li>
                      <li>• Flexible staking</li>
                      <li>• Earns $FIAPO with Lunes</li>
                    </ul>
                  </div>
                </div>

                {/* Distribution Fund */}
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                  <h4 className="font-bold text-purple-500 mb-2">Distribution Fund</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    The staking fund distributes rewards in multiple currencies:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-background rounded-full text-sm">USDT</span>
                    <span className="px-3 py-1 bg-background rounded-full text-sm">$FIAPO</span>
                    <span className="px-3 py-1 bg-background rounded-full text-sm">Rewards in USDT</span>
                    <span className="px-3 py-1 bg-background rounded-full text-sm">Rewards in $FIAPO</span>
                  </div>
                </div>

                {/* First Year Note */}
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground">
                      <strong className="text-green-500">First Year Bonus:</strong> During the first year, we will try to pay the best possible
                      subsidizing the fund, but for members (wallets) who engage in burning tokens,
                      priority will be given for enhanced rewards.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Rewards & Lottery Section */}
            <section id="rewards" className="mb-12 scroll-mt-24">
              <h2 className="text-2xl font-bold text-golden flex items-center gap-2 mb-4">
                <Gift className="w-6 h-6" /> Rewards & Lottery System
              </h2>
              <div className="bg-card rounded-xl p-6 border border-border space-y-6">
                {/* Rewards Categories */}
                <div>
                  <h4 className="font-bold mb-3">Reward Categories</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Rankings are calculated and rewards distributed across multiple timeframes:
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2">Category</th>
                          <th className="text-center py-2">7 Days</th>
                          <th className="text-center py-2">30 Days</th>
                          <th className="text-center py-2">12 Months</th>
                        </tr>
                      </thead>
                      <tbody className="text-muted-foreground">
                        <tr className="border-b border-border/50">
                          <td className="py-2 font-medium">🔥 Burn Volume</td>
                          <td className="text-center">✓</td>
                          <td className="text-center">✓</td>
                          <td className="text-center">✓</td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-2 font-medium">💱 Transactions</td>
                          <td className="text-center">✓</td>
                          <td className="text-center">✓</td>
                          <td className="text-center">✓</td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-2 font-medium">📈 Active Staking</td>
                          <td className="text-center">✓</td>
                          <td className="text-center">✓</td>
                          <td className="text-center">✓</td>
                        </tr>
                        <tr>
                          <td className="py-2 font-medium">👥 Affiliates</td>
                          <td className="text-center">✓</td>
                          <td className="text-center">✓</td>
                          <td className="text-center">✓</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Monthly Lottery */}
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                  <h4 className="font-bold text-purple-500 mb-2">🙏 &quot;God Looked at You&quot; - Monthly Lottery</h4>
                  <p className="text-sm text-muted-foreground">
                    A random draw held at a random day and time each month. 5% of all fees in $FIAPO and LUSDT
                    from the month&apos;s ecosystem are raffled to a wallet, <strong>excluding large wallets</strong>
                    to ensure fair distribution among regular participants.
                  </p>
                </div>

                {/* Christmas Lottery */}
                <div className="bg-gradient-to-r from-red-500/10 to-green-500/10 border border-red-500/30 rounded-lg p-4">
                  <h4 className="font-bold text-red-500 mb-2">🎄 &quot;God Looked at You&quot; - Christmas Lottery</h4>
                  <p className="text-sm text-muted-foreground">
                    A special annual Christmas raffle with 5% of all fees accumulated throughout the year in
                    $FIAPO and LUSDT from the ecosystem. The prize is raffled to a wallet,
                    <strong> excluding large wallets</strong> to maintain fairness.
                  </p>
                </div>

                {/* Top 7 Monthly */}
                <div className="bg-golden/10 border border-golden/30 rounded-lg p-4">
                  <h4 className="font-bold text-golden mb-2">🏆 Top 7 Monthly Rewards</h4>
                  <p className="text-sm text-muted-foreground">
                    The top 7 wallets by balance (excluding top 100 whales) receive 20% of the staking fund
                    distributed equally every month. This ensures active community members are rewarded fairly.
                  </p>
                </div>
              </div>
            </section>

            <section id="nfts" className="mb-12 scroll-mt-24">
              <h2 className="text-2xl font-bold text-golden flex items-center gap-2 mb-4">
                <Pickaxe className="w-6 h-6" /> NFT Mining System
              </h2>
              <div className="bg-card rounded-xl p-6 border border-border space-y-4">
                <p className="text-muted-foreground">
                  Royal NFTs are PSP-34 tokens that mine $FIAPO daily. Each tier offers different mining rates and prices.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2">Tier</th>
                        <th className="text-right py-2">Price</th>
                        <th className="text-right py-2">Daily Mining</th>
                        <th className="text-right py-2">Monthly</th>
                      </tr>
                    </thead>
                    <tbody className="text-muted-foreground">
                      <tr><td className="py-2">Free Peasant</td><td className="text-right">$0</td><td className="text-right">5</td><td className="text-right text-golden">150</td></tr>
                      <tr><td className="py-2">Bronze Miner</td><td className="text-right">$10</td><td className="text-right">50</td><td className="text-right text-golden">1,500</td></tr>
                      <tr><td className="py-2">Silver Excavator</td><td className="text-right">$30</td><td className="text-right">150</td><td className="text-right text-golden">4,500</td></tr>
                      <tr><td className="py-2">Gold Prospector</td><td className="text-right">$55</td><td className="text-right">300</td><td className="text-right text-golden">9,000</td></tr>
                      <tr><td className="py-2">Platinum Tycoon</td><td className="text-right">$100</td><td className="text-right">500</td><td className="text-right text-golden">15,000</td></tr>
                      <tr><td className="py-2">Diamond Baron</td><td className="text-right">$250</td><td className="text-right">1,200</td><td className="text-right text-golden">36,000</td></tr>
                      <tr><td className="py-2">Royal Crown</td><td className="text-right">$500</td><td className="text-right">2,500</td><td className="text-right text-golden">75,000</td></tr>
                    </tbody>
                  </table>
                </div>

                {/* NFT Evolution Section */}
                <div className="mt-6 pt-6 border-t border-border">
                  <h3 className="text-xl font-bold text-orange-500 flex items-center gap-2 mb-4">
                    <Flame className="w-5 h-5" /> NFT Evolution System
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Don Fiapo features a unique <strong className="text-golden">deflationary NFT evolution</strong> system
                    that allows holders to burn multiple NFTs to create a higher-tier NFT with permanent mining bonuses.
                  </p>

                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                      <h4 className="font-bold text-orange-500 mb-2">🔥 How It Works</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Burn <strong>2+ NFTs</strong> of the same tier</li>
                        <li>• Receive <strong>1 NFT</strong> of the next tier</li>
                        <li>• Gain <strong>+10% permanent mining bonus</strong></li>
                        <li>• Bonus is <strong>cumulative</strong> (up to +50%)</li>
                      </ul>
                    </div>
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                      <h4 className="font-bold text-green-500 mb-2">📈 Deflationary Impact</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• 2 NFTs burned → 1 NFT created = <strong>-1 NFT</strong></li>
                        <li>• Permanent supply reduction</li>
                        <li>• Increased scarcity over time</li>
                        <li>• Projected <strong>-70% NFT supply</strong> in Year 1</li>
                      </ul>
                    </div>
                  </div>

                  <div className="bg-golden/10 border border-golden/30 rounded-lg p-4">
                    <h4 className="font-bold text-golden mb-2">💰 Evolution Bonus Example</h4>
                    <p className="text-sm text-muted-foreground">
                      A Royal Crown NFT with <strong>3 evolutions</strong>:<br />
                      Base mining: 2,500 FIAPO/day → After bonus: <strong className="text-green-400">3,250 FIAPO/day (+30%)</strong><br />
                      Extra yearly: <strong>+273,750 FIAPO</strong> compared to non-evolved NFT.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section id="governance" className="mb-12 scroll-mt-24">
              <h2 className="text-2xl font-bold text-golden flex items-center gap-2 mb-4">
                <Vote className="w-6 h-6" /> Governance
              </h2>
              <div className="bg-card rounded-xl p-6 border border-border space-y-4">
                <p className="text-muted-foreground">
                  $FIAPO holders can participate in governance decisions affecting the protocol:
                </p>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Voting power proportional to token holdings</li>
                  <li>• Proposal creation requires minimum 1M $FIAPO</li>
                  <li>• 7-day voting period for all proposals</li>
                  <li>• 51% quorum required for proposal execution</li>
                </ul>
              </div>
            </section>

            <section id="team" className="scroll-mt-24">
              <h2 className="text-2xl font-bold text-golden flex items-center gap-2 mb-4">
                <Users className="w-6 h-6" /> Team & Roadmap
              </h2>
              <div className="bg-card rounded-xl p-6 border border-border space-y-4">
                <p className="text-muted-foreground">
                  The Don Fiapo team consists of experienced blockchain developers and community builders
                  committed to long-term project success.
                </p>
                <h4 className="font-bold mt-4">Roadmap Highlights</h4>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• <strong className="text-muted-foreground">Phase 1:</strong> The Coronation (Complete)</li>
                  <li>• <strong className="text-golden">Phase 2:</strong> Kingdom Conquest (ICO & Marketplace)</li>
                  <li>• <strong className="text-blue-400">Phase 3:</strong> The Meme Empire (Staking & CEX)</li>
                  <li>• <strong className="text-purple-500">Phase 4:</strong> Global Domination (Games & Airdrop)</li>
                </ul>
              </div>
            </section>
          </motion.main>
        </div>
      </div>
    </div>
  );
}
