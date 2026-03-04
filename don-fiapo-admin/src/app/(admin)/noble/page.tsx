"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Crown,
  Users,
  DollarSign,
  Loader2,
  AlertCircle,
  CheckCircle,
  Shield,
  UserPlus,
  TrendingUp,
  Clock,
  Zap,
  Plus,
  Copy,
  Handshake,
} from "lucide-react";
import { getSession, AdminSession } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  NOBLE_STATUS_LABELS,
  COMMISSION_SPLIT,
  ACTIVATION_THRESHOLD,
  MAINTENANCE_THRESHOLD,
} from "@/lib/blockchain/noble-abi";
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

// ==================== Interfaces ====================

interface NobleConfig {
  activationThreshold: number;
  maintenanceThreshold: number;
  minWithdrawLunes: number;
  minWithdrawFiapo: number;
  payoutInterval: string;
  commissionSplit: { noble: string; commercial: string };
}

interface RevenueSourceInfo {
  source: string;
  description: string;
}

interface NobleEntry {
  id: string;
  name: string;
  email: string;
  tier: string;
  status: string;
  walletAddress: string;
  solanaWallet: string | null;
  referralCode: string | null;
  totalSales: number;
  totalReferrals: number;
  totalCommission: number;
  pendingCommission: number;
  salesCount: number;
  partner: { id: string; name: string; type: string; trackingCode: string | null } | null;
  createdAt: string;
}

interface NobleStats {
  total: number;
  active: number;
  probation: number;
  suspended: number;
}

interface NobleDashboardData {
  nobles: NobleEntry[];
  stats: NobleStats;
  configured: boolean;
  contractAddress: string;
  config: NobleConfig;
  revenueSources: RevenueSourceInfo[];
}

// ==================== Helpers ====================

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// ==================== Main Page ====================

