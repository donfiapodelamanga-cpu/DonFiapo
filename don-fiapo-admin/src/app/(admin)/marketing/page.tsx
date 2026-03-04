"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Megaphone,
  TrendingUp,
  Users,
  MousePointer,
  Target,
  Download,
  Calendar,
  Plus,
  AlertCircle,
  Eye,
  Play,
  Pause,
  MoreVertical,
  Loader2,
  RefreshCw,
  X,
  ArrowUpRight,
  ArrowDownRight,
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

interface StatBlock {
  value: number;
  change: number;
  trend: "up" | "down" | "neutral";
}

interface Campaign {
  id: string;
  name: string;
  type: string;
  status: "active" | "paused" | "ended";
  reach: number;
  clicks: number;
  conversions: number;
  budget: number;
  spent: number;
  ctrGoal: number;
  startDate: string;
  endDate: string;
  hasDailyData: boolean;
}

interface DailyPoint {
  day: string;
  date: string;
  reach: number;
  clicks: number;
  conversions: number;
}

interface OverviewData {
  stats: {
    totalReach: StatBlock;
    totalClicks: StatBlock;
    totalConversions: StatBlock;
    conversionRate: StatBlock;
  };
  ctr: {
    value: number;
    goal: number;
    industryAvg: number;
    goalStatus: "above" | "below" | "on_target";
  };
  dailyChart: DailyPoint[];
  typeBreakdown: { type: string; reach: number; clicks: number; conversions: number; spent: number; count: number; ctr: number }[];
  campaigns: Campaign[];
  meta: {
    totalCampaigns: number;
    activeCampaigns: number;
    hasDailyMetrics: boolean;
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatNumber(value: number): string {
  if (value >= 1000000) return (value / 1000000).toFixed(1) + "M";
  if (value >= 1000) return (value / 1000).toFixed(1) + "K";
  return value.toString();
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function getStatusBadgeColor(status: string): string {
  switch (status) {
    case "active": return "bg-green-500/10 text-green-400 border-green-500/50";
    case "paused": return "bg-yellow-500/10 text-yellow-400 border-yellow-500/50";
    case "ended": return "bg-neutral-500/10 text-neutral-400 border-neutral-500/50";
    default: return "bg-neutral-500/10 text-neutral-400 border-neutral-500/50";
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "active": return "Ativa";
    case "paused": return "Pausada";
    case "ended": return "Encerrada";
    default: return status;
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case "active": return <Play className="w-3 h-3" />;
    case "paused": return <Pause className="w-3 h-3" />;
    default: return null;
  }
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

// ─── Skeletons ──────────────────────────────────────────────────────────────────

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
      {Array.from({ length: 8 }).map((_, i) => (
        <td key={i} className="py-4 px-6"><div className="h-4 bg-neutral-800 rounded animate-pulse w-3/4" /></td>
      ))}
    </tr>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────────

export default function MarketingPage() {
  const router = useRouter();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Period picker
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [pendingFrom, setPendingFrom] = useState("");
  const [pendingTo, setPendingTo] = useState("");
  const hasPeriod = !!(periodFrom && periodTo);

  // Create campaign modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "Social Media",
    budget: "",
    startDate: "",
    endDate: "",
    ctrGoal: "8.0",
  });

  const adminKeyRef = useRef("");

  // ── Auth guard ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const s = getSession();
    if (!s) { router.push("/login"); return; }
    if (!hasPermission(s, "marketing") && !hasPermission(s, "all")) {
      router.push("/dashboard?error=unauthorized"); return;
    }
    setSession(s);
    adminKeyRef.current = localStorage.getItem("don_admin_key") || "";
  }, [router]);

