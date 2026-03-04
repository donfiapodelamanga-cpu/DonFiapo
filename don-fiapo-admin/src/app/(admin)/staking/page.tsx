"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Coins,
  TrendingUp,
  Users,
  Layers,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  Flame,
  Zap,
  Award,
} from "lucide-react";
import { getSession, AdminSession } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { POOL_COLORS } from "@/lib/blockchain/staking-abi";

// ==================== Interfaces ====================

interface StakingStats {
  totalStaked: number;
  totalStakedFormatted: string;
  totalStakers: number;
  totalRewardsDistributed: number;
  totalRewardsFormatted: string;
  activePositions: number;
}

interface PoolInfo {
  id: number;
  name: string;
  apyRange: string;
  frequency: string;
  minDays: number;
  color: string;
}

interface StakingDashboardData {
  stats: StakingStats;
  pools: PoolInfo[];
  connected: boolean;
  error?: string;
}

// ==================== Sub-Components ====================

function StatCard({
  title,
  value,
  subtitle,
  icon,
  color = "yellow",
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  color?: string;
}) {
  const colorMap: Record<string, string> = {
    yellow: "bg-yellow-500/10 ring-yellow-500/30 text-yellow-500",
    green: "bg-green-500/10 ring-green-500/30 text-green-500",
    blue: "bg-blue-500/10 ring-blue-500/30 text-blue-500",
    purple: "bg-purple-500/10 ring-purple-500/30 text-purple-500",
    red: "bg-red-500/10 ring-red-500/30 text-red-500",
  };

  return (
    <div className="bg-neutral-900/40 backdrop-blur-md border border-neutral-800/50 rounded-2xl p-5 hover:shadow-lg hover:shadow-yellow-500/5 transition-all duration-300">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-neutral-500 text-xs font-bold uppercase tracking-widest truncate">{title}</p>
          <h3 className="text-2xl font-black text-white mt-2 tracking-tight">{value}</h3>
          {subtitle && <p className="text-xs text-neutral-500 mt-1">{subtitle}</p>}
        </div>
        <div className={cn("p-2.5 rounded-xl ring-1 flex-shrink-0 ml-3", colorMap[color])}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function PoolCard({ pool }: { pool: PoolInfo }) {
  const colors = POOL_COLORS[pool.id] || POOL_COLORS[0];
  const icons: Record<number, React.ReactNode> = {
    0: <Flame className="w-8 h-8 text-red-400" />,
    1: <Zap className="w-8 h-8 text-blue-400" />,
    2: <Award className="w-8 h-8 text-yellow-400" />,
  };

  return (
    <div className={cn("border rounded-2xl p-6 transition-all hover:shadow-lg", colors.border, colors.bg)}>
      <div className="flex items-center gap-4 mb-4">
        <div className={cn("p-3 rounded-xl ring-1", colors.bg, colors.ring)}>
          {icons[pool.id] || icons[0]}
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">{pool.name}</h3>
          <p className={cn("text-sm font-mono font-bold", colors.text)}>APY {pool.apyRange}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="bg-neutral-800/50 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-neutral-500 text-xs mb-1">
            <Clock className="w-3 h-3" />
            Frequência
          </div>
          <span className="text-white text-sm font-medium">{pool.frequency}</span>
        </div>
        <div className="bg-neutral-800/50 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-neutral-500 text-xs mb-1">
            <Layers className="w-3 h-3" />
            Mínimo
          </div>
          <span className="text-white text-sm font-medium">{pool.minDays} dias</span>
        </div>
      </div>
    </div>
  );
}

// ==================== Main Page ====================

export default function StakingPage() {
  const router = useRouter();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [data, setData] = useState<StakingDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/staking");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("[Staking Page] Fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const currentSession = getSession();
    if (!currentSession) {
      router.push("/login");
      return;
    }
    setSession(currentSession);
    fetchData();
  }, [router, fetchData]);

  useEffect(() => {
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
      </div>
    );
  }

  const stats = data?.stats;
  const pools = data?.pools || [];
  const connected = data?.connected || false;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 rounded-xl ring-1 ring-yellow-500/30">
              <Coins className="w-6 h-6 text-yellow-500" />
            </div>
            Staking
          </h1>
          <p className="text-neutral-500 text-sm mt-1">
            3 Pools • Don Burn • Don Lunes • Don Fiapo
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium",
            connected
              ? "bg-green-500/10 text-green-400 ring-1 ring-green-500/30"
              : "bg-red-500/10 text-red-400 ring-1 ring-red-500/30"
          )}>
            {connected ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
            {connected ? "On-Chain" : "Offline"}
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-1.5 bg-neutral-800 text-neutral-300 rounded-lg hover:bg-neutral-700 transition-colors text-xs"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Error */}
      {data?.error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 text-sm font-medium">Erro de conexão</p>
            <p className="text-red-400/70 text-xs mt-1">{data.error}</p>
            <p className="text-neutral-500 text-xs mt-2">
              Configure <code className="bg-neutral-800 px-1 rounded">STAKING_CONTRACT</code> no arquivo <code className="bg-neutral-800 px-1 rounded">.env</code>
            </p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="TVL (Total Staked)"
          value={`${stats?.totalStakedFormatted || "0"} FIAPO`}
          subtitle={`${(stats?.totalStaked || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })} tokens`}
          icon={<Coins className="w-5 h-5" />}
          color="yellow"
        />
        <StatCard
          title="Stakers"
          value={stats?.totalStakers.toLocaleString() || "0"}
          subtitle="Carteiras com posições"
          icon={<Users className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title="Posições Ativas"
          value={stats?.activePositions.toLocaleString() || "0"}
          subtitle="Stakes em andamento"
          icon={<Layers className="w-5 h-5" />}
          color="green"
        />
        <StatCard
          title="Rewards Distribuídos"
          value={`${stats?.totalRewardsFormatted || "0"} FIAPO`}
          subtitle="Total pago em rewards"
          icon={<TrendingUp className="w-5 h-5" />}
          color="purple"
        />
      </div>

      {/* Pools */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Layers className="w-5 h-5 text-yellow-500" />
          Pools de Staking
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {pools.map((pool) => (
            <PoolCard key={pool.id} pool={pool} />
          ))}
        </div>
      </div>

      {/* Fee Structure Table */}
      <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-green-500" />
          Estrutura de Taxas
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-neutral-500 text-xs uppercase tracking-wider border-b border-neutral-800">
                <th className="text-left py-2 px-3">Valor Staked</th>
                <th className="text-right py-2 px-3">Taxa de Entrada</th>
                <th className="text-right py-2 px-3">Distribuição</th>
              </tr>
            </thead>
            <tbody>
              {[
                { range: "≤ 1.000 FIAPO", fee: "10%", dist: "50% Team, 40% Staking, 5% Rewards, 5% Noble" },
                { range: "≤ 10.000 FIAPO", fee: "5%", dist: "50% Team, 40% Staking, 5% Rewards, 5% Noble" },
                { range: "≤ 100.000 FIAPO", fee: "2.5%", dist: "50% Team, 40% Staking, 5% Rewards, 5% Noble" },
                { range: "≤ 500.000 FIAPO", fee: "1%", dist: "50% Team, 40% Staking, 5% Rewards, 5% Noble" },
                { range: "> 500.000 FIAPO", fee: "0.5%", dist: "50% Team, 40% Staking, 5% Rewards, 5% Noble" },
              ].map((row) => (
                <tr key={row.range} className="border-b border-neutral-800/50 hover:bg-neutral-800/20">
                  <td className="py-2.5 px-3 font-medium text-white">{row.range}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-yellow-400">{row.fee}</td>
                  <td className="py-2.5 px-3 text-right text-neutral-400 text-xs">{row.dist}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Penalty Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[
          {
            name: "Don Burn",
            penalty: "10 USDT + 50% capital + 80% juros",
            dist: "20% Burn, 50% Staking, 30% Rewards",
            color: "red",
          },
          {
            name: "Don Lunes",
            penalty: "8% do capital",
            dist: "10% Team, 50% Staking, 40% Rewards",
            color: "blue",
          },
          {
            name: "Don Fiapo",
            penalty: "6% do capital",
            dist: "10% Team, 50% Staking, 40% Rewards",
            color: "yellow",
          },
        ].map((pool) => (
          <div
            key={pool.name}
            className={cn(
              "bg-neutral-900/40 border rounded-xl p-4",
              pool.color === "red" ? "border-red-500/20" : pool.color === "blue" ? "border-blue-500/20" : "border-yellow-500/20"
            )}
          >
            <h4 className="text-sm font-bold text-white mb-2">{pool.name} — Penalidade</h4>
            <p className="text-xs text-neutral-400 mb-1">
              <span className="text-red-400 font-medium">Saque antecipado:</span> {pool.penalty}
            </p>
            <p className="text-xs text-neutral-500">
              Distribuição: {pool.dist}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
