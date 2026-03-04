import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const ADMIN_KEY = process.env.ADMIN_API_KEY;

/**
 * GET /api/admin/spin/stats
 * Returns spin game statistics for the admin panel.
 */
export async function GET(req: NextRequest) {
  const key = req.headers.get("x-admin-key");
  if (key !== ADMIN_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [totalSpins, spinsToday, recentSpins, prizeGrouped] = await Promise.all([
      db.spinResult.count().catch(() => 0),
      db.spinResult.count({
        where: { playedAt: { gte: todayStart } },
      }).catch(() => 0),
      db.spinResult.findMany({
        orderBy: { playedAt: "desc" },
        take: 50,
      }).catch(() => []),
      db.spinResult.groupBy({
        by: ["prizeIndex", "prizeLabel", "prizeSublabel"],
        _count: { id: true },
        orderBy: { prizeIndex: "asc" },
      }).catch(() => []),
    ]);

    const prizeDistribution = (prizeGrouped as any[]).map((g: any) => ({
      prizeIndex: g.prizeIndex,
      label: g.prizeLabel,
      sublabel: g.prizeSublabel,
      count: g._count?.id ?? 0,
    }));

    return NextResponse.json({
      totalSpins,
      spinsToday,
      estimatedRevenue: totalSpins * 0.07,
      recentSpins,
      prizeDistribution,
    });
  } catch (error) {
    console.error("[ADMIN_SPIN_STATS]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
