import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

function checkAdmin(req: NextRequest): boolean {
  const adminKey = req.headers.get("x-admin-key");
  return adminKey === process.env.ADMIN_API_KEY;
}

/**
 * GET /api/admin/missions/pools
 * List all reward pools with stats
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
    });

    return NextResponse.json({ pools });
  } catch (error) {
    console.error("[ADMIN_POOLS_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/missions/pools
 * Update a reward pool (e.g., change distribution %)
 * Body: { id: string, totalAmount?: number, isActive?: boolean }
 */
export async function PATCH(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Pool id is required" }, { status: 400 });
    }

    if (updates.totalAmount != null) updates.totalAmount = Number(updates.totalAmount);

    const pool = await db.rewardPool.update({
      where: { id },
      data: updates,
    });

    return NextResponse.json({ pool });
  } catch (error) {
    console.error("[ADMIN_POOLS_PATCH]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
