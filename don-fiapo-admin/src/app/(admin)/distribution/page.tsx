"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Gift,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Copy,
  Check,
  Download,
  Send,
  Filter,
  RefreshCw,
  ExternalLink,
  Wallet,
  Users,
  Coins,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Ban,
  Target,
} from "lucide-react";
import { getSession, AdminSession } from "@/lib/auth";
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

interface Claim {
  id: string;
  slotNumber: number;
  lunesAmount: number;
  claimedAt: string;
  distributionStatus: "PENDING" | "SENT" | "FAILED";
  distributionTxHash: string | null;
  distributedAt: string | null;
  distributedBy: string | null;
  userId: string;
  xUsername: string | null;
  lunesWallet: string | null;
  // Activity verification
  activityVerified: boolean;
  missionsCompleted: number;
  referralsQualified: number;
  totalScore: number;
  rank: string | null;
  isBanned: boolean;
}

interface ClaimsResponse {
  claims: Claim[];
  pagination: { total: number; page: number; limit: number; pages: number };
  stats: Record<string, { count: number; totalLunes: number }>;
}

const STATUS_CONFIG = {
  PENDING: { label: "Pendente", color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30", icon: Clock },
  SENT: { label: "Enviado", color: "text-green-400 bg-green-500/10 border-green-500/30", icon: CheckCircle },
  FAILED: { label: "Falhou", color: "text-red-400 bg-red-500/10 border-red-500/30", icon: XCircle },
};

export default function DistributionPage() {
  const router = useRouter();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [data, setData] = useState<ClaimsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Distribution wallet from system wallets
  const [distWallet, setDistWallet] = useState<{ address: string; label: string } | null>(null);

  // Mark as sent dialog
  const [markDialogOpen, setMarkDialogOpen] = useState(false);
  const [markTxHash, setMarkTxHash] = useState("");
  const [markLoading, setMarkLoading] = useState(false);
  const [markResult, setMarkResult] = useState<string | null>(null);

  const fetchData = useCallback(async (pg = 1, status = "") => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(pg), limit: "50" });
      if (status) params.set("status", status);
      const res = await fetch(`/api/admin/airdrop/claims?${params}`);
      if (res.ok) setData(await res.json());
    } catch (err) {
      console.error("[Distribution] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDistWallet = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/wallets");
      if (!res.ok) return;
      const wallets: { key: string; label: string; address: string }[] = await res.json();
      const w = wallets.find((w) => w.key === "airdrop_distribution_lunes");
      if (w) setDistWallet({ address: w.address, label: w.label });
    } catch {
      // no-op
    }
  }, []);

  useEffect(() => {
    const s = getSession();
    if (!s) { router.push("/login"); return; }
    setSession(s);
    fetchData(1, "");
    fetchDistWallet();
  }, [router, fetchData, fetchDistWallet]);

  const handleFilterChange = (status: string) => {
    setFilterStatus(status);
    setPage(1);
    setSelected(new Set());
    fetchData(1, status);
  };

  const handlePageChange = (pg: number) => {
    setPage(pg);
    fetchData(pg, filterStatus);
  };

  const toggleSelect = (id: string) => {
    // Block selection of unverified or banned claims
    const claim = data?.claims.find((c) => c.id === id);
    if (claim && (!claim.activityVerified || claim.isBanned)) return;

    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!data) return;
    // Only select PENDING + verified + not banned
    const eligibleIds = data.claims
      .filter((c) => c.distributionStatus === "PENDING" && c.activityVerified && !c.isBanned)
      .map((c) => c.id);
    if (selected.size === eligibleIds.length && eligibleIds.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(eligibleIds));
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleMarkSent = async () => {
    if (!markTxHash.trim()) return;
    setMarkLoading(true);
    setMarkResult(null);
    try {
      const res = await fetch("/api/admin/airdrop/claims", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: Array.from(selected),
          txHash: markTxHash.trim(),
          adminEmail: session?.email,
          status: "SENT",
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setMarkResult(`✓ ${json.updated} claim(s) marcado(s) como ENVIADO`);
        setSelected(new Set());
        setMarkTxHash("");
        fetchData(page, filterStatus);
      } else {
        setMarkResult(`Erro: ${json.error}`);
      }
    } catch {
      setMarkResult("Falha na requisição.");
    } finally {
      setMarkLoading(false);
    }
  };

  const handleMarkFailed = async () => {
    if (selected.size === 0) return;
    setMarkLoading(true);
    try {
      const res = await fetch("/api/admin/airdrop/claims", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: Array.from(selected),
          adminEmail: session?.email,
          status: "FAILED",
        }),
      });
      if (res.ok) {
        setSelected(new Set());
        fetchData(page, filterStatus);
      }
    } catch {
      // no-op
    } finally {
      setMarkLoading(false);
    }
  };

  const exportCSV = () => {
    if (!data) return;
    const rows = [
      ["slot", "lunesAmount", "lunesWallet", "xUsername", "claimedAt", "distributionStatus", "txHash"],
      ...data.claims.map((c) => [
        c.slotNumber,
        c.lunesAmount,
        c.lunesWallet ?? "",
        c.xUsername ?? "",
        new Date(c.claimedAt).toISOString(),
        c.distributionStatus,
        c.distributionTxHash ?? "",
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `early-bird-claims-${filterStatus || "all"}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const stats = data?.stats || {};
  const pendingCount = stats.PENDING?.count ?? 0;
  const pendingLunes = stats.PENDING?.totalLunes ?? 0;
  const sentCount = stats.SENT?.count ?? 0;
  const sentLunes = stats.SENT?.totalLunes ?? 0;
  const failedCount = stats.FAILED?.count ?? 0;
  const totalCount = (stats.PENDING?.count ?? 0) + (stats.SENT?.count ?? 0) + (stats.FAILED?.count ?? 0);

  const pendingInView = data?.claims.filter((c) => c.distributionStatus === "PENDING") ?? [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 rounded-xl ring-1 ring-yellow-500/30">
              <Gift className="w-6 h-6 text-yellow-500" />
            </div>
            Distribuição Early Bird
          </h1>
          <p className="text-neutral-500 text-sm mt-1">
            Gestão de envio de LUNES para os primeiros {totalCount.toLocaleString("pt-BR")} participantes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchData(page, filterStatus)}
            className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors"
            title="Atualizar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Distribution Wallet Banner */}
      <div className={cn(
        "rounded-2xl border p-4 flex items-start gap-4",
        distWallet
          ? "bg-blue-500/5 border-blue-500/20"
          : "bg-orange-500/5 border-orange-500/30"
      )}>
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
          distWallet ? "bg-blue-500/10" : "bg-orange-500/10"
        )}>
          <Wallet className={cn("w-5 h-5", distWallet ? "text-blue-400" : "text-orange-400")} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn("font-bold text-sm", distWallet ? "text-blue-300" : "text-orange-300")}>
            {distWallet ? "Carteira de Distribuição Configurada" : "Carteira de Distribuição não Configurada"}
          </p>
          {distWallet ? (
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono text-xs text-neutral-400 truncate">{distWallet.address}</span>
              <button
                onClick={() => copyToClipboard(distWallet.address, "dist-wallet")}
                className="p-1 rounded hover:bg-neutral-700 text-neutral-500 hover:text-white transition-colors flex-shrink-0"
              >
                {copiedId === "dist-wallet" ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          ) : (
            <p className="text-xs text-orange-400/80 mt-1">
              Cadastre a chave <code className="bg-neutral-800 px-1 rounded">airdrop_distribution_lunes</code> em{" "}
              <a href="/system-wallets" className="underline hover:text-orange-300">Carteiras do Sistema</a>.
            </p>
          )}
        </div>
        <div className="text-xs text-neutral-600 flex-shrink-0">LUNES Network</div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-neutral-400" />
            <span className="text-xs text-neutral-500 uppercase tracking-wider">Total Claims</span>
          </div>
          <p className="text-2xl font-black text-white">{totalCount.toLocaleString("pt-BR")}</p>
          <p className="text-xs text-neutral-600 mt-0.5">de 30.000 slots</p>
        </div>
        <div className="bg-neutral-900 border border-yellow-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-yellow-400" />
            <span className="text-xs text-neutral-500 uppercase tracking-wider">Pendente Envio</span>
          </div>
          <p className="text-2xl font-black text-yellow-400">{pendingCount.toLocaleString("pt-BR")}</p>
          <p className="text-xs text-neutral-600 mt-0.5">{pendingLunes.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} LUNES</p>
        </div>
        <div className="bg-neutral-900 border border-green-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span className="text-xs text-neutral-500 uppercase tracking-wider">Enviado</span>
          </div>
          <p className="text-2xl font-black text-green-400">{sentCount.toLocaleString("pt-BR")}</p>
          <p className="text-xs text-neutral-600 mt-0.5">{sentLunes.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} LUNES</p>
        </div>
        <div className="bg-neutral-900 border border-red-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-4 h-4 text-red-400" />
            <span className="text-xs text-neutral-500 uppercase tracking-wider">Falhou</span>
          </div>
          <p className="text-2xl font-black text-red-400">{failedCount.toLocaleString("pt-BR")}</p>
          <p className="text-xs text-neutral-600 mt-0.5">{(stats.FAILED?.totalLunes ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} LUNES</p>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
          <span className="text-yellow-400 font-bold text-sm">{selected.size} selecionado(s)</span>
          <span className="text-neutral-500 text-xs">
            ≈ {data?.claims
              .filter((c) => selected.has(c.id))
              .reduce((acc, c) => acc + c.lunesAmount, 0)
              .toLocaleString("pt-BR", { maximumFractionDigits: 2 })} LUNES
          </span>
          <div className="flex gap-2 ml-auto">
            <button
              onClick={() => setSelected(new Set())}
              className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleMarkFailed}
              disabled={markLoading}
              className="px-3 py-1.5 text-xs text-red-400 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 rounded-lg transition-colors"
            >
              Marcar Falhou
            </button>
            <button
              onClick={() => { setMarkDialogOpen(true); setMarkResult(null); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-black bg-yellow-500 hover:bg-yellow-400 rounded-lg transition-colors"
            >
              <Send className="w-3 h-3" />
              Marcar como Enviado
            </button>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {[
          { value: "", label: "Todos" },
          { value: "PENDING", label: "Pendente" },
          { value: "SENT", label: "Enviado" },
          { value: "FAILED", label: "Falhou" },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => handleFilterChange(f.value)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              filterStatus === f.value
                ? "bg-yellow-500 text-black"
                : "bg-neutral-800 text-neutral-400 hover:text-white"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Claims Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
          </div>
        ) : !data || data.claims.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-neutral-500 gap-2">
            <Gift className="w-8 h-8" />
            <p className="text-sm">Nenhum claim encontrado.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-800 text-neutral-500 text-xs uppercase tracking-wider">
                    <th className="px-4 py-3 text-left w-10">
                      <input
                        type="checkbox"
                        checked={selected.size > 0 && selected.size === pendingInView.length}
                        onChange={toggleSelectAll}
                        className="rounded border-neutral-700 bg-neutral-800"
                      />
                    </th>
                    <th className="px-4 py-3 text-left">Slot</th>
                    <th className="px-4 py-3 text-left">Usuário</th>
                    <th className="px-4 py-3 text-left">Carteira Lunes</th>
                    <th className="px-4 py-3 text-right">LUNES</th>
                    <th className="px-4 py-3 text-center">Verificação</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-left">TX Hash</th>
                    <th className="px-4 py-3 text-left">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {data.claims.map((claim) => {
                    const sc = STATUS_CONFIG[claim.distributionStatus] || STATUS_CONFIG.PENDING;
                    const Icon = sc.icon;
                    const isPending = claim.distributionStatus === "PENDING";
                    return (
                      <tr
                        key={claim.id}
                        className={cn(
                          "border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors",
                          selected.has(claim.id) && "bg-yellow-500/5"
                        )}
                      >
                        <td className="px-4 py-3">
                          {isPending && claim.activityVerified && !claim.isBanned && (
                            <input
                              type="checkbox"
                              checked={selected.has(claim.id)}
                              onChange={() => toggleSelect(claim.id)}
                              className="rounded border-neutral-700 bg-neutral-800"
                            />
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-neutral-400">#{claim.slotNumber.toLocaleString("pt-BR")}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-neutral-300 text-sm">
                            {claim.xUsername ? `@${claim.xUsername}` : <span className="text-neutral-600 italic">sem X</span>}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {claim.lunesWallet ? (
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs text-neutral-400 truncate max-w-[160px]" title={claim.lunesWallet}>
                                {claim.lunesWallet.slice(0, 8)}…{claim.lunesWallet.slice(-6)}
                              </span>
                              <button
                                onClick={() => copyToClipboard(claim.lunesWallet!, claim.id + "-wallet")}
                                className="p-0.5 rounded hover:bg-neutral-700 text-neutral-600 hover:text-white transition-colors flex-shrink-0"
                              >
                                {copiedId === claim.id + "-wallet" ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                              </button>
                            </div>
                          ) : (
                            <span className="text-red-400/70 text-xs flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              Não conectou
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-yellow-400">
                          {claim.lunesAmount.toLocaleString("pt-BR", { maximumFractionDigits: 4 })}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {claim.isBanned ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border text-red-400 bg-red-500/10 border-red-500/30" title="Usuário banido">
                              <Ban className="w-3 h-3" />
                              Banido
                            </span>
                          ) : claim.activityVerified ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border text-green-400 bg-green-500/10 border-green-500/30" title={`${claim.missionsCompleted} missões • ${claim.referralsQualified} referrals • Score: ${claim.totalScore}`}>
                              <ShieldCheck className="w-3 h-3" />
                              {claim.missionsCompleted}m {claim.referralsQualified}r
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border text-orange-400 bg-orange-500/10 border-orange-500/30" title={`Missões: ${claim.missionsCompleted} | Wallet: ${claim.lunesWallet ? 'Sim' : 'Não'}`}>
                              <ShieldAlert className="w-3 h-3" />
                              Não verificado
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border", sc.color)}>
                            <Icon className="w-3 h-3" />
                            {sc.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {claim.distributionTxHash ? (
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[11px] text-neutral-500 truncate max-w-[120px]">
                                {claim.distributionTxHash.slice(0, 10)}…
                              </span>
                              <button
                                onClick={() => copyToClipboard(claim.distributionTxHash!, claim.id + "-tx")}
                                className="p-0.5 rounded hover:bg-neutral-700 text-neutral-600 hover:text-white"
                              >
                                {copiedId === claim.id + "-tx" ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                              </button>
                            </div>
                          ) : (
                            <span className="text-neutral-700 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-neutral-600">
                          {claim.distributedAt
                            ? new Date(claim.distributedAt).toLocaleDateString("pt-BR")
                            : new Date(claim.claimedAt).toLocaleDateString("pt-BR")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data.pagination.pages > 1 && (
              <div className="flex items-center justify-between px-5 py-4 border-t border-neutral-800">
                <span className="text-xs text-neutral-500">
                  {((page - 1) * 50) + 1}–{Math.min(page * 50, data.pagination.total)} de {data.pagination.total.toLocaleString("pt-BR")}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 1}
                    className="p-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-400 disabled:opacity-30"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-neutral-400 px-2">
                    {page} / {data.pagination.pages}
                  </span>
                  <button
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page === data.pagination.pages}
                    className="p-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-400 disabled:opacity-30"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Mark as Sent Dialog */}
      <Dialog open={markDialogOpen} onOpenChange={setMarkDialogOpen}>
        <DialogContent className="bg-neutral-950 border-neutral-800 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-yellow-500" />
              Confirmar Distribuição
            </DialogTitle>
            <DialogDescription className="text-neutral-400">
              Marcar {selected.size} claim(s) como ENVIADO. Informe o hash da transação Lunes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-neutral-900 rounded-xl p-4 space-y-1">
              <p className="text-xs text-neutral-500">Claims selecionados</p>
              <p className="text-xl font-black text-white">{selected.size}</p>
              <p className="text-sm text-yellow-400 font-medium">
                ≈ {data?.claims
                  .filter((c) => selected.has(c.id))
                  .reduce((acc, c) => acc + c.lunesAmount, 0)
                  .toLocaleString("pt-BR", { maximumFractionDigits: 2 })} LUNES
              </p>
            </div>

            <div className="space-y-2">
              <Label>Hash da Transação Lunes</Label>
              <Input
                placeholder="0x... ou hash da tx"
                className="bg-neutral-900 border-neutral-800 font-mono text-xs"
                value={markTxHash}
                onChange={(e) => setMarkTxHash(e.target.value)}
              />
              <p className="text-xs text-neutral-600">
                Cole o hash após enviar os LUNES on-chain. Um único hash pode cobrir múltiplos recipients (batch).
              </p>
            </div>

            {markResult && (
              <div className={cn(
                "text-sm p-3 rounded-lg",
                markResult.startsWith("✓")
                  ? "bg-green-500/10 text-green-400 border border-green-500/30"
                  : "bg-red-500/10 text-red-400 border border-red-500/30"
              )}>
                {markResult}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMarkDialogOpen(false)}
              className="bg-neutral-800 border-neutral-700 hover:bg-neutral-700 text-white"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleMarkSent}
              disabled={markLoading || !markTxHash.trim()}
              className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold"
            >
              {markLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              Confirmar Envio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Info box */}
      <div className="flex items-start gap-3 p-4 bg-blue-900/10 border border-blue-500/20 rounded-xl text-blue-400">
        <Coins className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium">Fluxo de Distribuição</p>
          <ol className="list-decimal list-inside mt-1 space-y-0.5 text-blue-400/70 text-xs">
            <li>Selecione os claims PENDENTES (use o filtro + checkbox)</li>
            <li>Envie os LUNES na rede Lunes da carteira <strong>airdrop_distribution_lunes</strong></li>
            <li>Informe o TX hash e confirme aqui no painel</li>
            <li>Exporte o CSV para auditoria</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
