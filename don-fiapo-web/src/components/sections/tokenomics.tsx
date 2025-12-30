"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { siteConfig } from "@/config/site";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const tokenomicsData = [
  { name: "Staking Fund", value: 80, color: "#FFD700", emoji: "🏆" },
  { name: "Airdrop", value: 7, color: "#10B981", emoji: "🎁" },
  { name: "Marketing", value: 5, color: "#EF4444", emoji: "📢" },
  { name: "Charity", value: 5, color: "#8B5CF6", emoji: "💜" },
  { name: "IEO/ICO", value: 2, color: "#3B82F6", emoji: "🚀" },
  { name: "Team", value: 1, color: "#6B7280", emoji: "👥" },
];

// Custom label for pie chart
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name, value }: any) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent < 0.05) return null; // Don't show label for small slices

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      className="text-xs font-bold"
      style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
    >
      {`${value}%`}
    </text>
  );
};

export function TokenomicsSection() {
  const t = useTranslations("tokenomics");

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
            👑 {t("title")}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t("subtitle")}
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Chart */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative"
          >
            {/* Glow effect behind chart */}
            <div className="absolute inset-0 bg-gradient-to-r from-golden/20 via-purple-500/20 to-golden/20 rounded-full blur-3xl" />

            <div className="relative" style={{ width: '100%', height: '400px' }}>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <defs>
                    {tokenomicsData.map((entry, index) => (
                      <linearGradient key={`gradient-${index}`} id={`gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={entry.color} stopOpacity={1} />
                        <stop offset="100%" stopColor={entry.color} stopOpacity={0.7} />
                      </linearGradient>
                    ))}
                  </defs>
                  <Pie
                    data={tokenomicsData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={140}
                    paddingAngle={3}
                    dataKey="value"
                    label={renderCustomLabel}
                    labelLine={false}
                    stroke="#1a1a1a"
                    strokeWidth={2}
                  >
                    {tokenomicsData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={`url(#gradient-${index})`}
                        style={{
                          filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3))',
                        }}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(26, 26, 26, 0.95)",
                      border: "1px solid #FFD700",
                      borderRadius: "12px",
                      padding: "12px 16px",
                      boxShadow: "0 10px 40px rgba(0, 0, 0, 0.5)",
                    }}
                    formatter={(value, name) => [
                      <span key="value" className="text-golden font-bold text-lg">{value}%</span>,
                      <span key="name" className="text-muted-foreground">{name}</span>
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Center text */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <p className="text-3xl font-bold text-golden">100%</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Details */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <div className="bg-background rounded-xl p-6 border border-golden/30 shadow-lg shadow-golden/10">
              <div className="flex justify-between items-center mb-4">
                <span className="text-muted-foreground">{t("totalSupply")}</span>
                <span className="text-2xl font-bold text-golden">{siteConfig.tokenomics.totalSupply}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t("symbol")}</span>
                <span className="text-xl font-bold">{siteConfig.tokenomics.symbol}</span>
              </div>
            </div>

            <div className="space-y-2">
              {tokenomicsData.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-4 p-3 rounded-lg bg-background/50 hover:bg-background transition-colors border border-border/50"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                    style={{ backgroundColor: `${item.color}20` }}
                  >
                    {item.emoji}
                  </div>
                  <div
                    className="w-3 h-3 rounded-full shadow-lg"
                    style={{
                      backgroundColor: item.color,
                      boxShadow: `0 0 10px ${item.color}80`
                    }}
                  />
                  <span className="flex-1 font-medium">{item.name}</span>
                  <div className="text-right">
                    <span className="text-xl font-bold" style={{ color: item.color }}>{item.value}%</span>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="bg-gradient-to-r from-golden/10 to-orange-500/10 border border-golden/30 rounded-xl p-4">
              <p className="text-sm text-golden italic">
                💰 {t("note")}
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
