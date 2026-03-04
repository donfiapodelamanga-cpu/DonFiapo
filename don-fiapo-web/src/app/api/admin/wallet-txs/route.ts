import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const ADMIN_KEY = process.env.ADMIN_API_KEY;

// Maps prize sublabel → SystemWallet key (matches don-fiapo-admin SystemWallet.key convention)
const PRIZE_WALLET_KEY: Record<string, string> = {
  FIAPO: "spin_fiapo",
  USDT: "spin_usdt",
  LUNES: "spin_lunes",
};

// Tokens that involve real on-chain payout (excludes SPIN bonus and MISS)
const PAYOUT_SUBLABELS = new Set(Object.keys(PRIZE_WALLET_KEY));

/**
 * Parses prize label strings like "100K", "50K", "1K", "0.5", "5" into a number.
 */
function parsePrizeAmount(label: string): number {
  const s = label.trim().toUpperCase();
  if (s.endsWith("K")) return parseFloat(s.slice(0, -1)) * 1_000;
  return parseFloat(s) || 0;
}

/**
 * GET /api/admin/wallet-txs
 *
 * Returns a unified list of on-chain / event-driven transactions sourced from:
 *   - SpinPurchase (CONFIRMED) — revenue wallet receives USDT
 *   - SpinResult (real prize payouts) — pool wallet pays out tokens
 *   - TokenMigration — treasury_solana receives FIAPO, treasury_lunes sends FIAPO (+2%)
 *
 * Query params:
 *   since  — ISO date string (default: 90 days ago)
 *   limit  — max records per source (default: 500, max: 1000)
 */
export async function GET(req: NextRequest) {
  const key = req.headers.get("x-admin-key");
  if (!ADMIN_KEY || key !== ADMIN_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const sinceRaw = searchParams.get("since");
  const since = sinceRaw && sinceRaw !== "all"
    ? new Date(sinceRaw)
    : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const limit = Math.min(1000, parseInt(searchParams.get("limit") || "500"));

  const [spinPurchases, spinResults, migrations] = await Promise.all([
    db.spinPurchase.findMany({
      where: { status: "CONFIRMED", confirmedAt: { gte: since } },
      orderBy: { confirmedAt: "desc" },
      take: limit,
      include: { user: { select: { id: true, xUsername: true } } },
    }).catch(() => []),

    db.spinResult.findMany({
      where: {
        playedAt: { gte: since },
        prizeSublabel: { in: Array.from(PAYOUT_SUBLABELS) },
      },
      orderBy: { playedAt: "desc" },
      take: limit,
      include: { user: { select: { id: true } } },
    }).catch(() => []),

    db.tokenMigration.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { user: { select: { id: true, xUsername: true } } },
    }).catch(() => []),
  ]);

  const txs = [
    // ── Spin Purchases → spin_revenue receives USDT ──────────────────────────
    ...spinPurchases.map((p) => ({
      externalId: `spinpurchase:${p.id}`,
      walletKey: "spin_revenue",
      sourceType: "spin_purchase",
      direction: "in",
      amount: p.priceUsdt,
      symbol: "USDT",
      status: "confirmed",
      description: `Spin Purchase — ${p.spins} spin(s) · ${p.user.xUsername ?? "user"}`,
      fromAddress: null,
      toAddress: null,
      txHash: p.solanaTxHash ?? null,
      onChainAt: (p.confirmedAt ?? p.createdAt).toISOString(),
      metadata: {
        spins: p.spins,
        paymentId: p.paymentId,
        userId: p.userId,
      },
    })),

    // ── Spin Payouts → pool wallet pays out tokens ────────────────────────────
    ...spinResults
      .filter((r) => PAYOUT_SUBLABELS.has(r.prizeSublabel))
      .map((r) => ({
        externalId: `spinpayout:${r.id}`,
        walletKey: PRIZE_WALLET_KEY[r.prizeSublabel] ?? "spin_fiapo",
        sourceType: "spin_payout",
        direction: "out",
        amount: parsePrizeAmount(r.prizeLabel),
        symbol: r.prizeSublabel,
        status: "confirmed",
        description: `Spin Prize — ${r.prizeLabel} ${r.prizeSublabel} (${r.tier})`,
        fromAddress: null,
        toAddress: null,
        txHash: null,
        onChainAt: r.playedAt.toISOString(),
        metadata: {
          prizeIndex: r.prizeIndex,
          tier: r.tier,
          userId: r.userId,
        },
      })),

    // ── Migration In → treasury_solana receives FIAPO from user ──────────────
    ...migrations.map((m) => ({
      externalId: `migration_in:${m.id}`,
      walletKey: "treasury_solana",
      sourceType: "migration_in",
      direction: "in",
      amount: m.amountSolana,
      symbol: "FIAPO",
      status:
        m.status === "APPROVED" ? "confirmed"
        : m.status === "REJECTED" ? "failed"
        : "pending",
      description: `Migration Received — ${m.user.xUsername ?? m.solanaSender.slice(0, 10)}…`,
      fromAddress: m.solanaSender,
      toAddress: null,
      txHash: m.solanaTxHash,
      onChainAt: m.createdAt.toISOString(),
      metadata: {
        lunesRecipient: m.lunesRecipient,
        migrationStatus: m.status,
        userId: m.userId,
      },
    })),

    // ── Migration Out → treasury_lunes sends FIAPO (+2% bonus) ───────────────
    ...migrations
      .filter((m) => m.status === "APPROVED")
      .map((m) => ({
        externalId: `migration_out:${m.id}`,
        walletKey: "treasury_lunes",
        sourceType: "migration_out",
        direction: "out",
        amount: m.amountLunes,
        symbol: "FIAPO",
        status: "confirmed",
        description: `Migration Sent (+2%) — treasury → ${m.lunesRecipient.slice(0, 10)}…`,
        fromAddress: null,
        toAddress: m.lunesRecipient,
        txHash: m.lunesTxHash ?? null,
        onChainAt: (m.approvedAt ?? m.createdAt).toISOString(),
        metadata: {
          solanaTxHash: m.solanaTxHash,
          amountSolana: m.amountSolana,
          userId: m.userId,
        },
      })),
  ];

  return NextResponse.json({
    txs,
    synced: txs.length,
    sources: {
      spinPurchases: spinPurchases.length,
      spinPayouts: spinResults.filter((r) => PAYOUT_SUBLABELS.has(r.prizeSublabel)).length,
      migrationsIn: migrations.length,
      migrationsOut: migrations.filter((m) => m.status === "APPROVED").length,
    },
  });
}
