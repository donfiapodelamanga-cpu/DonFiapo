import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/server/admin-auth";

type TxStatus = "completed" | "pending" | "failed" | "canceled";
type TxType = "income" | "expense";
type TxSource = "wallet" | "revenue" | "expense" | "sale" | "on_chain";

interface NormalizedTx {
  id: string;
  source: TxSource;
  type: TxType;
  description: string;
  category: string;
  amount: number;
  currency: string;
  status: TxStatus;
  date: string;
}

function mapExpenseStatus(s: string): TxStatus {
  if (s === "paid") return "completed";
  if (s === "canceled") return "canceled";
  return "pending";
}

function mapRevenueStatus(s: string): TxStatus {
  if (s === "confirmed") return "completed";
  if (s === "canceled") return "canceled";
  return "pending";
}

function mapGenericStatus(s: string): TxStatus {
  if (s === "completed") return "completed";
  if (s === "failed") return "failed";
  if (s === "canceled") return "canceled";
  return "pending";
}

function pctChange(curr: number, prev: number): string {
  if (prev === 0) return curr > 0 ? "+∞% vs período anterior" : "Sem dados anteriores";
  const delta = ((curr - prev) / prev) * 100;
  return `${delta >= 0 ? "+" : ""}${delta.toFixed(0)}% vs período anterior`;
}

function trendDir(curr: number, prev: number): "up" | "down" | "neutral" {
  if (curr > prev) return "up";
  if (curr < prev) return "down";
  return "neutral";
}

