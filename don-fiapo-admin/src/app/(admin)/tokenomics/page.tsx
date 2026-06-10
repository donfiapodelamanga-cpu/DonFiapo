"use client";

import { useEffect, useState } from "react";
import { Coins, TrendingUp, AlertCircle, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Distribution {
  id: string;
  category: string;
  label: string;
  planned: number;
  distributed: number;
  percentage: number;
  status: string;
  notes: string | null;
}

interface TokenomicsData {
  totalSupply: number;
  totalPlanned: number;
  totalDistributed: number;
  progressPercent: number;
  distributions: Distribution[];
}

const CATEGORY_COLORS: Record<string, string> = {
  presale: "bg-amber-500",
  staking: "bg-yellow-500",
  ico: "bg-blue-500",
  airdrop: "bg-green-500",
  marketing: "bg-cyan-500",
  charity: "bg-pink-500",
  team: "bg-purple-500",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "Pendente", color: "border-neutral-500/20 bg-neutral-500/10 text-neutral-400", icon: <Clock className="w-3 h-3" /> },
  in_progress: { label: "Em Progresso", color: "border-yellow-500/20 bg-yellow-500/10 text-yellow-500", icon: <Loader2 className="w-3 h-3 animate-spin" /> },
  completed: { label: "Concluído", color: "border-green-500/20 bg-green-500/10 text-green-500", icon: <CheckCircle2 className="w-3 h-3" /> },
};

export default function TokenomicsPage() {
  const [data, setData] = useState<TokenomicsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/tokenomics")
      .then((res) => res.json())
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center gap-3 text-neutral-400">
        <Loader2 className="w-5 h-5 animate-spin" /> Carregando tokenomics...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 flex items-center gap-3 text-red-400">
          <AlertCircle className="w-5 h-5" />
          <span>Erro ao carregar: {error || "Dados não disponíveis"}. Execute: <code className="bg-neutral-800 px-2 py-1 rounded">npx prisma migrate dev && npx prisma db seed</code></span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Tokenomics</h1>
        <p className="text-neutral-400 mt-2">
          Distribuição de tokens $FIAPO — Planejado vs Distribuído (em bilhões)
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <p className="text-neutral-400 text-sm">Total Supply</p>
          <h3 className="text-2xl font-bold text-yellow-500 mt-2">{data.totalSupply}B</h3>
          <p className="text-xs text-neutral-500 mt-1">600 bilhões $FIAPO</p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <p className="text-neutral-400 text-sm">Planejado</p>
          <h3 className="text-2xl font-bold text-white mt-2">{data.totalPlanned}B</h3>
          <p className="text-xs text-neutral-500 mt-1">Alocação total definida</p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <p className="text-neutral-400 text-sm">Distribuído</p>
          <h3 className="text-2xl font-bold text-green-500 mt-2">{data.totalDistributed}B</h3>
          <p className="text-xs text-neutral-500 mt-1">Já entregue/liberado</p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <p className="text-neutral-400 text-sm">Progresso</p>
          <h3 className="text-2xl font-bold text-yellow-500 mt-2">{data.progressPercent.toFixed(1)}%</h3>
          <div className="mt-2 h-2 bg-neutral-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-yellow-500 rounded-full transition-all"
              style={{ width: `${Math.min(data.progressPercent, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Distribution Bar */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 mb-8">
        <h3 className="text-lg font-bold text-white mb-4">Distribuição Visual</h3>
        <div className="h-10 rounded-full overflow-hidden flex">
          {data.distributions.map((d) => (
            <div
              key={d.category}
              className={cn(
                CATEGORY_COLORS[d.category] || "bg-neutral-600",
                "h-full flex items-center justify-center text-xs font-bold text-white transition-all"
              )}
              style={{ width: `${d.percentage}%` }}
              title={`${d.label}: ${d.percentage}% (${d.planned}B)`}
            >
              {d.percentage > 5 && `${d.percentage}%`}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-4 mt-4">
          {data.distributions.map((d) => (
            <div key={d.category} className="flex items-center gap-2">
              <div className={cn("w-3 h-3 rounded-full", CATEGORY_COLORS[d.category] || "bg-neutral-600")} />
              <span className="text-sm text-neutral-300">{d.label}</span>
              <span className="text-sm text-yellow-500 font-bold">{d.percentage}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Distribution Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-neutral-800">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Coins className="w-5 h-5 text-yellow-500" />
            Detalhamento por Categoria
          </h3>
          <p className="text-sm text-neutral-400">Acompanhe a distribuição real vs planejada</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-neutral-950 text-neutral-400 uppercase font-medium">
              <tr className="border-b border-neutral-800">
                <th className="px-6 py-4">Categoria</th>
                <th className="px-6 py-4 text-right">%</th>
                <th className="px-6 py-4 text-right">Planejado</th>
                <th className="px-6 py-4 text-right">Distribuído</th>
                <th className="px-6 py-4">Progresso</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Notas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {data.distributions.map((d) => {
                const progress = d.planned > 0 ? (d.distributed / d.planned) * 100 : 0;
                const statusCfg = STATUS_CONFIG[d.status] || STATUS_CONFIG.pending;

                return (
                  <tr key={d.category} className="hover:bg-neutral-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-3 h-3 rounded-full", CATEGORY_COLORS[d.category] || "bg-neutral-600")} />
                        <span className="font-medium text-white">{d.label}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-yellow-500 font-bold">{d.percentage}%</td>
                    <td className="px-6 py-4 text-right text-white font-medium">{d.planned}B</td>
                    <td className="px-6 py-4 text-right">
                      <span className={d.distributed > 0 ? "text-green-500 font-medium" : "text-neutral-500"}>
                        {d.distributed}B
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-24">
                        <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-yellow-500 rounded-full"
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-neutral-500 mt-0.5 block">{progress.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className={cn("border gap-1", statusCfg.color)}>
                        {statusCfg.icon}
                        {statusCfg.label}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-neutral-500 text-xs max-w-[200px] truncate" title={d.notes || ""}>
                      {d.notes || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