  // ── Fetch overview ────────────────────────────────────────────────────────────
  const fetchOverview = useCallback(async () => {
    if (!adminKeyRef.current && !session) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (periodFrom) params.set("from", periodFrom);
      if (periodTo) params.set("to", periodTo);

      const res = await fetch(`/api/admin/marketing/overview?${params}`, {
        headers: { "x-admin-key": adminKeyRef.current },
      });
      if (res.ok) {
        setData(await res.json());
      }
    } catch (err) {
      console.error("[MarketingPage] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [session, periodFrom, periodTo]);

  useEffect(() => {
    if (session) fetchOverview();
  }, [session, periodFrom, periodTo]);

  // ── Period modal ──────────────────────────────────────────────────────────────
  const openPeriodModal = () => { setPendingFrom(periodFrom); setPendingTo(periodTo); setShowPeriodModal(true); };
  const applyPeriod = () => { setPeriodFrom(pendingFrom); setPeriodTo(pendingTo); setShowPeriodModal(false); };
  const clearPeriod = () => { setPendingFrom(""); setPendingTo(""); setPeriodFrom(""); setPeriodTo(""); setShowPeriodModal(false); };

  // ── Create campaign ───────────────────────────────────────────────────────────
  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    try {
      const res = await fetch("/api/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKeyRef.current },
        body: JSON.stringify({
          ...formData,
          budget: parseFloat(formData.budget),
          ctrGoal: parseFloat(formData.ctrGoal),
        }),
      });
      if (res.ok) {
        setFormData({ name: "", type: "Social Media", budget: "", startDate: "", endDate: "", ctrGoal: "8.0" });
        setIsCreateModalOpen(false);
        fetchOverview();
      } else {
        const err = await res.json().catch(() => ({ error: "Erro" }));
        alert(err.error ?? "Falha ao criar campanha.");
      }
    } catch {
      alert("Erro de conexão.");
    } finally {
      setCreateLoading(false);
    }
  };

  // ── Toggle campaign status ────────────────────────────────────────────────────
  const toggleStatus = async (id: string, current: string) => {
    const next = current === "active" ? "paused" : "active";
    try {
      await fetch("/api/admin/campaigns", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKeyRef.current },
        body: JSON.stringify({ id, status: next }),
      });
      fetchOverview();
    } catch {
      alert("Erro ao atualizar status.");
    }
  };

  // ── Export ────────────────────────────────────────────────────────────────────
  const handleExport = () => {
    const rows = data?.campaigns;
    if (!rows?.length) { alert("Nenhum dado para exportar"); return; }
    exportToCSV(rows, "campanhas", {
      name: "Nome", type: "Tipo", status: "Status", reach: "Alcance",
      clicks: "Cliques", conversions: "Conversões", budget: "Orçamento",
      spent: "Gasto", startDate: "Data Início", endDate: "Data Fim",
    });
  };

  // ── Derived ───────────────────────────────────────────────────────────────────
  const stats = data?.stats;
  const ctr = data?.ctr;
  const chart = data?.dailyChart ?? [];
  const campaigns = data?.campaigns ?? [];
  const filteredCampaigns = filterStatus === "all" ? campaigns : campaigns.filter((c) => c.status === filterStatus);
  const chartMax = Math.max(...chart.map((d) => Math.max(d.reach, d.clicks, d.conversions)), 1);

  if (!session) return null;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Marketing</h1>
          <p className="text-neutral-400 mt-2">
            Gerencie campanhas e acompanhe métricas de marketing
            {data?.meta && (
              <span className="ml-2 text-xs text-neutral-600">
                ({data.meta.activeCampaigns} ativas de {data.meta.totalCampaigns})
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
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-neutral-800 text-white font-medium rounded-lg hover:bg-neutral-700 transition-colors">
            <Download className="w-5 h-5" />
            Exportar
          </button>
          <button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-black font-medium rounded-lg hover:bg-yellow-400 transition-colors">
            <Plus className="w-5 h-5" />
            Nova Campanha
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {loading || !stats ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard title="Alcance Total" stat={stats.totalReach} format={formatNumber} icon={<Eye className="w-6 h-6 text-yellow-500" />} />
            <StatCard title="Cliques" stat={stats.totalClicks} format={formatNumber} icon={<MousePointer className="w-6 h-6 text-yellow-500" />} />
            <StatCard title="Conversões" stat={stats.totalConversions} format={formatNumber} icon={<Target className="w-6 h-6 text-yellow-500" />} />
            <StatCard title="Taxa de Conversão" stat={stats.conversionRate} format={(v) => `${v}%`} icon={<TrendingUp className="w-6 h-6 text-yellow-500" />} />
          </>
        )}
      </div>

      {/* Performance Chart + CTR */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Weekly Performance */}
        <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-white">Performance da Semana</h3>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded" />
                <span className="text-neutral-400">Alcance</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded" />
                <span className="text-neutral-400">Cliques</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded" />
                <span className="text-neutral-400">Conversões</span>
              </div>
            </div>
          </div>
          {loading ? (
            <div className="h-64 flex items-end justify-between gap-4">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full bg-neutral-800 rounded animate-pulse" style={{ height: `${40 + Math.random() * 80}px` }} />
                  <div className="h-3 w-8 bg-neutral-800 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : (
            <div className="h-64 flex items-end justify-between gap-4">
              {chart.map((d, i) => {
                const maxH = 200;
                const reachH = chartMax > 0 ? (d.reach / chartMax) * maxH : 0;
                const clickH = chartMax > 0 ? (d.clicks / chartMax) * maxH : 0;
                const convH = chartMax > 0 ? (d.conversions / chartMax) * maxH : 0;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative">
                    <div className="w-full flex flex-col gap-1">
                      <div className="bg-yellow-500/80 rounded-t w-full transition-all" style={{ height: `${Math.max(reachH, 2)}px` }} />
                      <div className="bg-blue-500/80 rounded-t w-full transition-all" style={{ height: `${Math.max(clickH, 2)}px` }} />
                      <div className="bg-green-500/80 rounded-t w-full transition-all" style={{ height: `${Math.max(convH, 2)}px` }} />
                    </div>
                    <span className="text-xs text-neutral-500">{d.day}</span>
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 hidden group-hover:block bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-xs whitespace-nowrap z-10 shadow-xl">
                      <p className="text-neutral-300 font-medium mb-1">{d.date}</p>
                      <p className="text-yellow-400">Alcance: {formatNumber(d.reach)}</p>
                      <p className="text-blue-400">Cliques: {formatNumber(d.clicks)}</p>
                      <p className="text-green-400">Conversões: {formatNumber(d.conversions)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* CTR Card */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Taxa de Clique (CTR)</h3>
          {loading || !ctr ? (
            <div className="animate-pulse space-y-4">
              <div className="flex justify-center"><div className="w-40 h-40 bg-neutral-800 rounded-full" /></div>
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-4 bg-neutral-800 rounded" />)}
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-center h-48">
                <div className="relative w-40 h-40">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#262626" strokeWidth="12" />
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#EAB308" strokeWidth="12"
                      strokeDasharray={`${Math.min(ctr.value, 100) * 2.51} 251.2`} strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-white">{ctr.value}%</span>
                    <span className="text-xs text-neutral-400">CTR Médio</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-400">Média do setor</span>
                  <span className="text-white">{ctr.industryAvg}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-400">Nossa meta</span>
                  <span className="text-white">{ctr.goal}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-400">Status</span>
                  <span className={cn(
                    ctr.goalStatus === "above" && "text-green-400",
                    ctr.goalStatus === "below" && "text-red-400",
                    ctr.goalStatus === "on_target" && "text-yellow-400",
                  )}>
                    {ctr.goalStatus === "above" ? "Acima da meta" : ctr.goalStatus === "below" ? "Abaixo da meta" : "Na meta"}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Campaigns Filter */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-white">Campanhas</h3>
        <div className="flex items-center gap-3">
          <button onClick={() => fetchOverview()} className="flex items-center gap-1.5 text-sm text-neutral-400 hover:text-white transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
            Atualizar
          </button>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 bg-neutral-900 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 outline-none transition-all">
            <option value="all">Todas as campanhas</option>
            <option value="active">Ativas</option>
            <option value="paused">Pausadas</option>
            <option value="ended">Encerradas</option>
          </select>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-800">
              {["Campanha", "Tipo", "Alcance", "Cliques", "Conversões", "Orçamento", "Status", ""].map((h) => (
                <th key={h} className="text-left py-4 px-6 text-sm font-medium text-neutral-400">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
            ) : filteredCampaigns.length > 0 ? (
              filteredCampaigns.map((campaign) => (
                <tr key={campaign.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors">
                  <td className="py-4 px-6">
                    <div>
                      <p className="font-medium text-white">{campaign.name}</p>
                      <p className="text-xs text-neutral-500">
                        {formatDate(campaign.startDate)} - {formatDate(campaign.endDate)}
                      </p>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-neutral-800 text-neutral-300">
                      {campaign.type}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-white">{formatNumber(campaign.reach)}</td>
                  <td className="py-4 px-6 text-white">{formatNumber(campaign.clicks)}</td>
                  <td className="py-4 px-6">
                    <span className="text-green-400 font-medium">{formatNumber(campaign.conversions)}</span>
                  </td>
                  <td className="py-4 px-6">
                    <div>
                      <p className="text-white">{formatCurrency(campaign.spent)} / {formatCurrency(campaign.budget)}</p>
                      <div className="w-24 h-1.5 bg-neutral-800 rounded-full mt-1 overflow-hidden">
                        <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${Math.min((campaign.spent / campaign.budget) * 100, 100)}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className={cn("px-2.5 py-1 text-xs font-medium rounded-full border flex items-center gap-1 w-fit", getStatusBadgeColor(campaign.status))}>
                      {getStatusIcon(campaign.status)}
                      {getStatusLabel(campaign.status)}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <button onClick={() => toggleStatus(campaign.id, campaign.status)}
                      className="p-2 hover:bg-neutral-800 rounded-lg transition-colors" title={campaign.status === "active" ? "Pausar" : "Ativar"}>
                      {campaign.status === "active" ? <Pause className="w-4 h-4 text-yellow-400" /> : <Play className="w-4 h-4 text-green-400" />}
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="py-12 text-center">
                  <Megaphone className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
                  <p className="text-neutral-400">Nenhuma campanha encontrada</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Info Alert */}
      <div className="mt-6 flex items-start gap-3 p-4 bg-orange-500/10 border border-orange-500/50 rounded-xl text-orange-500">
        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">Métricas de Marketing</p>
          <p className="text-sm text-orange-500/80 mt-1">
            {data?.meta?.hasDailyMetrics
              ? "Dados reais de performance diária. Use a API PATCH /api/admin/campaigns para enviar métricas de Google Ads, Meta Ads, etc."
              : "Dados baseados em totais de campanha. Para métricas diárias granulares, envie dados via PATCH /api/admin/campaigns com o campo dailyMetric."}
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
              <button onClick={clearPeriod} className="flex-1 px-4 py-2 text-sm bg-neutral-800 text-white rounded-lg hover:bg-neutral-700">Limpar</button>
              <button onClick={applyPeriod} disabled={!pendingFrom || !pendingTo}
                className="flex-1 px-4 py-2 text-sm bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-400 disabled:opacity-50">Aplicar</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Campaign Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="bg-neutral-950 border-neutral-800 text-white sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Nova Campanha</DialogTitle>
            <DialogDescription className="text-neutral-400">Crie uma nova campanha de marketing.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateCampaign}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Nome da Campanha</Label>
                <Input placeholder="Ex: Lançamento Token Fiapo" className="bg-neutral-900 border-neutral-800"
                  value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div className="grid gap-2">
                <Label>Tipo</Label>
                <select className="w-full px-4 py-2.5 bg-neutral-900 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-yellow-500 outline-none"
                  value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                  <option value="Social Media">Social Media</option>
                  <option value="Influencer">Influencer</option>
                  <option value="PPC">PPC (Pay Per Click)</option>
                  <option value="Email">Email Marketing</option>
                  <option value="Video">Vídeo/YouTube</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Orçamento (R$)</Label>
                  <Input type="number" placeholder="0.00" className="bg-neutral-900 border-neutral-800"
                    value={formData.budget} onChange={(e) => setFormData({ ...formData, budget: e.target.value })} required />
                </div>
                <div className="grid gap-2">
                  <Label>Meta CTR (%)</Label>
                  <Input type="number" step="0.1" placeholder="8.0" className="bg-neutral-900 border-neutral-800"
                    value={formData.ctrGoal} onChange={(e) => setFormData({ ...formData, ctrGoal: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Data Início</Label>
                  <Input type="date" className="bg-neutral-900 border-neutral-800"
                    value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} required />
                </div>
                <div className="grid gap-2">
                  <Label>Data Fim</Label>
                  <Input type="date" className="bg-neutral-900 border-neutral-800"
                    value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} required />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" className="bg-neutral-800 border-neutral-700 text-white hover:bg-neutral-700"
                onClick={() => setIsCreateModalOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold" disabled={createLoading}>
                {createLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                Criar Campanha
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
