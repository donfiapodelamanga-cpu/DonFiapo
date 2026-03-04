"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  Calendar,
  AlertCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Zap,
} from "lucide-react";
import { getSession, hasPermission, AdminSession } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { exportToCSV } from "@/lib/export";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminTransaction {
  id: string;
  source: "wallet" | "revenue" | "expense" | "sale" | "on_chain";
  type: "income" | "expense";
  description: string;
  category: string;
  amount: number;
  currency: string;
  status: "completed" | "pending" | "failed" | "canceled";
  date: string;
}

interface ApiStats {
  total: { value: number; change: string; trend: "up" | "down" | "neutral" };
  volume: { value: number; change: string; trend: "up" | "down" | "neutral" };
  successRate: { value: number; change: string; trend: "up" | "down" | "neutral" };
}

interface ApiResponse {
  transactions: AdminTransaction[];
  pagination: { page: number; limit: number; total: number; pages: number };
  stats: ApiStats;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatAmount(amount: number, currency: string): string {
  const formatted = amount.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${formatted} ${currency}`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_MAP: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  completed: {
    label: "Concluído",
    className: "bg-green-500/10 text-green-400 border-green-500/40",
    icon: <CheckCircle className="w-3 h-3" />,
  },
  pending: {
    label: "Pendente",
    className: "bg-yellow-500/10 text-yellow-400 border-yellow-500/40",
    icon: <Clock className="w-3 h-3" />,
  },
  failed: {
    label: "Falhou",
    className: "bg-red-500/10 text-red-400 border-red-500/40",
    icon: <XCircle className="w-3 h-3" />,
  },
  canceled: {
    label: "Cancelado",
    className: "bg-neutral-500/10 text-neutral-400 border-neutral-500/40",
    icon: <XCircle className="w-3 h-3" />,
  },
};

const SOURCE_MAP: Record<string, { label: string; className: string }> = {
  wallet: { label: "Wallet", className: "bg-yellow-500/10 text-yellow-400" },
  revenue: { label: "Receita", className: "bg-green-500/10 text-green-400" },
  expense: { label: "Despesa", className: "bg-red-500/10 text-red-400" },
  sale: { label: "Venda", className: "bg-blue-500/10 text-blue-400" },
  on_chain: { label: "On-Chain", className: "bg-purple-500/10 text-purple-400" },
};

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  change,
  icon,
  trend,
  loading,
}: {
  title: string;
  value: string;
  change: string;
  icon: React.ReactNode;
  trend: "up" | "down" | "neutral";
  loading?: boolean;
}) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-neutral-400 text-sm">{title}</p>
          {loading ? (
            <>
              <div className="h-7 w-28 bg-neutral-800 rounded animate-pulse mt-2" />
              <div className="h-4 w-40 bg-neutral-800 rounded animate-pulse mt-2" />
            </>
          ) : (
            <>
              <h3 className="text-2xl font-bold text-white mt-2 truncate">{value}</h3>
              <p
                className={cn(
                  "text-sm mt-1",
                  trend === "up" && "text-green-400",
                  trend === "down" && "text-red-400",
                  trend === "neutral" && "text-neutral-500"
                )}
              >
                {change}
              </p>
            </>
          )}
        </div>
        <div className="p-3 bg-yellow-500/10 rounded-lg ring-1 ring-yellow-500/50 shrink-0">
          {icon}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TransactionsPage() {
  const router = useRouter();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [page, setPage] = useState(1);

  // Period
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [pendingFrom, setPendingFrom] = useState("");
  const [pendingTo, setPendingTo] = useState("");

  // Sync state
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ synced: number; ts: string } | null>(null);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // ── Auth guard ────────────────────────────────────────────────────────────
  useEffect(() => {
    const s = getSession();
    if (!s) { router.push("/login"); return; }
    if (!hasPermission(s, "transactions") && !hasPermission(s, "all")) {
      router.push("/dashboard?error=unauthorized");
      return;
    }
    setSession(s);
  }, [router]);

  // ── Debounce search ───────────────────────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 380);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  // ── Reset page on filter change ───────────────────────────────────────────
  useEffect(() => { setPage(1); }, [filterType, filterStatus, periodFrom, periodTo]);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    const key = localStorage.getItem("don_admin_key") || "";
    const params = new URLSearchParams({
      type: filterType,
      status: filterStatus,
      page: String(page),
      limit: "50",
    });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (periodFrom) params.set("from", periodFrom);
    if (periodTo) params.set("to", periodTo);

    try {
      const res = await fetch(`/api/admin/transactions?${params}`, {
        headers: { "x-admin-key": key },
      });
      if (res.status === 401) { router.push("/login"); return; }
      if (res.ok) setData(await res.json());
    } catch (err) {
      console.error("Error fetching transactions:", err);
    } finally {
      setLoading(false);
    }
  }, [session, filterType, filterStatus, page, debouncedSearch, periodFrom, periodTo, router]);

  useEffect(() => { if (session) fetchData(); }, [fetchData, session]);

  // ── Period modal handlers ─────────────────────────────────────────────────
  const openPeriodModal = () => {
    setPendingFrom(periodFrom);
    setPendingTo(periodTo);
    setShowPeriodModal(true);
  };

  const applyPeriod = () => {
    setPeriodFrom(pendingFrom);
    setPeriodTo(pendingTo);
    setShowPeriodModal(false);
  };

  const clearPeriod = () => {
    setPendingFrom(""); setPendingTo("");
    setPeriodFrom(""); setPeriodTo("");
    setShowPeriodModal(false);
  };

  // ── Sync on-chain data ────────────────────────────────────────────────────
  const handleSync = async () => {
    if (!session || syncing) return;
    setSyncing(true);
    const key = localStorage.getItem("don_admin_key") || "";
    try {
      const res = await fetch("/api/admin/transactions/sync", {
        method: "POST",
        headers: { "x-admin-key": key },
      });
      if (res.ok) {
        const json = await res.json();
        setSyncResult({
          synced: json.remote?.total ?? 0,
          ts: new Date().toLocaleTimeString("pt-BR"),
        });
        fetchData();
      }
    } catch (err) {
      console.error("Sync error:", err);
    } finally {
      setSyncing(false);
    }
  };

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = () => {
    const rows = data?.transactions;
    if (!rows?.length) { alert("Nenhum dado para exportar"); return; }
    exportToCSV(rows, "transacoes", {
      id: "ID", source: "Fonte", type: "Tipo", description: "Descrição",
      category: "Categoria", amount: "Valor", currency: "Moeda",
      date: "Data", status: "Status",
    });
  };

  if (!session) return null;

  const stats = data?.stats;
  const transactions = data?.transactions ?? [];
  const pagination = data?.pagination;
  const hasPeriod = !!(periodFrom || periodTo);

  return (
    <div className="p-8">
      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Transações</h1>
          <p className="text-neutral-400 mt-2 flex items-center gap-2">
            Acompanhe todas as movimentações do sistema em tempo real
            {hasPeriod && (
              <span className="text-xs bg-yellow-500/10 text-yellow-400 px-2 py-0.5 rounded-full border border-yellow-500/30">
                {periodFrom && new Date(periodFrom).toLocaleDateString("pt-BR")}
                {" — "}
                {periodTo && new Date(periodTo).toLocaleDateString("pt-BR")}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleSync}
            disabled={syncing}
            title={syncResult ? `Última sync: ${syncResult.ts} (${syncResult.synced} registros)` : "Sincronizar dados on-chain"}
            className={cn(
              "flex items-center gap-2 px-4 py-2 font-medium rounded-lg border transition-colors",
              syncing
                ? "bg-purple-500/10 text-purple-400 border-purple-500/40 cursor-wait"
                : syncResult
                ? "bg-purple-500/10 text-purple-400 border-purple-500/40 hover:bg-purple-500/20"
                : "bg-neutral-800 text-white border-transparent hover:bg-neutral-700"
            )}
          >
            {syncing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            {syncing ? "Sincronizando…" : syncResult ? `Sync (${syncResult.synced})` : "Sincronizar"}
          </button>
          <button
            onClick={openPeriodModal}
            className={cn(
              "flex items-center gap-2 px-4 py-2 font-medium rounded-lg border transition-colors",
              hasPeriod
                ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/40 hover:bg-yellow-500/20"
                : "bg-neutral-800 text-white border-transparent hover:bg-neutral-700"
            )}
          >
            <Calendar className="w-4 h-4" />
            {hasPeriod ? "Período ativo" : "Período"}
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-400 transition-colors"
          >
            <Download className="w-4 h-4" />
            Exportar
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Total de Transações"
          value={String(stats?.total.value ?? 0)}
          change={stats?.total.change ?? "Calculando..."}
          icon={<ArrowLeftRight className="w-6 h-6 text-yellow-500" />}
          trend={stats?.total.trend ?? "neutral"}
          loading={loading && !data}
        />
        <StatCard
          title="Volume de Entradas"
          value={stats ? formatAmount(stats.volume.value, "USDT") : "0,00 USDT"}
          change={stats?.volume.change ?? "Calculando..."}
          icon={<TrendingUp className="w-6 h-6 text-yellow-500" />}
          trend={stats?.volume.trend ?? "neutral"}
          loading={loading && !data}
        />
        <StatCard
          title="Taxa de Sucesso"
          value={`${stats?.successRate.value ?? 0}%`}
          change={stats?.successRate.change ?? "Calculando..."}
          icon={<CheckCircle className="w-6 h-6 text-yellow-500" />}
          trend={stats?.successRate.trend ?? "neutral"}
          loading={loading && !data}
        />
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
          <input
            type="text"
            placeholder="Buscar por ID, descrição ou categoria..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-neutral-900 border border-neutral-800 rounded-lg text-white placeholder:text-neutral-500 focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 outline-none transition-all"
          />
        </div>
        <div className="flex gap-3">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2.5 bg-neutral-900 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-yellow-500 outline-none"
          >
            <option value="all">Todos os tipos</option>
            <option value="income">Entradas</option>
            <option value="expense">Saídas</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 bg-neutral-900 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-yellow-500 outline-none"
          >
            <option value="all">Todos os status</option>
            <option value="completed">Concluído</option>
            <option value="pending">Pendente</option>
            <option value="failed">Falhou</option>
            <option value="canceled">Cancelado</option>
          </select>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden mb-4">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-900/60">
                <th className="text-left py-4 px-6 text-xs font-semibold text-neutral-400 uppercase tracking-wider">ID</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Descrição</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Fonte</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Tipo</th>
                <th className="text-right py-4 px-6 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Valor</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Data</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && !data ? (
                // Skeleton rows
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-neutral-800/50">
                    <td className="py-4 px-6"><div className="h-3 w-16 bg-neutral-800 rounded animate-pulse" /></td>
                    <td className="py-4 px-6">
                      <div className="h-3 w-48 bg-neutral-800 rounded animate-pulse mb-1.5" />
                      <div className="h-2.5 w-24 bg-neutral-800/60 rounded animate-pulse" />
                    </td>
                    <td className="py-4 px-6"><div className="h-5 w-14 bg-neutral-800 rounded animate-pulse" /></td>
                    <td className="py-4 px-6"><div className="h-5 w-16 bg-neutral-800 rounded animate-pulse" /></td>
                    <td className="py-4 px-6 text-right"><div className="h-3 w-20 bg-neutral-800 rounded animate-pulse ml-auto" /></td>
                    <td className="py-4 px-6"><div className="h-3 w-28 bg-neutral-800 rounded animate-pulse" /></td>
                    <td className="py-4 px-6"><div className="h-5 w-20 bg-neutral-800 rounded-full animate-pulse" /></td>
                  </tr>
                ))
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <ArrowLeftRight className="w-10 h-10 text-neutral-700 mx-auto mb-3" />
                    <p className="text-neutral-500 font-medium">Nenhuma transação encontrada</p>
                    <p className="text-neutral-600 text-sm mt-1">Ajuste os filtros ou o período selecionado</p>
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const statusCfg = STATUS_MAP[tx.status] ?? STATUS_MAP.pending;
                  const sourceCfg = SOURCE_MAP[tx.source] ?? { label: tx.source, className: "bg-neutral-500/10 text-neutral-400" };
                  return (
                    <tr
                      key={tx.id}
                      className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors"
                    >
                      <td className="py-4 px-6">
                        <span className="font-mono text-xs text-neutral-500 select-all">{tx.id.slice(0, 8)}…</span>
                      </td>
                      <td className="py-4 px-6 max-w-[260px]">
                        <p className="font-medium text-white text-sm truncate">{tx.description}</p>
                        <p className="text-xs text-neutral-500 mt-0.5">{tx.category}</p>
                      </td>
                      <td className="py-4 px-6">
                        <span className={cn("px-2 py-0.5 rounded text-xs font-semibold", sourceCfg.className)}>
                          {sourceCfg.label}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={cn(
                          "flex items-center gap-1 w-fit px-2 py-0.5 rounded text-xs font-semibold",
                          tx.type === "income" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                        )}>
                          {tx.type === "income"
                            ? <TrendingUp className="w-3 h-3" />
                            : <TrendingDown className="w-3 h-3" />}
                          {tx.type === "income" ? "Entrada" : "Saída"}
                        </span>
                      </td>
                      <td className={cn(
                        "py-4 px-6 text-right font-mono text-sm font-semibold whitespace-nowrap",
                        tx.type === "income" ? "text-green-400" : "text-red-400"
                      )}>
                        {tx.type === "income" ? "+" : "−"}{formatAmount(tx.amount, tx.currency)}
                      </td>
                      <td className="py-4 px-6 text-neutral-400 text-xs whitespace-nowrap">
                        {formatDate(tx.date)}
                      </td>
                      <td className="py-4 px-6">
                        <span className={cn(
                          "flex items-center gap-1 w-fit px-2.5 py-1 rounded-full text-xs font-medium border",
                          statusCfg.className
                        )}>
                          {statusCfg.icon}
                          {statusCfg.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Pagination ── */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-neutral-500">
            Exibindo{" "}
            <span className="text-white font-medium">
              {(page - 1) * pagination.limit + 1}–{Math.min(page * pagination.limit, pagination.total)}
            </span>{" "}
            de{" "}
            <span className="text-white font-medium">{pagination.total}</span>{" "}
            transações
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg bg-neutral-800 text-white disabled:opacity-30 hover:bg-neutral-700 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-neutral-400 px-2 min-w-[100px] text-center">
              Página {page} de {pagination.pages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
              disabled={page === pagination.pages}
              className="p-2 rounded-lg bg-neutral-800 text-white disabled:opacity-30 hover:bg-neutral-700 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Info Alert ── */}
      <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
        <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-yellow-500">Monitoramento Unificado</p>
          <p className="text-sm text-yellow-400/70 mt-1">
            Esta visão consolida transações de wallets internas, receitas, despesas e vendas registradas no sistema.
            Dados on-chain de Smart Contracts (Spin, ICO, Staking) são rastreados nas respectivas páginas de módulo.
          </p>
        </div>
      </div>

      {/* ── Period Modal ── */}
      {showPeriodModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setShowPeriodModal(false); }}
        >
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-1">Filtrar por Período</h2>
            <p className="text-sm text-neutral-400 mb-5">Selecione o intervalo de datas para análise.</p>
            <div className="grid gap-4">
              <div>
                <label className="text-sm text-neutral-400 block mb-1.5">Data inicial</label>
                <input
                  type="date"
                  value={pendingFrom}
                  onChange={(e) => setPendingFrom(e.target.value)}
                  className="w-full px-3 py-2.5 bg-neutral-950 border border-neutral-700 rounded-lg text-white focus:ring-1 focus:ring-yellow-500 outline-none"
                />
              </div>
              <div>
                <label className="text-sm text-neutral-400 block mb-1.5">Data final</label>
                <input
                  type="date"
                  value={pendingTo}
                  onChange={(e) => setPendingTo(e.target.value)}
                  min={pendingFrom}
                  className="w-full px-3 py-2.5 bg-neutral-950 border border-neutral-700 rounded-lg text-white focus:ring-1 focus:ring-yellow-500 outline-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={clearPeriod}
                className="flex-1 py-2.5 bg-neutral-800 text-neutral-300 rounded-lg hover:bg-neutral-700 transition-colors text-sm font-medium"
              >
                Limpar filtro
              </button>
              <button
                onClick={applyPeriod}
                disabled={!pendingFrom && !pendingTo}
                className="flex-1 py-2.5 bg-yellow-500 text-black rounded-lg hover:bg-yellow-400 transition-colors text-sm font-bold disabled:opacity-40"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
