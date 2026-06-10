"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Loader2,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  DollarSign,
  Trophy,
  Zap,
  ArrowRight,
} from "lucide-react";
import { getSession, AdminSession } from "@/lib/auth";
import { cn } from "@/lib/utils";

interface AffiliateDashboardData {
  configured: boolean;
  config: {
    enabled: boolean;
    boostPerAffiliateBps: number;
    maxBoostBps: number;
    minStakingForActive: string;
    maxDirectReferrals: number;
    leaderboardSize: number;
  };
  commissions: {
    level1: { bps: number; percent: string; label: string };
    level2: { bps: number; percent: string; label: string };
    total: { bps: number; percent: string; label: string };
  };
  apyBoost: {
    perAffiliate: string;
    maxBoost: string;
    requirement: string;
    example: { affiliates: number; boost: string }[];
  };
  leaderboard: {
    maxEntries: number;
    sortCriteria: string;
    updateTriggers: string[];
  };
}

export default function AffiliatePage() {
  const router = useRouter();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [data, setData] = useState<AffiliateDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/affiliate");
      if (res.ok) setData(await res.json());
    } catch (err) {
      console.error("[Affiliate Page] Fetch error:", err);
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
  const commissions = data?.commissions;
  const apyBoost = data?.apyBoost;
  const leaderboard = data?.leaderboard;
  const config = data?.config;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 rounded-xl ring-1 ring-yellow-500/30">
              <Users className="w-6 h-6 text-yellow-500" />
            </div>
            Afiliados
          </h1>
          <p className="text-neutral-500 text-sm mt-1">
            2 Níveis • Comissões • APY Boost • Leaderboard Top 100
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
              Configure <code className="bg-neutral-800 px-1 rounded">AFFILIATE_CONTRACT</code> no <code className="bg-neutral-800 px-1 rounded">.env</code>
            </p>
          </div>
        </div>
      )}

      {/* Commission Structure */}
      <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-green-500" />
          Estrutura de Comissões
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Level 1 */}
          <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-green-500/10 ring-1 ring-green-500/30 flex items-center justify-center text-green-400 font-bold text-sm">
                1
              </div>
              <span className="text-green-400 font-bold text-sm">{commissions?.level1?.label}</span>
            </div>
            <div className="text-3xl font-black text-white mb-1">{commissions?.level1?.percent}</div>
            <div className="text-neutral-500 text-xs">{commissions?.level1?.bps} bps por transação</div>
            <p className="text-neutral-400 text-xs mt-3 leading-relaxed">
              Comissão paga diretamente ao afiliado que indicou o usuário.
            </p>
          </div>

          {/* Level 2 */}
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/10 ring-1 ring-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-sm">
                2
              </div>
              <span className="text-blue-400 font-bold text-sm">{commissions?.level2?.label}</span>
            </div>
            <div className="text-3xl font-black text-white mb-1">{commissions?.level2?.percent}</div>
            <div className="text-neutral-500 text-xs">{commissions?.level2?.bps} bps por transação</div>
            <p className="text-neutral-400 text-xs mt-3 leading-relaxed">
              Comissão paga ao afiliado que indicou o referrer direto (segundo nível).
            </p>
          </div>

          {/* Total */}
          <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-yellow-500/10 ring-1 ring-yellow-500/30 flex items-center justify-center text-yellow-400 font-bold text-sm">
                Σ
              </div>
              <span className="text-yellow-400 font-bold text-sm">{commissions?.total?.label}</span>
            </div>
            <div className="text-3xl font-black text-white mb-1">{commissions?.total?.percent}</div>
            <div className="text-neutral-500 text-xs">{commissions?.total?.bps} bps combinados</div>
            <p className="text-neutral-400 text-xs mt-3 leading-relaxed">
              Total máximo distribuído entre os dois níveis de afiliação.
            </p>
          </div>
        </div>

        {/* Flow visual */}
        <div className="mt-4 bg-neutral-800/20 rounded-xl p-4">
          <div className="flex items-center justify-center gap-3 flex-wrap text-xs">
            <span className="bg-neutral-800 text-neutral-300 px-3 py-1.5 rounded-lg font-medium">Usuário Compra</span>
            <ArrowRight className="w-4 h-4 text-neutral-600" />
            <span className="bg-green-500/10 text-green-400 px-3 py-1.5 rounded-lg font-medium ring-1 ring-green-500/30">2.5% → Referrer N1</span>
            <ArrowRight className="w-4 h-4 text-neutral-600" />
            <span className="bg-blue-500/10 text-blue-400 px-3 py-1.5 rounded-lg font-medium ring-1 ring-blue-500/30">1% → Referrer N2</span>
          </div>
        </div>
      </div>

      {/* APY Boost */}
      <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-yellow-500" />
          APY Boost por Afiliados Ativos
        </h3>
        <p className="text-neutral-400 text-xs mb-4">
          Cada afiliado direto com staking ativo (mín. {config?.minStakingForActive}) adiciona <span className="text-yellow-400 font-bold">{apyBoost?.perAffiliate}</span> de boost no APY do referrer, até o máximo de <span className="text-yellow-400 font-bold">{apyBoost?.maxBoost}</span>.
        </p>

        <div className="grid grid-cols-4 gap-3">
          {(apyBoost?.example || []).map((ex) => (
            <div
              key={ex.affiliates}
              className={cn(
                "rounded-xl p-4 text-center border",
                ex.boost === "5.0% (máx)"
                  ? "bg-yellow-500/10 border-yellow-500/30"
                  : "bg-neutral-800/30 border-neutral-700/30"
              )}
            >
              <div className="text-2xl font-black text-white">{ex.affiliates}</div>
              <div className="text-[10px] text-neutral-500 mb-2">afiliado{ex.affiliates > 1 ? "s" : ""} ativo{ex.affiliates > 1 ? "s" : ""}</div>
              <div className={cn(
                "text-sm font-bold",
                ex.boost === "5.0% (máx)" ? "text-yellow-400" : "text-green-400"
              )}>
                +{ex.boost}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-3 flex items-start gap-2">
          <Zap className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-neutral-400">
            <span className="text-yellow-400 font-bold">Requisito de ativação:</span> {apyBoost?.requirement}
          </div>
        </div>
      </div>

      {/* Leaderboard Info */}
      <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-500" />
          Leaderboard On-Chain (Top {leaderboard?.maxEntries || 100})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="text-neutral-500 text-xs font-bold uppercase block mb-2">Critério de Ordenação</span>
            <div className="bg-neutral-800/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-yellow-500/10 ring-1 ring-yellow-500/30 flex items-center justify-center text-yellow-400 font-bold text-[10px]">
                  1º
                </div>
                <span className="text-white text-xs font-medium">Total de Earnings (DESC)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-neutral-700/50 ring-1 ring-neutral-600/50 flex items-center justify-center text-neutral-400 font-bold text-[10px]">
                  2º
                </div>
                <span className="text-neutral-400 text-xs font-medium">Direct Referrals (DESC) — desempate</span>
              </div>
            </div>
          </div>

          <div>
            <span className="text-neutral-500 text-xs font-bold uppercase block mb-2">Triggers de Atualização</span>
            <ul className="space-y-2">
              {(leaderboard?.updateTriggers || []).map((t, i) => (
                <li key={i} className="flex items-center gap-2 text-xs text-neutral-400">
                  <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-4 text-xs text-neutral-500">
          Complexidade: <span className="text-white font-mono">O(N)</span> onde N = {leaderboard?.maxEntries || 100} — Insertion Sort on-chain, custo constante e barato.
        </div>
      </div>

      {/* Config Summary */}
      <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Users className="w-4 h-4 text-yellow-500" />
          Configuração do Sistema
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-neutral-800/30 rounded-xl p-4">
            <span className="text-neutral-500 text-[10px] block mb-1">Status</span>
            <span className={cn("font-bold text-sm", config?.enabled ? "text-green-400" : "text-red-400")}>
              {config?.enabled ? "Ativado" : "Desativado"}
            </span>
          </div>
          <div className="bg-neutral-800/30 rounded-xl p-4">
            <span className="text-neutral-500 text-[10px] block mb-1">Máx. Referidos Diretos</span>
            <span className="text-white font-bold text-sm">{config?.maxDirectReferrals || 100}</span>
          </div>
          <div className="bg-neutral-800/30 rounded-xl p-4">
            <span className="text-neutral-500 text-[10px] block mb-1">Staking Mín. Ativação</span>
            <span className="text-white font-bold text-sm">{config?.minStakingForActive}</span>
          </div>
          <div className="bg-neutral-800/30 rounded-xl p-4">
            <span className="text-neutral-500 text-[10px] block mb-1">Leaderboard</span>
            <span className="text-white font-bold text-sm">Top {config?.leaderboardSize || 100}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
