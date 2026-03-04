import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

function checkAdmin(req: NextRequest): boolean {
  const adminKey = req.headers.get("x-admin-key");
  return adminKey === process.env.ADMIN_API_KEY;
}

/**
 * GET /api/admin/airdrop/claims
 * Returns all Early Bird claims with user wallet addresses for distribution management.
 * Supports ?status=PENDING|SENT|FAILED and ?page=1&limit=50
 */
export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const skip = (page - 1) * limit;

  try {
    const [claims, total] = await Promise.all([
      db.earlyBirdClaim.findMany({
        where: status ? { distributionStatus: status } : undefined,
        include: {
          user: {
            select: {
              id: true,
              xUsername: true,
              totalScore: true,
              offchainScore: true,
              onchainScore: true,
              rank: true,
              isBanned: true,
              wallets: {
                where: { network: "LUNES" },
                select: { address: true, isPrimary: true },
                orderBy: { isPrimary: "desc" },
                take: 1,
              },
              _count: {
                select: {
                  completions: { where: { status: "VERIFIED" } },
                  referralsMade: { where: { status: "QUALIFIED" } },
                },
              },
            },
          },
        },
        orderBy: { slotNumber: "asc" },
        skip,
        take: limit,
      }),
      db.earlyBirdClaim.count({
        where: status ? { distributionStatus: status } : undefined,
      }),
    ]);

    const stats = await db.earlyBirdClaim.groupBy({
      by: ["distributionStatus"],
      _count: { id: true },
      _sum: { lunesAmount: true },
    });

    const formatted = claims.map((c) => {
      const missionsCompleted = c.user._count?.completions ?? 0;
      const referralsQualified = c.user._count?.referralsMade ?? 0;
      const hasWallet = (c.user.wallets?.length ?? 0) > 0;
      const totalScore = c.user.totalScore ?? 0;

      // Activity verification: user must have completed at least 1 mission AND connected a wallet
      const activityVerified = missionsCompleted >= 1 && hasWallet;

      return {
        id: c.id,
        slotNumber: c.slotNumber,
        lunesAmount: c.lunesAmount,
        claimedAt: c.claimedAt,
        distributionStatus: c.distributionStatus,
        distributionTxHash: c.distributionTxHash,
        distributedAt: c.distributedAt,
        distributedBy: c.distributedBy,
        userId: c.userId,
        xUsername: c.user.xUsername,
        lunesWallet: c.user.wallets[0]?.address ?? null,
        // Activity verification data
        activityVerified,
        missionsCompleted,
        referralsQualified,
        totalScore,
        rank: c.user.rank,
        isBanned: c.user.isBanned ?? false,
      };
    });

    return NextResponse.json({
      claims: formatted,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      stats: stats.reduce(
        (acc, s) => ({
          ...acc,
          [s.distributionStatus]: {
            count: s._count.id,
            totalLunes: s._sum.lunesAmount ?? 0,
          },
        }),
        {} as Record<string, { count: number; totalLunes: number }>
      ),
    });
  } catch (error) {
    console.error("[AIRDROP_CLAIMS_GET]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/airdrop/claims
 * Mark one or multiple claims as SENT with a tx hash.
 * Body: { ids: string[], txHash: string, adminEmail: string }
 * Or mark as FAILED: { ids: string[], status: "FAILED" }
 */
export async function PATCH(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { ids, txHash, adminEmail, status } = body as {
      ids: string[];
      txHash?: string;
      adminEmail?: string;
      status?: string;
    };

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids array required" }, { status: 400 });
    }

    const newStatus = status || "SENT";
    if (!["SENT", "FAILED", "PENDING"].includes(newStatus)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {
      distributionStatus: newStatus,
      distributedBy: adminEmail ?? null,
    };

    if (newStatus === "SENT") {
      if (!txHash) {
        return NextResponse.json({ error: "txHash required when marking as SENT" }, { status: 400 });
      }
      updateData.distributionTxHash = txHash;
      updateData.distributedAt = new Date();
    } else if (newStatus === "PENDING") {
      updateData.distributionTxHash = null;
      updateData.distributedAt = null;
    }

    const result = await db.earlyBirdClaim.updateMany({
      where: { id: { in: ids } },
      data: updateData,
    });

    return NextResponse.json({ updated: result.count });
  } catch (error) {
    console.error("[AIRDROP_CLAIMS_PATCH]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
