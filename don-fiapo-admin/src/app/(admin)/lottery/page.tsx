"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Gift,
  Star,
  TreePine,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle,
  Trophy,
  Shield,
  Calendar,
  DollarSign,
} from "lucide-react";
import { getSession, AdminSession } from "@/lib/auth";
import { cn } from "@/lib/utils";

interface LotteryTypeInfo {
  name: string;
  description: string;
  prizes: { first: string; second: string; third: string };
  interval: string;
  minBalance: string;
  maxBalance: string;
  antiWhale: string;
}

interface LotteryDashboardData {
  configured: boolean;
  contractAddress: string;
  monthly: LotteryTypeInfo;
  christmas: LotteryTypeInfo;
}

export default function LotteryPage() {
  const router = useRouter();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [data, setData] = useState<LotteryDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/lottery");
      if (res.ok) setData(await res.json());
    } catch (err) {
      console.error("[Lottery Page] Fetch error:", err);
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

  function LotteryCard({ info, icon, color }: { info: LotteryTypeInfo; icon: React.ReactNode; color: string }) {
    const colorMap: Record<string, { bg: string; border: string; text: string }> = {
      yellow: { bg: "bg-yellow-500/5", border: "border-yellow-500/20", text: "text-yellow-400" },
      red: { bg: "bg-red-500/5", border: "border-red-500/20", text: "text-red-400" },
    };
    const c = colorMap[color] || colorMap.yellow;

    return (
      <div className={cn("border rounded-2xl p-6", c.bg, c.border)}>
        <div className="flex items-center gap-3 mb-4">
          <div className={cn("p-3 rounded-xl ring-1", c.bg, `ring-${color}-500/30`)}>
            {icon}
          </div>
          <div>
            <h3 className="font-bold text-white text-lg">{info.name}</h3>
            <p className="text-neutral-400 text-xs">{info.description}</p>
          </div>
        </div>

        {/* Prizes */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { pos: "1º", pct: info.prizes.first, icon: <Trophy className="w-5 h-5 text-yellow-400" /> },
            { pos: "2º", pct: info.prizes.second, icon: <Trophy className="w-5 h-5 text-neutral-300" /> },
            { pos: "3º", pct: info.prizes.third, icon: <Trophy className="w-5 h-5 text-orange-400" /> },
          ].map((p) => (
            <div key={p.pos} className="bg-neutral-800/50 rounded-xl p-3 text-center">
              {p.icon}
              <div className="text-xl font-black text-white mt-1">{p.pct}</div>
              <div className="text-[10px] text-neutral-500">{p.pos} Lugar</div>
            </div>
          ))}
        </div>

        {/* Config details */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs">
            <Calendar className="w-3.5 h-3.5 text-neutral-500" />
            <span className="text-neutral-400">Intervalo:</span>
            <span className="text-white font-medium ml-auto">{info.interval}</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <DollarSign className="w-3.5 h-3.5 text-neutral-500" />
            <span className="text-neutral-400">Saldo mínimo:</span>
            <span className="text-white font-medium ml-auto">{info.minBalance}</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <DollarSign className="w-3.5 h-3.5 text-neutral-500" />
            <span className="text-neutral-400">Saldo máximo:</span>
            <span className="text-white font-medium ml-auto">{info.maxBalance}</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Shield className="w-3.5 h-3.5 text-neutral-500" />
            <span className="text-neutral-400">Anti-whale:</span>
            <span className="text-white font-medium ml-auto">{info.antiWhale}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 rounded-xl ring-1 ring-yellow-500/30">
              <Gift className="w-6 h-6 text-yellow-500" />
            </div>
            Lottery
          </h1>
          <p className="text-neutral-500 text-sm mt-1">
            Sorteio Mensal &quot;God Looked at You&quot; • Sorteio de Natal
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
              Configure <code className="bg-neutral-800 px-1 rounded">LOTTERY_CONTRACT</code> no <code className="bg-neutral-800 px-1 rounded">.env</code>
            </p>
          </div>
        </div>
      )}

      {/* Lottery Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {data?.monthly && (
          <LotteryCard
            info={data.monthly}
            icon={<Star className="w-8 h-8 text-yellow-400" />}
            color="yellow"
          />
        )}
        {data?.christmas && (
          <LotteryCard
            info={data.christmas}
            icon={<TreePine className="w-8 h-8 text-red-400" />}
            color="red"
          />
        )}
      </div>

      {/* How it works */}
      <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Gift className="w-4 h-4 text-yellow-500" />
          Como Funciona
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-neutral-800/30 rounded-xl p-4">
            <h4 className="font-bold text-white text-sm mb-2">1. Acumulação</h4>
            <p className="text-neutral-400 text-xs">
              5% das taxas mensais (staking, marketplace) são direcionadas ao fundo do sorteio mensal. 5% das taxas anuais vão para o fundo de Natal.
            </p>
          </div>
          <div className="bg-neutral-800/30 rounded-xl p-4">
            <h4 className="font-bold text-white text-sm mb-2">2. Elegibilidade</h4>
            <p className="text-neutral-400 text-xs">
              Carteiras com saldo entre 1,000 e 10M FIAPO participam. Top 100 carteiras (whales) são excluídas para garantir distribuição justa.
            </p>
          </div>
          <div className="bg-neutral-800/30 rounded-xl p-4">
            <h4 className="font-bold text-white text-sm mb-2">3. Sorteio</h4>
            <p className="text-neutral-400 text-xs">
              Pseudo-random on-chain seleciona 3 ganhadores. Prêmios distribuídos automaticamente via contrato Core (FIAPO tokens).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
