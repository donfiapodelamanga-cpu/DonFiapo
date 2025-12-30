"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Crown, Scroll, Users, Gift, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/navigation";

export function HeroSection() {
  const t = useTranslations("hero");

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Hero Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/hero-bg.png')" }}
      />
      {/* Dark overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
      {/* Additional decorative effects */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-golden/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-slate/20 rounded-full blur-3xl" />
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-golden rounded-full"
            initial={{
              x: `${(i * 7 + 13) % 100}%`, // Deterministic position
              y: "100%",
              opacity: 0
            }}
            animate={{
              y: "-10%",
              opacity: [0, 1, 0]
            }}
            transition={{
              duration: (i % 5) + 10,   // Deterministic duration
              repeat: Infinity,
              delay: (i % 5),           // Deterministic delay
            }}
          />
        ))}
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-golden/10 border border-golden/30 text-golden text-sm font-medium mb-8"
          >
            <Crown className="w-4 h-4" />
            <span>{t("badge")}</span>
            <Sparkles className="w-4 h-4" />
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-7xl lg:text-8xl font-bold font-display mb-4"
          >
            <span className="text-gradient-gold">{t("title")}</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-2xl md:text-3xl text-golden font-display mb-6"
          >
            👑 {t("subtitle")}
          </motion.p>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
          >
            {t("description")}
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button size="xl" className="w-full sm:w-auto glow-gold">
              🪙 {t("cta.buy")}
            </Button>
            <Button size="xl" variant="outline" asChild className="w-full sm:w-auto">
              <Link href="/docs/whitepaper">
                <Scroll className="w-5 h-5 mr-2" />
                {t("cta.whitepaper")}
              </Link>
            </Button>
          </motion.div>

          {/* Secondary CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-4"
          >
            <Button size="lg" variant="secondary" asChild className="w-full sm:w-auto">
              <a href="https://t.me/donfiapo" target="_blank" rel="noopener noreferrer">
                <Users className="w-5 h-5 mr-2" />
                {t("cta.telegram")}
              </a>
            </Button>
            <Button size="lg" variant="secondary" asChild className="w-full sm:w-auto">
              <Link href="/airdrop">
                <Gift className="w-5 h-5 mr-2" />
                {t("cta.airdrop")}
              </Link>
            </Button>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 pt-16 border-t border-border"
          >
            {[
              { value: "300B", label: "Total Supply" },
              { value: "300%", label: "Max APY" },
              { value: "7", label: "NFT Tiers" },
              { value: "0.6%", label: "TX Fee" },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-golden">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
