"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Flame, Moon, Crown, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Link } from "@/lib/navigation";

const stakingPools = [
  { key: "donBurn", icon: Flame, color: "text-orange-500", bgColor: "bg-orange-500/10" },
  { key: "donLunes", icon: Moon, color: "text-blue-400", bgColor: "bg-blue-400/10" },
  { key: "donFiapo", icon: Crown, color: "text-golden", bgColor: "bg-golden/10" },
];

export function StakingPreviewSection() {
  const t = useTranslations("staking");

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
            🏰 {t("title")}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t("subtitle")}
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {stakingPools.map((pool, i) => {
            const Icon = pool.icon;
            return (
              <motion.div
                key={pool.key}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="h-full card-hover bg-background">
                  <CardHeader>
                    <div className={`w-16 h-16 rounded-2xl ${pool.bgColor} flex items-center justify-center mb-4`}>
                      <Icon className={`w-8 h-8 ${pool.color}`} />
                    </div>
                    <CardTitle className="text-foreground">{t(`${pool.key}.title`)}</CardTitle>
                    <CardDescription>{t(`${pool.key}.description`)}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-3 border-b border-border">
                        <span className="text-muted-foreground">APY</span>
                        <span className="text-2xl font-bold text-golden">{t(`${pool.key}.apy`)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Rewards</span>
                        <span className="font-medium">{t(`${pool.key}.frequency`)}</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button asChild className="w-full" variant="outline">
                      <Link href={`/staking/${pool.key.replace("don", "don-").toLowerCase()}`}>
                        {t("stake")}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
