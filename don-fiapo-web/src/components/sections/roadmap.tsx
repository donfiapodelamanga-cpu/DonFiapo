"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Crown, Swords, Castle, Globe, CheckCircle2 } from "lucide-react";

const phases = [
  { icon: Crown, key: "phase1", status: "completed" },
  { icon: Swords, key: "phase2", status: "current" },
  { icon: Castle, key: "phase3", status: "upcoming" },
  { icon: Globe, key: "phase4", status: "upcoming" },
];

export function RoadmapSection() {
  const t = useTranslations("roadmap");

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
            🗺️ {t("title")}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t("subtitle")}
          </p>
        </motion.div>

        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-0.5 bg-border md:-translate-x-1/2" />

          <div className="space-y-12">
            {phases.map((phase, i) => {
              const Icon = phase.icon;
              const isCompleted = phase.status === "completed";
              const isCurrent = phase.status === "current";
              
              return (
                <motion.div
                  key={phase.key}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className={`relative flex flex-col md:flex-row items-start gap-8 ${
                    i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                  }`}
                >
                  {/* Timeline dot */}
                  <div className="absolute left-4 md:left-1/2 w-8 h-8 -translate-x-1/2 flex items-center justify-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isCompleted ? "bg-green-500" : isCurrent ? "bg-golden" : "bg-muted"
                    }`}>
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-background" />
                      ) : (
                        <Icon className="w-4 h-4 text-background" />
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className={`ml-16 md:ml-0 md:w-5/12 ${i % 2 === 0 ? "md:text-right md:pr-16" : "md:pl-16"}`}>
                    <div className={`bg-card rounded-xl p-6 border ${
                      isCurrent ? "border-golden glow-gold" : "border-border"
                    } card-hover`}>
                      <h3 className="text-xl font-bold text-golden mb-4 flex items-center gap-2 ${i % 2 === 0 ? 'md:justify-end' : ''}">
                        <Icon className="w-5 h-5" />
                        {t(`${phase.key}.title`)}
                      </h3>
                      <ul className={`space-y-2 ${i % 2 === 0 ? "md:text-right" : ""}`}>
                        {(t.raw(`${phase.key}.items`) as string[]).map((item: string, j: number) => (
                          <li key={j} className="text-muted-foreground flex items-center gap-2 ${i % 2 === 0 ? 'md:justify-end' : ''}">
                            <span className="w-1.5 h-1.5 rounded-full bg-golden" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Spacer for opposite side */}
                  <div className="hidden md:block md:w-5/12" />
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
