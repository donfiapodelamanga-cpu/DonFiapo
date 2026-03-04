"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Server,
  Loader2,
  AlertCircle,
  CheckCircle,
  Shield,
  Clock,
  ArrowUpCircle,
  Radio,
  Lock,
  Eye,
  Ban,
  Zap,
} from "lucide-react";
import { getSession, AdminSession } from "@/lib/auth";
import { cn } from "@/lib/utils";

interface InfraData {
  oracle: {
    configured: boolean;
    name: string;
    description: string;
    features: string[];
    linkedContracts: string[];
  };
  security: {
    configured: boolean;
    name: string;
    description: string;
    config: Record<string, unknown>;
    features: string[];
  };
  timelock: {
    configured: boolean;
    name: string;
    description: string;
    delays: { operation: string; delay: string }[];
    expiration: string;
  };
  upgrade: {
    configured: boolean;
    name: string;
    description: string;
    config: { minUpgradeDelay: string; upgradeExpiration: string; minApprovals: number; rollbackAllowed: boolean };
    flow: string[];
  };
}

function StatusBadge({ configured }: { configured: boolean }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold",
      configured
        ? "bg-green-500/10 text-green-400 ring-1 ring-green-500/30"
        : "bg-red-500/10 text-red-400 ring-1 ring-red-500/30"
    )}>
      {configured ? <CheckCircle className="w-2.5 h-2.5" /> : <AlertCircle className="w-2.5 h-2.5" />}
      {configured ? "OK" : "N/A"}
    </span>
  );
}

