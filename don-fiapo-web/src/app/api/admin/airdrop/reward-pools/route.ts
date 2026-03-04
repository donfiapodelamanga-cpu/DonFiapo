import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

function checkAdmin(req: NextRequest): boolean {
  const adminKey = req.headers.get("x-admin-key");
  return adminKey === process.env.ADMIN_API_KEY;
}

/**
 * GET /api/admin/airdrop/reward-pools
 * Returns full liability view of all reward pools + Early Bird claim stats.
 * Used exclusively by the admin panel finance section.
 */
export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const pools = await db.rewardPool.findMany({
      include: {
        _count: { select: { missions: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    // Early Bird specific stats
    const earlyBirdPool = pools.find((p) => p.id === "pool-early-bird");

    let earlyBirdStats = null;
    if (earlyBirdPool) {
      const [totalClaims, pendingDistribution] = await Promise.all([
        db.earlyBirdClaim.count(),
        db.earlyBirdClaim.aggregate({
          _sum: { lunesAmount: true },
        }),
      ]);

      earlyBirdStats = {
        totalClaims,
        lunesReserved: pendingDistribution._sum.lunesAmount ?? 0,
        lunesRemaining:
          earlyBirdPool.totalAmount -
          (pendingDistribution._sum.lunesAmount ?? 0),
        percentClaimed: earlyBirdPool.maxSlots
          ? (earlyBirdPool.slotsClaimed / earlyBirdPool.maxSlots) * 100
          : 0,
        isFull: earlyBirdPool.maxSlots
          ? earlyBirdPool.slotsClaimed >= earlyBirdPool.maxSlots
          : false,
        lunesPerSlot: earlyBirdPool.linesPerSlot,
        maxSlots: earlyBirdPool.maxSlots,
        slotsClaimed: earlyBirdPool.slotsClaimed,
      };
    }

    // All pools summary (RewardPool has no currency field — all pools are LUNES)
    const poolSummary = pools.map((p) => ({
      id: p.id,
      name: p.name,
      totalAmount: p.totalAmount,
      currency: "LUNES",
      maxSlots: p.maxSlots,
      slotsClaimed: p.slotsClaimed,
      lunesPerSlot: p.linesPerSlot,
      missionCount: p._count.missions,
      committed: p.linesPerSlot && p.slotsClaimed
        ? p.linesPerSlot * p.slotsClaimed
        : 0,
      percentCommitted: p.maxSlots && p.slotsClaimed
        ? (p.slotsClaimed / p.maxSlots) * 100
        : 0,
    }));

    // Aggregate liability — all pools are LUNES
    const totalCommittedLunes = poolSummary.reduce(
      (acc, p) => acc + p.committed,
      0
    );
    const totalAllocatedLunes = pools.reduce(
      (acc, p) => acc + p.totalAmount,
      0
    );

    return NextResponse.json({
      pools: poolSummary,
      earlyBird: earlyBirdStats,
      totals: {
        totalAllocatedLunes,
        totalCommittedLunes,
        totalPendingLunes: totalCommittedLunes, // all claims are pending distribution
        totalRemainingLunes: totalAllocatedLunes - totalCommittedLunes,
      },
    });
  } catch (error) {
    console.error("[REWARD_POOLS_API]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
