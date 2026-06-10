import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/server/admin-auth";

// ─── Unified Sale Event ────────────────────────────────────────────────────────

export interface SaleEvent {
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

// ─── Channel mapping for WalletTransaction source types ──────────────────────

const SOURCE_CHANNEL: Record<string, string> = {
  spin_purchase: "App",
  migration_in: "Website",
  nft_mint: "Marketplace",
  staking: "App",
  contract_event: "Blockchain",
};

// ─── Revenue category → channel ───────────────────────────────────────────────

const REVENUE_CHANNEL: Record<string, string> = {
  Spin: "App",
  NFT: "Marketplace",
  Staking: "App",
  ICO: "Website",
  Parcerias: "Partner",
  Vendas: "Website",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function pctChange(cur: number, prev: number): number {
  if (prev === 0) return cur > 0 ? 100 : 0;
  return Math.round(((cur - prev) / prev) * 1000) / 10;
}

export function trendDir(cur: number, prev: number): "up" | "down" | "neutral" {
  if (cur > prev) return "up";
  if (cur < prev) return "down";
  return "neutral";
}

/**
 * Derives a human-readable product name from a WalletTransaction record.
 * Future sourceTypes can be added here without touching any other file.
 */
export function walletTxProduct(wt: {
  sourceType: string;
  description: string;
  metadata: string | null;
}): string {
  try {
    const meta = wt.metadata ? (JSON.parse(wt.metadata) as Record<string, unknown>) : {};

    switch (wt.sourceType) {
      case "spin_purchase":
        return `Spin Game — ${meta.spins ?? "?"} Ticket(s)`;
      case "migration_in":
        return "Token Migration (Presale)";
      case "nft_mint": {
        const col = meta.collectionName as string | undefined;
        return col ? `NFT: ${col}` : "NFT Mint";
      }
      case "staking":
        return "Staking Activation";
      default:
        return wt.description || wt.sourceType;
    }
  } catch {
    return wt.description || wt.sourceType;
  }
}

/**
 * Normalises a raw sale status string into the unified "completed | pending | failed" enum.
 */
function normaliseStatus(s: string): "completed" | "pending" | "failed" {
  if (["completed", "confirmed", "APPROVED", "CONFIRMED"].includes(s)) return "completed";
  if (["failed", "REJECTED", "EXPIRED", "canceled"].includes(s)) return "failed";
  return "pending";
}

/**
 * Groups a product name to a top-level category key.
 * e.g. "Spin Game — 5 Tickets" → "Spin Game"
 *      "NFT: The Royal Scepter — #1" → "NFT"
 */
function productGroupKey(product: string): string {
  return product.split(" — ")[0].split(":")[0].trim();
}

// ─── Route Handler ────────────────────────────────────────────────────────────

/**
 * GET /api/admin/sales/overview
 *
 * Aggregates sales events from four sources:
 *   1. Sale          — manual entries (admin UI)
 *   2. WalletTransaction (direction=in) — on-chain indexed events (spin purchases, migrations, NFT mints)
 *   3. Revenue       — off-chain revenue records
 *   4. NFTCollectionItem (mintedCount > 0) — minted NFT items from admin collections
 *
 * Any new wallet type registered in SystemWallet + synced via /api/admin/transactions/sync
 * will automatically appear here without code changes.
 *
 * Query params:
 *   from    — ISO date (default: 30 days ago)
 *   to      — ISO date (default: now)
 *   source  — "all" | "manual" | "on_chain" | "revenue" | "nft" (default: "all")
 *   page    — 1-indexed (default: 1)
 *   limit   — max rows per page (default: 20, max: 100)
 */
export async function GET(req: NextRequest) {
  const auth = requireAdminAuth(req, "sales");
  if (!auth.ok) return auth.response;

  const { searchParams } = req.nextUrl;
  const rawFrom = searchParams.get("from");
  const rawTo = searchParams.get("to");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, parseInt(searchParams.get("limit") || "20"));
  const sourceFilter = searchParams.get("source") || "all";

  const now = new Date();
  const rangeEnd = rawTo ? new Date(rawTo + "T23:59:59.999Z") : now;
  const rangeStart = rawFrom
    ? new Date(rawFrom + "T00:00:00.000Z")
    : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const rangeMs = rangeEnd.getTime() - rangeStart.getTime();
  const prevStart = new Date(rangeStart.getTime() - rangeMs);
  const prevEnd = rangeStart;

  const curFilter = { gte: rangeStart, lte: rangeEnd };
  const prevFilter = { gte: prevStart, lte: prevEnd };

  // ── Fetch current + previous period in parallel ───────────────────────────
  const [
    manualSales,
    prevManualSales,
    onChainSales,
    prevOnChainSales,
    revenues,
    prevRevenues,
    nftItems,
  ] = await Promise.all([
    prisma.sale.findMany({
      where: { date: curFilter },
      orderBy: { date: "desc" },
    }),
    prisma.sale.findMany({
      where: { date: prevFilter },
      select: { amount: true, status: true, customer: true },
    }),

    // WalletTransaction: only income events are "sales"
    prisma.walletTransaction.findMany({
      where: { onChainAt: curFilter, direction: "in" },
      orderBy: { onChainAt: "desc" },
    }),
    prisma.walletTransaction.findMany({
      where: { onChainAt: prevFilter, direction: "in" },
      select: { amount: true, status: true },
    }),

    prisma.revenue.findMany({
      where: { date: curFilter },
      orderBy: { date: "desc" },
    }),
    prisma.revenue.findMany({
      where: { date: prevFilter },
      select: { amount: true, status: true },
    }),

    // NFT items minted within the period
    prisma.nFTCollectionItem.findMany({
      where: {
        mintedAt: curFilter,
        mintedCount: { gt: 0 },
      },
      include: {
        collection: { select: { name: true } },
      },
    }),
  ]);

  // ── Normalise to unified SaleEvent[] ─────────────────────────────────────
  const allEvents: SaleEvent[] = [
    ...manualSales.map((s) => ({
      id: s.id,
      source: "manual" as const,
      product: s.product,
      customer: s.customer,
      channel: s.channel,
      amount: s.amount,
      currency: s.currency,
      status: normaliseStatus(s.status),
      date: s.date.toISOString(),
    })),

    ...onChainSales.map((wt) => ({
      id: wt.id,
      source: "on_chain" as const,
      product: walletTxProduct(wt),
      customer: wt.fromAddress || wt.walletKey,
      channel: SOURCE_CHANNEL[wt.sourceType] ?? "Website",
      amount: wt.amount,
      currency: wt.symbol,
      status: normaliseStatus(wt.status),
      date: wt.onChainAt.toISOString(),
    })),

    ...revenues.map((r) => ({
      id: r.id,
      source: "revenue" as const,
      product: r.source || r.description,
      customer: r.source || "—",
      channel: REVENUE_CHANNEL[r.category] ?? "Website",
      amount: r.amount,
      currency: r.currency,
      status: normaliseStatus(r.status),
      date: r.date.toISOString(),
    })),

    ...nftItems.map((item) => ({
      id: `nft:${item.id}`,
      source: "nft" as const,
      product: `NFT: ${item.collection.name} — ${item.name}`,
      customer: "—",
      channel: "Marketplace",
      amount: item.price * item.mintedCount,
      currency: item.currency,
      status: "completed" as const,
      date: (item.mintedAt ?? new Date()).toISOString(),
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // ── Apply source filter ────────────────────────────────────────────────────
  const filtered = sourceFilter === "all"
    ? allEvents
    : allEvents.filter((e) => e.source === sourceFilter);

  // ── Paginate ─────────────────────────────────────────────────────────────
  const total = filtered.length;
  const recentSales = filtered.slice((page - 1) * limit, page * limit);

  // ── Channel breakdown (on all unfiltered events for accuracy) ────────────
  const channelMap = new Map<string, { amount: number; count: number }>();
  for (const e of allEvents) {
    const entry = channelMap.get(e.channel) ?? { amount: 0, count: 0 };
    entry.amount += e.amount;
    entry.count += 1;
    channelMap.set(e.channel, entry);
  }
  const totalVolume = allEvents.reduce((s, e) => s + e.amount, 0);
  const channelBreakdown = Array.from(channelMap.entries())
    .map(([channel, { amount, count }]) => ({
      channel,
      amount,
      count,
      pct: totalVolume > 0 ? Math.round((amount / totalVolume) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  // ── Top products ──────────────────────────────────────────────────────────
  const productMap = new Map<string, { count: number; revenue: number; currency: string }>();
  for (const e of allEvents) {
    const key = productGroupKey(e.product);
    const entry = productMap.get(key) ?? { count: 0, revenue: 0, currency: e.currency };
    entry.count += 1;
    entry.revenue += e.amount;
    productMap.set(key, entry);
  }
  const topProducts = Array.from(productMap.entries())
    .map(([product, { count, revenue, currency }]) => ({ product, count, revenue, currency }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);

  // ── Stats (current vs previous period) ───────────────────────────────────
  const curTotal = allEvents.length;
  const curVolume = totalVolume;
  const curAvgTicket = curTotal > 0 ? curVolume / curTotal : 0;
  const curCustomers = new Set(allEvents.map((e) => e.customer).filter((c) => c !== "—")).size;

  const prevTotal = prevManualSales.length + prevOnChainSales.length + prevRevenues.length;
  const prevVolume =
    prevManualSales.reduce((s, e) => s + e.amount, 0) +
    prevOnChainSales.reduce((s, e) => s + e.amount, 0) +
    prevRevenues.reduce((s, e) => s + e.amount, 0);
  const prevAvgTicket = prevTotal > 0 ? prevVolume / prevTotal : 0;
  const prevCustomers = new Set(prevManualSales.map((e) => e.customer).filter(Boolean)).size;

  return NextResponse.json({
    stats: {
      totalRevenue: {
        value: curVolume,
        change: pctChange(curVolume, prevVolume),
        trend: trendDir(curVolume, prevVolume),
      },
      totalSales: {
        value: curTotal,
        change: pctChange(curTotal, prevTotal),
        trend: trendDir(curTotal, prevTotal),
      },
      avgTicket: {
        value: curAvgTicket,
        change: pctChange(curAvgTicket, prevAvgTicket),
        trend: trendDir(curAvgTicket, prevAvgTicket),
      },
      newCustomers: {
        value: curCustomers,
        change: pctChange(curCustomers, prevCustomers),
        trend: trendDir(curCustomers, prevCustomers),
      },
    },
    channelBreakdown,
    topProducts,
    recentSales,
    pagination: {
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
    },
    meta: {
      rangeStart: rangeStart.toISOString(),
      rangeEnd: rangeEnd.toISOString(),
      sources: {
        manual: manualSales.length,
        on_chain: onChainSales.length,
        revenue: revenues.length,
        nft: nftItems.length,
      },
    },
  });
}
