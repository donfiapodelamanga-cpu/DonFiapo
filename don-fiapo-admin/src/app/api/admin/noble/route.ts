import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/server/admin-auth";
import { randomBytes } from "crypto";

const NOBLE_CONTRACT = process.env.NOBLE_CONTRACT || "";

function generateReferralCode(): string {
  return `N-${randomBytes(4).toString("hex").toUpperCase()}`;
}

// Commission split constants (from smart contract)
const NOBLE_COMMISSION_RATE = 7 / 12; // 58.3%
const COMMERCIAL_COMMISSION_RATE = 5 / 12; // 41.7%

/**
 * GET /api/admin/noble
 * Returns Noble list + config + stats from real DB
 */
export async function GET(request: NextRequest) {
  const auth = requireAdminAuth(request, "commercial");
  if (!auth.ok) return auth.response;

  try {
    const nobles = await prisma.noble.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        partner: { select: { id: true, name: true, type: true, trackingCode: true } },
        _count: { select: { salesRecords: true, commissions: true } },
      },
    });

    // Compute real stats per noble
    const enrichedNobles = await Promise.all(
      nobles.map(async (n) => {
        const salesAgg = await prisma.sale.aggregate({
          where: { nobleId: n.id, status: "completed" },
          _sum: { amount: true },
          _count: { id: true },
        });

        const commAgg = await prisma.partnerCommission.aggregate({
          where: { nobleId: n.id },
          _sum: { amount: true },
        });

        const pendingComm = await prisma.partnerCommission.aggregate({
          where: { nobleId: n.id, status: "pending" },
          _sum: { amount: true },
        });

        return {
          id: n.id,
          name: n.name,
          email: n.email,
          tier: n.tier,
          status: n.status,
          walletAddress: n.walletAddress,
          solanaWallet: n.solanaWallet,
          referralCode: n.referralCode,
          totalSales: salesAgg._sum.amount ?? n.totalSales,
          totalReferrals: n.totalReferrals,
          totalCommission: commAgg._sum.amount ?? n.totalCommission,
          pendingCommission: pendingComm._sum.amount ?? 0,
          salesCount: salesAgg._count.id,
          partner: n.partner,
          createdAt: n.createdAt.toISOString(),
        };
      })
    );

    // Aggregate stats
    const totalActive = nobles.filter((n) => n.status === "Active").length;
    const totalProbation = nobles.filter((n) => n.status === "Probation").length;

    return NextResponse.json({
      nobles: enrichedNobles,
      stats: {
        total: nobles.length,
        active: totalActive,
        probation: totalProbation,
        suspended: nobles.filter((n) => n.status === "Suspended").length,
      },
      configured: !!NOBLE_CONTRACT,
      contractAddress: NOBLE_CONTRACT,
      config: {
        activationThreshold: 10,
        maintenanceThreshold: 2,
        minWithdrawLunes: 10,
        minWithdrawFiapo: 1000,
        payoutInterval: "15 dias",
        commissionSplit: {
          noble: `${(NOBLE_COMMISSION_RATE * 100).toFixed(1)}%`,
          commercial: `${(COMMERCIAL_COMMISSION_RATE * 100).toFixed(1)}%`,
        },
      },
      revenueSources: [
        { source: "ICO NFT", description: "12% do markup de vendas com código afiliado" },
        { source: "Marketplace Fee", description: "Parte da taxa de venda (10% do fee)" },
        { source: "Staking Entry", description: "5% da taxa de entrada no staking" },
        { source: "Governance", description: "Taxas de propostas e votos" },
      ],
    });
  } catch (error) {
    console.error("[NOBLE_GET]", error);
    return NextResponse.json({ error: "Failed to fetch nobles" }, { status: 500 });
  }
}

/**
 * POST /api/admin/noble — create new Noble affiliate
 */
export async function POST(request: NextRequest) {
  const auth = requireAdminAuth(request, "commercial");
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const { name, email, walletAddress, solanaWallet, tier } = body;

    if (!name || !email || !walletAddress) {
      return NextResponse.json(
        { error: "Missing required fields: name, email, walletAddress" },
        { status: 400 }
      );
    }

    // Check for duplicates
    const existing = await prisma.noble.findFirst({
      where: { OR: [{ email }, { walletAddress }] },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Noble with this email or wallet already exists" },
        { status: 409 }
      );
    }

    // Generate unique referral code
    let referralCode = generateReferralCode();
    const existingCode = await prisma.noble.findFirst({ where: { referralCode } });
    if (existingCode) referralCode = generateReferralCode();

    const noble = await prisma.noble.create({
      data: {
        name,
        email,
        walletAddress,
        solanaWallet: solanaWallet || null,
        tier: tier || "Silver",
        status: "Probation",
        referralCode,
      },
    });

    return NextResponse.json(noble, { status: 201 });
  } catch (error) {
    console.error("[NOBLE_POST]", error);
    return NextResponse.json({ error: "Failed to create noble" }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/noble — update noble status, tier, or details
 */
export async function PATCH(request: NextRequest) {
  const auth = requireAdminAuth(request, "commercial");
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Noble id required" }, { status: 400 });
    }

    const noble = await prisma.noble.update({
      where: { id },
      data: updates,
    });

    return NextResponse.json(noble);
  } catch (error) {
    console.error("[NOBLE_PATCH]", error);
    return NextResponse.json({ error: "Failed to update noble" }, { status: 500 });
  }
}