export async function GET(req: NextRequest) {
  const auth = requireAdminAuth(req, "transactions");
  if (!auth.ok) return auth.response;

  const { searchParams } = req.nextUrl;
  const typeFilter = searchParams.get("type") || "all";
  const statusFilter = searchParams.get("status") || "all";
  const search = searchParams.get("search") || "";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(10, parseInt(searchParams.get("limit") || "50")));

  const now = new Date();
  const rawFrom = searchParams.get("from");
  const rawTo = searchParams.get("to");
  const rangeEnd = rawTo ? new Date(rawTo + "T23:59:59.999Z") : now;
  const rangeStart = rawFrom ? new Date(rawFrom + "T00:00:00.000Z") : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const rangeMs = rangeEnd.getTime() - rangeStart.getTime();
  const prevStart = new Date(rangeStart.getTime() - rangeMs);
  const prevEnd = rangeStart;

  const curFilter = { gte: rangeStart, lte: rangeEnd };
  const prevFilter = { gte: prevStart, lte: prevEnd };

  // Fetch current period from all sources in parallel
  const [walletTxs, revenues, expenses, sales, onChainTxs] = await Promise.all([
    prisma.transaction.findMany({
      include: { wallet: { select: { name: true, symbol: true, network: true } } },
      where: { createdAt: curFilter },
      orderBy: { createdAt: "desc" },
    }),
    prisma.revenue.findMany({ where: { date: curFilter }, orderBy: { date: "desc" } }),
    prisma.expense.findMany({ where: { createdAt: curFilter }, orderBy: { createdAt: "desc" } }),
    prisma.sale.findMany({ where: { date: curFilter }, orderBy: { date: "desc" } }),
    prisma.walletTransaction.findMany({ where: { onChainAt: curFilter }, orderBy: { onChainAt: "desc" } }),
  ]);

  // Fetch previous period (lean — only fields needed for stats)
  const [prevWallet, prevRevenue, prevExpense, prevSale, prevOnChain] = await Promise.all([
    prisma.transaction.findMany({
      where: { createdAt: prevFilter },
      select: { type: true, amount: true, status: true },
    }),
    prisma.revenue.findMany({
      where: { date: prevFilter },
      select: { amount: true, status: true },
    }),
    prisma.expense.findMany({
      where: { createdAt: prevFilter },
      select: { amount: true, status: true },
    }),
    prisma.sale.findMany({
      where: { date: prevFilter },
      select: { amount: true, status: true },
    }),
    prisma.walletTransaction.findMany({
      where: { onChainAt: prevFilter },
      select: { direction: true, amount: true, status: true },
    }),
  ]);

  // Normalize current period to unified shape
  const all: NormalizedTx[] = [
    ...walletTxs.map((t) => ({
      id: t.id,
      source: "wallet" as TxSource,
      type: (t.type === "deposit" ? "income" : "expense") as TxType,
      description: t.description || `Transferência — ${t.wallet?.name || t.wallet?.symbol || "Wallet"}`,
      category: t.wallet?.network || "Wallet Transfer",
      amount: t.amount,
      currency: t.wallet?.symbol || "USDT",
      status: mapGenericStatus(t.status),
      date: t.createdAt.toISOString(),
    })),
    ...revenues.map((r) => ({
      id: r.id,
      source: "revenue" as TxSource,
      type: "income" as TxType,
      description: r.description,
      category: r.category,
      amount: r.amount,
      currency: r.currency,
      status: mapRevenueStatus(r.status),
      date: r.date.toISOString(),
    })),
    ...expenses.map((e) => ({
      id: e.id,
      source: "expense" as TxSource,
      type: "expense" as TxType,
      description: e.description,
      category: e.category,
      amount: e.amount,
      currency: e.currency,
      status: mapExpenseStatus(e.status),
      date: (e.paidAt || e.createdAt).toISOString(),
    })),
    ...sales.map((s) => ({
      id: s.id,
      source: "sale" as TxSource,
      type: "income" as TxType,
      description: `Venda: ${s.product} — ${s.customer}`,
      category: s.channel,
      amount: s.amount,
      currency: "USDT",
      status: mapGenericStatus(s.status),
      date: s.date.toISOString(),
    })),
    ...onChainTxs.map((t) => ({
      id: t.id,
      source: "on_chain" as TxSource,
      type: (t.direction === "in" ? "income" : "expense") as TxType,
      description: t.description,
      category: `${t.walletKey}${t.network ? ` · ${t.network}` : ""}`,
      amount: t.amount,
      currency: t.symbol,
      status: mapGenericStatus(t.status),
      date: t.onChainAt.toISOString(),
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Apply filters
  let filtered = all;
  if (typeFilter !== "all") filtered = filtered.filter((t) => t.type === typeFilter);
  if (statusFilter !== "all") filtered = filtered.filter((t) => t.status === statusFilter);
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (t) =>
        t.description.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
    );
  }

  // Paginate
  const total = filtered.length;
  const skip = (page - 1) * limit;
  const paginated = filtered.slice(skip, skip + limit);

  // Current period stats (on unfiltered 'all' for accuracy)
  const curTotal = all.length;
  const curVolume = all.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const curCompleted = all.filter((t) => t.status === "completed").length;
  const curSuccessRate = curTotal > 0 ? Math.round((curCompleted / curTotal) * 100) : 0;

  // Previous period stats
  const prevTotal =
    prevWallet.length + prevRevenue.length + prevExpense.length + prevSale.length + prevOnChain.length;
  const prevVolume =
    prevWallet.filter((t) => t.type === "deposit").reduce((s, t) => s + t.amount, 0) +
    prevRevenue.reduce((s, r) => s + r.amount, 0) +
    prevSale.reduce((s, s2) => s + s2.amount, 0) +
    prevOnChain.filter((t) => t.direction === "in").reduce((s, t) => s + t.amount, 0);
  const prevCompleted =
    prevWallet.filter((t) => t.status === "completed").length +
    prevRevenue.filter((r) => r.status === "confirmed").length +
    prevExpense.filter((e) => e.status === "paid").length +
    prevSale.filter((s) => s.status === "completed").length +
    prevOnChain.filter((t) => t.status === "confirmed").length;
  const prevSuccessRate = prevTotal > 0 ? Math.round((prevCompleted / prevTotal) * 100) : 0;

  return NextResponse.json({
    transactions: paginated,
    pagination: {
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
    },
    stats: {
      total: {
        value: curTotal,
        change: pctChange(curTotal, prevTotal),
        trend: trendDir(curTotal, prevTotal),
      },
      volume: {
        value: curVolume,
        change: pctChange(curVolume, prevVolume),
        trend: trendDir(curVolume, prevVolume),
      },
      successRate: {
        value: curSuccessRate,
        change: pctChange(curSuccessRate, prevSuccessRate),
        trend: trendDir(curSuccessRate, prevSuccessRate),
      },
    },
  });
}
