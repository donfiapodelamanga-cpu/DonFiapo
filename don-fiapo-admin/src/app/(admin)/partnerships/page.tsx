"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Handshake,
  TrendingUp,
  Users,
  DollarSign,
  Plus,
  Download,
  AlertCircle,
  MoreVertical,
  Building2,
  Rocket,
  Wallet,
  Globe,
  Loader2,
  Megaphone,
  Crown,
  Copy,
  Link2,
  Shield,
  BookOpen,
  Zap,
  UserPlus,
} from "lucide-react";
import { getSession, hasPermission, AdminSession } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { exportToCSV } from "@/lib/export";
import { COMMISSION_SPLIT, REVENUE_SOURCES } from "@/lib/blockchain/noble-abi";
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

interface Partner {
  id: string;
  name: string;
  type: string;
  status: "active" | "inactive" | "pending";
  commission: string;
  commissionPct: number;
  revenue: number;
  sales: number;
  totalCommissionEarned: number;
  joinedAt: string;
  contact: string;
  trackingCode: string | null;
  influencerMeta: { platform?: string; handle?: string; followers?: number; niche?: string } | null;
  // Unified Noble fields
  walletLunes: string | null;
  walletSolana: string | null;
  tier: string | null;
  referralCode: string | null;
  // Legacy
  nobleId: string | null;
  noble: { id: string; name: string; tier: string; status: string; referralCode: string | null } | null;
}

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  icon: React.ReactNode;
  trend: "up" | "down" | "neutral";
}

function StatCard({ title, value, change, icon, trend }: StatCardProps) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-neutral-400 text-sm">{title}</p>
          <h3 className="text-2xl font-bold text-white mt-2">{value}</h3>
          <p
            className={cn(
              "text-sm mt-1",
              trend === "up" && "text-green-400",
              trend === "down" && "text-red-400",
              trend === "neutral" && "text-neutral-400"
            )}
          >
            {change}
          </p>
        </div>
        <div className="p-3 bg-yellow-500/10 rounded-lg ring-1 ring-yellow-500/50">
          {icon}
        </div>
      </div>
    </div>
  );
}

// All partner data comes from /api/admin/partners

