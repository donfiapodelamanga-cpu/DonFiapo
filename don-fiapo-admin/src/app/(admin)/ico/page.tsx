"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Gem,
  TrendingUp,
  Users,
  DollarSign,
  Pickaxe,
  Zap,
  Flame,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Sparkles,
  Crown,
  Star,
  Shield,
  BarChart3,
} from "lucide-react";
import { getSession, hasPermission, AdminSession } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { RARITY_COLORS } from "@/lib/blockchain/ico-abi";

// ==================== Interfaces ====================

interface ICOStats {
  totalNftsMinted: number;
  totalRaisedUsdCents: number;
  totalRaisedUsd: number;
  totalTokensMined: number;
  totalTokensClaimed: number;
  uniqueParticipants: number;
  icoActive: boolean;
  miningActive: boolean;
}

interface TierConfig {
  tier: number;
  name: string;
  priceUsdCents: number;
  priceUsd: number;
  maxSupply: number;
  minted: number;
  mintedEvolution: number;
  burned: number;
  tokensPerNft: number;
  dailyMiningRate: number;
  active: boolean;
  progress: number;
}

interface EvolutionStats {
  totalEvolutions: number;
  totalNftsBurned: number;
}

interface RarityStats {
  name: string;
  count: number;
}

interface ICODashboardData {
  stats: ICOStats;
  tiers: TierConfig[];
  evolutionStats: EvolutionStats;
  rarityStats: RarityStats[];
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

function TierCard({ tier }: { tier: TierConfig }) {
  const tierColors = [
    "border-neutral-600", // Free
    "border-green-600",   // Tier 2
    "border-blue-600",    // Tier 3
    "border-purple-600",  // Tier 4
    "border-orange-600",  // Tier 5
    "border-red-600",     // Tier 6
    "border-yellow-600",  // Tier 7
  ];

  const tierBgColors = [
    "bg-neutral-500/5",
    "bg-green-500/5",
    "bg-blue-500/5",
    "bg-purple-500/5",
    "bg-orange-500/5",
    "bg-red-500/5",
    "bg-yellow-500/5",
  ];

  const progressColors = [
    "bg-neutral-500",
    "bg-green-500",
    "bg-blue-500",
    "bg-purple-500",
    "bg-orange-500",
    "bg-red-500",
    "bg-yellow-500",
  ];

  return (
    <div className={cn(
      "border rounded-xl p-4 transition-all hover:shadow-md",
      tierColors[tier.tier] || "border-neutral-700",
      tierBgColors[tier.tier] || "bg-neutral-900/40",
    )}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-bold text-white text-sm">{tier.name}</h4>
        {tier.priceUsd > 0 ? (
          <span className="text-xs font-mono text-neutral-400">${tier.priceUsd.toFixed(2)}</span>
        ) : (
          <span className="text-xs font-mono text-green-400">GRÁTIS</span>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-neutral-500 mb-1">
          <span>{tier.minted.toLocaleString()} mintados</span>
          <span>{tier.maxSupply.toLocaleString()} max</span>
        </div>
        <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-500", progressColors[tier.tier] || "bg-neutral-500")}
            style={{ width: `${Math.min(tier.progress, 100)}%` }}
          />
        </div>
        <div className="text-right text-xs text-neutral-500 mt-0.5">{tier.progress}%</div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-neutral-800/50 rounded-lg p-2">
          <span className="text-neutral-500 block">Tokens/NFT</span>
          <span className="text-white font-mono">{tier.tokensPerNft.toLocaleString()}</span>
        </div>
        <div className="bg-neutral-800/50 rounded-lg p-2">
          <span className="text-neutral-500 block">Diário</span>
          <span className="text-white font-mono">{tier.dailyMiningRate.toLocaleString()}/dia</span>
        </div>
        {tier.mintedEvolution > 0 && (
          <div className="bg-neutral-800/50 rounded-lg p-2">
            <span className="text-neutral-500 block">Evoluções</span>
            <span className="text-purple-400 font-mono">{tier.mintedEvolution.toLocaleString()}</span>
          </div>
        )}
        {tier.burned > 0 && (
          <div className="bg-neutral-800/50 rounded-lg p-2">
            <span className="text-neutral-500 block">Queimados</span>
            <span className="text-red-400 font-mono">{tier.burned.toLocaleString()}</span>
          </div>
        )}
      </div>

      {!tier.active && (
        <div className="mt-2 text-xs text-red-400 flex items-center gap-1">
          <XCircle className="w-3 h-3" /> Tier desativado
        </div>
      )}
    </div>
  );
}

function RarityBar({ stats }: { stats: RarityStats[] }) {
  const total = stats.reduce((acc, s) => acc + s.count, 0);
  if (total === 0) return null;

  const colors: Record<string, string> = {
    Common: "bg-neutral-500",
    Uncommon: "bg-green-500",
    Rare: "bg-blue-500",
    Epic: "bg-purple-500",
    Legendary: "bg-yellow-500",
  };

  return (
    <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl p-5">
      <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-yellow-500" />
        Distribuição de Raridade
      </h3>

      {/* Stacked bar */}
      <div className="h-4 rounded-full overflow-hidden flex mb-4">
        {stats.map((s) => {
          const pct = (s.count / total) * 100;
          if (pct === 0) return null;
          return (
            <div
              key={s.name}
              className={cn("h-full transition-all", colors[s.name] || "bg-neutral-500")}
              style={{ width: `${pct}%` }}
              title={`${s.name}: ${s.count} (${pct.toFixed(1)}%)`}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        {stats.map((s) => {
          const pct = total > 0 ? ((s.count / total) * 100).toFixed(1) : "0";
          return (
            <div key={s.name} className="flex items-center gap-2 text-xs">
              <div className={cn("w-2.5 h-2.5 rounded-full", colors[s.name] || "bg-neutral-500")} />
              <span className={RARITY_COLORS[s.name] || "text-neutral-400"}>{s.name}</span>
              <span className="text-neutral-600">{s.count.toLocaleString()} ({pct}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ==================== Main Page ====================

export default function ICOPage() {
  const router = useRouter();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [data, setData] = useState<ICODashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/ico");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("[ICO Page] Fetch error:", err);
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

  // Auto-refresh every 60s
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
  const tiers = data?.tiers || [];
  const evoStats = data?.evolutionStats;
  const rarityStats = data?.rarityStats || [];
  const connected = data?.connected || false;

  // Calculate total possible revenue
  const totalPossibleRevenue = tiers.reduce((acc, t) => acc + (t.priceUsd * t.maxSupply), 0);
  const totalMintedRevenue = tiers.reduce((acc, t) => acc + (t.priceUsd * t.minted), 0);
  const totalMaxNfts = tiers.reduce((acc, t) => acc + t.maxSupply, 0);
  const totalMinted = tiers.reduce((acc, t) => acc + t.minted, 0);
  const globalProgress = totalMaxNfts > 0 ? Math.round((totalMinted / totalMaxNfts) * 100) : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 rounded-xl ring-1 ring-yellow-500/30">
              <Gem className="w-6 h-6 text-yellow-500" />
            </div>
            ICO — NFTs Mineradores
          </h1>
          <p className="text-neutral-500 text-sm mt-1">
            Dados on-chain do contrato de ICO • 7 Tiers • 112 dias de mineração
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Connection status */}
          <div className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium",
            connected
              ? "bg-green-500/10 text-green-400 ring-1 ring-green-500/30"
              : "bg-red-500/10 text-red-400 ring-1 ring-red-500/30"
          )}>
            {connected ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
            {connected ? "On-Chain" : "Offline"}
          </div>

          {/* ICO Status */}
          {stats && (
            <div className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium",
              stats.icoActive
                ? "bg-green-500/10 text-green-400 ring-1 ring-green-500/30"
                : "bg-red-500/10 text-red-400 ring-1 ring-red-500/30"
            )}>
              {stats.icoActive ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
              ICO {stats.icoActive ? "Ativo" : "Pausado"}
            </div>
          )}

          {/* Mining Status */}
          {stats && (
            <div className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium",
              stats.miningActive
                ? "bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/30"
                : "bg-neutral-500/10 text-neutral-400 ring-1 ring-neutral-500/30"
            )}>
              <Pickaxe className="w-3 h-3" />
              Mineração {stats.miningActive ? "Ativa" : "Pausada"}
            </div>
          )}

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

      {/* Error banner */}
      {data?.error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 text-sm font-medium">Erro de conexão</p>
            <p className="text-red-400/70 text-xs mt-1">{data.error}</p>
            <p className="text-neutral-500 text-xs mt-2">
              Configure <code className="bg-neutral-800 px-1 rounded">ICO_CONTRACT</code> no arquivo <code className="bg-neutral-800 px-1 rounded">.env</code>
            </p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="NFTs Mintados"
          value={stats?.totalNftsMinted.toLocaleString() || "0"}
          subtitle={`${globalProgress}% do total (${totalMaxNfts.toLocaleString()})`}
          icon={<Gem className="w-5 h-5" />}
          color="yellow"
        />
        <StatCard
          title="Arrecadado"
          value={`$${(stats?.totalRaisedUsd || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
          subtitle={`Meta: $${totalPossibleRevenue.toLocaleString("en-US", { minimumFractionDigits: 0 })}`}
          icon={<DollarSign className="w-5 h-5" />}
          color="green"
        />
        <StatCard
          title="Participantes"
          value={stats?.uniqueParticipants.toLocaleString() || "0"}
          subtitle="Carteiras únicas"
          icon={<Users className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title="Tokens Claimed"
          value={`${(stats?.totalTokensClaimed || 0).toLocaleString()} FIAPO`}
          subtitle="Minerados e sacados"
          icon={<Pickaxe className="w-5 h-5" />}
          color="purple"
        />
      </div>

      {/* Global Progress */}
      <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-yellow-500" />
            Progresso Global da ICO
          </h3>
          <span className="text-sm font-mono text-yellow-500">{globalProgress}%</span>
        </div>
        <div className="h-3 bg-neutral-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 rounded-full transition-all duration-700"
            style={{ width: `${Math.min(globalProgress, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-neutral-500 mt-2">
          <span>{totalMinted.toLocaleString()} NFTs vendidos</span>
          <span>{totalMaxNfts.toLocaleString()} total</span>
        </div>
      </div>

      {/* Tiers Grid */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Crown className="w-5 h-5 text-yellow-500" />
          Tiers de NFT
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tiers.map((tier) => (
            <TierCard key={tier.tier} tier={tier} />
          ))}
          {tiers.length === 0 && !loading && (
            <div className="col-span-full text-center py-12 text-neutral-500">
              <Gem className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum tier carregado</p>
              <p className="text-xs mt-1">Verifique a conexão com o contrato</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Grid: Rarity + Evolution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rarity Distribution */}
        <RarityBar stats={rarityStats} />

        {/* Evolution Stats */}
        <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-purple-500" />
            Evoluções
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4 text-center">
              <Zap className="w-6 h-6 text-purple-400 mx-auto mb-2" />
              <div className="text-2xl font-black text-white">
                {(evoStats?.totalEvolutions || 0).toLocaleString()}
              </div>
              <div className="text-xs text-neutral-500 mt-1">Evoluções Realizadas</div>
            </div>

            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 text-center">
              <Flame className="w-6 h-6 text-red-400 mx-auto mb-2" />
              <div className="text-2xl font-black text-white">
                {(evoStats?.totalNftsBurned || 0).toLocaleString()}
              </div>
              <div className="text-xs text-neutral-500 mt-1">NFTs Queimados</div>
            </div>
          </div>

          {(evoStats?.totalEvolutions || 0) > 0 && (
            <div className="mt-4 text-xs text-neutral-500 bg-neutral-800/30 rounded-lg p-3">
              <p>
                <Star className="w-3 h-3 inline mr-1 text-yellow-500" />
                Média de {((evoStats?.totalNftsBurned || 0) / Math.max(evoStats?.totalEvolutions || 1, 1)).toFixed(1)} NFTs
                queimados por evolução
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Revenue by Tier Table */}
      {tiers.length > 0 && (
        <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            Receita por Tier
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-neutral-500 text-xs uppercase tracking-wider border-b border-neutral-800">
                  <th className="text-left py-2 px-3">Tier</th>
                  <th className="text-right py-2 px-3">Preço</th>
                  <th className="text-right py-2 px-3">Vendidos</th>
                  <th className="text-right py-2 px-3">Supply</th>
                  <th className="text-right py-2 px-3">Receita</th>
                  <th className="text-right py-2 px-3">Potencial</th>
                  <th className="text-right py-2 px-3">%</th>
                </tr>
              </thead>
              <tbody>
                {tiers.map((tier) => {
                  const revenue = tier.priceUsd * tier.minted;
                  const potential = tier.priceUsd * tier.maxSupply;
                  return (
                    <tr key={tier.tier} className="border-b border-neutral-800/50 hover:bg-neutral-800/20">
                      <td className="py-2.5 px-3 font-medium text-white">{tier.name}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-neutral-400">
                        {tier.priceUsd > 0 ? `$${tier.priceUsd.toFixed(2)}` : "Grátis"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-white">
                        {tier.minted.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-neutral-500">
                        {tier.maxSupply.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-green-400">
                        ${revenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-neutral-500">
                        ${potential.toLocaleString("en-US", { minimumFractionDigits: 0 })}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-yellow-500">
                        {tier.progress}%
                      </td>
                    </tr>
                  );
                })}
                {/* Totals row */}
                <tr className="bg-neutral-800/30 font-bold">
                  <td className="py-2.5 px-3 text-white">TOTAL</td>
                  <td className="py-2.5 px-3 text-right">—</td>
                  <td className="py-2.5 px-3 text-right font-mono text-white">
                    {totalMinted.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-neutral-500">
                    {totalMaxNfts.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-green-400">
                    ${totalMintedRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-neutral-500">
                    ${totalPossibleRevenue.toLocaleString("en-US", { minimumFractionDigits: 0 })}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-yellow-500">
                    {globalProgress}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
