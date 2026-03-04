"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  PieChart,
  Download,
  Calendar,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Gift,
  Clock,
  Users,
  Coins,
  CheckCircle,
  XCircle,
  Zap,
  Activity,
  Link,
  Database,
  BarChart2,
  Send,
} from "lucide-react";
import { getSession, hasPermission, AdminSession } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { fetchLunesPrices, PriceData } from "@/lib/api/prices";

interface FinanceCardProps {
  title: string;
  value: string;
  change: string;
  icon: React.ReactNode;
  trend: "up" | "down" | "neutral";
}

function FinanceCard({ title, value, change, icon, trend }: FinanceCardProps) {
  return (
    <div className="bg-neutral-900/40 backdrop-blur-md border border-neutral-800/50 rounded-2xl p-6 hover:shadow-2xl hover:shadow-yellow-500/5 transition-all duration-300">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-neutral-500 text-xs font-bold uppercase tracking-widest">{title}</p>
          <h3 className="text-2xl font-black text-white mt-3 tracking-tight">{value}</h3>
          <p
            className={cn(
              "text-xs mt-2 font-medium flex items-center gap-1",
              trend === "up" && "text-green-400",
              trend === "down" && "text-red-400",
              trend === "neutral" && "text-neutral-500"
            )}
          >
            {trend === "up" ? <TrendingUp className="w-3 h-3" /> : trend === "down" ? <TrendingDown className="w-3 h-3" /> : null}
            {change}
          </p>
        </div>
        <div className="p-3 bg-yellow-500/10 rounded-xl ring-1 ring-yellow-500/20 shadow-inner shadow-yellow-500/10">
          {icon}
        </div>
      </div>
    </div>
  );
}

