"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Coins, FileText, Send, Twitter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/navigation";

export function CTASection() {
  const t = useTranslations("cta");

  return (
    <section className="py-24 bg-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-golden/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-burgundy/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center"
        >
          <h2 className="text-4xl md:text-5xl font-bold font-display text-golden mb-4">
            ⚔️ {t("title")}
          </h2>
          <p className="text-xl text-muted-foreground mb-12">
            {t("subtitle")}
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button size="xl" className="glow-gold">
              <Coins className="w-5 h-5 mr-2" />
              {t("buy")}
            </Button>
            <Button size="xl" variant="outline" asChild>
              <Link href="/docs/whitepaper">
                <FileText className="w-5 h-5 mr-2" />
                {t("whitepaper")}
              </Link>
            </Button>
            <Button size="xl" variant="secondary" asChild>
              <a href="https://t.me/donfiapo" target="_blank" rel="noopener noreferrer">
                <Send className="w-5 h-5 mr-2" />
                {t("telegram")}
              </a>
            </Button>
            <Button size="xl" variant="secondary" asChild>
              <a href="https://twitter.com/donfiapo" target="_blank" rel="noopener noreferrer">
                <Twitter className="w-5 h-5 mr-2" />
                {t("social")}
              </a>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
