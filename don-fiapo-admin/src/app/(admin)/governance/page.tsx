"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Vote,
  Loader2,
  AlertCircle,
  CheckCircle,
  Shield,
  Clock,
  DollarSign,
  Zap,
  Settings,
  Rocket,
  Megaphone,
  Code,
  Flame,
} from "lucide-react";
import { getSession, AdminSession } from "@/lib/auth";
import { cn } from "@/lib/utils";

interface GovernanceDashboardData {
  configured: boolean;
  config: {
    quorum: string;
    votingPeriod: string;
    timelockPeriod: string;
    proposalFeeFiapo: string;
    proposalFeeUsdt: string;
    voteFeeFiapo: string;
    voteFeeUsdt: string;
    maxVotesPerHour: number;
    requiresStaking: boolean;
  };
  proposalTypes: { type: string; label: string; description: string }[];
  feeDistribution: Record<string, string>;
}

export default function GovernancePage() {
  const router = useRouter();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [data, setData] = useState<GovernanceDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/governance");
      if (res.ok) setData(await res.json());
    } catch (err) {
      console.error("[Governance Page] Fetch error:", err);
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
  const config = data?.config;
  const feeDist = data?.feeDistribution || {};

  const typeIcons: Record<string, React.ReactNode> = {
    ConfigChange: <Settings className="w-5 h-5 text-blue-400" />,
    Emergency: <Zap className="w-5 h-5 text-red-400" />,
    Upgrade: <Rocket className="w-5 h-5 text-purple-400" />,
    Marketing: <Megaphone className="w-5 h-5 text-green-400" />,
    Development: <Code className="w-5 h-5 text-yellow-400" />,
  };

  const feeColors: Record<string, string> = {
    team: "bg-yellow-500",
    staking: "bg-blue-500",
    rewards: "bg-green-500",
    burn: "bg-red-500",
    noble: "bg-purple-500",
  };

  const feeLabels: Record<string, string> = {
    team: "Equipe",
    staking: "Staking",
    rewards: "Rewards",
    burn: "Burn",
    noble: "Noble",
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 rounded-xl ring-1 ring-yellow-500/30">
              <Vote className="w-6 h-6 text-yellow-500" />
            </div>
            Governance
          </h1>
          <p className="text-neutral-500 text-sm mt-1">
            Propostas • Votação • Timelock • Execução
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
              Configure <code className="bg-neutral-800 px-1 rounded">GOVERNANCE_CONTRACT</code> no <code className="bg-neutral-800 px-1 rounded">.env</code>
            </p>
          </div>
        </div>
      )}

      {/* Config Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-yellow-400" />
            <span className="text-neutral-500 text-xs font-bold uppercase">Quorum</span>
          </div>
          <div className="text-2xl font-black text-white">{config?.quorum || "51%"}</div>
        </div>
        <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <span className="text-neutral-500 text-xs font-bold uppercase">Votação</span>
          </div>
          <div className="text-2xl font-black text-white">{config?.votingPeriod || "3 dias"}</div>
        </div>
        <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-purple-400" />
            <span className="text-neutral-500 text-xs font-bold uppercase">Timelock</span>
          </div>
          <div className="text-2xl font-black text-white">{config?.timelockPeriod || "1 dia"}</div>
        </div>
        <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-red-400" />
            <span className="text-neutral-500 text-xs font-bold uppercase">Anti-Spam</span>
          </div>
          <div className="text-2xl font-black text-white">{config?.maxVotesPerHour || 10}/hora</div>
        </div>
      </div>

      {/* Fee Requirements */}
      <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-green-500" />
          Custos de Participação
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
            <h4 className="font-bold text-blue-400 text-sm mb-3">Criar Proposta</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-neutral-400">FIAPO</span>
                <span className="text-white font-mono font-bold">{config?.proposalFeeFiapo}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-neutral-400">USDT (Solana)</span>
                <span className="text-white font-mono font-bold">{config?.proposalFeeUsdt}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-neutral-400">Staking Ativo</span>
                <span className="text-green-400 font-bold">Obrigatório</span>
              </div>
            </div>
          </div>

          <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4">
            <h4 className="font-bold text-purple-400 text-sm mb-3">Votar</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-neutral-400">FIAPO</span>
                <span className="text-white font-mono font-bold">{config?.voteFeeFiapo}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-neutral-400">USDT (Solana)</span>
                <span className="text-white font-mono font-bold">{config?.voteFeeUsdt}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-neutral-400">Staking Ativo</span>
                <span className="text-green-400 font-bold">Obrigatório</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fee Distribution */}
      <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Flame className="w-4 h-4 text-red-500" />
          Distribuição de Taxas FIAPO
        </h3>
        <div className="h-6 rounded-full overflow-hidden flex mb-4">
          {Object.entries(feeDist).map(([key, value]) => (
            <div
              key={key}
              className={cn("h-full flex items-center justify-center text-[10px] font-bold text-white", feeColors[key] || "bg-neutral-500")}
              style={{ width: value }}
            >
              {value}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-5 gap-3">
          {Object.entries(feeDist).map(([key, value]) => (
            <div key={key} className="flex items-center gap-2 text-xs">
              <div className={cn("w-2.5 h-2.5 rounded-full", feeColors[key])} />
              <span className="text-neutral-400">{feeLabels[key]}</span>
              <span className="text-white font-mono ml-auto">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Proposal Types */}
      <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Vote className="w-4 h-4 text-yellow-500" />
          Tipos de Proposta
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(data?.proposalTypes || []).map((pt) => (
            <div key={pt.type} className="bg-neutral-800/30 rounded-xl p-4 flex items-start gap-3">
              {typeIcons[pt.type] || <Settings className="w-5 h-5 text-neutral-400" />}
              <div>
                <h4 className="font-bold text-white text-sm">{pt.label}</h4>
                <p className="text-neutral-400 text-xs mt-1">{pt.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Governance Flow */}
      <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4 text-yellow-500" />
          Fluxo de Governança
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { step: "1", title: "Proposta", desc: "Usuário com staking ativo paga 1,000 FIAPO + 100 USDT para criar proposta.", color: "blue" },
            { step: "2", title: "Votação", desc: "3 dias para votar (For/Against/Abstain). Cada voto custa 100 FIAPO + 10 USDT. Máx 10 votos/hora.", color: "purple" },
            { step: "3", title: "Timelock", desc: "Se aprovada (quorum 51%), entra em timelock de 1 dia antes da execução.", color: "yellow" },
            { step: "4", title: "Execução", desc: "Após timelock, proposta pode ser executada pelo owner ou automaticamente.", color: "green" },
          ].map((s) => (
            <div key={s.step} className="bg-neutral-800/30 rounded-xl p-4">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm mb-2 ring-1",
                s.color === "blue" ? "bg-blue-500/10 ring-blue-500/30 text-blue-400" :
                s.color === "purple" ? "bg-purple-500/10 ring-purple-500/30 text-purple-400" :
                s.color === "yellow" ? "bg-yellow-500/10 ring-yellow-500/30 text-yellow-400" :
                "bg-green-500/10 ring-green-500/30 text-green-400"
              )}>
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
