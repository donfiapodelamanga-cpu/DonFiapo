import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/server/admin-auth";

const WEB_API = process.env.WEB_API_URL || "http://localhost:3000";
const ADMIN_KEY = process.env.ADMIN_API_KEY || "";

interface RemoteWalletTx {
  externalId: string;
  walletKey: string;
  sourceType: string;
  direction: "in" | "out";
  amount: number;
  symbol: string;
  status: string;
  description: string;
  fromAddress: string | null;
  toAddress: string | null;
  txHash: string | null;
  onChainAt: string;
  metadata: Record<string, unknown> | null;
}

/**
 * POST /api/admin/transactions/sync
 *
 * Fetches on-chain / event-driven transactions from don-fiapo-web,
 * enriches them with SystemWallet metadata (address, network),
 * and upserts them into the local WalletTransaction cache.
 *
 * Query params:
 *   since — ISO date string or "all" (default: 90 days ago)
 */
export async function POST(req: NextRequest) {
  const auth = requireAdminAuth(req, "transactions");
  if (!auth.ok) return auth.response;

  const { searchParams } = req.nextUrl;
  const sinceParam = searchParams.get("since");
  const since =
    sinceParam === "all"
      ? "all"
      : sinceParam
      ? sinceParam
      : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  // Build SystemWallet address map for enrichment
  const systemWallets = await prisma.systemWallet.findMany({
    where: { isActive: true },
    select: { key: true, address: true, network: true },
  });
  const walletMap = new Map(
    systemWallets.map((w) => [w.key, { address: w.address, network: w.network }])
  );

  // Fetch normalized transactions from don-fiapo-web
  let remoteTxs: RemoteWalletTx[] = [];
  let remoteSources: Record<string, number> = {};

  try {
    const url = `${WEB_API}/api/admin/wallet-txs?since=${since}&limit=1000`;
    const res = await fetch(url, {
      method: "GET",
      headers: { "x-admin-key": ADMIN_KEY },
      signal: AbortSignal.timeout(20_000),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `don-fiapo-web returned ${res.status}`, detail: errBody },
        { status: 502 }
      );
    }

    const data = await res.json();
    remoteTxs = data.txs ?? [];
    remoteSources = data.sources ?? {};
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[SYNC] Fetch failed:", msg);
    return NextResponse.json(
      { error: "Failed to connect to don-fiapo-web", detail: msg },
      { status: 502 }
    );
  }

  // Upsert each transaction — idempotent via externalId unique constraint
  let created = 0;
  let updated = 0;
  let errored = 0;

  for (const tx of remoteTxs) {
    const wallet = walletMap.get(tx.walletKey);
    try {
      const result = await prisma.walletTransaction.upsert({
        where: { externalId: tx.externalId },
        create: {
          walletKey: tx.walletKey,
          walletAddress: wallet?.address ?? null,
          network: wallet?.network ?? null,
          externalId: tx.externalId,
          sourceType: tx.sourceType,
          direction: tx.direction,
          amount: tx.amount,
          symbol: tx.symbol,
          status: tx.status,
          description: tx.description,
          fromAddress: tx.fromAddress ?? null,
          toAddress: tx.toAddress ?? null,
          txHash: tx.txHash ?? null,
          metadata: tx.metadata ? JSON.stringify(tx.metadata) : null,
          onChainAt: new Date(tx.onChainAt),
        },
        update: {
          // Only mutable fields — status can change (pending → confirmed)
          status: tx.status,
          txHash: tx.txHash ?? null,
          walletAddress: wallet?.address ?? null,
          network: wallet?.network ?? null,
        },
      });

      // Prisma upsert doesn't distinguish create vs update easily;
      // use indexedAt as a heuristic: if it was just set, it's a create.
      const ageSec = (Date.now() - result.indexedAt.getTime()) / 1000;
      if (ageSec < 5) created++;
      else updated++;
    } catch (err: unknown) {
      errored++;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[SYNC] Failed to upsert ${tx.externalId}:`, msg);
    }
  }

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    walletsTracked: systemWallets.length,
    remote: {
      total: remoteTxs.length,
      sources: remoteSources,
    },
    local: {
      created,
      updated,
      errored,
    },
  });
}
