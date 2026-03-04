import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

function checkAdmin(req: NextRequest): boolean {
  const adminKey = req.headers.get("x-admin-key");
  return adminKey === process.env.ADMIN_API_KEY;
}

/**
 * GET /api/admin/migrations?status=PENDING
 */
export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const status = req.nextUrl.searchParams.get("status");
    const whereClause = status ? { status } : {};

    const migrations = await db.tokenMigration.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, xUsername: true, trustScore: true } }
      }
    });

    return NextResponse.json({ migrations });
  } catch (error) {
    console.error("[ADMIN_MIGRATIONS_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