const PARTNER_TYPES = [
  { id: "Exchange", icon: <Building2 className="w-4 h-4" /> },
  { id: "Marketing", icon: <Rocket className="w-4 h-4" /> },
  { id: "Integração", icon: <Wallet className="w-4 h-4" /> },
  { id: "Educação", icon: <Globe className="w-4 h-4" /> },
  { id: "Marketplace", icon: <Handshake className="w-4 h-4" /> },
  { id: "DeFi", icon: <TrendingUp className="w-4 h-4" /> },
  { id: "Influenciador", icon: <Megaphone className="w-4 h-4" /> },
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatNumber(value: number): string {
  if (value >= 1000000) {
    return (value / 1000000).toFixed(1) + "M";
  }
  if (value >= 1000) {
    return (value / 1000).toFixed(1) + "K";
  }
  return value.toString();
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getStatusBadgeColor(status: string): string {
  switch (status) {
    case "active":
      return "bg-green-500/10 text-green-400 border-green-500/50";
    case "inactive":
      return "bg-red-500/10 text-red-400 border-red-500/50";
    case "pending":
      return "bg-yellow-500/10 text-yellow-400 border-yellow-500/50";
    default:
      return "bg-neutral-500/10 text-neutral-400 border-neutral-500/50";
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "active":
      return "Ativo";
    case "inactive":
      return "Inativo";
    case "pending":
      return "Pendente";
    default:
      return status;
  }
}

function getTypeIcon(type: string) {
  const typeInfo = PARTNER_TYPES.find((t) => t.id === type);
  return typeInfo?.icon || <Handshake className="w-4 h-4" />;
}

export default function PartnershipsPage() {
  const router = useRouter();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [tab, setTab] = useState<"parceiros" | "info">("parceiros");

  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "Exchange",
    commission: "12%",
    contact: "",
    walletLunes: "",
    walletSolana: "",
    tier: "Silver",
    influencerMeta: { platform: "", handle: "", followers: 0, niche: "" },
  });

  useEffect(() => {
    const currentSession = getSession();
    if (!currentSession) {
      router.push("/login");
      return;
    }
    if (!hasPermission(currentSession, "partnerships") && !hasPermission(currentSession, "sales")) {
      router.push("/dashboard?error=unauthorized");
      return;
    }
    setSession(currentSession);
    fetchPartners();
  }, [router]);

  const fetchPartners = async () => {
    try {
      const res = await fetch("/api/admin/partners");
      if (res.ok) {
        const data = await res.json();
        setPartners(data);
      }
    } catch (error) {
      console.error("Error fetching partners:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "", type: "Exchange", commission: "12%", contact: "",
      walletLunes: "", walletSolana: "", tier: "Silver",
      influencerMeta: { platform: "", handle: "", followers: 0, niche: "" },
    });
  };

  const handleCreatePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);

    try {
      const payload: Record<string, unknown> = {
        name: formData.name,
        type: formData.type,
        commission: formData.commission,
        contact: formData.contact,
        walletLunes: formData.walletLunes || null,
        walletSolana: formData.walletSolana || null,
        tier: formData.tier,
      };
      if (formData.type === "Influenciador") payload.influencerMeta = formData.influencerMeta;

      const res = await fetch("/api/admin/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        resetForm();
        setIsCreateModalOpen(false);
        fetchPartners();
      } else {
        const err = await res.json();
        alert(err.error || "Falha ao criar parceiro.");
      }
    } catch (error) {
      console.error("Error creating partner:", error);
      alert("Erro ao criar parceiro.");
    } finally {
      setCreateLoading(false);
    }
  };

  const copyTrackingCode = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  const filteredPartners = partners.filter((partner) => {
    const matchesStatus = filterStatus === "all" || partner.status === filterStatus;
    const matchesType = filterType === "all" || partner.type === filterType;
    return matchesStatus && matchesType;
  });

  const activePartners = partners.filter((p) => p.status === "active").length;
  const totalRevenue = partners.reduce((acc, p) => acc + p.revenue, 0);
  const totalSales = partners.reduce((acc, p) => acc + p.sales, 0);

  if (!session) {
    return null;
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 rounded-xl ring-1 ring-yellow-500/20">
              <Handshake className="w-7 h-7 text-yellow-500" />
            </div>
            Parceiros
          </h1>
          <p className="text-neutral-400 mt-2">
            Gerencie parceiros comerciais • NFT ICO: <strong className="text-yellow-400">{COMMISSION_SPLIT.parceiro}</strong> Parceiro + <strong className="text-green-400">{COMMISSION_SPLIT.comercial}</strong> Comercial
            <span className="text-neutral-600 ml-1">(Comercial só recebe da venda de NFTs)</span>
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => exportToCSV(partners, "parceiros", {
              name: "Nome",
              type: "Tipo",
              status: "Status",
              commission: "Comissão",
              revenue: "Receita",
              sales: "Vendas",
              joinedAt: "Data Cadastro",
              contact: "Contato"
            })}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-800 text-white font-medium rounded-lg hover:bg-neutral-700 transition-colors">
            <Download className="w-5 h-5" />
            Exportar
          </button>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-black font-medium rounded-lg hover:bg-yellow-400 transition-colors">
            <Plus className="w-5 h-5" />
            Novo Parceiro
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Parceiros Ativos"
          value={activePartners.toString()}
          change={`${partners.length} total`}
          icon={<Users className="w-6 h-6 text-yellow-500" />}
          trend="neutral"
        />
        <StatCard
          title="Receita Total"
          value={formatCurrency(totalRevenue)}
          change={`De ${partners.length} parceiros`}
          icon={<DollarSign className="w-6 h-6 text-yellow-500" />}
          trend={totalRevenue > 0 ? "up" : "neutral"}
        />
        <StatCard
          title="Vendas Indicadas"
          value={formatNumber(totalSales)}
          change={`${partners.filter(p => p.type === "Influenciador").length} influenciadores`}
          icon={<TrendingUp className="w-6 h-6 text-yellow-500" />}
          trend={totalSales > 0 ? "up" : "neutral"}
        />
        <StatCard
          title="Ticket Médio"
          value={totalSales > 0 ? formatCurrency(totalRevenue / totalSales) : "R$ 0,00"}
          change={totalSales > 0 ? `${totalSales} vendas` : "Nenhuma venda"}
          icon={<Handshake className="w-6 h-6 text-yellow-500" />}
          trend={totalSales > 0 ? "up" : "neutral"}
        />
      </div>

      {/* Top Partners */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 mb-8">
        <h3 className="text-lg font-bold text-white mb-6">Top Parceiros - Receita</h3>
        <div className="space-y-4">
          {(() => {
            const sorted = [...partners].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
            const maxRev = sorted[0]?.revenue || 1;
            return sorted.map((partner, index) => (
              <div key={partner.id} className="flex items-center gap-4">
                <span className="w-8 h-8 flex items-center justify-center bg-neutral-800 text-white text-sm font-medium rounded-lg">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm">{partner.name}</span>
                      {partner.type === "Influenciador" && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 ring-1 ring-purple-500/30">Influencer</span>
                      )}
                      {partner.noble && (
                        <Crown className="w-3 h-3 text-yellow-500" />
                      )}
                    </div>
                    <span className="text-yellow-500 font-medium">
                      {formatCurrency(partner.revenue)}
                    </span>
                  </div>
                  <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-500 rounded-full"
                      style={{
                        width: `${Math.max(2, (partner.revenue / maxRev) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ));
          })()}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex gap-3">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2.5 bg-neutral-900 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 outline-none transition-all"
          >
            <option value="all">Todos os tipos</option>
            <option value="Exchange">Exchange</option>
            <option value="Marketing">Marketing</option>
            <option value="Integração">Integração</option>
            <option value="Educação">Educação</option>
            <option value="Marketplace">Marketplace</option>
            <option value="DeFi">DeFi</option>
            <option value="Influenciador">Influenciador</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 bg-neutral-900 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 outline-none transition-all"
          >
            <option value="all">Todos os status</option>
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
            <option value="pending">Pendente</option>
          </select>
        </div>
      </div>

      {/* Partners Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-800">
              <th className="text-left py-4 px-6 text-sm font-medium text-neutral-400">
                Parceiro
              </th>
              <th className="text-left py-4 px-6 text-sm font-medium text-neutral-400">
                Tipo
              </th>
              <th className="text-left py-4 px-6 text-sm font-medium text-neutral-400">
                Tracking
              </th>
              <th className="text-left py-4 px-6 text-sm font-medium text-neutral-400">
                Comissão
              </th>
              <th className="text-left py-4 px-6 text-sm font-medium text-neutral-400">
                Receita Gerada
              </th>
              <th className="text-left py-4 px-6 text-sm font-medium text-neutral-400">
                Vendas
              </th>
              <th className="text-left py-4 px-6 text-sm font-medium text-neutral-400">
                Tier / Wallet
              </th>
              <th className="text-left py-4 px-6 text-sm font-medium text-neutral-400">
                Status
              </th>
              <th className="py-4 px-6"></th>
            </tr>
          </thead>
          <tbody>
            {filteredPartners.map((partner) => (
              <tr
                key={partner.id}
                className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors"
              >
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center",
                      partner.type === "Influenciador" ? "bg-purple-500/20" : "bg-yellow-500/20"
                    )}>
                      <span className={cn(
                        "font-bold text-sm",
                        partner.type === "Influenciador" ? "text-purple-400" : "text-yellow-500"
                      )}>
                        {partner.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-white">{partner.name}</p>
                      <p className="text-xs text-neutral-500">{partner.contact}</p>
                      {partner.influencerMeta && (
                        <p className="text-[10px] text-purple-400 mt-0.5">
                          {partner.influencerMeta.platform} • {partner.influencerMeta.handle}
                          {partner.influencerMeta.followers ? ` • ${formatNumber(partner.influencerMeta.followers)} seg.` : ""}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <span className={cn(
                    "px-2.5 py-1 text-xs font-medium rounded-full flex items-center gap-1 w-fit",
                    partner.type === "Influenciador"
                      ? "bg-purple-500/10 text-purple-300 ring-1 ring-purple-500/30"
                      : "bg-neutral-800 text-neutral-300"
                  )}>
                    {getTypeIcon(partner.type)}
                    {partner.type}
                  </span>
                </td>
                <td className="py-4 px-6">
                  {partner.trackingCode ? (
                    <button
                      onClick={() => copyTrackingCode(partner.trackingCode!)}
                      className="flex items-center gap-1.5 text-xs font-mono bg-neutral-800 px-2 py-1 rounded hover:bg-neutral-700 transition-colors text-neutral-300"
                      title="Clique para copiar"
                    >
                      <Link2 className="w-3 h-3 text-yellow-500" />
                      {partner.trackingCode}
                      <Copy className="w-3 h-3 text-neutral-500" />
                    </button>
                  ) : (
                    <span className="text-neutral-600 text-xs">—</span>
                  )}
                </td>
                <td className="py-4 px-6 text-white font-medium">
                  {partner.commission}
                </td>
                <td className="py-4 px-6">
                  <span className="text-green-400 font-medium">
                    {formatCurrency(partner.revenue)}
                  </span>
                </td>
                <td className="py-4 px-6 text-white">
                  {formatNumber(partner.sales)}
                </td>
                <td className="py-4 px-6">
                  <div className="space-y-1">
                    {(partner.tier || partner.noble?.tier) && (
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded",
                        (partner.tier || partner.noble?.tier) === "Platinum" ? "bg-purple-500/10 text-purple-400" :
                        (partner.tier || partner.noble?.tier) === "Gold" ? "bg-yellow-500/10 text-yellow-400" :
                        "bg-neutral-700/30 text-neutral-300"
                      )}>
                        <Crown className="w-3 h-3" />
                        {partner.tier || partner.noble?.tier}
                      </span>
                    )}
                    {(partner.walletLunes || partner.noble?.referralCode) && (
                      <p className="text-[10px] text-neutral-500 font-mono truncate max-w-[120px]">
                        {partner.walletLunes?.slice(0, 8) || partner.referralCode || partner.noble?.referralCode}…
                      </p>
                    )}
                    {!partner.tier && !partner.noble?.tier && (
                      <span className="text-neutral-600 text-xs">—</span>
                    )}
                  </div>
                </td>
                <td className="py-4 px-6">
                  <span
                    className={cn(
                      "px-2.5 py-1 text-xs font-medium rounded-full border",
                      getStatusBadgeColor(partner.status)
                    )}
                  >
                    {getStatusLabel(partner.status)}
                  </span>
                </td>
                <td className="py-4 px-6">
                  <button className="p-2 hover:bg-neutral-800 rounded-lg transition-colors">
                    <MoreVertical className="w-5 h-5 text-neutral-400" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredPartners.length === 0 && (
          <div className="py-12 text-center">
            <Handshake className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
            <p className="text-neutral-400">Nenhum parceiro encontrado</p>
          </div>
        )}
      </div>

      {/* Revenue Sources Table */}
      <div className="mt-6 bg-neutral-900/40 border border-neutral-800/50 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-500" />
          Fontes de Receita & Comissões
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-neutral-500 text-xs uppercase tracking-wider border-b border-neutral-800">
                <th className="text-left py-2.5 px-3">Fonte de Receita</th>
                <th className="text-left py-2.5 px-3">Taxa / Valor</th>
                <th className="text-center py-2.5 px-3">Parceiro</th>
                <th className="text-center py-2.5 px-3">Comercial</th>
                <th className="text-left py-2.5 px-3">Distribuição</th>
              </tr>
            </thead>
            <tbody>
              {REVENUE_SOURCES.map((rs) => (
                <tr key={rs.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/20">
                  <td className="py-2.5 px-3 font-medium text-white">{rs.source}</td>
                  <td className="py-2.5 px-3 text-neutral-400 font-mono text-xs">{rs.taxa}</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-yellow-500/10 text-yellow-400">
                      {rs.parceiroPct}%
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {rs.comercialPct > 0 ? (
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-500/10 text-green-400">
                        {rs.comercialPct}%
                      </span>
                    ) : (
                      <span className="text-neutral-600 text-xs">—</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-neutral-500 text-xs">{rs.split}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-start gap-2 mt-4 pt-3 border-t border-neutral-800/50">
          <AlertCircle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
          <p className="text-xs text-orange-300/80">
            <strong>Importante:</strong> O time Comercial (pessoa que trouxe o parceiro) <strong>só recebe comissão da venda de NFTs (ICO)</strong>.
            Nas demais fontes, apenas o Parceiro recebe sua porcentagem. As comissões são calculadas automaticamente pelo smart contract.
          </p>
        </div>
      </div>

      {/* Create Partner Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="bg-neutral-950 border-neutral-800 text-white sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Handshake className="w-5 h-5 text-yellow-500" />
              Novo Parceiro
            </DialogTitle>
            <DialogDescription className="text-neutral-400">
              Cadastre um novo parceiro. Comissão: {COMMISSION_SPLIT.parceiro} Parceiro / {COMMISSION_SPLIT.comercial} Equipe Comercial.
              Um código de tracking será gerado automaticamente.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreatePartner}>
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-1">
              <div className="grid gap-2">
                <Label className="text-neutral-300">Nome do Parceiro *</Label>
                <Input
                  placeholder="Ex: Crypto Exchange Brasil"
                  className="bg-neutral-900 border-neutral-700 text-white placeholder:text-neutral-600"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className="text-neutral-300">Tipo *</Label>
                  <select
                    className="w-full px-4 py-2.5 bg-neutral-900 border border-neutral-700 rounded-lg text-white focus:ring-1 focus:ring-yellow-500 outline-none"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  >
                    <option value="Exchange">Exchange</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Integração">Integração</option>
                    <option value="Educação">Educação</option>
                    <option value="Marketplace">Marketplace</option>
                    <option value="DeFi">DeFi</option>
                    <option value="Influenciador">Influenciador</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label className="text-neutral-300 flex items-center gap-1">
                    <Crown className="w-3.5 h-3.5 text-yellow-500" />
                    Tier
                  </Label>
                  <select
                    className="w-full px-4 py-2.5 bg-neutral-900 border border-neutral-700 rounded-lg text-white focus:ring-1 focus:ring-yellow-500 outline-none"
                    value={formData.tier}
                    onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                  >
                    <option value="Silver">Silver</option>
                    <option value="Gold">Gold</option>
                    <option value="Platinum">Platinum</option>
                  </select>
                </div>
              </div>

              {formData.type === "Influenciador" && (
                <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                    <Megaphone className="w-3.5 h-3.5" />
                    Dados do Influenciador
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1">
                      <Label className="text-xs text-neutral-400">Plataforma</Label>
                      <select
                        className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white text-sm focus:ring-1 focus:ring-purple-500 outline-none"
                        value={formData.influencerMeta.platform}
                        onChange={(e) => setFormData({ ...formData, influencerMeta: { ...formData.influencerMeta, platform: e.target.value } })}
                      >
                        <option value="">Selecione</option>
                        <option value="youtube">YouTube</option>
                        <option value="instagram">Instagram</option>
                        <option value="tiktok">TikTok</option>
                        <option value="twitter">Twitter/X</option>
                        <option value="twitch">Twitch</option>
                      </select>
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs text-neutral-400">Handle / @</Label>
                      <Input
                        placeholder="@usuario"
                        className="bg-neutral-900 border-neutral-700 text-white text-sm placeholder:text-neutral-600"
                        value={formData.influencerMeta.handle}
                        onChange={(e) => setFormData({ ...formData, influencerMeta: { ...formData.influencerMeta, handle: e.target.value } })}
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs text-neutral-400">Seguidores</Label>
                      <Input
                        type="number"
                        placeholder="50000"
                        className="bg-neutral-900 border-neutral-700 text-white text-sm placeholder:text-neutral-600"
                        value={formData.influencerMeta.followers || ""}
                        onChange={(e) => setFormData({ ...formData, influencerMeta: { ...formData.influencerMeta, followers: parseInt(e.target.value) || 0 } })}
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs text-neutral-400">Nicho</Label>
                      <Input
                        placeholder="crypto, games..."
                        className="bg-neutral-900 border-neutral-700 text-white text-sm placeholder:text-neutral-600"
                        value={formData.influencerMeta.niche}
                        onChange={(e) => setFormData({ ...formData, influencerMeta: { ...formData.influencerMeta, niche: e.target.value } })}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className="text-neutral-300">Comissão Total</Label>
                  <Input
                    placeholder="Ex: 12%"
                    className="bg-neutral-900 border-neutral-700 text-white placeholder:text-neutral-600"
                    value={formData.commission}
                    onChange={(e) => setFormData({ ...formData, commission: e.target.value })}
                    required
                  />
                  <p className="text-[10px] text-neutral-600">Split: {COMMISSION_SPLIT.parceiro} parceiro + {COMMISSION_SPLIT.comercial} comercial</p>
                </div>
                <div className="grid gap-2">
                  <Label className="text-neutral-300">Email de Contato *</Label>
                  <Input
                    type="email"
                    placeholder="contato@parceiro.com"
                    className="bg-neutral-900 border-neutral-700 text-white placeholder:text-neutral-600"
                    value={formData.contact}
                    onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Wallet fields */}
              <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4 space-y-3">
                <p className="text-xs font-bold text-yellow-400 flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5" />
                  Carteiras de Pagamento (Comissão)
                </p>
                <div className="grid gap-3">
                  <div className="grid gap-1">
                    <Label className="text-xs text-neutral-400">Wallet Lunes (para receber comissão)</Label>
                    <Input
                      placeholder="Endereço Lunes do parceiro"
                      className="bg-neutral-900 border-neutral-700 text-white font-mono text-sm placeholder:text-neutral-600"
                      value={formData.walletLunes}
                      onChange={(e) => setFormData({ ...formData, walletLunes: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs text-neutral-400">Wallet Solana (opcional)</Label>
                    <Input
                      placeholder="Endereço Solana do parceiro"
                      className="bg-neutral-900 border-neutral-700 text-white font-mono text-sm placeholder:text-neutral-600"
                      value={formData.walletSolana}
                      onChange={(e) => setFormData({ ...formData, walletSolana: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="bg-neutral-800 border-neutral-700 text-white hover:bg-neutral-700"
                onClick={() => setIsCreateModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold"
                disabled={createLoading}
              >
                {createLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Criar Parceiro
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
