"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Target,
  TrendingUp,
  Wallet,
  AlertCircle,
  Shield,
  Coins,
  Users,
  Clock,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Plus,
  Loader2,
  BarChart3,
  DollarSign,
} from "lucide-react";
import { getSession, hasPermission, AdminSession } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ── Prize table (mirrors backend /api/games/spin/roll) ──────────────────────

interface PrizeRule {
  index: number;
  label: string;
  sublabel: string;
  tier: string;
  weight: number;
  prob: string;
  dailyCap: number;
  costPerUnit: string;
  evPerSpin: string;
}

const PRIZE_RULES: PrizeRule[] = [
  { index: 0, label: "100K", sublabel: "FIAPO", tier: "jackpot", weight: 1, prob: "0.001%", dailyCap: 1, costPerUnit: "~$1.00", evPerSpin: "$0.00001" },
  { index: 1, label: "50K", sublabel: "FIAPO", tier: "rare", weight: 4, prob: "0.004%", dailyCap: 1, costPerUnit: "~$0.50", evPerSpin: "$0.00002" },
  { index: 2, label: "0.5", sublabel: "FIAPO", tier: "common", weight: 14000, prob: "14.00%", dailyCap: 0, costPerUnit: "~$0.00", evPerSpin: "~$0" },
  { index: 3, label: "5", sublabel: "USDT", tier: "rare", weight: 15, prob: "0.015%", dailyCap: 1, costPerUnit: "$5.00", evPerSpin: "$0.00075" },
  { index: 4, label: "1K", sublabel: "FIAPO", tier: "uncommon", weight: 50, prob: "0.05%", dailyCap: 2, costPerUnit: "~$0.01", evPerSpin: "$0.000005" },
  { index: 5, label: "0.5", sublabel: "FIAPO", tier: "common", weight: 14000, prob: "14.00%", dailyCap: 0, costPerUnit: "~$0.00", evPerSpin: "~$0" },
  { index: 6, label: "1", sublabel: "USDT", tier: "uncommon", weight: 80, prob: "0.08%", dailyCap: 5, costPerUnit: "$1.00", evPerSpin: "$0.0008" },
  { index: 7, label: "+1", sublabel: "SPIN", tier: "uncommon", weight: 6000, prob: "6.00%", dailyCap: 0, costPerUnit: "$1 (ticket)", evPerSpin: "$0.06" },
  { index: 8, label: "0.5", sublabel: "FIAPO", tier: "common", weight: 14000, prob: "14.00%", dailyCap: 0, costPerUnit: "~$0.00", evPerSpin: "~$0" },
  { index: 9, label: "100", sublabel: "FIAPO", tier: "uncommon", weight: 850, prob: "0.85%", dailyCap: 10, costPerUnit: "~$0.001", evPerSpin: "$0.000008" },
  { index: 10, label: "1", sublabel: "LUNES", tier: "uncommon", weight: 1000, prob: "1.00%", dailyCap: 0, costPerUnit: "~$0.001", evPerSpin: "$0.00001" },
  { index: 11, label: "MISS", sublabel: "Try again", tier: "miss", weight: 50000, prob: "50.00%", dailyCap: 0, costPerUnit: "$0", evPerSpin: "$0" },
];

const TIER_COLORS: Record<string, string> = {
  jackpot: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
  rare: "text-orange-400 bg-orange-500/10 border-orange-500/30",
  uncommon: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  common: "text-green-400 bg-green-500/10 border-green-500/30",
  miss: "text-neutral-400 bg-neutral-500/10 border-neutral-500/30",
};

// ── Spin Wallets for distribution ───────────────────────────────────────────

interface SpinWallet {
  id: string;
  name: string;
  address: string;
  network: string;
  symbol: string;
  purpose: string;
  balance?: string;
}

const SPIN_WALLET_KEYS = ["spin_fiapo", "spin_usdt", "spin_lunes", "spin_revenue"];

