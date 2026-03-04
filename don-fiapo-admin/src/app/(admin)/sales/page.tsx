"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  Users,
  Target,
  Download,
  Calendar,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";
import { getSession, hasPermission, AdminSession } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { exportToCSV } from "@/lib/export";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface SaleEvent {
  id: string;
  source: "manual" | "on_chain" | "revenue" | "nft";
  product: string;
  customer: string;
  channel: string;
  amount: number;
  currency: string;
  status: "completed" | "pending" | "failed";
  date: string;
}

interface StatBlock {
  value: number;
  change: number;
  trend: "up" | "down" | "neutral";
}

interface OverviewData {
  stats: {
    totalRevenue: StatBlock;
    totalSales: StatBlock;
    avgTicket: StatBlock;
    newCustomers: StatBlock;
  };
  channelBreakdown: { channel: string; amount: number; count: number; pct: number }[];
  topProducts: { product: string; count: number; revenue: number; currency: string }[];
  recentSales: SaleEvent[];
  pagination: { page: number; limit: number; total: number; pages: number };
  meta: { sources: Record<string, number> };
}

// ─── Source badge config ────────────────────────────────────────────────────────

const SOURCE_MAP: Record<string, { label: string; className: string }> = {
  manual: { label: "Manual", className: "bg-yellow-500/10 text-yellow-400" },
  on_chain: { label: "On-Chain", className: "bg-purple-500/10 text-purple-400" },
  revenue: { label: "Receita", className: "bg-green-500/10 text-green-400" },
  nft: { label: "NFT", className: "bg-blue-500/10 text-blue-400" },
};

const STATUS_MAP = {
  completed: { label: "Concluído", className: "bg-green-500/10 text-green-400 border-green-500/50" },
  pending: { label: "Pendente", className: "bg-yellow-500/10 text-yellow-400 border-yellow-500/50" },
  failed: { label: "Falhou", className: "bg-red-500/10 text-red-400 border-red-500/50" },
};

// ─── Formatters ─────────────────────────────────────────────────────────────────

