import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

function checkAdmin(req: NextRequest): boolean {
  const adminKey = req.headers.get("x-admin-key");
  return adminKey === process.env.ADMIN_API_KEY;
}

/**
 * GET /api/admin/missions/completions?status=PENDING&limit=50
 * List mission completions for admin review
 */
export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const status = req.nextUrl.searchParams.get("status") || "PENDING";
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "50", 10);

    const completions = await db.missionCompletion.findMany({
      where: { status },
      orderBy: { completedAt: "desc" },
      take: Math.min(limit, 200),
      include: {
        user: {
          select: {
            id: true,
            xUsername: true,
            telegramUsername: true,
            rank: true,
            trustScore: true,
            wallets: { where: { isPrimary: true }, take: 1 },
          },
        },
        mission: {
          select: { id: true, name: true, type: true, platform: true, basePoints: true },
        },
      },
    });

    return NextResponse.json({ completions });
  } catch (error) {
    console.error("[ADMIN_COMPLETIONS_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
