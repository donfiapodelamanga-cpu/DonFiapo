"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Award,
  Trophy,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle,
  BarChart3,
  Flame,
  Users,
  Vote,
  Coins,
  Shield,
} from "lucide-react";
import { getSession, AdminSession } from "@/lib/auth";
import { cn } from "@/lib/utils";

interface RewardsDashboardData {
  configured: boolean;
  contractAddress: string;
  config: {
    maxRankingSize: number;
    excludeTopWallets: number;
    minBalance: string;
    maxBalance: string;
    rewardPercentages: number[];
  };
  scoringWeights: Record<string, number>;
  rankingTypes: { id: number; name: string; description: string }[];
}

export default function RewardsPage() {
  const router = useRouter();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [data, setData] = useState<RewardsDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/rewards");
      if (res.ok) setData(await res.json());
    } catch (err) {
      console.error("[Rewards Page] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const s = getSession();
    if (!s) { router.push("/login"); return; }
    setSession(s);
    fetchData();
  }, [router, fetchData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
      </div>
    );
  }

  const configured = data?.configured || false;
  const weights = data?.scoringWeights || {};
  const percentages = data?.config?.rewardPercentages || [];

  const weightIcons: Record<string, React.ReactNode> = {
    balance: <Coins className="w-4 h-4" />,
    staking: <BarChart3 className="w-4 h-4" />,
    burn: <Flame className="w-4 h-4" />,
    transactions: <RefreshCw className="w-4 h-4" />,
    affiliates: <Users className="w-4 h-4" />,
    governance: <Vote className="w-4 h-4" />,
  };

  const weightLabels: Record<string, string> = {
    balance: "Saldo",
    staking: "Staking",
    burn: "Burn",
    transactions: "Transações",
    affiliates: "Afiliados",
    governance: "Governança",
  };

  const weightColors: Record<string, string> = {
    balance: "bg-yellow-500",
    staking: "bg-blue-500",
    burn: "bg-red-500",
    transactions: "bg-green-500",
    affiliates: "bg-purple-500",
    governance: "bg-cyan-500",
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 rounded-xl ring-1 ring-yellow-500/30">
              <Award className="w-6 h-6 text-yellow-500" />
            </div>
            Rewards & Rankings
          </h1>
          <p className="text-neutral-500 text-sm mt-1">
            Rankings mensais • Distribuição de recompensas • Proteção anti-whale
          </p>
        </div>
        <div className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium",
          configured
            ? "bg-green-500/10 text-green-400 ring-1 ring-green-500/30"
            : "bg-red-500/10 text-red-400 ring-1 ring-red-500/30"
        )}>
          {configured ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
          {configured ? "Contrato Configurado" : "Não Configurado"}
        </div>
      </div>

      {!configured && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 text-sm font-medium">Contrato não configurado</p>
            <p className="text-neutral-500 text-xs mt-2">
              Configure <code className="bg-neutral-800 px-1 rounded">REWARDS_CONTRACT</code> no <code className="bg-neutral-800 px-1 rounded">.env</code>
            </p>
          </div>
        </div>
      )}

      {/* Anti-whale config */}
      <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4 text-yellow-500" />
          Configuração do Ranking
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-neutral-800/30 rounded-lg p-3">
            <span className="text-neutral-500 text-xs block">Top Posições</span>
            <span className="text-white font-bold text-lg">{data?.config?.maxRankingSize || 12}</span>
          </div>
          <div className="bg-neutral-800/30 rounded-lg p-3">
            <span className="text-neutral-500 text-xs block">Excluir Top Wallets</span>
            <span className="text-red-400 font-bold text-lg">{data?.config?.excludeTopWallets || 100}</span>
          </div>
          <div className="bg-neutral-800/30 rounded-lg p-3">
            <span className="text-neutral-500 text-xs block">Saldo Mínimo</span>
            <span className="text-white font-bold text-lg">{data?.config?.minBalance}</span>
          </div>
          <div className="bg-neutral-800/30 rounded-lg p-3">
            <span className="text-neutral-500 text-xs block">Saldo Máximo</span>
            <span className="text-white font-bold text-lg">{data?.config?.maxBalance}</span>
          </div>
        </div>
      </div>

      {/* Scoring Weights */}
      <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-500" />
          Pesos do Score Geral
        </h3>

        {/* Stacked bar */}
        <div className="h-6 rounded-full overflow-hidden flex mb-4">
          {Object.entries(weights).map(([key, value]) => (
            <div
              key={key}
              className={cn("h-full transition-all flex items-center justify-center text-[10px] font-bold text-white", weightColors[key] || "bg-neutral-500")}
              style={{ width: `${value}%` }}
            >
              {value}%
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Object.entries(weights).map(([key, value]) => (
            <div key={key} className="flex items-center gap-2 text-xs">
              <div className={cn("w-2.5 h-2.5 rounded-full", weightColors[key] || "bg-neutral-500")} />
              <span className="text-neutral-400">{weightLabels[key] || key}</span>
              <span className="text-white font-mono ml-auto">{value}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Reward Distribution Table */}
      <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-500" />
          Distribuição de Prêmios (% do fundo)
        </h3>
        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
          {percentages.map((pct, i) => (
            <div key={i} className={cn(
              "rounded-xl p-3 text-center border",
              i === 0 ? "bg-yellow-500/10 border-yellow-500/30" :
              i === 1 ? "bg-neutral-400/10 border-neutral-400/30" :
              i === 2 ? "bg-orange-500/10 border-orange-500/30" :
              "bg-neutral-800/30 border-neutral-700/30"
            )}>
              <div className={cn(
                "text-lg font-black",
                i === 0 ? "text-yellow-400" :
                i === 1 ? "text-neutral-300" :
                i === 2 ? "text-orange-400" :
                "text-neutral-400"
              )}>
                {pct}%
              </div>
              <div className="text-[10px] text-neutral-500 mt-1">#{i + 1}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Ranking Types */}
      <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Award className="w-4 h-4 text-purple-500" />
          Tipos de Ranking
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(data?.rankingTypes || []).map((rt) => {
            const icons = [<Coins key={0} className="w-5 h-5" />, <BarChart3 key={1} className="w-5 h-5" />, <Flame key={2} className="w-5 h-5" />, <Users key={3} className="w-5 h-5" />, <Trophy key={4} className="w-5 h-5" />];
            const colors = ["text-yellow-400", "text-blue-400", "text-red-400", "text-purple-400", "text-green-400"];
            return (
              <div key={rt.id} className="bg-neutral-800/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className={colors[rt.id] || "text-neutral-400"}>{icons[rt.id]}</span>
                  <span className="font-bold text-white text-sm">{rt.name}</span>
                </div>
                <p className="text-neutral-400 text-xs">{rt.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