function formatAmount(amount: number, currency = "USDT"): string {
  if (currency === "BRL") {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(amount);
  }
  const fmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 });
  return `${fmt.format(amount)} ${currency}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── StatCard ───────────────────────────────────────────────────────────────────

function StatCard({
  title,
  stat,
  format,
  icon,
}: {
  title: string;
  stat: StatBlock;
  format: (v: number) => string;
  icon: React.ReactNode;
}) {
  const isUp = stat.trend === "up";
  const isDown = stat.trend === "down";
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-neutral-400 text-sm">{title}</p>
          <h3 className="text-2xl font-bold text-white mt-2">{format(stat.value)}</h3>
          <div className="flex items-center gap-1 mt-1">
            {isUp && <ArrowUpRight className="w-4 h-4 text-green-400" />}
            {isDown && <ArrowDownRight className="w-4 h-4 text-red-400" />}
            <p className={cn("text-sm", isUp && "text-green-400", isDown && "text-red-400", !isUp && !isDown && "text-neutral-400")}>
              {stat.change > 0 ? "+" : ""}{stat.change}% vs período anterior
            </p>
          </div>
        </div>
        <div className="p-3 bg-yellow-500/10 rounded-lg ring-1 ring-yellow-500/50">{icon}</div>
      </div>
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 animate-pulse">
      <div className="h-4 w-24 bg-neutral-800 rounded mb-3" />
      <div className="h-8 w-36 bg-neutral-800 rounded mb-2" />
      <div className="h-3 w-28 bg-neutral-800 rounded" />
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-b border-neutral-800/50">
      {Array.from({ length: 6 }).map((_, i) => (
        <td key={i} className="py-4 px-6">
          <div className="h-4 bg-neutral-800 rounded animate-pulse w-3/4" />
        </td>
      ))}
    </tr>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────────

export default function SalesPage() {
  const router = useRouter();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Period
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [pendingFrom, setPendingFrom] = useState("");
  const [pendingTo, setPendingTo] = useState("");
  const hasPeriod = !!(periodFrom && periodTo);

  // Create sale modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [formData, setFormData] = useState({
    product: "",
    customer: "",
    amount: "",
    channel: "Website",
    currency: "BRL",
  });

  const adminKeyRef = useRef("");

  // ── Auth guard ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const s = getSession();
    if (!s) { router.push("/login"); return; }
    if (!hasPermission(s, "sales") && !hasPermission(s, "all")) {
      router.push("/dashboard?error=unauthorized"); return;
    }
    setSession(s);
    adminKeyRef.current = localStorage.getItem("don_admin_key") || "";
  }, [router]);

  // ── Fetch overview ────────────────────────────────────────────────────────────
  const fetchOverview = useCallback(async (p = page) => {
    if (!adminKeyRef.current && !session) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: "20" });
      if (periodFrom) params.set("from", periodFrom);
      if (periodTo) params.set("to", periodTo);

      const res = await fetch(`/api/admin/sales/overview?${params}`, {
        headers: { "x-admin-key": adminKeyRef.current },
      });
      if (res.ok) {
        setData(await res.json());
      }
    } catch (err) {
      console.error("[SalesPage] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [session, page, periodFrom, periodTo]);

  useEffect(() => {
    if (session) fetchOverview(page);
  }, [session, page, periodFrom, periodTo]);

  // ── Period modal ──────────────────────────────────────────────────────────────
  const openPeriodModal = () => {
    setPendingFrom(periodFrom);
    setPendingTo(periodTo);
    setShowPeriodModal(true);
  };
  const applyPeriod = () => {
    setPeriodFrom(pendingFrom);
    setPeriodTo(pendingTo);
    setPage(1);
    setShowPeriodModal(false);
  };
  const clearPeriod = () => {
    setPendingFrom(""); setPendingTo("");
    setPeriodFrom(""); setPeriodTo("");
    setPage(1);
    setShowPeriodModal(false);
  };

  // ── Create sale ───────────────────────────────────────────────────────────────
  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    try {
      const res = await fetch("/api/admin/sales", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKeyRef.current,
        },
        body: JSON.stringify({ ...formData, amount: parseFloat(formData.amount) }),
      });
      if (res.ok) {
        setFormData({ product: "", customer: "", amount: "", channel: "Website", currency: "BRL" });
        setIsCreateOpen(false);
        fetchOverview(1);
      } else {
        const err = await res.json().catch(() => ({ error: "Erro ao criar venda" }));
        alert(err.error ?? "Falha ao registrar venda.");
      }
    } catch {
      alert("Erro de conexão.");
    } finally {
      setCreateLoading(false);
    }
  };

  // ── Export ────────────────────────────────────────────────────────────────────
  const handleExport = () => {
    const rows = data?.recentSales;
    if (!rows?.length) { alert("Nenhum dado para exportar"); return; }
    exportToCSV(rows, "vendas", {
      id: "ID", source: "Fonte", product: "Produto", customer: "Cliente",
      channel: "Canal", amount: "Valor", currency: "Moeda", status: "Status", date: "Data",
    });
  };

  const stats = data?.stats;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Vendas & Comercial</h1>
          <p className="text-neutral-400 mt-2">
            Acompanhe vendas, parcerias e métricas comerciais
            {data?.meta && (
              <span className="ml-2 text-xs text-neutral-600">
                ({Object.entries(data.meta.sources).map(([k, v]) => `${k}: ${v}`).join(" · ")})
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-3">
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
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-black font-medium rounded-lg hover:bg-yellow-400 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nova Venda
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-800 text-white font-medium rounded-lg hover:bg-neutral-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Exportar
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {loading || !stats ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard
              title="Receita Total"
              stat={stats.totalRevenue}
              format={(v) => formatAmount(v, "USDT")}
              icon={<ShoppingCart className="w-6 h-6 text-yellow-500" />}
            />
            <StatCard
              title="Novos Clientes"
              stat={stats.newCustomers}
              format={(v) => v.toString()}
              icon={<Users className="w-6 h-6 text-yellow-500" />}
            />
            <StatCard
              title="Ticket Médio"
              stat={stats.avgTicket}
              format={(v) => formatAmount(v, "USDT")}
              icon={<TrendingUp className="w-6 h-6 text-yellow-500" />}
            />
            <StatCard
              title="Total de Vendas"
              stat={stats.totalSales}
              format={(v) => v.toString()}
              icon={<Target className="w-6 h-6 text-yellow-500" />}
            />
          </>
        )}
      </div>

      {/* Channel + Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Vendas por Canal */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Vendas por Canal</h3>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-3 w-32 bg-neutral-800 rounded mb-2" />
                  <div className="h-2 bg-neutral-800 rounded-full" />
                </div>
              ))}
            </div>
          ) : data?.channelBreakdown.length ? (
            <div className="space-y-4">
              {data.channelBreakdown.map((item) => (
                <div key={item.channel}>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-neutral-300">{item.channel}</span>
                    <span className="text-white font-medium">
                      {formatAmount(item.amount, "USDT")} ({item.pct}%)
                    </span>
                  </div>
                  <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                    <div className="h-full bg-yellow-500 rounded-full transition-all" style={{ width: `${item.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-neutral-500 text-sm text-center py-8">Nenhuma venda no período</p>
          )}
        </div>

        {/* Produtos Mais Vendidos */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Produtos Mais Vendidos</h3>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 animate-pulse">
                  <div className="w-6 h-6 bg-neutral-800 rounded" />
                  <div className="flex-1 h-4 bg-neutral-800 rounded" />
                  <div className="w-24 h-4 bg-neutral-800 rounded" />
                </div>
              ))}
            </div>
          ) : data?.topProducts.length ? (
            <div className="space-y-4">
              {data.topProducts.map((item, index) => (
                <div key={item.product} className="flex items-center gap-4">
                  <span className="w-6 h-6 flex items-center justify-center bg-neutral-800 text-neutral-400 text-sm rounded shrink-0">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">{item.product}</p>
                    <p className="text-neutral-500 text-xs">{item.count} venda(s)</p>
                  </div>
                  <span className="text-yellow-500 font-medium text-sm shrink-0">
                    {formatAmount(item.revenue, item.currency)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-neutral-500 text-sm text-center py-8">Nenhum produto no período</p>
          )}
        </div>
      </div>

      {/* Vendas Recentes */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden mb-8">
        <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Vendas Recentes</h3>
          <button
            onClick={() => fetchOverview(page)}
            className="flex items-center gap-1.5 text-sm text-neutral-400 hover:text-white transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Atualizar
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-800">
                {["Produto", "Cliente", "Canal", "Fonte", "Valor", "Data", "Status"].map((h) => (
                  <th key={h} className="text-left py-4 px-6 text-sm font-medium text-neutral-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
              ) : data?.recentSales.length ? (
                data.recentSales.map((sale) => {
                  const src = SOURCE_MAP[sale.source] ?? SOURCE_MAP.manual;
                  const st = STATUS_MAP[sale.status] ?? STATUS_MAP.pending;
                  return (
                    <tr key={sale.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors">
                      <td className="py-4 px-6">
                        <p className="font-medium text-white text-sm">{sale.product}</p>
                      </td>
                      <td className="py-4 px-6 text-neutral-400 text-sm max-w-[140px] truncate">
                        {sale.customer}
                      </td>
                      <td className="py-4 px-6">
                        <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-neutral-800 text-neutral-300">
                          {sale.channel}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={cn("px-2.5 py-1 text-xs font-medium rounded-full", src.className)}>
                          {src.label}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-medium text-white text-sm">
                        {formatAmount(sale.amount, sale.currency)}
                      </td>
                      <td className="py-4 px-6 text-neutral-400 text-sm whitespace-nowrap">
                        {formatDate(sale.date)}
                      </td>
                      <td className="py-4 px-6">
                        <span className={cn("px-2.5 py-1 text-xs font-medium rounded-full border", st.className)}>
                          {st.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-500">
                    Nenhuma venda encontrada no período
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.pagination.pages > 1 && (
          <div className="p-4 border-t border-neutral-800 flex items-center justify-between">
            <p className="text-sm text-neutral-400">
              {((page - 1) * data.pagination.limit) + 1}–{Math.min(page * data.pagination.limit, data.pagination.total)} de {data.pagination.total} vendas
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm bg-neutral-800 text-white rounded-lg disabled:opacity-40 hover:bg-neutral-700 transition-colors"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage((p) => Math.min(data.pagination.pages, p + 1))}
                disabled={page >= data.pagination.pages}
                className="px-3 py-1.5 text-sm bg-neutral-800 text-white rounded-lg disabled:opacity-40 hover:bg-neutral-700 transition-colors"
              >
                Próximo
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Info Alert */}
      <div className="mt-6 flex items-start gap-3 p-4 bg-orange-500/10 border border-orange-500/50 rounded-xl text-orange-500">
        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">Acesso Comercial</p>
          <p className="text-sm text-orange-500/80 mt-1">
            Dados agregados de 4 fontes: vendas manuais, eventos on-chain (via Sync), receitas e NFTs mintados.
            Use <strong>Sincronizar</strong> na página de Transações para atualizar eventos on-chain.
          </p>
        </div>
      </div>

      {/* Period Picker Modal */}
      {showPeriodModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Filtrar por Período</h3>
              <button onClick={() => setShowPeriodModal(false)} className="text-neutral-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-neutral-400 mb-1">Data Inicial</label>
                <input type="date" value={pendingFrom} onChange={(e) => setPendingFrom(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm outline-none focus:ring-1 focus:ring-yellow-500" />
              </div>
              <div>
                <label className="block text-sm text-neutral-400 mb-1">Data Final</label>
                <input type="date" value={pendingTo} onChange={(e) => setPendingTo(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm outline-none focus:ring-1 focus:ring-yellow-500" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={clearPeriod} className="flex-1 px-4 py-2 text-sm bg-neutral-800 text-white rounded-lg hover:bg-neutral-700">
                Limpar
              </button>
              <button onClick={applyPeriod} disabled={!pendingFrom || !pendingTo}
                className="flex-1 px-4 py-2 text-sm bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-400 disabled:opacity-50">
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Sale Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="bg-neutral-950 border-neutral-800 text-white sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Nova Venda</DialogTitle>
            <DialogDescription className="text-neutral-400">
              Registre uma venda manual no sistema.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSale}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Produto</Label>
                <Input placeholder="Ex: Token Fiapo - Pacote 1000"
                  className="bg-neutral-900 border-neutral-800"
                  value={formData.product}
                  onChange={(e) => setFormData({ ...formData, product: e.target.value })}
                  required />
              </div>
              <div className="grid gap-2">
                <Label>Cliente</Label>
                <Input placeholder="Ex: João Silva"
                  className="bg-neutral-900 border-neutral-800"
                  value={formData.customer}
                  onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                  required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Valor</Label>
                  <Input type="number" step="any" placeholder="0.00"
                    className="bg-neutral-900 border-neutral-800"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required />
                </div>
                <div className="grid gap-2">
                  <Label>Moeda</Label>
                  <select className="w-full px-4 py-2.5 bg-neutral-900 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-yellow-500 outline-none"
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}>
                    <option value="BRL">BRL (R$)</option>
                    <option value="USDT">USDT</option>
                    <option value="FIAPO">FIAPO</option>
                    <option value="LUNES">LUNES</option>
                  </select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Canal</Label>
                <select className="w-full px-4 py-2.5 bg-neutral-900 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-yellow-500 outline-none"
                  value={formData.channel}
                  onChange={(e) => setFormData({ ...formData, channel: e.target.value })}>
                  <option value="Website">Website</option>
                  <option value="Marketplace">Marketplace</option>
                  <option value="App">App</option>
                  <option value="Partner">Parceiro</option>
                </select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline"
                className="bg-neutral-800 border-neutral-700 text-white hover:bg-neutral-700"
                onClick={() => setIsCreateOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold" disabled={createLoading}>
                {createLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                Registrar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
