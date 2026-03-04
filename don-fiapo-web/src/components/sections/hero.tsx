"use client";

import { useTranslations } from "next-intl";
import { motion, useScroll, useTransform, Variants } from "framer-motion";
import { Crown, Scroll, Users, Gift, Sparkles, ChevronRight } from "lucide-react";
import Image from "next/image";
import { Link } from "@/lib/navigation";
import { useRef } from "react";
import { Button } from "@/components/ui/button";

// Micro-interaction presets
const springHover = { scale: 1.05 };
const springTap = { scale: 0.95 };
const springTransition = { type: "spring", stiffness: 400, damping: 17 };

export function HeroSection() {
  const t = useTranslations("hero");
  const containerRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  // Parallax effects
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <section 
      ref={containerRef}
      className="relative min-h-[100svh] flex items-center justify-center overflow-hidden bg-black"
    >
      {/* 1. Parallax Hero Background Image */}
      <motion.div 
        className="absolute inset-0 w-full h-[120%]" 
        style={{ y: bgY, top: "-10%" }}
      >
        <Image
          src="/hero-bg-v2.png"
          alt="Hero Background"
          fill
          priority
          className="object-cover object-center opacity-80"
          quality={100}
        />
        {/* Grain overlay for cinematic film feel */}
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay pointer-events-none" />
      </motion.div>

      {/* 2. Complex Vignette & Gradients (Depth) */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
      
      {/* Royal Glow Accents */}
      <div className="absolute inset-0 opacity-40 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[40rem] h-[40rem] bg-golden/10 rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute bottom-0 right-1/4 w-[30rem] h-[30rem] bg-amber-900/20 rounded-full blur-[100px] mix-blend-screen" />
      </div>

      {/* 3. Floating Gold Dust Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-golden rounded-full blur-[1px]"
            initial={{
              x: `${(i * 17 + 23) % 100}vw`,
              y: "110vh",
              opacity: 0,
              scale: Math.random() * 1.5 + 0.5
            }}
            animate={{
              y: "-10vh",
              opacity: [0, 0.8, 0],
              x: `+=${Math.random() * 50 - 25}px`
            }}
            transition={{
              duration: Math.random() * 10 + 15,
              repeat: Infinity,
              delay: Math.random() * 10,
              ease: "linear"
            }}
          />
        ))}
      </div>

      {/* 4. Main Content (Foreground) */}
      <motion.div 
        className="container mx-auto px-4 relative z-10 pt-20"
        style={{ y: textY, opacity }}
      >
        <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
          
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, type: "spring", bounce: 0.4 }}
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

          {/* Subtitle — cyclic fade pulse */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: [0, 1, 1, 1, 0, 0] }}
            transition={{
              duration: 7,
              delay: 0.8,
              times: [0, 0.1, 0.55, 0.7, 0.85, 1],
              repeat: Infinity,
              repeatDelay: 0.5,
              ease: "easeInOut",
            }}
            className="text-2xl md:text-3xl text-golden font-display mb-6"
          >
            👑 {t("subtitle")}
          </motion.p>

          {/* Description — cyclic fade pulse, offset from subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: [0, 1, 1, 1, 0, 0] }}
            transition={{
              duration: 7,
              delay: 1.4,
              times: [0, 0.1, 0.55, 0.7, 0.85, 1],
              repeat: Infinity,
              repeatDelay: 0.5,
              ease: "easeInOut",
            }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
          >
            {t("description")}
          </motion.p>

          {/* Call to Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto"
          >
            <motion.div whileHover={springHover} whileTap={springTap} className="w-full sm:w-auto">
              <Button size="xl" className="w-full sm:w-auto glow-gold">
                🪙 {t("cta.buy")}
              </Button>
            </motion.div>

            <motion.div whileHover={springHover} whileTap={springTap} className="w-full sm:w-auto">
              <Button size="xl" variant="outline" asChild className="w-full sm:w-auto">
                <Link href="/docs/whitepaper">
                  <Scroll className="w-5 h-5 mr-2" />
                  {t("cta.whitepaper")}
                </Link>
              </Button>
            </motion.div>
          </motion.div>

          {/* Secondary Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-4"
          >
            <motion.div whileHover={springHover} whileTap={springTap} className="w-full sm:w-auto">
              <Button size="lg" variant="secondary" asChild className="w-full sm:w-auto">
                <a href="https://t.me/donfiapodela" target="_blank" rel="noopener noreferrer">
                  <Users className="w-5 h-5 mr-2" />
                  {t("cta.telegram")}
                </a>
              </Button>
            </motion.div>

            <motion.div whileHover={springHover} whileTap={springTap} className="w-full sm:w-auto">
              <Button size="lg" variant="secondary" asChild className="w-full sm:w-auto">
                <Link href="/airdrop">
                  <Gift className="w-5 h-5 mr-2" />
                  {t("cta.airdrop")}
                </Link>
              </Button>
            </motion.div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 pt-16 border-t border-border"
          >
            {[
              { value: "600B", label: "Total Supply" },
              { value: "300%", label: "Max APY" },
              { value: "7", label: "NFT Tiers" },
              { value: "0.6%", label: "TX Fee" },
            ].map((stat, i) => (
              <motion.div 
                key={i} 
                className="text-center cursor-default"
                whileHover={{ scale: 1.1 }}
                transition={springTransition as any}
              >
                <div className="text-3xl md:text-4xl font-bold text-golden">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