// Network options for wallet creation form
const NETWORKS = [
  { id: "lunes", name: "Lunes Network", symbol: "LUNES" },
  { id: "solana", name: "Solana", symbol: "SOL" },
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// All wallet data comes from /api/finance/wallets (Prisma DB) and /api/finance/treasury (on-chain)

export default function FinancePage() {
  const router = useRouter();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "revenues" | "expenses" | "wallets" | "airdrop">("overview");
  const [prices, setPrices] = useState<PriceData | null>(null);

  // Data State
  const [wallets, setWallets] = useState<any[]>([]);
  const [sedes, setSedes] = useState<any[]>([]);
  const [dbTransactions, setDbTransactions] = useState<any[]>([]);
  const [dbExpenses, setDbExpenses] = useState<any[]>([]);
  const [dbRevenues, setDbRevenues] = useState<any[]>([]);
  const [treasuryData, setTreasuryData] = useState<any>(null);
  const [dbLoading, setDbLoading] = useState(true);
  const [rewardPools, setRewardPools] = useState<any>(null);
  const [rewardPoolsLoading, setRewardPoolsLoading] = useState(false);
  const [airdropOverview, setAirdropOverview] = useState<any>(null);
  const [airdropOverviewLoading, setAirdropOverviewLoading] = useState(false);

  // Modal State
  const [selectedWallet, setSelectedWallet] = useState<any | null>(null);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const [isRevenueOpen, setIsRevenueOpen] = useState(false);
  const [isNewWalletOpen, setIsNewWalletOpen] = useState(false); // Modal state for new wallet
  const [isCopied, setIsCopied] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Form State (Transactions)
  const [formSede, setFormSede] = useState("");
  const [formNetwork, setFormNetwork] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formAddress, setFormAddress] = useState("");

  // Form State (Expenses)
  const [expenseData, setExpenseData] = useState({
    description: "",
    category: "Operational",
    amount: "",
    currency: "USDT",
    dueDate: new Date().toISOString().split("T")[0],
  });

  // Form State (Revenue)
  const [revenueData, setRevenueData] = useState({
    description: "",
    category: "Vendas",
    source: "",
    amount: "",
    currency: "USDT",
    date: new Date().toISOString().split("T")[0],
  });

  const [isPeriodOpen, setIsPeriodOpen] = useState(false);
  const [periodData, setPeriodData] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });

  // Form State (New Wallet)
  const [newWalletData, setNewWalletData] = useState({
    name: "",
    address: "",
    seed: "",
    symbol: "LUNES",
    network: "Lunes Network",
    branchId: "",
  });

  const fetchData = async () => {
    try {
      const params = new URLSearchParams();
      if (periodData.start) params.append("startDate", periodData.start);
      if (periodData.end) params.append("endDate", periodData.end);

      console.log("[Finance] Fetching with period:", periodData);

      const [walletsRes, branchesRes, transRes, expRes, revRes, treasuryRes] = await Promise.all([
        fetch("/api/finance/wallets"),
        fetch("/api/finance/branches"),
        fetch(`/api/finance/transactions?${params.toString()}`),
        fetch(`/api/finance/expenses?${params.toString()}`),
        fetch(`/api/finance/revenues?${params.toString()}`),
        fetch("/api/finance/treasury").catch(() => null),
      ]);

      console.log("[Finance] API Status:", {
        wallets: walletsRes.status,
        branches: branchesRes.status,
        transactions: transRes.status,
        expenses: expRes.status,
        revenues: revRes.status,
      });

      if (walletsRes.ok && branchesRes.ok && transRes.ok && expRes.ok && revRes.ok) {
        const walletsData = await walletsRes.json();
        const branchesData = await branchesRes.json();
        const transactionsData = await transRes.json();
        const expensesData = await expRes.json();
        const revenuesData = await revRes.json();

        console.log("[Finance] Data received:", {
          wallets: walletsData.length,
          branches: branchesData.length,
          transactions: transactionsData.length,
          expenses: expensesData.length,
          revenues: revenuesData.length,
        });

        setWallets(walletsData);
        setSedes(branchesData);
        setDbTransactions(transactionsData);
        setDbExpenses(expensesData);
        setDbRevenues(revenuesData);

        // Parse treasury on-chain data (non-blocking)
        if (treasuryRes && treasuryRes.ok) {
          const tData = await treasuryRes.json();
          setTreasuryData(tData);
          console.log("[Finance] Treasury on-chain data:", tData);
        }

        if (branchesData.length > 0) {
          setFormSede(branchesData[0].id);
          setNewWalletData(prev => ({ ...prev, branchId: branchesData[0].id }));
        }

        // Fetch reward pools (legacy, kept for overview stats cards)
        setRewardPoolsLoading(true);
        fetch("/api/admin/airdrop/reward-pools")
          .then((r) => r.json())
          .then((d) => setRewardPools(d))
          .catch(() => {})
          .finally(() => setRewardPoolsLoading(false));

        // Fetch unified airdrop overview (on-chain + off-chain)
        setAirdropOverviewLoading(true);
        fetch("/api/admin/airdrop/overview")
          .then((r) => r.json())
          .then((d) => setAirdropOverview(d))
          .catch(() => {})
          .finally(() => setAirdropOverviewLoading(false));
      } else {
        console.error("[Finance] API errors:", {
          wallets: !walletsRes.ok ? await walletsRes.text() : null,
          transactions: !transRes.ok ? await transRes.text() : null,
          expenses: !expRes.ok ? await expRes.text() : null,
          revenues: !revRes.ok ? await revRes.text() : null,
        });
      }
    } catch (error) {
      console.error("[Finance] Error fetching finance data:", error);
    } finally {
      setDbLoading(false);
    }
  };

  useEffect(() => {
    const currentSession = getSession();
    if (!currentSession) {
      router.push("/login");
      return;
    }
    if (!hasPermission(currentSession, "finance")) {
      router.push("/dashboard?error=unauthorized");
      return;
    }
    setSession(currentSession);

    fetchData();
    fetchLunesPrices().then(setPrices);
  }, [router, periodData.start, periodData.end]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const openDeposit = (wallet: any) => {
    setSelectedWallet(wallet);
    setFormNetwork(wallet.networkId);
    setFormSede(wallet.branchId);
    setIsDepositOpen(true);
  };

  const openWithdraw = (wallet: any) => {
    setSelectedWallet(wallet);
    setFormNetwork(wallet.networkId);
    setFormSede(wallet.branchId);
    setIsWithdrawOpen(true);
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);

    try {
      const res = await fetch("/api/finance/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "withdrawal",
          amount: formAmount,
          walletId: selectedWallet.id,
          description: `Saque para ${formAddress}`,
        }),
      });

      if (res.ok) {
        alert("Saque processado com sucesso!");
        setIsWithdrawOpen(false);
        setFormAmount("");
        setFormAddress("");
        fetchData(); // Refresh list
      } else {
        alert("Falha ao processar saque.");
      }
    } catch (error) {
      alert("Erro de conexão ao processar saque.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleNewExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);

    try {
      const res = await fetch("/api/finance/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(expenseData),
      });

      if (res.ok) {
        alert("Despesa registrada com sucesso!");
        setIsExpenseOpen(false);
        setExpenseData({
          description: "",
          category: "Operational",
          amount: "",
          currency: "USDT",
          dueDate: new Date().toISOString().split("T")[0],
        });
        fetchData();
      } else {
        alert("Falha ao registrar despesa.");
      }
    } catch (error) {
      alert("Erro de conexão ao registrar despesa.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleNewRevenue = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);

    try {
      const res = await fetch("/api/finance/revenues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(revenueData),
      });

      if (res.ok) {
        alert("Receita registrada com sucesso!");
        setIsRevenueOpen(false);
        setRevenueData({
          description: "",
          category: "Vendas",
          source: "",
          amount: "",
          currency: "USDT",
          date: new Date().toISOString().split("T")[0],
        });
        fetchData();
      } else {
        alert("Falha ao registrar receita.");
      }
    } catch (error) {
      alert("Erro de conexão ao registrar receita.");
    } finally {
      setActionLoading(false);
    }
  };

  // Calculate real financial metrics
  const revenueFromTransactions = dbTransactions
    .filter((t: any) => t.type === "income" || t.type === "deposit")
    .reduce((acc: number, t: any) => acc + (t.amount || 0), 0);
  const revenueFromModel = dbRevenues
    .filter((r: any) => r.status === "confirmed")
    .reduce((acc: number, r: any) => acc + (r.amount || 0), 0);
  const totalRevenue = revenueFromTransactions + revenueFromModel;
  
  const totalExpenses = dbExpenses
    .reduce((acc: number, e: any) => acc + (e.amount || 0), 0);
  
  const totalTransactionsExpense = dbTransactions
    .filter((t: any) => t.type === "expense" || t.type === "withdrawal")
    .reduce((acc: number, t: any) => acc + (t.amount || 0), 0);
  
  const allExpenses = totalExpenses + totalTransactionsExpense;
  const netProfit = totalRevenue - allExpenses;
  const totalBalance = wallets.reduce((acc: number, w: any) => acc + (w.valueBrl || 0), 0);

  // Calculate monthly data for charts (last 12 months)
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    const monthRevenueFromTx = dbTransactions
      .filter((t: any) => {
        const tDate = new Date(t.createdAt || t.date);
        const tMonthKey = `${tDate.getFullYear()}-${String(tDate.getMonth() + 1).padStart(2, '0')}`;
        return (t.type === "income" || t.type === "deposit") && tMonthKey === monthKey;
      })
      .reduce((acc: number, t: any) => acc + (t.amount || 0), 0);
    const monthRevenueFromModel = dbRevenues
      .filter((r: any) => {
        const rDate = new Date(r.date || r.createdAt);
        const rMonthKey = `${rDate.getFullYear()}-${String(rDate.getMonth() + 1).padStart(2, '0')}`;
        return r.status === "confirmed" && rMonthKey === monthKey;
      })
      .reduce((acc: number, r: any) => acc + (r.amount || 0), 0);
    const monthRevenue = monthRevenueFromTx + monthRevenueFromModel;
    
    const monthExpenses = dbTransactions
      .filter((t: any) => {
        const tDate = new Date(t.createdAt || t.date);
        const tMonthKey = `${tDate.getFullYear()}-${String(tDate.getMonth() + 1).padStart(2, '0')}`;
        return (t.type === "expense" || t.type === "withdrawal") && tMonthKey === monthKey;
      })
      .reduce((acc: number, t: any) => acc + (t.amount || 0), 0) +
      dbExpenses
        .filter((e: any) => {
          const eDate = new Date(e.dueDate || e.createdAt);
          const eMonthKey = `${eDate.getFullYear()}-${String(eDate.getMonth() + 1).padStart(2, '0')}`;
          return eMonthKey === monthKey;
        })
        .reduce((acc: number, e: any) => acc + (e.amount || 0), 0);
    
    return {
      month: date.toLocaleDateString('pt-BR', { month: 'short' }),
      revenue: monthRevenue,
      expenses: monthExpenses,
    };
  }).reverse();

  // Calculate revenue distribution by source (from both transactions and Revenue model)
  const revenueBySource: Record<string, number> = {};
  dbTransactions
    .filter((t: any) => t.type === "income" || t.type === "deposit")
    .forEach((t: any) => {
      const source = t.category || t.description?.split(' ')[0] || 'Outros';
      revenueBySource[source] = (revenueBySource[source] || 0) + (t.amount || 0);
    });
  dbRevenues
    .filter((r: any) => r.status === "confirmed")
    .forEach((r: any) => {
      const source = r.category || r.source || 'Outros';
      revenueBySource[source] = (revenueBySource[source] || 0) + (r.amount || 0);
    });

  const totalRevenueForChart = Object.values(revenueBySource).reduce((a: number, b: number) => a + b, 0) || 1;
  const revenueDistribution = Object.entries(revenueBySource).map(([name, value]) => ({
    name,
    percentage: Math.round((value as number / totalRevenueForChart) * 100),
    value: value as number,
  })).sort((a, b) => b.value - a.value).slice(0, 3);

  // Fill remaining slots if less than 3 sources
  const fillerNames = ['Vendas', 'Taxas', 'Outros'];
  let fillerIdx = 0;
  while (revenueDistribution.length < 3) {
    const usedNames = revenueDistribution.map(r => r.name);
    let name = fillerNames[fillerIdx] || `Outros ${fillerIdx}`;
    while (usedNames.includes(name)) {
      fillerIdx++;
      name = fillerNames[fillerIdx] || `Outros ${fillerIdx}`;
    }
    revenueDistribution.push({ name, percentage: 0, value: 0 });
    fillerIdx++;
  }

  // Calculate treasury by currency — prefer on-chain data when available
  const treasuryByCurrency: Record<string, { balance: number; valueBrl: number; count: number; priceUsd: number; onChain: boolean }> = {};

  // 1. Start with on-chain treasury data (if available)
  if (treasuryData?.aggregated) {
    for (const item of treasuryData.aggregated) {
      treasuryByCurrency[item.symbol] = {
        balance: item.totalBalance,
        valueBrl: item.totalValueBrl,
        count: item.wallets,
        priceUsd: item.priceUsd,
        onChain: item.connected,
      };
    }
  }

  // 2. Merge with DB wallet data (only for symbols not already from on-chain)
  for (const w of wallets) {
    const symbol = w.symbol || "OTHER";
    if (!treasuryByCurrency[symbol]) {
      treasuryByCurrency[symbol] = { balance: 0, valueBrl: 0, count: 0, priceUsd: 0, onChain: false };
    }
    // If on-chain data already present for this symbol, skip DB merge
    if (treasuryByCurrency[symbol].onChain) continue;
    treasuryByCurrency[symbol].balance += w.balanceRaw ?? parseFloat(w.balance?.replace(/,/g, "") || "0");
    treasuryByCurrency[symbol].valueBrl += w.valueBrl || 0;
    treasuryByCurrency[symbol].priceUsd = w.priceUsd || treasuryByCurrency[symbol].priceUsd;
    treasuryByCurrency[symbol].count += 1;
  }

  const handleApplyPeriod = () => {
    setIsPeriodOpen(false);
    fetchData();
  };

  const handleExport = async () => {
    try {
      const res = await fetch("/api/finance/expenses/export");
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `finance_export_${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        alert("Falha ao exportar dados.");
      }
    } catch (error) {
      alert("Erro ao exportar dados.");
    }
  };
  const handleNewWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);

    try {
      const res = await fetch("/api/finance/wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newWalletData),
      });

      if (res.ok) {
        alert("Carteira conectada com sucesso!");
        setIsNewWalletOpen(false);
        setNewWalletData({
          name: "",
          address: "",
          seed: "",
          symbol: "LUNES",
          network: "Lunes Network",
          branchId: sedes[0]?.id || "",
        });
        fetchData();
      } else {
        alert("Falha ao conectar carteira.");
      }
    } catch (error) {
      alert("Erro de conexão ao conectar carteira.");
    } finally {
      setActionLoading(false);
    }
  };

  if (!session) {
    return null;
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Financeiro</h1>
          <p className="text-neutral-400 mt-2">
            Gestão completa de receitas, despesas e ativos digitais
          </p>
          {prices && (
            <div className="flex gap-4 mt-3">
              <div className="px-3 py-1 bg-neutral-900 border border-neutral-800 rounded-lg flex items-center gap-2">
                <span className="text-[10px] text-neutral-500 font-bold uppercase">CoinGecko</span>
                <span className="text-sm font-bold text-yellow-500/80">
                  {prices.coingecko && prices.coingecko > 0 ? `$${prices.coingecko.toFixed(6)}` : "N/A"}
                  <span className="text-[10px] text-neutral-400 font-normal uppercase ml-1">LUNES</span>
                </span>
              </div>
              <div className="px-3 py-1 bg-neutral-900/50 backdrop-blur-sm border border-neutral-800 rounded-lg flex items-center gap-2">
                <span className="text-[10px] text-neutral-500 font-bold uppercase">BitStorage</span>
                <span className="text-sm font-bold text-yellow-500">
                  ${prices.bitstorage?.toFixed(prices.bitstorage < 0.01 ? 6 : 4)}
                  <span className="text-[10px] text-neutral-400 font-normal uppercase ml-1">LUNES</span>
                </span>
              </div>
              <div className="px-3 py-1 bg-neutral-900/50 backdrop-blur-sm border border-neutral-800 rounded-lg flex items-center gap-2">
                <span className="text-[10px] text-neutral-500 font-bold uppercase">Conversor</span>
                <span className="text-sm font-bold text-yellow-500">$1.0000 <span className="text-[10px] text-neutral-400 font-normal uppercase ml-1">USDT</span></span>
              </div>
              <div className="px-3 py-1 bg-neutral-900/50 backdrop-blur-sm border border-neutral-800 rounded-lg flex items-center gap-2">
                <span className="text-[10px] text-neutral-500 font-bold uppercase">Internal</span>
                <span className="text-sm font-bold text-yellow-500">$0.1000 <span className="text-[10px] text-neutral-400 font-normal uppercase ml-1">FIAPO</span></span>
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsPeriodOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-800 text-white font-medium rounded-lg hover:bg-neutral-700 transition-colors"
          >
            <Calendar className="w-5 h-5" />
            Período
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-black font-medium rounded-lg hover:bg-yellow-400 transition-colors"
          >
            <Download className="w-5 h-5" />
            Exportar
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 border-b border-neutral-800">
        <button
          onClick={() => setActiveTab("overview")}
          className={cn(
            "px-6 py-3 text-sm font-medium border-b-2 transition-colors",
            activeTab === "overview"
              ? "border-yellow-500 text-yellow-500"
              : "border-transparent text-neutral-400 hover:text-white"
          )}
        >
          Visão Geral
        </button>
        <button
          onClick={() => setActiveTab("revenues")}
          className={cn(
            "px-6 py-3 text-sm font-medium border-b-2 transition-colors",
            activeTab === "revenues"
              ? "border-yellow-500 text-yellow-500"
              : "border-transparent text-neutral-400 hover:text-white"
          )}
        >
          Receitas
        </button>
        <button
          onClick={() => setActiveTab("expenses")}
          className={cn(
            "px-6 py-3 text-sm font-medium border-b-2 transition-colors",
            activeTab === "expenses"
              ? "border-yellow-500 text-yellow-500"
              : "border-transparent text-neutral-400 hover:text-white"
          )}
        >
          Despesas
        </button>
        <button
          onClick={() => setActiveTab("wallets")}
          className={cn(
            "px-6 py-3 text-sm font-medium border-b-2 transition-colors",
            activeTab === "wallets"
              ? "border-yellow-500 text-yellow-500"
              : "border-transparent text-neutral-400 hover:text-white"
          )}
        >
          Carteiras (Wallets)
        </button>
        <button
          onClick={() => setActiveTab("airdrop")}
          className={cn(
            "px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5",
            activeTab === "airdrop"
              ? "border-yellow-500 text-yellow-500"
              : "border-transparent text-neutral-400 hover:text-white"
          )}
        >
          <Gift className="w-4 h-4" />
          Airdrop & Recompensas
        </button>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === "overview" && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FinanceCard
              title="Saldo Total (BRL)"
              value={formatCurrency(totalBalance)}
              change={`${wallets.length} carteiras ativas`}
              icon={<Wallet className="w-6 h-6 text-yellow-500" />}
              trend="up"
            />
            <FinanceCard
              title="Receitas (Período)"
              value={formatCurrency(totalRevenue)}
              change={`${dbRevenues.filter((r: any) => r.status === "confirmed").length} receitas + ${dbTransactions.filter((t: any) => t.type === "income" || t.type === "deposit").length} transações`}
              icon={<TrendingUp className="w-6 h-6 text-yellow-500" />}
              trend="up"
            />
            <FinanceCard
              title="Despesas (Período)"
              value={formatCurrency(allExpenses)}
              change={`${dbExpenses.length} despesas + ${dbTransactions.filter((t: any) => t.type === "withdrawal").length} saques`}
              icon={<TrendingDown className="w-6 h-6 text-yellow-500" />}
              trend="down"
            />
            <FinanceCard
              title="Lucro Líquido"
              value={formatCurrency(netProfit)}
              change={netProfit >= 0 ? "Positivo no período" : "Negativo no período"}
              icon={<PieChart className="w-6 h-6 text-yellow-500" />}
              trend={netProfit >= 0 ? "up" : "down"}
            />
          </div>

          {/* Treasury by Currency */}
          <div className="bg-neutral-900/40 backdrop-blur-md border border-neutral-800/50 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
              Tesouraria por Moeda
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {(() => {
                const TARGET_CURRENCIES = ["USDC", "USDT", "LUNES", "FIAPO"];
                const colorMap: Record<string, string> = {
                  USDC: "border-blue-500/50 bg-blue-500/5",
                  USDT: "border-green-500/50 bg-green-500/5",
                  LUNES: "border-yellow-500/50 bg-yellow-500/5",
                  FIAPO: "border-orange-500/50 bg-orange-500/5",
                };
                const dotColor: Record<string, string> = {
                  USDC: "bg-blue-500",
                  USDT: "bg-green-500",
                  LUNES: "bg-yellow-500",
                  FIAPO: "bg-orange-500",
                };

                const allSymbols = new Set([
                  ...TARGET_CURRENCIES,
                  ...Object.keys(treasuryByCurrency),
                ]);

                return Array.from(allSymbols).map((symbol) => {
                  const data = treasuryByCurrency[symbol] || { balance: 0, valueBrl: 0, count: 0, priceUsd: 0 };
                  const isTarget = TARGET_CURRENCIES.includes(symbol);
                  return (
                    <div
                      key={symbol}
                      className={cn(
                        "border rounded-xl p-4 transition-all hover:scale-[1.02]",
                        isTarget
                          ? colorMap[symbol] || "border-neutral-700 bg-neutral-800/50"
                          : "border-neutral-700 bg-neutral-800/50"
                      )}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2 h-2 rounded-full", dotColor[symbol] || "bg-neutral-500")} />
                          <span className="text-sm text-white font-bold uppercase tracking-wider">{symbol}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {data.onChain && (
                            <span className="px-1.5 py-0.5 text-[8px] font-bold rounded bg-green-500/20 text-green-400 border border-green-500/30 uppercase tracking-wider">On-Chain</span>
                          )}
                          <span className="text-[10px] text-neutral-400 font-medium">
                            {data.count > 0 ? `${data.count} carteira(s)` : "Sem carteira"}
                          </span>
                        </div>
                      </div>
                      <p className="text-2xl font-bold text-white">
                        {data.balance.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-sm text-green-400 font-medium">≈ {formatCurrency(data.valueBrl)}</p>
                        {data.priceUsd > 0 && (
                          <span className="text-[10px] text-neutral-500">
                            ${data.priceUsd < 0.01 ? data.priceUsd.toFixed(6) : data.priceUsd.toFixed(4)}/un
                          </span>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
            {/* On-Chain Connection Status */}
            {treasuryData && (
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-neutral-800/50">
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full", treasuryData.status?.lunes?.connected ? "bg-green-500" : "bg-red-500")} />
                  <span className="text-[11px] text-neutral-400">
                    Lunes: {treasuryData.status?.lunes?.connected ? (
                      <span className="text-green-400">{treasuryData.status.lunes.chain} ({treasuryData.status.lunes.walletsConfigured} carteiras)</span>
                    ) : (
                      <span className="text-red-400">Desconectado</span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full", treasuryData.status?.solana?.connected ? "bg-green-500" : "bg-red-500")} />
                  <span className="text-[11px] text-neutral-400">
                    Solana: {treasuryData.status?.solana?.connected ? (
                      <span className="text-green-400">Conectado</span>
                    ) : (
                      <span className="text-red-400">{treasuryData.status?.solana?.walletConfigured ? "Erro" : "Não configurado"}</span>
                    )}
                  </span>
                </div>
                {treasuryData.queryTimeMs && (
                  <span className="text-[10px] text-neutral-600 ml-auto">
                    Query: {treasuryData.queryTimeMs}ms
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-neutral-900/40 backdrop-blur-md border border-neutral-800/50 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                Receitas vs Despesas (Últimos 12 meses)
              </h3>
              <div className="h-64 flex items-end justify-between gap-3 px-2 pb-6 pt-2">
                {monthlyData.map((data, i) => {
                  const maxValue = Math.max(
                    ...monthlyData.map(d => Math.max(d.revenue, d.expenses)),
                    1
                  );
                  const revenueHeight = (data.revenue / maxValue) * 80;
                  const expenseHeight = (data.expenses / maxValue) * 80;
                  
                  return (
                    <div key={i} className="flex-1 h-full flex flex-col items-center justify-end gap-1.5 group relative">
                      <div className="w-full h-full flex flex-col justify-end gap-1 overflow-hidden rounded-t-lg">
                        <div
                          className="w-full bg-gradient-to-t from-yellow-600 to-yellow-400 rounded-t-[4px] transition-all duration-500 group-hover:brightness-125"
                          style={{ height: `${Math.max(revenueHeight, 2)}%` }}
                        />
                        <div
                          className="w-full bg-gradient-to-t from-red-600 to-red-400 rounded-t-[2px] transition-all duration-500 opacity-60 group-hover:opacity-100"
                          style={{ height: `${Math.max(expenseHeight, 2)}%` }}
                        />
                      </div>
                      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-neutral-500 font-bold opacity-60 group-hover:opacity-100 transition-opacity uppercase tracking-tighter">
                        {data.month}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Distribuição de Receitas</h3>
              <div className="h-64 flex items-center justify-center">
                {totalRevenueForChart > 1 ? (
                  <div className="relative w-48 h-48">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                      {revenueDistribution.map((item, index) => {
                        const circumference = 251.2;
                        const offset = index === 0 ? 0 : revenueDistribution.slice(0, index).reduce((acc, i) => acc + (i.percentage / 100) * circumference, 0);
                        const colors = ["#EAB308", "#22C55E", "#3B82F6"];
                        return (
                          <circle
                            key={index}
                            cx="50"
                            cy="50"
                            r="40"
                            fill="none"
                            stroke={colors[index]}
                            strokeWidth="20"
                            strokeDasharray={`${(item.percentage / 100) * circumference} ${circumference}`}
                            strokeDashoffset={-offset}
                          />
                        );
                      })}
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold text-white">{revenueDistribution.reduce((a, b) => a + b.percentage, 0)}%</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-neutral-500">
                    <p>Sem dados de receita</p>
                    <p className="text-xs mt-2">Adicione transações de entrada</p>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4">
                {revenueDistribution.map((item, index) => {
                  const colors = ["bg-yellow-500", "bg-green-500", "bg-blue-500"];
                  return (
                    <div key={index} className="text-center">
                      <div className={`w-3 h-3 ${colors[index]} rounded mx-auto mb-1`} />
                      <p className="text-xs text-neutral-400 truncate">{item.name}</p>
                      <p className="text-sm font-medium text-white">{item.percentage}%</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
            <div className="p-6 border-b border-neutral-800">
              <h3 className="text-lg font-bold text-white">Transações Recentes</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-800">
                  <th className="text-left py-4 px-6 text-sm font-medium text-neutral-400">Descrição</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-neutral-400">Tipo</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-neutral-400">Valor</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-neutral-400">Data</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-neutral-400">Status</th>
                </tr>
              </thead>
              <tbody>
                {dbTransactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors">
                    <td className="py-4 px-6">
                      <p className="font-medium text-white">{transaction.description || `Transação ${transaction.wallet?.symbol}`}</p>
                    </td>
                    <td className="py-4 px-6">
                      <span className={cn(
                        "px-3 py-1 text-[10px] font-bold rounded-full border uppercase tracking-wider",
                        transaction.type === "deposit"
                          ? "bg-green-500/10 text-green-400 border-green-500/30"
                          : "bg-red-500/10 text-red-400 border-red-500/30"
                      )}>
                        {transaction.type === "deposit" ? "Receita" : "Despesa"}
                      </span>
                    </td>
                    <td className={cn("py-4 px-6 font-bold", transaction.type === "deposit" ? "text-green-400" : "text-red-400")}>
                      {transaction.type === "deposit" ? "+" : "-"}
                      {formatCurrency(transaction.amount)}
                    </td>
                    <td className="py-4 px-6 text-neutral-400 text-sm font-medium">{formatDate(transaction.createdAt)}</td>
                    <td className="py-4 px-6">
                      <span className={cn(
                        "px-3 py-1 text-[10px] font-bold rounded-full border border-neutral-800/50 bg-neutral-800/30 uppercase tracking-tighter",
                        transaction.status === "completed" ? "text-green-500/80" : "text-yellow-500/80"
                      )}>
                        {transaction.status === "completed" ? "Concluído" : "Pendente"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REVENUES TAB */}
      {activeTab === "revenues" && (
        <div className="space-y-6">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
              <div>
                <h3 className="text-lg font-bold text-white">Registro de Receitas</h3>
                <p className="text-sm text-neutral-400 mt-1">
                  Total confirmado: <span className="text-green-400 font-bold">{revenueFromModel.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (multi-moeda)</span>
                  {' · '}{dbRevenues.length} registro(s)
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-neutral-800 p-1 rounded-lg border border-neutral-700">
                  <Input
                    type="date"
                    className="h-8 bg-transparent border-none text-xs text-white p-2 w-32"
                    value={periodData.start}
                    onChange={(e) => setPeriodData({ ...periodData, start: e.target.value })}
                  />
                  <span className="text-neutral-500 text-xs">até</span>
                  <Input
                    type="date"
                    className="h-8 bg-transparent border-none text-xs text-white p-2 w-32"
                    value={periodData.end}
                    onChange={(e) => setPeriodData({ ...periodData, end: e.target.value })}
                  />
                  {(periodData.start || periodData.end) && (
                    <button
                      onClick={() => setPeriodData({ start: "", end: "" })}
                      className="p-1 hover:text-red-400 text-neutral-500"
                    >
                      <Plus className="w-4 h-4 rotate-45" />
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setIsRevenueOpen(true)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-500 font-medium text-sm flex items-center gap-2 transition-all shadow-lg shadow-green-600/20 active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  Nova Receita
                </button>
              </div>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-800">
                  <th className="text-left py-4 px-6 text-sm font-medium text-neutral-400">ID</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-neutral-400">Descrição</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-neutral-400">Categoria</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-neutral-400">Origem</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-neutral-400">Moeda</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-neutral-400">Valor</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-neutral-400">Data</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-neutral-400">Status</th>
                </tr>
              </thead>
              <tbody>
                {dbRevenues.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-neutral-500">
                      Nenhuma receita registrada. Clique em "Nova Receita" para adicionar.
                    </td>
                  </tr>
                ) : (
                  dbRevenues.map((revenue: any) => (
                    <tr key={revenue.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors">
                      <td className="py-4 px-6"><span className="text-xs font-mono text-neutral-500">{revenue.id.substring(0, 8)}</span></td>
                      <td className="py-4 px-6"><p className="font-medium text-white">{revenue.description}</p></td>
                      <td className="py-4 px-6"><span className="text-neutral-400 text-sm font-medium">{revenue.category}</span></td>
                      <td className="py-4 px-6"><span className="text-neutral-400 text-sm">{revenue.source || '—'}</span></td>
                      <td className="py-4 px-6">
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-neutral-800 border border-neutral-700 text-neutral-300 uppercase tracking-wider">
                          {revenue.currency || 'USDT'}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-bold text-green-400">
                        +{revenue.amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} <span className="text-xs text-neutral-500 font-normal">{revenue.currency || 'USDT'}</span>
                      </td>
                      <td className="py-4 px-6 text-neutral-400 text-xs">{formatDate(revenue.date)}</td>
                      <td className="py-4 px-6">
                        <span className={cn(
                          "px-2.5 py-1 text-[10px] font-bold rounded-full border uppercase tracking-wider",
                          revenue.status === "confirmed" ? "bg-green-500/10 text-green-400 border-green-500/50" :
                          revenue.status === "pending" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/50" :
                          "bg-red-500/10 text-red-400 border-red-500/50"
                        )}>
                          {revenue.status === "confirmed" ? "Confirmado" : revenue.status === "pending" ? "Pendente" : "Cancelado"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* EXPENSES TAB */}
      {activeTab === "expenses" && (
        <div className="space-y-6">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
              <h3 className="text-lg font-bold text-white">Registro de Despesas</h3>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-neutral-800 p-1 rounded-lg border border-neutral-700">
                  <Input
                    type="date"
                    className="h-8 bg-transparent border-none text-xs text-white p-2 w-32"
                    value={periodData.start}
                    onChange={(e) => setPeriodData({ ...periodData, start: e.target.value })}
                  />
                  <span className="text-neutral-500 text-xs">até</span>
                  <Input
                    type="date"
                    className="h-8 bg-transparent border-none text-xs text-white p-2 w-32"
                    value={periodData.end}
                    onChange={(e) => setPeriodData({ ...periodData, end: e.target.value })}
                  />
                  {(periodData.start || periodData.end) && (
                    <button
                      onClick={() => setPeriodData({ start: "", end: "" })}
                      className="p-1 hover:text-red-400 text-neutral-500"
                    >
                      <Plus className="w-4 h-4 rotate-45" />
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setIsExpenseOpen(true)}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-500 font-medium text-sm flex items-center gap-2 transition-all shadow-lg shadow-red-600/20 active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  Nova Despesa
                </button>
              </div>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-800">
                  <th className="text-left py-4 px-6 text-sm font-medium text-neutral-400">ID</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-neutral-400">Descrição</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-neutral-400">Categoria</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-neutral-400">Moeda</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-neutral-400">Valor</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-neutral-400">Data</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-neutral-400">Status</th>
                </tr>
              </thead>
              <tbody>
                {dbExpenses.map((expense) => (
                  <tr key={expense.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors">
                    <td className="py-4 px-6"><span className="text-xs font-mono text-neutral-500">{expense.id.substring(0, 8)}</span></td>
                    <td className="py-4 px-6"><p className="font-medium text-white">{expense.description}</p></td>
                    <td className="py-4 px-6"><span className="text-neutral-400 text-sm font-medium">{expense.category}</span></td>
                    <td className="py-4 px-6">
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-neutral-800 border border-neutral-700 text-neutral-300 uppercase tracking-wider">
                        {expense.currency || 'USD'}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-bold text-red-400">-{expense.amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} <span className="text-xs text-neutral-500 font-normal">{expense.currency || 'USD'}</span></td>
                    <td className="py-4 px-6 text-neutral-400 text-xs">{formatDate(expense.dueDate)}</td>
                    <td className="py-4 px-6">
                      <span className={cn(
                        "px-2.5 py-1 text-[10px] font-bold rounded-full border uppercase tracking-wider",
                        expense.status === "paid" ? "bg-green-500/10 text-green-400 border-green-500/50" : "bg-yellow-500/10 text-yellow-400 border-yellow-500/50"
                      )}>
                        {expense.status === "paid" ? "Pago" : "Pendente"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* WALLETS TAB */}
      {activeTab === "wallets" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {dbLoading ? (
            <div className="col-span-full h-48 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
            </div>
          ) : (
            wallets.map((wallet) => (
              <div key={wallet.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 hover:border-yellow-500/50 transition-colors group">
                <div className="flex items-center justify-between mb-4">
                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", wallet.color)}>
                    <Wallet className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">
                      {wallet.network}
                    </span>
                    <span className="text-[9px] font-bold text-neutral-400 uppercase">
                      {wallet.branchName}
                    </span>
                    <span className="text-xs font-mono text-neutral-300 bg-neutral-800 border border-neutral-700 px-2 py-0.5 rounded mt-1">
                      {wallet.symbol}
                    </span>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-white mb-1">{wallet.name}</h3>
                <p className="text-xs text-neutral-500 font-mono mb-4 truncate" title={wallet.address}>
                  {wallet.shortAddress}
                </p>

                <div className="pt-4 border-t border-neutral-800">
                  <p className="text-neutral-400 text-sm">Saldo:</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <p className="text-2xl font-bold text-white">{wallet.balance}</p>
                    <span className="text-sm font-normal text-neutral-500">{wallet.symbol}</span>
                  </div>
                  <p className="text-green-500 text-sm font-medium mt-1">
                    ≈ {formatCurrency(wallet.valueBrl)}
                  </p>
                </div>

                <div className="mt-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openDeposit(wallet)}
                    className="flex-1 px-3 py-2 bg-neutral-800 text-white text-sm rounded hover:bg-neutral-700 transition-colors"
                  >
                    Depositar
                  </button>
                  <button
                    onClick={() => openWithdraw(wallet)}
                    className="flex-1 px-3 py-2 bg-yellow-500 text-black text-sm rounded font-bold hover:bg-yellow-400 transition-colors"
                  >
                    Sacar
                  </button>
                </div>
              </div>
            ))
          )}
          <button
            onClick={() => setIsNewWalletOpen(true)}
            className="bg-neutral-900/50 border border-neutral-800 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-neutral-500 hover:text-white hover:border-yellow-500 hover:bg-neutral-900 transition-all group min-h-[250px]"
          >
            <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center mb-4 group-hover:bg-yellow-500 group-hover:text-black transition-colors">
              <Plus className="w-6 h-6" />
            </div>
            <span className="font-medium">Conectar Nova Carteira</span>
          </button>
        </div>
      )}

      {/* DEPOSIT MODAL */}
      <Dialog open={isDepositOpen} onOpenChange={setIsDepositOpen}>
        <DialogContent className="bg-neutral-950 border-neutral-800 text-white sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Depositar Recurso</DialogTitle>
            <DialogDescription className="text-neutral-400">
              Gerencie o endereço de depósito para a sede selecionada.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <Label>Sede (Local de Destino)</Label>
              <Select value={formSede} onValueChange={setFormSede}>
                <SelectTrigger className="bg-neutral-900 border-neutral-800">
                  <SelectValue placeholder="Selecione a sede" />
                </SelectTrigger>
                <SelectContent>
                  {sedes.map(sede => (
                    <SelectItem key={sede.id} value={sede.id}>{sede.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Rede</Label>
              <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg text-sm text-neutral-300">
                {selectedWallet?.network} ({selectedWallet?.symbol})
              </div>
            </div>

            {selectedWallet && (
              <div className="grid gap-2">
                <Label>Endereço de Depósito</Label>
                <div className="flex items-center gap-2 p-3 bg-neutral-900 border border-neutral-800 rounded-lg">
                  <span className="flex-1 font-mono text-xs truncate">{selectedWallet.address}</span>
                  <button
                    onClick={() => copyToClipboard(selectedWallet.address)}
                    className="p-1.5 hover:bg-neutral-800 rounded transition-colors text-neutral-400 hover:text-white"
                  >
                    {isCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              className="w-full bg-neutral-800 hover:bg-neutral-700 text-white"
              onClick={() => setIsDepositOpen(false)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WITHDRAW MODAL */}
      <Dialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen}>
        <DialogContent className="bg-neutral-950 border-neutral-800 text-white sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Solicitar Saque</DialogTitle>
            <DialogDescription className="text-neutral-400">
              Configure os detalhes para o envio de recursos da sede selecionada.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleWithdraw}>
            <div className="grid gap-6 py-4">
              <div className="grid gap-2">
                <Label>Sede (Origem do Fundo)</Label>
                <Select value={formSede} onValueChange={setFormSede}>
                  <SelectTrigger className="bg-neutral-900 border-neutral-800">
                    <SelectValue placeholder="Selecione a sede" />
                  </SelectTrigger>
                  <SelectContent>
                    {sedes.map(sede => (
                      <SelectItem key={sede.id} value={sede.id}>{sede.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Valor do Saque</Label>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="0.00"
                    className="bg-neutral-900 border-neutral-800 pr-16"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-500 uppercase">
                    {selectedWallet?.symbol}
                  </span>
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Endereço de Destino</Label>
                <Input
                  placeholder="Endereço da carteira..."
                  className="bg-neutral-900 border-neutral-800 font-mono text-xs"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="submit"
                className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold"
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <ArrowUpRight className="w-4 h-4 mr-2" />
                )}
                Confirmar Saque
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* New Expense Modal */}
      <Dialog open={isExpenseOpen} onOpenChange={setIsExpenseOpen}>
        <DialogContent className="bg-neutral-950 border-neutral-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <TrendingDown className="w-5 h-5 text-red-500" />
              </div>
              Registrar Nova Despesa
            </DialogTitle>
            <DialogDescription className="text-neutral-400">
              Cadastre uma nova despesa no sistema financeiro.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleNewExpense}>
            <div className="grid gap-6 py-4">
              <div className="grid gap-2">
                <Label>Descrição</Label>
                <Input
                  placeholder="Ex: Servidores AWS - Fevereiro"
                  className="bg-neutral-900 border-neutral-800"
                  value={expenseData.description}
                  onChange={(e) => setExpenseData({ ...expenseData, description: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Categoria</Label>
                  <Select
                    value={expenseData.category}
                    onValueChange={(v) => setExpenseData({ ...expenseData, category: v })}
                  >
                    <SelectTrigger className="bg-neutral-900 border-neutral-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Infraestrutura">Infraestrutura</SelectItem>
                      <SelectItem value="Marketing">Marketing</SelectItem>
                      <SelectItem value="Operational">Operacional</SelectItem>
                      <SelectItem value="RH">Recursos Humanos</SelectItem>
                      <SelectItem value="Segurança">Segurança</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Moeda</Label>
                  <Select
                    value={expenseData.currency}
                    onValueChange={(v) => setExpenseData({ ...expenseData, currency: v })}
                  >
                    <SelectTrigger className="bg-neutral-900 border-neutral-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USDT">USDT</SelectItem>
                      <SelectItem value="USDC">USDC</SelectItem>
                      <SelectItem value="LUNES">LUNES</SelectItem>
                      <SelectItem value="FIAPO">FIAPO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Valor ({expenseData.currency})</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  className="bg-neutral-900 border-neutral-800"
                  value={expenseData.amount}
                  onChange={(e) => setExpenseData({ ...expenseData, amount: e.target.value })}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label>Data de Vencimento</Label>
                <Input
                  type="date"
                  className="bg-neutral-900 border-neutral-800"
                  value={expenseData.dueDate}
                  onChange={(e) => setExpenseData({ ...expenseData, dueDate: e.target.value })}
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-500 text-white font-bold"
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Registrar Despesa
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {/* NEW REVENUE MODAL */}
      <Dialog open={isRevenueOpen} onOpenChange={setIsRevenueOpen}>
        <DialogContent className="bg-neutral-950 border-neutral-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              Registrar Nova Receita
            </DialogTitle>
            <DialogDescription className="text-neutral-400">
              Cadastre uma nova entrada de receita no sistema financeiro.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleNewRevenue}>
            <div className="grid gap-6 py-4">
              <div className="grid gap-2">
                <Label>Descrição</Label>
                <Input
                  placeholder="Ex: Venda de 10.000 FIAPO tokens"
                  className="bg-neutral-900 border-neutral-800"
                  value={revenueData.description}
                  onChange={(e) => setRevenueData({ ...revenueData, description: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Categoria</Label>
                  <Select
                    value={revenueData.category}
                    onValueChange={(v) => setRevenueData({ ...revenueData, category: v })}
                  >
                    <SelectTrigger className="bg-neutral-900 border-neutral-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Vendas">Vendas</SelectItem>
                      <SelectItem value="Taxas">Taxas</SelectItem>
                      <SelectItem value="Staking">Staking</SelectItem>
                      <SelectItem value="Parcerias">Parcerias</SelectItem>
                      <SelectItem value="Serviços">Serviços</SelectItem>
                      <SelectItem value="Outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Moeda</Label>
                  <Select
                    value={revenueData.currency}
                    onValueChange={(v) => setRevenueData({ ...revenueData, currency: v })}
                  >
                    <SelectTrigger className="bg-neutral-900 border-neutral-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USDT">USDT</SelectItem>
                      <SelectItem value="USDC">USDC</SelectItem>
                      <SelectItem value="LUNES">LUNES</SelectItem>
                      <SelectItem value="FIAPO">FIAPO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Valor ({revenueData.currency})</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    className="bg-neutral-900 border-neutral-800"
                    value={revenueData.amount}
                    onChange={(e) => setRevenueData({ ...revenueData, amount: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Data</Label>
                  <Input
                    type="date"
                    className="bg-neutral-900 border-neutral-800"
                    value={revenueData.date}
                    onChange={(e) => setRevenueData({ ...revenueData, date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Origem (opcional)</Label>
                <Input
                  placeholder="Ex: BitStorage, Parceiro XYZ, Website"
                  className="bg-neutral-900 border-neutral-800"
                  value={revenueData.source}
                  onChange={(e) => setRevenueData({ ...revenueData, source: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-500 text-white font-bold"
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Registrar Receita
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* NEW WALLET MODAL */}
      <Dialog open={isNewWalletOpen} onOpenChange={setIsNewWalletOpen}>
        <DialogContent className="bg-neutral-950 border-neutral-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <Wallet className="w-5 h-5 text-yellow-500" />
              </div>
              Conectar Nova Carteira
            </DialogTitle>
            <DialogDescription className="text-neutral-400">
              Registre uma nova carteira administrativa para monitoramento.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleNewWallet}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Nome da Carteira</Label>
                <Input
                  placeholder="Ex: Reserva Lunes HQ"
                  className="bg-neutral-900 border-neutral-800"
                  value={newWalletData.name}
                  onChange={(e) => setNewWalletData({ ...newWalletData, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Símbolo</Label>
                  <Input
                    placeholder="LUNES"
                    className="bg-neutral-900 border-neutral-800"
                    value={newWalletData.symbol}
                    onChange={(e) => setNewWalletData({ ...newWalletData, symbol: e.target.value.toUpperCase() })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Sede</Label>
                  <Select
                    value={newWalletData.branchId}
                    onValueChange={(v) => setNewWalletData({ ...newWalletData, branchId: v })}
                  >
                    <SelectTrigger className="bg-neutral-900 border-neutral-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sedes.map(sede => (
                        <SelectItem key={sede.id} value={sede.id}>{sede.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Rede</Label>
                <Input
                  placeholder="Lunes Network"
                  className="bg-neutral-900 border-neutral-800"
                  value={newWalletData.network}
                  onChange={(e) => setNewWalletData({ ...newWalletData, network: e.target.value })}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label>Endereço Público</Label>
                <Input
                  placeholder="5F3..."
                  className="bg-neutral-900 border-neutral-800 font-mono text-xs"
                  value={newWalletData.address}
                  onChange={(e) => setNewWalletData({ ...newWalletData, address: e.target.value })}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label>Seed / Chave Privada (Opcional)</Label>
                <Input
                  type="password"
                  placeholder="Sua seed phrase para operações internas..."
                  className="bg-neutral-900 border-neutral-800 text-xs"
                  value={newWalletData.seed}
                  onChange={(e) => setNewWalletData({ ...newWalletData, seed: e.target.value })}
                />
                <p className="text-[10px] text-neutral-500 italic">
                  * A seed é armazenada de forma segura para execuções automatizadas (Swap/Bridge).
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="submit"
                className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold"
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Conectar Carteira
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Period Selection Modal */}
      <Dialog open={isPeriodOpen} onOpenChange={setIsPeriodOpen}>
        <DialogContent className="bg-neutral-950 border-neutral-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <Calendar className="w-5 h-5 text-yellow-500" />
              </div>
              Selecionar Período
            </DialogTitle>
            <DialogDescription className="text-neutral-400">
              Defina o intervalo de datas para filtrar receitas e despesas.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <Label>Data Inicial</Label>
              <Input
                type="date"
                className="bg-neutral-900 border-neutral-800"
                value={periodData.start}
                onChange={(e) => setPeriodData({ ...periodData, start: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label>Data Final</Label>
              <Input
                type="date"
                className="bg-neutral-900 border-neutral-800"
                value={periodData.end}
                onChange={(e) => setPeriodData({ ...periodData, end: e.target.value })}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  const today = new Date();
                  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                  setPeriodData({
                    start: firstDay.toISOString().split("T")[0],
                    end: today.toISOString().split("T")[0],
                  });
                }}
                className="flex-1 px-3 py-2 bg-neutral-800 text-white text-xs rounded hover:bg-neutral-700 transition-colors"
              >
                Este Mês
              </button>
              <button
                onClick={() => {
                  const today = new Date();
                  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                  const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
                  setPeriodData({
                    start: lastMonth.toISOString().split("T")[0],
                    end: lastDay.toISOString().split("T")[0],
                  });
                }}
                className="flex-1 px-3 py-2 bg-neutral-800 text-white text-xs rounded hover:bg-neutral-700 transition-colors"
              >
                Mês Passado
              </button>
              <button
                onClick={() => {
                  const today = new Date();
                  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
                  setPeriodData({
                    start: thirtyDaysAgo.toISOString().split("T")[0],
                    end: today.toISOString().split("T")[0],
                  });
                }}
                className="flex-1 px-3 py-2 bg-neutral-800 text-white text-xs rounded hover:bg-neutral-700 transition-colors"
              >
                Últimos 30 dias
              </button>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setIsPeriodOpen(false)}
              className="bg-neutral-800 hover:bg-neutral-700 text-white"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleApplyPeriod}
              className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold"
            >
              Aplicar Período
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AIRDROP & RECOMPENSAS TAB */}
      {activeTab === "airdrop" && (
        <div className="space-y-8">
          {(rewardPoolsLoading || airdropOverviewLoading) && !airdropOverview ? (
            <div className="h-48 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
            </div>
          ) : (
            <>
              {/* ═══════════════════════════════════════════════════════════════
                  SECTION HEADER
              ═══════════════════════════════════════════════════════════════ */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-white">Airdrops & Recompensas</h2>
                  <p className="text-xs text-neutral-500 mt-0.5">Visão consolidada de distribuições on-chain (FIAPO) e off-chain (LUNES)</p>
                </div>
                <a href="/distribution" className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-xs font-bold rounded-xl transition-colors">
                  <Send className="w-3.5 h-3.5" />
                  Gerenciar Distribuição EB
                </a>
              </div>

              {/* ═══════════════════════════════════════════════════════════════
                  BLOCO 1 — ON-CHAIN: FiapoAirdrop (FIAPO)
              ═══════════════════════════════════════════════════════════════ */}
              <div className="space-y-4">
                {/* Section label */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                    <Link className="w-3.5 h-3.5 text-purple-400" />
                    <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">ON-CHAIN · Lunes Smart Contract</span>
                  </div>
                  {airdropOverview?.onChain?.airdrop?.configured ? (
                    airdropOverview?.onChain?.airdrop?.connected ? (
                      <span className="flex items-center gap-1 text-xs text-green-400">
                        <CheckCircle className="w-3.5 h-3.5" /> Conectado
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-yellow-400">
                        <AlertCircle className="w-3.5 h-3.5" /> Contrato configurado · aguardando deploy
                      </span>
                    )
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-neutral-500">
                      <XCircle className="w-3.5 h-3.5" /> Contrato não configurado (AIRDROP_CONTRACT)
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* FiapoAirdrop — Configuração & Round Atual */}
                  <div className="bg-neutral-900 border border-purple-500/20 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center">
                        <Zap className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <p className="font-bold text-white text-sm">FiapoAirdrop · Rodada Atual</p>
                        <p className="text-xs text-neutral-500">Distribuição de FIAPO por pontos acumulados</p>
                      </div>
                      <div className={cn(
                        "ml-auto text-[10px] font-bold px-2.5 py-1 rounded-full border",
                        airdropOverview?.onChain?.airdrop?.isActive
                          ? "bg-green-500/10 text-green-400 border-green-500/30"
                          : "bg-neutral-800 text-neutral-500 border-neutral-700"
                      )}>
                        {airdropOverview?.onChain?.airdrop?.isActive ? "ATIVO" : "INATIVO"}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-neutral-800/50 rounded-xl p-3">
                        <p className="text-[10px] text-neutral-500 mb-1">Rodada</p>
                        <p className="text-xl font-black text-purple-400">{airdropOverview?.onChain?.airdrop?.currentRound ?? "—"}</p>
                      </div>
                      <div className="bg-neutral-800/50 rounded-xl p-3">
                        <p className="text-[10px] text-neutral-500 mb-1">Total FIAPO</p>
                        <p className="text-xl font-black text-white">
                          {airdropOverview?.onChain?.airdrop?.totalTokens
                            ? (Number(airdropOverview.onChain.airdrop.totalTokens) / 1e8).toLocaleString("pt-BR", { maximumFractionDigits: 0 })
                            : airdropOverview?.onChain?.airdrop?.allocation?.totalTokens ?? "—"}
                        </p>
                        <p className="text-[10px] text-neutral-600">{airdropOverview?.onChain?.airdrop?.allocation?.percentage}</p>
                      </div>
                      <div className="bg-neutral-800/50 rounded-xl p-3">
                        <p className="text-[10px] text-neutral-500 mb-1">Total Pontos</p>
                        <p className="text-xl font-black text-white">
                          {airdropOverview?.onChain?.airdrop?.totalPoints
                            ? Number(airdropOverview.onChain.airdrop.totalPoints).toLocaleString("pt-BR")
                            : "—"}
                        </p>
                      </div>
                    </div>

                    {/* Distribution rates */}
                    <div className="space-y-2">
                      <p className="text-[11px] text-neutral-500 font-medium uppercase tracking-wider">Taxas de Distribuição</p>
                      {airdropOverview?.onChain?.airdrop?.distributionRates && (
                        <div className="space-y-1.5">
                          {[
                            { label: "Holders", key: "holders", color: "bg-blue-400" },
                            { label: "Stakers", key: "stakers", color: "bg-purple-400" },
                            { label: "Burners", key: "burners", color: "bg-orange-400" },
                            { label: "Afiliados", key: "affiliates", color: "bg-green-400" },
                            { label: "NFT Holders", key: "nftHolders", color: "bg-yellow-400" },
                          ].map((item) => {
                            const pct = airdropOverview.onChain.airdrop.distributionRates[item.key] ?? 0;
                            return (
                              <div key={item.key} className="flex items-center gap-3">
                                <span className="text-xs text-neutral-400 w-20 flex-shrink-0">{item.label}</span>
                                <div className="flex-1 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                                  <div className={cn("h-full rounded-full", item.color)} style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-xs text-neutral-400 w-8 text-right">{pct}%</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* FiapoRewards — Fundo & Ranking */}
                  <div className="bg-neutral-900 border border-purple-500/20 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center">
                        <BarChart2 className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <p className="font-bold text-white text-sm">FiapoRewards · Ranking Mensal</p>
                        <p className="text-xs text-neutral-500">Pool de FIAPO · Top 12 excluindo whales (top 100)</p>
                      </div>
                      {airdropOverview?.onChain?.rewards?.configured ? (
                        airdropOverview?.onChain?.rewards?.connected ? (
                          <div className="ml-auto text-[10px] font-bold px-2.5 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/30">LIVE</div>
                        ) : (
                          <div className="ml-auto text-[10px] font-bold px-2.5 py-1 rounded-full bg-neutral-800 text-neutral-500 border border-neutral-700">OFFLINE</div>
                        )
                      ) : null}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-neutral-800/50 rounded-xl p-3">
                        <p className="text-[10px] text-neutral-500 mb-1">Fundo Disponível</p>
                        <p className="text-xl font-black text-purple-400">
                          {airdropOverview?.onChain?.rewards?.rewardsFund != null
                            ? Number(airdropOverview.onChain.rewards.rewardsFund).toLocaleString("pt-BR", { maximumFractionDigits: 2 })
                            : "—"}
                        </p>
                        <p className="text-[10px] text-neutral-600">FIAPO</p>
                      </div>
                      <div className="bg-neutral-800/50 rounded-xl p-3">
                        <p className="text-[10px] text-neutral-500 mb-1">Total Distribuído</p>
                        <p className="text-xl font-black text-white">
                          {airdropOverview?.onChain?.rewards?.totalDistributed != null
                            ? Number(airdropOverview.onChain.rewards.totalDistributed).toLocaleString("pt-BR", { maximumFractionDigits: 2 })
                            : "—"}
                        </p>
                        <p className="text-[10px] text-neutral-600">FIAPO cumulativo</p>
                      </div>
                    </div>

                    {/* Scoring weights */}
                    <div className="space-y-2">
                      <p className="text-[11px] text-neutral-500 font-medium uppercase tracking-wider">Pesos do Ranking Geral</p>
                      {[
                        { label: "Saldo", pct: 25, color: "bg-blue-400" },
                        { label: "Staking", pct: 30, color: "bg-purple-400" },
                        { label: "Burn", pct: 20, color: "bg-orange-400" },
                        { label: "Transações", pct: 10, color: "bg-green-400" },
                        { label: "Afiliados", pct: 10, color: "bg-yellow-400" },
                        { label: "Governance", pct: 5, color: "bg-pink-400" },
                      ].map((w) => (
                        <div key={w.label} className="flex items-center gap-3">
                          <span className="text-xs text-neutral-400 w-20 flex-shrink-0">{w.label}</span>
                          <div className="flex-1 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                            <div className={cn("h-full rounded-full", w.color)} style={{ width: `${w.pct}%` }} />
                          </div>
                          <span className="text-xs text-neutral-400 w-8 text-right">{w.pct}%</span>
                        </div>
                      ))}
                    </div>

                    {!airdropOverview?.onChain?.rewards?.configured && (
                      <div className="flex items-center gap-2 text-xs text-neutral-600 pt-1">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        Conecte definindo REWARDS_CONTRACT no .env do admin
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ═══════════════════════════════════════════════════════════════
                  BLOCO 2 — OFF-CHAIN: LUNES Early Bird + Mission Pools
              ═══════════════════════════════════════════════════════════════ */}
              <div className="space-y-4">
                {/* Section label */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <Database className="w-3.5 h-3.5 text-yellow-400" />
                    <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider">OFF-CHAIN · Banco de Dados · LUNES</span>
                  </div>
                  {airdropOverview?.offChain?.error ? (
                    <span className="flex items-center gap-1 text-xs text-red-400">
                      <XCircle className="w-3.5 h-3.5" /> {airdropOverview.offChain.error}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-green-400">
                      <CheckCircle className="w-3.5 h-3.5" /> Conectado ao Web App DB
                    </span>
                  )}
                </div>

                {/* Summary cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-neutral-900 border border-yellow-500/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Coins className="w-4 h-4 text-yellow-400" />
                      <p className="text-[11px] text-neutral-500 uppercase tracking-wider">Total Alocado</p>
                    </div>
                    <p className="text-2xl font-black text-white">
                      {((airdropOverview?.offChain?.totals?.totalAllocatedLunes ?? rewardPools?.totals?.totalAllocatedLunes) ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                    </p>
                    <p className="text-[11px] text-neutral-600 mt-0.5">LUNES reservados</p>
                  </div>
                  <div className="bg-neutral-900 border border-orange-500/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-orange-400" />
                      <p className="text-[11px] text-neutral-500 uppercase tracking-wider">Comprometido</p>
                    </div>
                    <p className="text-2xl font-black text-orange-400">
                      {((airdropOverview?.offChain?.totals?.totalCommittedLunes ?? rewardPools?.totals?.totalCommittedLunes) ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-[11px] text-neutral-600 mt-0.5">LUNES comprometidos</p>
                  </div>
                  <div className="bg-neutral-900 border border-red-500/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-red-400" />
                      <p className="text-[11px] text-neutral-500 uppercase tracking-wider">Pendente Envio</p>
                    </div>
                    <p className="text-2xl font-black text-red-400">
                      {((airdropOverview?.offChain?.totals?.totalPendingLunes ?? rewardPools?.totals?.totalPendingLunes) ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-[11px] text-neutral-600 mt-0.5">LUNES aguardando tx</p>
                  </div>
                  <div className="bg-neutral-900 border border-green-500/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="w-4 h-4 text-green-400" />
                      <p className="text-[11px] text-neutral-500 uppercase tracking-wider">Saldo Livre</p>
                    </div>
                    <p className="text-2xl font-black text-green-400">
                      {((airdropOverview?.offChain?.totals?.totalRemainingLunes ?? rewardPools?.totals?.totalRemainingLunes) ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-[11px] text-neutral-600 mt-0.5">LUNES disponíveis</p>
                  </div>
                </div>

                {/* Early Bird */}
                {(airdropOverview?.offChain?.earlyBird ?? rewardPools?.earlyBird) && (() => {
                  const eb = airdropOverview?.offChain?.earlyBird ?? rewardPools?.earlyBird;
                  return (
                    <div className="bg-neutral-900 border border-yellow-500/20 rounded-2xl p-5 space-y-4">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                            <Gift className="w-5 h-5 text-yellow-400" />
                          </div>
                          <div>
                            <p className="font-bold text-white">Early Bird Distribution · OFF-CHAIN</p>
                            <p className="text-xs text-neutral-500">
                              100,000 LUNES · {eb.maxSlots?.toLocaleString("pt-BR")} slots · ≈{eb.lunesPerSlot?.toFixed(2)} LUNES/slot
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "text-xs font-bold px-3 py-1 rounded-full border",
                            eb.isFull ? "bg-red-500/10 text-red-400 border-red-500/30" : "bg-green-500/10 text-green-400 border-green-500/30"
                          )}>
                            {eb.isFull ? "ESGOTADO" : "ABERTO"}
                          </div>
                          <a
                            href="/distribution"
                            className="text-xs text-yellow-400 hover:text-yellow-300 underline"
                          >
                            Gerenciar →
                          </a>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { label: "Slots Preenchidos", value: eb.slotsClaimed?.toLocaleString("pt-BR"), sub: `de ${eb.maxSlots?.toLocaleString("pt-BR")}`, color: "text-yellow-400" },
                          { label: "LUNES Reservados", value: eb.lunesReserved?.toLocaleString("pt-BR", { maximumFractionDigits: 2 }), sub: "comprometido", color: "text-orange-400" },
                          { label: "LUNES Disponível", value: eb.lunesRemaining?.toLocaleString("pt-BR", { maximumFractionDigits: 2 }), sub: "ainda livre", color: "text-green-400" },
                          { label: "% Preenchido", value: `${eb.percentClaimed?.toFixed(1)}%`, sub: "do total", color: "text-blue-400" },
                        ].map((s) => (
                          <div key={s.label} className="bg-neutral-800/50 rounded-xl p-3">
                            <p className="text-[11px] text-neutral-500 mb-1">{s.label}</p>
                            <p className={cn("text-lg font-black", s.color)}>{s.value}</p>
                            <p className="text-[11px] text-neutral-600">{s.sub}</p>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-1">
                        <div className="h-2.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              eb.percentClaimed >= 90 ? "bg-red-500" :
                              eb.percentClaimed >= 70 ? "bg-orange-500" : "bg-yellow-400"
                            )}
                            style={{ width: `${Math.min(100, eb.percentClaimed ?? 0)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[11px] text-neutral-600">
                          <span>0 slots</span>
                          <span>{eb.slotsClaimed?.toLocaleString("pt-BR")} / {eb.maxSlots?.toLocaleString("pt-BR")} preenchidos</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Mission Pools Table */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-white">Mission Reward Pools · OFF-CHAIN</h3>
                      <p className="text-xs text-neutral-500 mt-0.5">Pools de LUNES para distribuição por missões completadas</p>
                    </div>
                    <span className="text-xs text-neutral-600">{(airdropOverview?.offChain?.pools ?? rewardPools?.pools ?? []).length} pools</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-neutral-800 text-neutral-500 text-xs">
                          <th className="text-left px-5 py-3 font-medium">Pool</th>
                          <th className="text-left px-4 py-3 font-medium">Tipo</th>
                          <th className="text-right px-4 py-3 font-medium">Alocado</th>
                          <th className="text-right px-4 py-3 font-medium">Comprometido</th>
                          <th className="text-right px-4 py-3 font-medium">Ocupação</th>
                          <th className="text-right px-4 py-3 font-medium">Missões</th>
                          <th className="text-right px-5 py-3 font-medium">Slots</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(airdropOverview?.offChain?.pools ?? rewardPools?.pools ?? []).map((pool: any) => (
                          <tr key={pool.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors">
                            <td className="px-5 py-3">
                              <p className="font-medium text-white text-sm">{pool.name}</p>
                              <p className="text-xs text-neutral-500">{pool.currency ?? "LUNES"}</p>
                            </td>
                            <td className="px-4 py-3">
                              <span className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase",
                                pool.type === "EARLY_BIRD"
                                  ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
                                  : pool.type === "ONCHAIN"
                                  ? "bg-purple-500/10 text-purple-400 border-purple-500/30"
                                  : "bg-blue-500/10 text-blue-400 border-blue-500/30"
                              )}>
                                {pool.type === "EARLY_BIRD" ? "Early Bird" : pool.type === "ONCHAIN" ? "On-chain" : "Off-chain"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-neutral-300 text-sm">
                              {pool.totalAmount?.toLocaleString("pt-BR")}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-sm">
                              <span className={pool.committed > 0 ? "text-orange-400" : "text-neutral-600"}>
                                {pool.committed?.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-16 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                                  <div
                                    className={cn(
                                      "h-full rounded-full",
                                      pool.percentCommitted >= 90 ? "bg-red-500" :
                                      pool.percentCommitted >= 70 ? "bg-orange-500" : "bg-yellow-400"
                                    )}
                                    style={{ width: `${Math.min(100, pool.percentCommitted ?? 0)}%` }}
                                  />
                                </div>
                                <span className="text-xs text-neutral-400 w-10 text-right">{(pool.percentCommitted ?? 0).toFixed(1)}%</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right text-neutral-400 text-sm">{pool.missionCount ?? 0}</td>
                            <td className="px-5 py-3 text-right text-neutral-400 text-sm">
                              {pool.maxSlots
                                ? `${pool.slotsClaimed?.toLocaleString("pt-BR")} / ${pool.maxSlots?.toLocaleString("pt-BR")}`
                                : "—"}
                            </td>
                          </tr>
                        ))}
                        {(airdropOverview?.offChain?.pools ?? rewardPools?.pools ?? []).length === 0 && (
                          <tr>
                            <td colSpan={7} className="px-5 py-8 text-center text-neutral-600 text-sm">
                              Nenhum pool encontrado. Verifique se o Web App está rodando.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Pending distribution alert */}
                {((airdropOverview?.offChain?.totals?.totalPendingLunes ?? rewardPools?.totals?.totalPendingLunes) ?? 0) > 0 && (
                  <div className="flex items-start gap-3 p-4 bg-orange-900/10 border border-orange-500/20 rounded-xl text-orange-400">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">Passivo Off-Chain Pendente</p>
                      <p className="text-xs text-orange-400/80 mt-1">
                        <strong>{((airdropOverview?.offChain?.totals?.totalPendingLunes ?? rewardPools?.totals?.totalPendingLunes) ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} LUNES</strong> registrados no DB ainda não enviados on-chain.
                        Acesse <a href="/distribution" className="underline font-bold">Distribuição EB</a> para liquidar os claims pendentes.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Footer Alert */}
      <div className="mt-8 flex items-start gap-3 p-4 bg-blue-900/10 border border-blue-500/20 rounded-xl text-blue-400">
        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">Gestão de Ativos</p>
          <p className="text-sm text-blue-400/80 mt-1">
            As carteiras listadas são monitoradas em tempo real. Movimentações acima de $ 50.000 exigem aprovação multi-signature.
          </p>
        </div>
      </div>
    </div>
  );
}