export default function NoblePage() {
  const router = useRouter();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [data, setData] = useState<NobleDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"nobles" | "info">("nobles");

  // Create modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "", email: "", walletAddress: "", solanaWallet: "", tier: "Silver",
  });

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/noble");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("[Noble Page] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const currentSession = getSession();
    if (!currentSession) { router.push("/login"); return; }
    setSession(currentSession);
    fetchData();
  }, [router, fetchData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    try {
      const res = await fetch("/api/admin/noble", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setFormData({ name: "", email: "", walletAddress: "", solanaWallet: "", tier: "Silver" });
        setIsCreateOpen(false);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || "Falha ao criar Noble.");
      }
    } catch { alert("Erro ao criar Noble."); }
    finally { setCreateLoading(false); }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      const res = await fetch("/api/admin/noble", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) fetchData();
    } catch (err) { console.error("Error updating noble:", err); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
      </div>
    );
  }

  const config = data?.config;
  const configured = data?.configured || false;
  const nobles = data?.nobles || [];
  const stats = data?.stats || { total: 0, active: 0, probation: 0, suspended: 0 };
  const totalCommissions = nobles.reduce((s, n) => s + n.totalCommission, 0);
  const totalSales = nobles.reduce((s, n) => s + n.totalSales, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 rounded-xl ring-1 ring-yellow-500/30">
              <Crown className="w-6 h-6 text-yellow-500" />
            </div>
            Order of Nobles
          </h1>
          <p className="text-neutral-500 text-sm mt-1">
            Time Comercial • Afiliados Especiais • Comissões
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium",
            configured
              ? "bg-green-500/10 text-green-400 ring-1 ring-green-500/30"
              : "bg-red-500/10 text-red-400 ring-1 ring-red-500/30"
          )}>
            {configured ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
            {configured ? "Contrato" : "Sem Contrato"}
          </div>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-black font-medium rounded-lg hover:bg-yellow-400 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Novo Noble
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-xl p-4">
          <p className="text-neutral-500 text-xs">Total</p>
          <p className="text-2xl font-black text-white">{stats.total}</p>
        </div>
        <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-xl p-4">
          <p className="text-neutral-500 text-xs">Ativos</p>
          <p className="text-2xl font-black text-green-400">{stats.active}</p>
        </div>
        <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-xl p-4">
          <p className="text-neutral-500 text-xs">Probação</p>
          <p className="text-2xl font-black text-yellow-400">{stats.probation}</p>
        </div>
        <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-xl p-4">
          <p className="text-neutral-500 text-xs">Vendas Atribuídas</p>
          <p className="text-2xl font-black text-white">{formatCurrency(totalSales)}</p>
        </div>
        <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-xl p-4">
          <p className="text-neutral-500 text-xs">Comissões Geradas</p>
          <p className="text-2xl font-black text-green-400">{formatCurrency(totalCommissions)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setTab("nobles")} className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-colors", tab === "nobles" ? "bg-yellow-500 text-black" : "bg-neutral-800 text-neutral-400 hover:text-white")}>
          <Users className="w-4 h-4 inline mr-1.5" /> Nobles ({stats.total})
        </button>
        <button onClick={() => setTab("info")} className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-colors", tab === "info" ? "bg-yellow-500 text-black" : "bg-neutral-800 text-neutral-400 hover:text-white")}>
          <Shield className="w-4 h-4 inline mr-1.5" /> Como Funciona
        </button>
      </div>

      {/* === NOBLES TABLE TAB === */}
      {tab === "nobles" && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800 text-neutral-500 text-xs uppercase tracking-wider">
                <th className="text-left py-3 px-4">Noble</th>
                <th className="text-left py-3 px-4">Tier</th>
                <th className="text-left py-3 px-4">Código</th>
                <th className="text-left py-3 px-4">Vendas</th>
                <th className="text-left py-3 px-4">Comissão</th>
                <th className="text-left py-3 px-4">Parceiro</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="py-3 px-4">Ações</th>
              </tr>
            </thead>
            <tbody>
              {nobles.map((noble) => (
                <tr key={noble.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/20">
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium text-white">{noble.name}</p>
                      <p className="text-[10px] text-neutral-500">{noble.email}</p>
                      <p className="text-[10px] text-neutral-600 font-mono truncate max-w-[140px]">{noble.walletAddress}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={cn(
                      "px-2 py-0.5 text-xs font-bold rounded",
                      noble.tier === "Platinum" ? "bg-purple-500/10 text-purple-400" :
                      noble.tier === "Gold" ? "bg-yellow-500/10 text-yellow-400" :
                      "bg-neutral-700/30 text-neutral-300"
                    )}>
                      {noble.tier}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {noble.referralCode ? (
                      <button
                        onClick={() => navigator.clipboard.writeText(noble.referralCode!)}
                        className="flex items-center gap-1 text-xs font-mono bg-neutral-800 px-2 py-1 rounded hover:bg-neutral-700 text-yellow-400"
                      >
                        {noble.referralCode}
                        <Copy className="w-3 h-3 text-neutral-500" />
                      </button>
                    ) : <span className="text-neutral-600 text-xs">—</span>}
                  </td>
                  <td className="py-3 px-4">
                    <p className="text-white font-medium">{formatCurrency(noble.totalSales)}</p>
                    <p className="text-[10px] text-neutral-500">{noble.salesCount} vendas</p>
                  </td>
                  <td className="py-3 px-4">
                    <p className="text-green-400 font-medium">{formatCurrency(noble.totalCommission)}</p>
                    {noble.pendingCommission > 0 && (
                      <p className="text-[10px] text-yellow-400">{formatCurrency(noble.pendingCommission)} pendente</p>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {noble.partner ? (
                      <div className="flex items-center gap-1">
                        <Handshake className="w-3 h-3 text-blue-400" />
                        <span className="text-xs text-blue-400">{noble.partner.name}</span>
                      </div>
                    ) : <span className="text-neutral-600 text-xs">—</span>}
                  </td>
                  <td className="py-3 px-4">
                    <span className={cn(
                      "px-2 py-0.5 text-xs font-medium rounded ring-1",
                      NOBLE_STATUS_LABELS[noble.status]?.color || "text-neutral-400 bg-neutral-800 ring-neutral-700"
                    )}>
                      {NOBLE_STATUS_LABELS[noble.status]?.label || noble.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <select
                      className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-xs text-white outline-none"
                      value={noble.status}
                      onChange={(e) => handleStatusUpdate(noble.id, e.target.value)}
                    >
                      <option value="Active">Ativo</option>
                      <option value="Probation">Probação</option>
                      <option value="Suspended">Suspenso</option>
                      <option value="Removed">Removido</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {nobles.length === 0 && (
            <div className="py-12 text-center">
              <Crown className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
              <p className="text-neutral-400">Nenhum Noble cadastrado</p>
              <button onClick={() => setIsCreateOpen(true)} className="mt-3 text-yellow-500 text-sm hover:underline">
                + Cadastrar primeiro Noble
              </button>
            </div>
          )}
        </div>
      )}

      {/* === INFO TAB === */}
      {tab === "info" && (
        <div className="space-y-6">
          {!configured && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-400 text-sm font-medium">Contrato não configurado</p>
                <p className="text-neutral-500 text-xs mt-2">
                  Configure <code className="bg-neutral-800 px-1 rounded">NOBLE_CONTRACT</code> no arquivo <code className="bg-neutral-800 px-1 rounded">.env</code>
                </p>
              </div>
            </div>
          )}

          {/* How it works */}
          <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-yellow-500" />
              Como Funciona
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-500/10 rounded-lg ring-1 ring-blue-500/30">
                    <UserPlus className="w-4 h-4 text-blue-400" />
                  </div>
                  <h3 className="font-bold text-white text-sm">1. Cadastro</h3>
                </div>
                <p className="text-neutral-400 text-xs leading-relaxed">
                  Owner adiciona <strong className="text-white">Comerciais</strong>. Comerciais cadastram <strong className="text-white">Nobles</strong> com wallet Lunes e Solana. Noble recebe código de afiliado único.
                </p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-yellow-500/10 rounded-lg ring-1 ring-yellow-500/30">
                    <Zap className="w-4 h-4 text-yellow-400" />
                  </div>
                  <h3 className="font-bold text-white text-sm">2. Ativação</h3>
                </div>
                <p className="text-neutral-400 text-xs leading-relaxed">
                  Noble começa em <strong className="text-yellow-400">Probação</strong>. Precisa de <strong className="text-white">{ACTIVATION_THRESHOLD} referidos únicos</strong> para ativar. Manutenção anual: mínimo <strong className="text-white">{MAINTENANCE_THRESHOLD} referidos/ano</strong>.
                </p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-green-500/10 rounded-lg ring-1 ring-green-500/30">
                    <DollarSign className="w-4 h-4 text-green-400" />
                  </div>
                  <h3 className="font-bold text-white text-sm">3. Comissões</h3>
                </div>
                <p className="text-neutral-400 text-xs leading-relaxed">
                  Receita dividida: <strong className="text-white">{COMMISSION_SPLIT.noble}</strong> para Noble, <strong className="text-white">{COMMISSION_SPLIT.commercial}</strong> para Comercial. Pagamento a cada {config?.payoutInterval || "15 dias"}.
                </p>
              </div>
            </div>
          </div>

          {/* Status Types */}
          <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-yellow-500" />
              Status dos Nobles
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(NOBLE_STATUS_LABELS).map(([key, { label, color }]) => (
                <div key={key} className={cn("rounded-xl p-4 ring-1 text-center", color)}>
                  <span className="text-lg font-bold">{label}</span>
                  <p className="text-xs mt-1 opacity-70">
                    {key === "Active" && "Recebe comissões"}
                    {key === "Probation" && "Precisa de referidos"}
                    {key === "Suspended" && "Sem comissões"}
                    {key === "Removed" && "Desativado"}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Revenue Sources */}
          <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              Fontes de Receita
            </h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-neutral-500 text-xs uppercase tracking-wider border-b border-neutral-800">
                  <th className="text-left py-2 px-3">Fonte</th>
                  <th className="text-left py-2 px-3">Descrição</th>
                </tr>
              </thead>
              <tbody>
                {(data?.revenueSources || []).map((rs) => (
                  <tr key={rs.source} className="border-b border-neutral-800/50 hover:bg-neutral-800/20">
                    <td className="py-2.5 px-3 font-medium text-white">{rs.source}</td>
                    <td className="py-2.5 px-3 text-neutral-400">{rs.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Withdrawal Limits */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-bold text-white">Mín. Saque LUNES</span>
              </div>
              <div className="text-2xl font-black text-yellow-400">{config?.minWithdrawLunes || 10} LUNES</div>
            </div>
            <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-bold text-white">Mín. Saque FIAPO</span>
              </div>
              <div className="text-2xl font-black text-blue-400">{config?.minWithdrawFiapo || 1000} FIAPO</div>
            </div>
            <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-green-400" />
                <span className="text-sm font-bold text-white">Intervalo de Pagamento</span>
              </div>
              <div className="text-2xl font-black text-green-400">{config?.payoutInterval || "15 dias"}</div>
            </div>
          </div>
        </div>
      )}

      {/* Create Noble Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="bg-neutral-950 border-neutral-800 text-white sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Crown className="w-5 h-5 text-yellow-500" />
              Novo Noble
            </DialogTitle>
            <DialogDescription className="text-neutral-400">
              Cadastre um novo afiliado Noble. Um código de referral único será gerado automaticamente.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Nome</Label>
                <Input placeholder="Nome completo" className="bg-neutral-900 border-neutral-800" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input type="email" placeholder="email@exemplo.com" className="bg-neutral-900 border-neutral-800" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
              </div>
              <div className="grid gap-2">
                <Label>Wallet Lunes</Label>
                <Input placeholder="Endereço da wallet Lunes" className="bg-neutral-900 border-neutral-800 font-mono text-sm" value={formData.walletAddress} onChange={(e) => setFormData({ ...formData, walletAddress: e.target.value })} required />
              </div>
              <div className="grid gap-2">
                <Label>Wallet Solana (opcional)</Label>
                <Input placeholder="Endereço da wallet Solana" className="bg-neutral-900 border-neutral-800 font-mono text-sm" value={formData.solanaWallet} onChange={(e) => setFormData({ ...formData, solanaWallet: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Tier</Label>
                <select className="w-full px-4 py-2.5 bg-neutral-900 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-yellow-500 outline-none" value={formData.tier} onChange={(e) => setFormData({ ...formData, tier: e.target.value })}>
                  <option value="Silver">Silver</option>
                  <option value="Gold">Gold</option>
                  <option value="Platinum">Platinum</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" className="bg-neutral-800 border-neutral-700 text-white hover:bg-neutral-700" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold" disabled={createLoading}>
                {createLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Crown className="w-4 h-4 mr-2" />}
                Criar Noble
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
