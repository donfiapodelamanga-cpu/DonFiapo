"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Store,
  Tag,
  Gavel,
  ArrowLeftRight,
  TrendingUp,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  DollarSign,
  Percent,
  Shield,
} from "lucide-react";
import { getSession, AdminSession } from "@/lib/auth";
import { cn } from "@/lib/utils";

// ==================== Interfaces ====================

interface MarketplaceStats {
  activeListings: number;
  activeAuctions: number;
  activeTrades: number;
  totalVolume: number;
  totalVolumeFormatted: string;
  icoSalesCompleted: boolean;
  paymentMode: string;
  feeBps: number;
  tradFeeBps: number;
}

interface MarketplaceDashboardData {
  stats: MarketplaceStats;
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
    orange: "bg-orange-500/10 ring-orange-500/30 text-orange-500",
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

// ==================== Main Page ====================

export default function MarketplacePage() {
  const router = useRouter();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [data, setData] = useState<MarketplaceDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/marketplace");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("[Marketplace Page] Fetch error:", err);
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
  const connected = data?.connected || false;
  const totalActivity = (stats?.activeListings || 0) + (stats?.activeAuctions || 0) + (stats?.activeTrades || 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 rounded-xl ring-1 ring-yellow-500/30">
              <Store className="w-6 h-6 text-yellow-500" />
            </div>
            Marketplace
          </h1>
          <p className="text-neutral-500 text-sm mt-1">
            Venda direta • Leilões • Trocas P2P
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
              Configure <code className="bg-neutral-800 px-1 rounded">MARKETPLACE_CONTRACT</code> no arquivo <code className="bg-neutral-800 px-1 rounded">.env</code>
            </p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Vendas Ativas"
          value={stats?.activeListings.toLocaleString() || "0"}
          subtitle="Listagens de venda direta"
          icon={<Tag className="w-5 h-5" />}
          color="green"
        />
        <StatCard
          title="Leilões Ativos"
          value={stats?.activeAuctions.toLocaleString() || "0"}
          subtitle="Leilões em andamento"
          icon={<Gavel className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title="Trocas Ativas"
          value={stats?.activeTrades.toLocaleString() || "0"}
          subtitle="Ofertas de troca P2P"
          icon={<ArrowLeftRight className="w-5 h-5" />}
          color="purple"
        />
        <StatCard
          title="Volume Total"
          value={`${stats?.totalVolumeFormatted || "0"} FIAPO`}
          subtitle={`${(stats?.totalVolume || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })} tokens`}
          icon={<TrendingUp className="w-5 h-5" />}
          color="yellow"
        />
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Payment Mode */}
        <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-500" />
            Modo de Pagamento
          </h3>
          <div className={cn(
            "flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium",
            stats?.icoSalesCompleted
              ? "bg-green-500/10 text-green-400 ring-1 ring-green-500/30"
              : "bg-yellow-500/10 text-yellow-400 ring-1 ring-yellow-500/30"
          )}>
            {stats?.icoSalesCompleted ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <Shield className="w-4 h-4" />
            )}
            {stats?.paymentMode || "Apenas LUNES"}
          </div>
          <p className="text-xs text-neutral-500 mt-2">
            {stats?.icoSalesCompleted
              ? "ICO finalizado — pagamentos em LUNES e FIAPO aceitos"
              : "Durante ICO — apenas LUNES aceito como pagamento"
            }
          </p>
        </div>

        {/* Fee Structure */}
        <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <Percent className="w-4 h-4 text-yellow-500" />
            Taxas
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-neutral-800/30 rounded-lg px-3 py-2">
              <span className="text-neutral-400 text-sm">Venda Direta</span>
              <span className="text-yellow-400 font-mono font-bold">{((stats?.feeBps || 600) / 100).toFixed(1)}%</span>
            </div>
            <div className="flex items-center justify-between bg-neutral-800/30 rounded-lg px-3 py-2">
              <span className="text-neutral-400 text-sm">Leilão</span>
              <span className="text-yellow-400 font-mono font-bold">{((stats?.feeBps || 600) / 100).toFixed(1)}%</span>
            </div>
            <div className="flex items-center justify-between bg-neutral-800/30 rounded-lg px-3 py-2">
              <span className="text-neutral-400 text-sm">Troca P2P</span>
              <span className="text-yellow-400 font-mono font-bold">{((stats?.tradFeeBps || 300) / 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Fee Distribution */}
        <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-500" />
            Distribuição de Taxas
          </h3>
          <div className="space-y-2">
            {[
              { label: "Team", pct: "40%", color: "bg-yellow-500" },
              { label: "Staking Pool", pct: "25%", color: "bg-blue-500" },
              { label: "Rewards Fund", pct: "20%", color: "bg-green-500" },
              { label: "Noble Affiliate", pct: "10%", color: "bg-purple-500" },
              { label: "Burn", pct: "5%", color: "bg-red-500" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <div className={cn("w-2.5 h-2.5 rounded-full", item.color)} />
                <span className="text-neutral-400 text-xs flex-1">{item.label}</span>
                <span className="text-white text-xs font-mono">{item.pct}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activity Summary */}
      <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Store className="w-4 h-4 text-yellow-500" />
          Resumo de Atividade
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Listings */}
          <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <Tag className="w-5 h-5 text-green-400" />
              <span className="text-green-400 font-bold text-sm">Venda Direta</span>
            </div>
            <p className="text-neutral-400 text-xs">
              NFTs listados para compra imediata com preço fixo. Vendedor define preço, comprador paga e recebe o NFT automaticamente.
            </p>
            <div className="mt-3 text-2xl font-black text-white">{stats?.activeListings || 0} ativas</div>
          </div>

          {/* Auctions */}
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <Gavel className="w-5 h-5 text-blue-400" />
              <span className="text-blue-400 font-bold text-sm">Leilões</span>
            </div>
            <p className="text-neutral-400 text-xs">
              Leilões com tempo definido. Maior lance ganha. Auto-claim de tokens minerados para o vendedor na transferência.
            </p>
            <div className="mt-3 text-2xl font-black text-white">{stats?.activeAuctions || 0} ativos</div>
          </div>

          {/* Trades */}
          <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <ArrowLeftRight className="w-5 h-5 text-purple-400" />
              <span className="text-purple-400 font-bold text-sm">Trocas P2P</span>
            </div>
            <p className="text-neutral-400 text-xs">
              Troca direta de NFTs entre usuários. Um oferece seu NFT e especifica o NFT desejado. Taxa reduzida de 3%.
            </p>
            <div className="mt-3 text-2xl font-black text-white">{stats?.activeTrades || 0} ativas</div>
          </div>
        </div>
      </div>
    </div>
  );
}
