"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Users,
    LogOut,
    Plus,
    Search,
    Loader2,
    TrendingUp,
    DollarSign,
    ArrowUpRight,
    ArrowDownRight,
    AlertCircle,
    ShoppingCart,
    Target,
    Handshake,
    ArrowLeftRight,
    BarChart3,
    Megaphone,
    Wallet
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface Noble {
    id: string;
    name: string;
    email: string;
    tier: string;
    status: string;
    walletAddress: string;
    totalSales: number;
    referralCode?: string;
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

export default function Dashboard() {
    const router = useRouter();
    const [nobles, setNobles] = useState<Noble[]>([]);
    const [sales, setSales] = useState<any[]>([]);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [partners, setPartners] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Create Modal State
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [createLoading, setCreateLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        walletAddress: "",
        tier: "Silver"
    });

    const fetchAllData = async () => {
        const key = localStorage.getItem("don_admin_key");
        if (!key) return;
        
        try {
            // Fetch nobles
            const noblesRes = await fetch("/api/admin/noble", {
                headers: { "x-admin-key": key }
            });
            if (noblesRes.ok) {
                const noblesData = await noblesRes.json();
                const normalizedNobles = Array.isArray(noblesData)
                    ? noblesData
                    : Array.isArray(noblesData?.nobles)
                        ? noblesData.nobles
                        : [];
                setNobles(normalizedNobles);
            } else {
                console.error("[Dashboard] Nobles API error:", noblesRes.status);
            }

            // Fetch sales
            const salesRes = await fetch("/api/admin/sales");
            if (salesRes.ok) {
                const salesData = await salesRes.json();
                setSales(salesData);
            } else {
                console.error("[Dashboard] Sales API error:", salesRes.status);
            }

            // Fetch transactions
            const transRes = await fetch("/api/admin/transactions");
            if (transRes.ok) {
                const transData = await transRes.json();
                setTransactions(transData);
            } else {
                console.error("[Dashboard] Transactions API error:", transRes.status);
            }

            // Fetch campaigns
            const campRes = await fetch("/api/admin/campaigns");
            if (campRes.ok) {
                const campData = await campRes.json();
                setCampaigns(campData);
            } else {
                console.error("[Dashboard] Campaigns API error:", campRes.status);
            }

            // Fetch partners
            const partnersRes = await fetch("/api/admin/partners");
            if (partnersRes.ok) {
                const partnersData = await partnersRes.json();
                setPartners(partnersData);
            } else {
                console.error("[Dashboard] Partners API error:", partnersRes.status);
            }
        } catch (e) { 
            console.error("[Dashboard] Fetch error:", e);
        }
        setLoading(false);
    };

    useEffect(() => {
        const key = localStorage.getItem("don_admin_key");
        if (!key) {
            router.push("/login");
            return;
        }
        fetchAllData();
    }, [router]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateLoading(true);
        const key = localStorage.getItem("don_admin_key");

        try {
            const res = await fetch("/api/admin/noble", {
                method: "POST",
                headers: {
                    "x-admin-key": key || "",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                setFormData({ name: "", email: "", walletAddress: "", tier: "Silver" });
                setIsCreateOpen(false);
                fetchAllData();
            } else {
                alert("Failed to create noble. Check console.");
            }
        } catch (err) {
            console.error(err);
            alert("Error creating noble.");
        } finally {
            setCreateLoading(false);
        }
    };

    if (loading) return <div className="p-10 text-white">Loading Admin Panel...</div>;

    return (
        <div className="p-8 space-y-10">
            {/* Page Header */}
            <div className="flex items-start justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Dashboard</h1>
                    <p className="text-neutral-400 mt-2">
                        Visão geral do sistema e principais métricas
                    </p>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-yellow-500 text-black hover:bg-yellow-400 font-medium">
                            <Plus className="w-4 h-4 mr-2" /> Add Noble
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-neutral-900 border-neutral-800 text-white sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Add New Noble</DialogTitle>
                            <DialogDescription className="text-neutral-400">
                                Register a new influencer/partner to the platform.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Full Name</Label>
                                <Input
                                    id="name"
                                    className="bg-neutral-950 border-neutral-800 text-white"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email" type="email"
                                    className="bg-neutral-950 border-neutral-800 text-white"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="wallet">Wallet Address (Lunes)</Label>
                                <Input
                                    id="wallet"
                                    className="bg-neutral-950 border-neutral-800 text-white font-mono"
                                    placeholder="5..."
                                    value={formData.walletAddress}
                                    onChange={e => setFormData({ ...formData, walletAddress: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="tier">Initial Tier</Label>
                                <select
                                    id="tier"
                                    className="flex h-10 w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                    value={formData.tier}
                                    onChange={e => setFormData({ ...formData, tier: e.target.value })}
                                >
                                    <option value="Silver">Silver</option>
                                    <option value="Gold">Gold</option>
                                    <option value="Platinum">Platinum</option>
                                </select>
                            </div>
                            <DialogFooter className="pt-4">
                                <Button type="submit" className="bg-yellow-500 text-black hover:bg-yellow-400 w-full" disabled={createLoading}>
                                    {createLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Create Noble"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <StatCard
                    title="Total de Vendas"
                    value={sales.length.toString()}
                    change={`R$ ${sales.reduce((acc, s) => acc + (s.amount || 0), 0).toLocaleString('pt-BR')}`}
                    icon={<ShoppingCart className="h-6 w-6 text-yellow-500" />}
                    trend="up"
                />
                <StatCard
                    title="Total Nobles"
                    value={nobles.length.toString()}
                    change="Afiliados especiais"
                    icon={<Users className="h-6 w-6 text-yellow-500" />}
                    trend="neutral"
                />
                <StatCard
                    title="Campanhas Ativas"
                    value={campaigns.filter((c: any) => c.status === 'active').length.toString()}
                    change={`de ${campaigns.length} total`}
                    icon={<Target className="h-6 w-6 text-yellow-500" />}
                    trend="up"
                />
                <StatCard
                    title="Parceiros"
                    value={partners.length.toString()}
                    change={`${partners.filter((p: any) => p.status === 'active').length} ativos`}
                    icon={<Handshake className="h-6 w-6 text-yellow-500" />}
                    trend="up"
                />
            </div>

            {/* Second Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <StatCard
                    title="Volume Financeiro"
                    value={`R$ ${transactions.reduce((acc, t) => acc + (t.amount || 0), 0).toLocaleString('pt-BR')}`}
                    change="Total em transações"
                    icon={<DollarSign className="h-6 w-6 text-yellow-500" />}
                    trend="up"
                />
                <StatCard
                    title="Transações"
                    value={transactions.length.toString()}
                    change={`${transactions.filter((t: any) => t.status === 'completed').length} concluídas`}
                    icon={<ArrowLeftRight className="h-6 w-6 text-yellow-500" />}
                    trend="up"
                />
                <StatCard
                    title="Ticket Médio"
                    value={sales.length > 0 ? `R$ ${Math.round(sales.reduce((acc, s) => acc + (s.amount || 0), 0) / sales.length).toLocaleString('pt-BR')}` : 'R$ 0'}
                    change="Por venda"
                    icon={<TrendingUp className="h-6 w-6 text-yellow-500" />}
                    trend="neutral"
                />
            </div>

            {/* Nobles Table */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden mt-10">
                <div className="p-8 border-b border-neutral-800 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold text-white">Noble Management</h3>
                        <p className="text-sm text-neutral-400">Overview of registered partners.</p>
                    </div>
                </div>

                <div className="p-6 border-b border-neutral-800">
                    <div className="flex items-center max-w-md bg-neutral-950 rounded-lg border border-neutral-800 px-4 py-3">
                        <Search className="w-5 h-5 text-neutral-500 mr-3" />
                        <Input placeholder="Search nobles..." className="bg-transparent border-0 text-white focus-visible:ring-0 focus-visible:ring-offset-0 px-0" />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-neutral-950 text-neutral-400 uppercase font-medium">
                        <tr className="border-b border-neutral-800">
                                <th className="px-8 py-5">Name</th>
                                <th className="px-8 py-5">Status</th>
                                <th className="px-8 py-5">Tier</th>
                                <th className="px-8 py-5">Referral Code</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-800">
                            {nobles.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-8 py-12 text-center text-neutral-500">
                                        No nobles found. Add one to get started.
                                    </td>
                                </tr>
                            ) : (
                                nobles.map((noble) => (
                                    <tr key={noble.id} className="hover:bg-neutral-800/50 transition-colors border-b border-neutral-800/50 last:border-0">
                                        <td className="px-8 py-5">
                                            <div className="font-medium text-white">{noble.name}</div>
                                            <div className="text-xs text-neutral-500 mt-1">{noble.email}</div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <Badge variant="outline" className="border-green-500/20 bg-green-500/10 text-green-500">
                                                {noble.status}
                                            </Badge>
                                        </td>
                                        <td className="px-8 py-5 text-yellow-500 font-medium">{noble.tier}</td>
                                        <td className="px-8 py-5 font-mono text-neutral-400">
                                            {noble.referralCode || "-"}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Sales & Transactions Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-10">
                {/* Recent Sales */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
                    <div className="p-8 border-b border-neutral-800 flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <ShoppingCart className="w-5 h-5 text-yellow-500" />
                                Vendas Recentes
                            </h3>
                            <p className="text-sm text-neutral-400">Últimas vendas registradas</p>
                        </div>
                        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                            {sales.length} total
                        </Badge>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-neutral-950 text-neutral-400 uppercase font-medium">
                                <tr className="border-b border-neutral-800">
                                    <th className="px-6 py-4">Produto</th>
                                    <th className="px-6 py-4">Cliente</th>
                                    <th className="px-6 py-4">Valor</th>
                                    <th className="px-6 py-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-800">
                                {sales.slice(0, 5).length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-10 text-center text-neutral-500">
                                            Nenhuma venda encontrada.
                                        </td>
                                    </tr>
                                ) : (
                                    sales.slice(0, 5).map((sale: any) => (
                                        <tr key={sale.id} className="hover:bg-neutral-800/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-white">{sale.product}</div>
                                                <div className="text-xs text-neutral-500 mt-1">{sale.channel}</div>
                                            </td>
                                            <td className="px-6 py-4 text-neutral-400">{sale.customer}</td>
                                            <td className="px-6 py-4 text-yellow-500 font-medium">
                                                R$ {(sale.amount || 0).toLocaleString('pt-BR')}
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant="outline" className={cn(
                                                    "border",
                                                    sale.status === 'completed' 
                                                        ? "border-green-500/20 bg-green-500/10 text-green-500"
                                                        : "border-yellow-500/20 bg-yellow-500/10 text-yellow-500"
                                                )}>
                                                    {sale.status === 'completed' ? 'Concluído' : 'Pendente'}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Recent Transactions */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
                    <div className="p-8 border-b border-neutral-800 flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <ArrowLeftRight className="w-5 h-5 text-yellow-500" />
                                Transações Recentes
                            </h3>
                            <p className="text-sm text-neutral-400">Últimas movimentações</p>
                        </div>
                        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                            {transactions.length} total
                        </Badge>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-neutral-950 text-neutral-400 uppercase font-medium">
                                <tr className="border-b border-neutral-800">
                                    <th className="px-6 py-4">Tipo</th>
                                    <th className="px-6 py-4">Descrição</th>
                                    <th className="px-6 py-4">Valor</th>
                                    <th className="px-6 py-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-800">
                                {transactions.slice(0, 5).length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-10 text-center text-neutral-500">
                                            Nenhuma transação encontrada.
                                        </td>
                                    </tr>
                                ) : (
                                    transactions.slice(0, 5).map((trans: any) => (
                                        <tr key={trans.id} className="hover:bg-neutral-800/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <Badge variant="outline" className={cn(
                                                    "border",
                                                    trans.type === 'deposit'
                                                        ? "border-green-500/20 bg-green-500/10 text-green-500"
                                                        : trans.type === 'withdrawal'
                                                        ? "border-red-500/20 bg-red-500/10 text-red-500"
                                                        : "border-blue-500/20 bg-blue-500/10 text-blue-500"
                                                )}>
                                                    {trans.type === 'deposit' ? 'Depósito' : trans.type === 'withdrawal' ? 'Saque' : 'Transferência'}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 text-neutral-400">{trans.description || '-'}</td>
                                            <td className="px-6 py-4 font-medium">
                                                <span className={trans.type === 'deposit' ? 'text-green-500' : trans.type === 'withdrawal' ? 'text-red-500' : 'text-white'}>
                                                    {trans.type === 'deposit' ? '+' : trans.type === 'withdrawal' ? '-' : ''}
                                                    R$ {(trans.amount || 0).toLocaleString('pt-BR')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant="outline" className={cn(
                                                    "border",
                                                    trans.status === 'completed'
                                                        ? "border-green-500/20 bg-green-500/10 text-green-500"
                                                        : "border-yellow-500/20 bg-yellow-500/10 text-yellow-500"
                                                )}>
                                                    {trans.status === 'completed' ? 'Concluído' : 'Pendente'}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Campaigns & Partners Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-10">
                {/* Active Campaigns */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
                    <div className="p-8 border-b border-neutral-800 flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Megaphone className="w-5 h-5 text-yellow-500" />
                                Campanhas de Marketing
                            </h3>
                            <p className="text-sm text-neutral-400">Campanhas ativas e recentes</p>
                        </div>
                        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                            {campaigns.filter((c: any) => c.status === 'active').length} ativas
                        </Badge>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-neutral-950 text-neutral-400 uppercase font-medium">
                                <tr className="border-b border-neutral-800">
                                    <th className="px-6 py-4">Campanha</th>
                                    <th className="px-6 py-4">Tipo</th>
                                    <th className="px-6 py-4">Orçamento</th>
                                    <th className="px-6 py-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-800">
                                {campaigns.slice(0, 5).length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-10 text-center text-neutral-500">
                                            Nenhuma campanha encontrada.
                                        </td>
                                    </tr>
                                ) : (
                                    campaigns.slice(0, 5).map((camp: any) => (
                                        <tr key={camp.id} className="hover:bg-neutral-800/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-white">{camp.name}</div>
                                                <div className="text-xs text-neutral-500">
                                                    {new Date(camp.startDate).toLocaleDateString('pt-BR')} - {new Date(camp.endDate).toLocaleDateString('pt-BR')}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant="outline" className="border-neutral-700 bg-neutral-800 text-neutral-300">
                                                    {camp.type}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 text-yellow-500 font-medium">
                                                R$ {(camp.budget || 0).toLocaleString('pt-BR')}
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant="outline" className={cn(
                                                    "border",
                                                    camp.status === 'active'
                                                        ? "border-green-500/20 bg-green-500/10 text-green-500"
                                                        : camp.status === 'paused'
                                                        ? "border-yellow-500/20 bg-yellow-500/10 text-yellow-500"
                                                        : "border-neutral-500/20 bg-neutral-500/10 text-neutral-500"
                                                )}>
                                                    {camp.status === 'active' ? 'Ativa' : camp.status === 'paused' ? 'Pausada' : 'Encerrada'}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Partners */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
                    <div className="p-8 border-b border-neutral-800 flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Handshake className="w-5 h-5 text-yellow-500" />
                                Parceiros Comerciais
                            </h3>
                            <p className="text-sm text-neutral-400">Parceiros ativos no sistema</p>
                        </div>
                        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                            {partners.filter((p: any) => p.status === 'active').length} ativos
                        </Badge>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-neutral-950 text-neutral-400 uppercase font-medium">
                                <tr className="border-b border-neutral-800">
                                    <th className="px-6 py-4">Parceiro</th>
                                    <th className="px-6 py-4">Tipo</th>
                                    <th className="px-6 py-4">Comissão</th>
                                    <th className="px-6 py-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-800">
                                {partners.slice(0, 5).length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-10 text-center text-neutral-500">
                                            Nenhum parceiro encontrado.
                                        </td>
                                    </tr>
                                ) : (
                                    partners.slice(0, 5).map((partner: any) => (
                                        <tr key={partner.id} className="hover:bg-neutral-800/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-white">{partner.name}</div>
                                                <div className="text-xs text-neutral-500">{partner.email}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant="outline" className="border-neutral-700 bg-neutral-800 text-neutral-300">
                                                    {partner.type}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 text-yellow-500 font-medium">{partner.commission}</td>
                                            <td className="px-6 py-4">
                                                <Badge variant="outline" className={cn(
                                                    "border",
                                                    partner.status === 'active'
                                                        ? "border-green-500/20 bg-green-500/10 text-green-500"
                                                        : "border-yellow-500/20 bg-yellow-500/10 text-yellow-500"
                                                )}>
                                                    {partner.status === 'active' ? 'Ativo' : 'Inativo'}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Info Alert */}
            <div className="mt-10 flex items-start gap-3 p-6 bg-yellow-500/10 border border-yellow-500/50 rounded-xl text-yellow-500">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                    <p className="font-medium">System Overview</p>
                    <p className="text-sm text-yellow-500/80 mt-1">
                        This dashboard provides a real-time overview of the Don Fiapo ecosystem.
                        Data is refreshed every 5 minutes.
                    </p>
                </div>
            </div>
        </div>
    );
}
