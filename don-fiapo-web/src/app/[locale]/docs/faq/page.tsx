"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { useState } from "react";
import { ChevronDown, ArrowLeft } from "lucide-react";
import { Link } from "@/lib/navigation";

const faqCategories = [
  {
    category: "General",
    questions: [
      {
        q: "What is Don Fiapo?",
        a: "Don Fiapo de Manga is a memecoin built on the Lunes blockchain. It combines humor with real utility through staking, NFTs, and governance features."
      },
      {
        q: "What makes Don Fiapo different?",
        a: "Unlike typical memecoins, Don Fiapo offers real utility: 7-tier NFT mining system, multi-pool staking with up to 10% APY, and community governance."
      },
      {
        q: "What is the total supply?",
        a: "The total supply is 300 billion $FIAPO tokens, distributed across staking rewards, liquidity, marketing, team, and airdrops."
      },
    ]
  },
  {
    category: "Staking",
    questions: [
      {
        q: "What are the staking options?",
        a: "We offer three pools: Don Burn (10% APY, burns tokens), Don Lunes (6% APY, rewards in LUNES), and Don Fiapo (7% APY, compound rewards)."
      },
      {
        q: "What is the minimum stake amount?",
        a: "Minimum varies by pool: Don Burn (10,000 FIAPO), Don Lunes (50,000 FIAPO), Don Fiapo (100,000 FIAPO)."
      },
      {
        q: "How are rewards distributed?",
        a: "Don Burn: daily, Don Lunes: weekly, Don Fiapo: monthly. All rewards can be claimed or compounded."
      },
    ]
  },
  {
    category: "NFTs",
    questions: [
      {
        q: "What are Royal NFTs?",
        a: "Royal NFTs are ERC-721 tokens that mine $FIAPO daily. Higher tiers mine more tokens. Mining runs for 112 days from mint."
      },
      {
        q: "How many tiers are there?",
        a: "7 tiers: Free (5/day), Bronze $10 (50/day), Silver $30 (150/day), Gold $55 (300/day), Platinum $100 (500/day), Diamond $250 (1,200/day), Royal $500 (2,500/day). All tiers mine for 112 days."
      },
      {
        q: "When can I claim mined tokens?",
        a: "Tokens accumulate daily and can be claimed anytime. Mining period lasts 112 days from your NFT mint date."
      },
    ]
  },
  {
    category: "Technical",
    questions: [
      {
        q: "Which blockchain is Don Fiapo on?",
        a: "Don Fiapo is built on the Lunes blockchain, a Substrate-based network with fast transactions and low fees."
      },
      {
        q: "What wallet do I need?",
        a: "You need a Polkadot.js compatible wallet or Lunes Wallet. For NFT purchases, you can also use Solana wallets (Phantom, Solflare)."
      },
      {
        q: "Is the contract audited?",
        a: "Yes, our smart contracts have been audited. View the full report in the Security section of our documentation."
      },
    ]
  },
];

export default function FAQPage() {
  const [openItems, setOpenItems] = useState<string[]>([]);

  const toggleItem = (id: string) => {
    setOpenItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-4xl">
        <Link href="/docs" className="inline-flex items-center gap-2 text-muted-foreground hover:text-golden mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to Docs
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold font-display text-golden mb-4">❓ FAQ</h1>
          <p className="text-xl text-muted-foreground">Frequently Asked Questions</p>
        </motion.div>

        <div className="space-y-8">
          {faqCategories.map((category, ci) => (
            <motion.div
              key={category.category}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: ci * 0.1 }}
            >
              <h2 className="text-2xl font-bold text-golden mb-4">{category.category}</h2>
              <div className="space-y-2">
                {category.questions.map((item, qi) => {
                  const id = `${ci}-${qi}`;
                  const isOpen = openItems.includes(id);

                  return (
                    <div key={id} className="bg-card rounded-xl overflow-hidden">
                      <button
                        onClick={() => toggleItem(id)}
                        className="w-full p-4 flex items-center justify-between text-left hover:bg-muted/50 transition-colors"
                      >
                        <span className="font-medium pr-4">{item.q}</span>
                        <ChevronDown className={`w-5 h-5 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-4">
                          <p className="text-muted-foreground">{item.a}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