export default function SpinAdminPage() {
  const router = useRouter();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [activeTab, setActiveTab] = useState<"rules" | "stats" | "wallets">("rules");
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState<string | null>(null);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [spinWallets, setSpinWallets] = useState<SpinWallet[]>([]);
  const [walletsLoading, setWalletsLoading] = useState(false);
  const [newWallet, setNewWallet] = useState({ name: "", address: "", network: "Lunes Network", symbol: "FIAPO", purpose: "" });

  useEffect(() => {
    const currentSession = getSession();
    if (!currentSession) {
      router.push("/login");
      return;
    }
    if (!hasPermission(currentSession, "view_dashboard")) {
      router.push("/dashboard?error=unauthorized");
      return;
    }
    setSession(currentSession);
    fetchStats();
    fetchSpinWallets();
  }, [router]);

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const res = await fetch("/api/admin/spin/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
      // Stats API may not exist yet — show defaults
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchSpinWallets = async () => {
    setWalletsLoading(true);
    try {
      const res = await fetch("/api/admin/wallets");
      if (res.ok) {
        const all = await res.json();
        const spinWs = all
          .filter((w: any) => SPIN_WALLET_KEYS.includes(w.key))
          .map((w: any) => ({
            id: w.id,
            name: w.label,
            address: w.address,
            network: w.network === "lunes" ? "Lunes Network" : w.network,
            symbol: w.symbol,
            purpose: w.purpose || "",
          }));
        setSpinWallets(spinWs);
      }
    } catch {
      // Fallback: no wallets loaded
    } finally {
      setWalletsLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(id);
    setTimeout(() => setIsCopied(null), 2000);
  };

  const handleAddWallet = async () => {
    if (!newWallet.name || !newWallet.address) return;
    const key = `spin_custom_${Date.now()}`;
    try {
      await fetch("/api/admin/wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key,
          label: newWallet.name,
          address: newWallet.address,
          network: newWallet.network.toLowerCase().includes("lunes") ? "lunes" : "solana",
          symbol: newWallet.symbol,
          purpose: newWallet.purpose,
          updatedBy: session?.email || "unknown",
        }),
      });
      await fetchSpinWallets();
    } catch (e) {
      console.error("Failed to add wallet:", e);
    }
    setNewWallet({ name: "", address: "", network: "Lunes Network", symbol: "FIAPO", purpose: "" });
    setIsWalletModalOpen(false);
  };

  if (!session) return null;

  const totalWeight = PRIZE_RULES.reduce((s, p) => s + p.weight, 0);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 rounded-xl ring-1 ring-yellow-500/20">
              <Target className="w-7 h-7 text-yellow-500" />
            </div>
            Spin Game
          </h1>
          <p className="text-neutral-400 mt-2">
            Gerenciamento de regras, prêmios, limites diários e carteiras de distribuição
          </p>
        </div>
        <Button onClick={fetchStats} variant="outline" size="sm" className="gap-2">
          <RefreshCw className={cn("w-4 h-4", statsLoading && "animate-spin")} />
          Atualizar
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-neutral-500 font-bold uppercase tracking-widest">Total Spins</span>
            <BarChart3 className="w-5 h-5 text-yellow-500/60" />
          </div>
          <p className="text-2xl font-black text-white">{stats?.totalSpins?.toLocaleString() ?? "—"}</p>
          <p className="text-xs text-neutral-500 mt-1">Desde o lançamento</p>
        </div>
        <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-neutral-500 font-bold uppercase tracking-widest">Spins Hoje</span>
            <Clock className="w-5 h-5 text-blue-500/60" />
          </div>
          <p className="text-2xl font-black text-white">{stats?.spinsToday?.toLocaleString() ?? "—"}</p>
          <p className="text-xs text-neutral-500 mt-1">Últimas 24h</p>
        </div>
        <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-neutral-500 font-bold uppercase tracking-widest">Receita Est.</span>
            <DollarSign className="w-5 h-5 text-green-500/60" />
          </div>
          <p className="text-2xl font-black text-white">${stats?.estimatedRevenue?.toFixed(2) ?? "—"}</p>
          <p className="text-xs text-neutral-500 mt-1">~$0.07/spin × total</p>
        </div>
        <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-neutral-500 font-bold uppercase tracking-widest">Margem</span>
            <Shield className="w-5 h-5 text-yellow-500/60" />
          </div>
          <p className="text-2xl font-black text-green-400">~93%</p>
          <p className="text-xs text-neutral-500 mt-1">EV ~$0.065/spin vs $1.00 receita</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 border-b border-neutral-800">
        {(["rules", "stats", "wallets"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-6 py-3 text-sm font-medium border-b-2 transition-colors capitalize",
              activeTab === tab
                ? "border-yellow-500 text-yellow-500"
                : "border-transparent text-neutral-400 hover:text-white"
            )}
          >
            {tab === "rules" ? "Regras & Prêmios" : tab === "stats" ? "Estatísticas" : "Carteiras"}
          </button>
        ))}
      </div>

      {/* ═══════════════════════ RULES TAB ═══════════════════════ */}
      {activeTab === "rules" && (
        <div className="space-y-6">
          {/* Financial Summary */}
          <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-yellow-500" />
              Proteção Anti-Quebra
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4">
                <p className="text-xs text-green-400 font-bold uppercase tracking-widest mb-1">Receita/Spin</p>
                <p className="text-xl font-bold text-green-400">~$1.00</p>
                <p className="text-xs text-neutral-500 mt-1">Preço base do ticket (1 spin = $1)</p>
              </div>
              <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
                <p className="text-xs text-red-400 font-bold uppercase tracking-widest mb-1">Custo EV/Spin</p>
                <p className="text-xl font-bold text-red-400">~$0.065</p>
                <p className="text-xs text-neutral-500 mt-1">Valor esperado ponderado de prêmios</p>
              </div>
              <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4">
                <p className="text-xs text-yellow-400 font-bold uppercase tracking-widest mb-1">Pior Caso USDT/Dia</p>
                <p className="text-xl font-bold text-yellow-400">$10.00</p>
                <p className="text-xs text-neutral-500 mt-1">1×$5 + 5×$1 = max diário em USDT</p>
              </div>
            </div>
          </div>

          {/* Prize Table */}
          <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-neutral-800/50">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Coins className="w-5 h-5 text-yellow-500" />
                Tabela de Prêmios
              </h3>
              <p className="text-sm text-neutral-500 mt-1">Peso total: {totalWeight.toLocaleString()} — Definido em <code className="text-xs bg-neutral-800 px-1.5 py-0.5 rounded">api/games/spin/roll/route.ts</code></p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-800/50">
                    <th className="text-left px-6 py-3 text-xs text-neutral-500 font-bold uppercase tracking-widest">#</th>
                    <th className="text-left px-6 py-3 text-xs text-neutral-500 font-bold uppercase tracking-widest">Prêmio</th>
                    <th className="text-left px-6 py-3 text-xs text-neutral-500 font-bold uppercase tracking-widest">Tier</th>
                    <th className="text-right px-6 py-3 text-xs text-neutral-500 font-bold uppercase tracking-widest">Peso</th>
                    <th className="text-right px-6 py-3 text-xs text-neutral-500 font-bold uppercase tracking-widest">Prob</th>
                    <th className="text-right px-6 py-3 text-xs text-neutral-500 font-bold uppercase tracking-widest">Cap/Dia</th>
                    <th className="text-right px-6 py-3 text-xs text-neutral-500 font-bold uppercase tracking-widest">Custo Unit</th>
                    <th className="text-right px-6 py-3 text-xs text-neutral-500 font-bold uppercase tracking-widest">EV/Spin</th>
                  </tr>
                </thead>
                <tbody>
                  {PRIZE_RULES.map((prize) => (
                    <tr key={prize.index} className="border-b border-neutral-800/30 hover:bg-neutral-800/20 transition-colors">
                      <td className="px-6 py-3 text-sm text-neutral-400 font-mono">{prize.index}</td>
                      <td className="px-6 py-3">
                        <span className="text-sm font-bold text-white">{prize.label}</span>{" "}
                        <span className="text-sm text-neutral-400">{prize.sublabel}</span>
                      </td>
                      <td className="px-6 py-3">
                        <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider", TIER_COLORS[prize.tier])}>
                          {prize.tier}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-right text-white font-mono">{prize.weight.toLocaleString()}</td>
                      <td className="px-6 py-3 text-sm text-right text-neutral-300">{prize.prob}</td>
                      <td className="px-6 py-3 text-sm text-right">
                        {prize.dailyCap > 0 ? (
                          <span className="text-yellow-400 font-bold">{prize.dailyCap}</span>
                        ) : (
                          <span className="text-neutral-600">∞</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-sm text-right text-neutral-300 font-mono">{prize.costPerUnit}</td>
                      <td className="px-6 py-3 text-sm text-right text-neutral-300 font-mono">{prize.evPerSpin}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* RNG & Security Info */}
          <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-500" />
              Segurança do RNG
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Server-side RNG</p>
                    <p className="text-xs text-neutral-500">Prêmio determinado no backend com <code className="bg-neutral-800 px-1 rounded">crypto.randomInt()</code></p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Daily Caps</p>
                    <p className="text-xs text-neutral-500">Prêmios caros têm limite diário. Se atingido, cai para MISS</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Registro em DB</p>
                    <p className="text-xs text-neutral-500">Cada spin é registrado no banco (SpinResult) para auditoria</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Anti-manipulação</p>
                    <p className="text-xs text-neutral-500">Frontend recebe apenas o prizeIndex — não controla o sorteio</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Margem de 71%</p>
                    <p className="text-xs text-neutral-500">EV ~$0.020/spin vs receita ~$0.070/spin</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertCircle className="w-3.5 h-3.5 text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">TODO: Redis para Daily Caps</p>
                    <p className="text-xs text-neutral-500">Atualmente in-memory — resetará no restart do servidor</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════ STATS TAB ═══════════════════════ */}
      {activeTab === "stats" && (
        <div className="space-y-6">
          {statsLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
            </div>
          ) : stats ? (
            <>
              {/* Prize Distribution */}
              <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">Distribuição de Prêmios</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {(stats.prizeDistribution ?? []).map((item: any) => (
                    <div key={item.prizeIndex} className="bg-neutral-800/50 border border-neutral-700/50 rounded-xl p-3 text-center">
                      <p className="text-xs text-neutral-500 mb-1">#{item.prizeIndex}</p>
                      <p className="text-lg font-bold text-white">{item.count}</p>
                      <p className="text-xs text-neutral-400">{item.label} {item.sublabel}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Spins */}
              <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-neutral-800/50">
                  <h3 className="text-lg font-bold text-white">Últimos Spins</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-neutral-800/50">
                        <th className="text-left px-6 py-3 text-xs text-neutral-500 font-bold uppercase">Data</th>
                        <th className="text-left px-6 py-3 text-xs text-neutral-500 font-bold uppercase">Usuário</th>
                        <th className="text-left px-6 py-3 text-xs text-neutral-500 font-bold uppercase">Prêmio</th>
                        <th className="text-left px-6 py-3 text-xs text-neutral-500 font-bold uppercase">Tier</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(stats.recentSpins ?? []).slice(0, 20).map((spin: any, i: number) => (
                        <tr key={i} className="border-b border-neutral-800/30 hover:bg-neutral-800/20">
                          <td className="px-6 py-3 text-sm text-neutral-400">
                            {new Date(spin.playedAt || spin.createdAt).toLocaleString("pt-BR")}
                          </td>
                          <td className="px-6 py-3 text-sm text-neutral-300 font-mono">
                            {spin.userId?.slice(0, 8)}...
                          </td>
                          <td className="px-6 py-3 text-sm font-bold text-white">
                            {spin.prizeLabel} {spin.prizeSublabel}
                          </td>
                          <td className="px-6 py-3">
                            <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full border uppercase", TIER_COLORS[spin.tier] || TIER_COLORS.common)}>
                              {spin.tier}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {(!stats.recentSpins || stats.recentSpins.length === 0) && (
                  <div className="p-12 text-center text-neutral-500">
                    <Target className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>Nenhum spin registrado ainda</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl p-12 text-center">
              <AlertCircle className="w-10 h-10 text-yellow-500 mx-auto mb-3" />
              <p className="text-neutral-400">API de estatísticas ainda não configurada</p>
              <p className="text-xs text-neutral-600 mt-2">Crie a rota <code className="bg-neutral-800 px-1.5 py-0.5 rounded">/api/admin/spin/stats</code> no admin</p>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════ WALLETS TAB ═══════════════════════ */}
      {activeTab === "wallets" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">Carteiras de Distribuição do Spin</h3>
              <p className="text-sm text-neutral-500 mt-1">Carteiras usadas para depósito de prêmios e recebimento de receita</p>
            </div>
            <Button onClick={() => setIsWalletModalOpen(true)} size="sm" className="gap-2 bg-yellow-500 hover:bg-yellow-400 text-black">
              <Plus className="w-4 h-4" />
              Nova Carteira
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {spinWallets.map((wallet) => (
              <div key={wallet.id} className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl p-5 hover:border-neutral-700/50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      wallet.symbol === "USDT" ? "bg-green-500/10 ring-1 ring-green-500/30" :
                        wallet.symbol === "LUNES" ? "bg-yellow-500/10 ring-1 ring-yellow-500/30" :
                          wallet.symbol === "FIAPO" ? "bg-orange-500/10 ring-1 ring-orange-500/30" :
                            "bg-neutral-800 ring-1 ring-neutral-700"
                    )}>
                      <Wallet className={cn(
                        "w-5 h-5",
                        wallet.symbol === "USDT" ? "text-green-500" :
                          wallet.symbol === "LUNES" ? "text-yellow-500" :
                            wallet.symbol === "FIAPO" ? "text-orange-500" :
                              "text-neutral-400"
                      )} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{wallet.name}</p>
                      <p className="text-xs text-neutral-500">{wallet.network} · {wallet.symbol}</p>
                    </div>
                  </div>
                  {wallet.id === "sw-revenue" && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-green-500/20 text-green-400 border border-green-500/30 uppercase">Receita</span>
                  )}
                </div>

                <p className="text-xs text-neutral-500 mb-3">{wallet.purpose}</p>

                {wallet.address ? (
                  <div className="flex items-center gap-2 bg-neutral-800/50 rounded-lg px-3 py-2">
                    <code className="text-xs text-neutral-300 truncate flex-1 font-mono">{wallet.address}</code>
                    <button
                      onClick={() => copyToClipboard(wallet.address, wallet.id)}
                      className="shrink-0 text-neutral-500 hover:text-white transition-colors"
                    >
                      {isCopied === wallet.id ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <a
                      href={`https://lunescan.io/address/${wallet.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-neutral-500 hover:text-yellow-500 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <p className="text-xs text-red-400">Endereço não configurado — defina no <code className="bg-neutral-800 px-1 rounded">.env</code></p>
                  </div>
                )}

                {wallet.balance && (
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-neutral-500">Saldo</span>
                    <span className="text-sm font-bold text-white">{wallet.balance} {wallet.symbol}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Link to System Wallets management */}
          <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl p-6">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-500" />
              Gerenciamento de Carteiras
            </h3>
            <p className="text-xs text-neutral-400 mb-3">
              As carteiras do Spin Game são gerenciadas centralmente na página de Carteiras do Sistema.
              Configure as chaves <code className="text-yellow-400">spin_fiapo</code>, <code className="text-yellow-400">spin_usdt</code>, <code className="text-yellow-400">spin_lunes</code> e <code className="text-yellow-400">spin_revenue</code>.
            </p>
            <a href="/system-wallets" className="inline-flex items-center gap-2 text-sm text-yellow-400 hover:text-yellow-300 font-medium">
              Ir para Carteiras do Sistema →
            </a>
          </div>
        </div>
      )}

      {/* ═══════════════════════ NEW WALLET MODAL ═══════════════════════ */}
      <Dialog open={isWalletModalOpen} onOpenChange={setIsWalletModalOpen}>
        <DialogContent className="bg-neutral-900 border-neutral-800">
          <DialogHeader>
            <DialogTitle className="text-white">Nova Carteira de Spin</DialogTitle>
            <DialogDescription className="text-neutral-400">Adicione uma carteira para gerenciamento de distribuição do Spin Game</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-neutral-300">Nome</Label>
              <Input
                value={newWallet.name}
                onChange={(e) => setNewWallet(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Pool FIAPO Secundário"
                className="bg-neutral-800 border-neutral-700 text-white"
              />
            </div>
            <div>
              <Label className="text-neutral-300">Endereço</Label>
              <Input
                value={newWallet.address}
                onChange={(e) => setNewWallet(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Endereço da carteira"
                className="bg-neutral-800 border-neutral-700 text-white font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-neutral-300">Rede</Label>
                <Input
                  value={newWallet.network}
                  onChange={(e) => setNewWallet(prev => ({ ...prev, network: e.target.value }))}
                  placeholder="Lunes Network"
                  className="bg-neutral-800 border-neutral-700 text-white"
                />
              </div>
              <div>
                <Label className="text-neutral-300">Símbolo</Label>
                <Input
                  value={newWallet.symbol}
                  onChange={(e) => setNewWallet(prev => ({ ...prev, symbol: e.target.value }))}
                  placeholder="FIAPO, USDT, LUNES"
                  className="bg-neutral-800 border-neutral-700 text-white"
                />
              </div>
            </div>
            <div>
              <Label className="text-neutral-300">Finalidade</Label>
              <Input
                value={newWallet.purpose}
                onChange={(e) => setNewWallet(prev => ({ ...prev, purpose: e.target.value }))}
                placeholder="Ex: Distribuição de prêmios FIAPO"
                className="bg-neutral-800 border-neutral-700 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsWalletModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddWallet} className="bg-yellow-500 hover:bg-yellow-400 text-black">Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