export default function InfrastructurePage() {
  const router = useRouter();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [data, setData] = useState<InfraData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/infrastructure");
      if (res.ok) setData(await res.json());
    } catch (err) {
      console.error("[Infra Page] Fetch error:", err);
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white flex items-center gap-3">
          <div className="p-2 bg-yellow-500/10 rounded-xl ring-1 ring-yellow-500/30">
            <Server className="w-6 h-6 text-yellow-500" />
          </div>
          Infraestrutura
        </h1>
        <p className="text-neutral-500 text-sm mt-1">
          Oracle Multisig • Security • Timelock • Upgrade Manager
        </p>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { name: "Oracle", icon: <Radio className="w-5 h-5 text-blue-400" />, configured: data?.oracle?.configured },
          { name: "Security", icon: <Shield className="w-5 h-5 text-red-400" />, configured: data?.security?.configured },
          { name: "Timelock", icon: <Clock className="w-5 h-5 text-yellow-400" />, configured: data?.timelock?.configured },
          { name: "Upgrade", icon: <ArrowUpCircle className="w-5 h-5 text-green-400" />, configured: data?.upgrade?.configured },
        ].map((c) => (
          <div key={c.name} className="bg-neutral-900/40 border border-neutral-800/50 rounded-xl p-4 flex items-center gap-3">
            {c.icon}
            <div className="flex-1">
              <span className="text-white font-bold text-sm">{c.name}</span>
            </div>
            <StatusBadge configured={!!c.configured} />
          </div>
        ))}
      </div>

      {/* Oracle Multisig */}
      <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Radio className="w-4 h-4 text-blue-500" />
            {data?.oracle?.name || "Oracle Multisig"}
          </h3>
          <StatusBadge configured={!!data?.oracle?.configured} />
        </div>
        <p className="text-neutral-400 text-xs mb-4">{data?.oracle?.description}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="text-neutral-500 text-xs font-bold uppercase block mb-2">Funcionalidades</span>
            <ul className="space-y-1.5">
              {(data?.oracle?.features || []).map((f, i) => (
                <li key={i} className="text-neutral-400 text-xs flex items-start gap-2">
                  <CheckCircle className="w-3 h-3 text-green-400 mt-0.5 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <span className="text-neutral-500 text-xs font-bold uppercase block mb-2">Contratos Conectados</span>
            <div className="flex flex-wrap gap-2">
              {(data?.oracle?.linkedContracts || []).map((c) => (
                <span key={c} className="bg-blue-500/10 text-blue-400 text-xs px-2 py-1 rounded-lg ring-1 ring-blue-500/30 font-medium">
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-red-500" />
            {data?.security?.name || "Security"}
          </h3>
          <StatusBadge configured={!!data?.security?.configured} />
        </div>
        <p className="text-neutral-400 text-xs mb-4">{data?.security?.description}</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-neutral-800/30 rounded-lg p-3 text-center">
            <Lock className="w-5 h-5 text-green-400 mx-auto mb-1" />
            <span className="text-[10px] text-neutral-500 block">Reentrância</span>
            <span className="text-green-400 text-xs font-bold">Ativa</span>
          </div>
          <div className="bg-neutral-800/30 rounded-lg p-3 text-center">
            <Zap className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
            <span className="text-[10px] text-neutral-500 block">Rate Limit</span>
            <span className="text-yellow-400 text-xs font-bold">100 ops/min</span>
          </div>
          <div className="bg-neutral-800/30 rounded-lg p-3 text-center">
            <Eye className="w-5 h-5 text-blue-400 mx-auto mb-1" />
            <span className="text-[10px] text-neutral-500 block">Whitelist</span>
            <span className="text-blue-400 text-xs font-bold">Sem limite</span>
          </div>
          <div className="bg-neutral-800/30 rounded-lg p-3 text-center">
            <Ban className="w-5 h-5 text-red-400 mx-auto mb-1" />
            <span className="text-[10px] text-neutral-500 block">Blacklist</span>
            <span className="text-red-400 text-xs font-bold">Bloqueio total</span>
          </div>
        </div>

        <ul className="space-y-1.5">
          {(data?.security?.features || []).map((f, i) => (
            <li key={i} className="text-neutral-400 text-xs flex items-start gap-2">
              <Shield className="w-3 h-3 text-red-400 mt-0.5 flex-shrink-0" />
              {f}
            </li>
          ))}
        </ul>
      </div>

      {/* Timelock */}
      <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-yellow-500" />
            {data?.timelock?.name || "Timelock"}
          </h3>
          <StatusBadge configured={!!data?.timelock?.configured} />
        </div>
        <p className="text-neutral-400 text-xs mb-4">{data?.timelock?.description}</p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-neutral-500 text-xs uppercase tracking-wider border-b border-neutral-800">
                <th className="text-left py-2 px-3">Operação</th>
                <th className="text-right py-2 px-3">Delay</th>
              </tr>
            </thead>
            <tbody>
              {(data?.timelock?.delays || []).map((d) => (
                <tr key={d.operation} className="border-b border-neutral-800/50 hover:bg-neutral-800/20">
                  <td className="py-2 px-3 text-white font-medium text-xs">{d.operation}</td>
                  <td className="py-2 px-3 text-right text-yellow-400 font-mono text-xs font-bold">{d.delay}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 text-xs text-neutral-500">
          Expiração padrão: <span className="text-white font-bold">{data?.timelock?.expiration || "7 dias"}</span>
        </div>
      </div>

      {/* Upgrade Manager */}
      <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ArrowUpCircle className="w-4 h-4 text-green-500" />
            {data?.upgrade?.name || "Upgrade Manager"}
          </h3>
          <StatusBadge configured={!!data?.upgrade?.configured} />
        </div>
        <p className="text-neutral-400 text-xs mb-4">{data?.upgrade?.description}</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-neutral-800/30 rounded-lg p-3">
            <span className="text-neutral-500 text-[10px] block">Delay Mínimo</span>
            <span className="text-white font-bold text-sm">{data?.upgrade?.config?.minUpgradeDelay || "72h"}</span>
          </div>
          <div className="bg-neutral-800/30 rounded-lg p-3">
            <span className="text-neutral-500 text-[10px] block">Expiração</span>
            <span className="text-white font-bold text-sm">{data?.upgrade?.config?.upgradeExpiration || "7 dias"}</span>
          </div>
          <div className="bg-neutral-800/30 rounded-lg p-3">
            <span className="text-neutral-500 text-[10px] block">Aprovações Mín.</span>
            <span className="text-white font-bold text-sm">{data?.upgrade?.config?.minApprovals || 2}</span>
          </div>
          <div className="bg-neutral-800/30 rounded-lg p-3">
            <span className="text-neutral-500 text-[10px] block">Rollback</span>
            <span className={cn("font-bold text-sm", data?.upgrade?.config?.rollbackAllowed ? "text-green-400" : "text-red-400")}>
              {data?.upgrade?.config?.rollbackAllowed ? "Permitido" : "Bloqueado"}
            </span>
          </div>
        </div>

        <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4">
          <span className="text-neutral-500 text-xs font-bold uppercase block mb-2">Fluxo de Upgrade</span>
          <div className="flex items-center gap-2 flex-wrap">
            {["Proposta", "Aprovações (mín 2)", "Timelock (72h)", "Execução", "Histórico"].map((step, i) => (
              <span key={i} className="flex items-center gap-2">
                <span className="bg-green-500/10 text-green-400 text-xs px-2 py-1 rounded-lg ring-1 ring-green-500/30 font-medium">
                  {step}
                </span>
                {i < 4 && <span className="text-neutral-600">→</span>}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
