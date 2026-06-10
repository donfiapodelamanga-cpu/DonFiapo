"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Rocket,
  Loader2,
  AlertCircle,
  CheckCircle,
  Coins,
  BarChart3,
  Flame,
  Users,
  ImageIcon,
} from "lucide-react";
import { getSession, AdminSession } from "@/lib/auth";
import { cn } from "@/lib/utils";

interface AirdropDashboardData {
  configured: boolean;
  config: {
    minBalance: string;
    maxParticipants: number;
    pointsPerFiapo: number;
    pointsPerStake: number;
    pointsPerBurn: number;
    pointsPerNFT: number;
    nftTierMultipliers: number[];
  };
  distributionRates: Record<string, number>;
  pointsSources: { source: string; points: string; weight: string }[];
}

const TIER_NAMES = ["Free", "Bronze", "Silver", "Gold", "Diamond", "Emerald", "Ruby"];

export default function AirdropPage() {
  const router = useRouter();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [data, setData] = useState<AirdropDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/airdrop");
      if (res.ok) setData(await res.json());
    } catch (err) {
      console.error("[Airdrop Page] Fetch error:", err);
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
  const rates = data?.distributionRates || {};
  const multipliers = data?.config?.nftTierMultipliers || [];

  const rateColors: Record<string, string> = {
    holders: "bg-yellow-500",
    stakers: "bg-blue-500",
    burners: "bg-red-500",
    affiliates: "bg-purple-500",
    nftHolders: "bg-green-500",
  };

  const rateLabels: Record<string, string> = {
    holders: "Holders",
    stakers: "Stakers",
    burners: "Burners",
    affiliates: "Afiliados",
    nftHolders: "NFT Holders",
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 rounded-xl ring-1 ring-yellow-500/30">
              <Rocket className="w-6 h-6 text-yellow-500" />
            </div>
            Airdrop
          </h1>
          <p className="text-neutral-500 text-sm mt-1">
            Sistema de pontos • Distribuição por categoria • Rodadas anuais
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
              Configure <code className="bg-neutral-800 px-1 rounded">AIRDROP_CONTRACT</code> no <code className="bg-neutral-800 px-1 rounded">.env</code>
            </p>
          </div>
        </div>
      )}

      {/* Distribution Rates */}
      <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-500" />
          Distribuição por Categoria
        </h3>

        {/* Stacked bar */}
        <div className="h-8 rounded-full overflow-hidden flex mb-4">
          {Object.entries(rates).map(([key, value]) => (
            <div
              key={key}
              className={cn("h-full flex items-center justify-center text-xs font-bold text-white", rateColors[key] || "bg-neutral-500")}
              style={{ width: `${value}%` }}
            >
              {value}%
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Object.entries(rates).map(([key, value]) => (
            <div key={key} className="flex items-center gap-2 text-xs">
              <div className={cn("w-3 h-3 rounded-full", rateColors[key] || "bg-neutral-500")} />
              <span className="text-neutral-400">{rateLabels[key] || key}</span>
              <span className="text-white font-mono ml-auto font-bold">{value}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Points Sources */}
      <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Coins className="w-4 h-4 text-yellow-500" />
          Fontes de Pontos
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-neutral-500 text-xs uppercase tracking-wider border-b border-neutral-800">
                <th className="text-left py-2 px-3">Fonte</th>
                <th className="text-left py-2 px-3">Pontuação</th>
                <th className="text-right py-2 px-3">Peso</th>
              </tr>
            </thead>
            <tbody>
              {(data?.pointsSources || []).map((ps) => (
                <tr key={ps.source} className="border-b border-neutral-800/50 hover:bg-neutral-800/20">
                  <td className="py-2.5 px-3 font-medium text-white">{ps.source}</td>
                  <td className="py-2.5 px-3 text-neutral-400 font-mono text-xs">{ps.points}</td>
                  <td className="py-2.5 px-3 text-right text-yellow-400 font-bold">{ps.weight}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* NFT Tier Multipliers */}
      <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-green-500" />
          Multiplicadores NFT por Tier
        </h3>
        <div className="grid grid-cols-7 gap-3">
          {multipliers.map((mult, i) => (
            <div
              key={i}
              className={cn(
                "rounded-xl p-4 text-center border",
                i >= 5 ? "bg-yellow-500/10 border-yellow-500/30" :
                i >= 3 ? "bg-blue-500/10 border-blue-500/30" :
                "bg-neutral-800/30 border-neutral-700/30"
              )}
            >
              <div className={cn(
                "text-xl font-black",
                i >= 5 ? "text-yellow-400" :
                i >= 3 ? "text-blue-400" :
                "text-neutral-300"
              )}>
                {mult}x
              </div>
              <div className="text-[10px] text-neutral-500 mt-1">{TIER_NAMES[i]}</div>
              <div className="text-[10px] text-neutral-600 mt-0.5">{100 * mult} pts</div>
            </div>
          ))}
        </div>
      </div>

      {/* How rounds work */}
      <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Rocket className="w-4 h-4 text-yellow-500" />
          Ciclo de Vida da Rodada
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { step: "1", title: "Início", desc: "Owner inicia rodada definindo total de tokens a distribuir. Duração: ~12 meses." },
            { step: "2", title: "Acumulação", desc: "Pontos acumulam automaticamente baseado em saldo, staking, burn, NFTs e afiliados." },
            { step: "3", title: "Fechamento", desc: "Ao final do período, calcula tokens por ponto. Cada ponto vale X FIAPO." },
            { step: "4", title: "Claim", desc: "Usuários elegíveis fazem claim dos tokens proporcionais aos seus pontos acumulados." },
          ].map((s) => (
            <div key={s.step} className="bg-neutral-800/30 rounded-xl p-4">
              <div className="w-8 h-8 rounded-full bg-yellow-500/10 ring-1 ring-yellow-500/30 flex items-center justify-center text-yellow-400 font-bold text-sm mb-2">
                {s.step}
              </div>
              <h4 className="font-bold text-white text-sm mb-1">{s.title}</h4>
              <p className="text-neutral-400 text-xs leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
