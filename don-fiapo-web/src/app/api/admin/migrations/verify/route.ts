import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

function checkAdmin(req: NextRequest): boolean {
  const adminKey = req.headers.get("x-admin-key");
  return adminKey === process.env.ADMIN_API_KEY;
}

/**
 * POST /api/admin/migrations/verify
 * Body: { id: string, approved: boolean, reason?: string, lunesTxHash?: string }
 */
export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, approved, reason, lunesTxHash } = body;

    if (!id || typeof approved !== "boolean") {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const migration = await db.tokenMigration.findUnique({ where: { id } });
    if (!migration || migration.status !== "PENDING") {
      return NextResponse.json({ error: "Migration not found or already processed" }, { status: 400 });
    }

    const newStatus = approved ? "APPROVED" : "REJECTED";

    const updated = await db.tokenMigration.update({
      where: { id },
      data: {
        status: newStatus,
        approvedAt: new Date(),
        rejectionReason: reason || null,
        lunesTxHash: lunesTxHash || null,
      },
    });

    return NextResponse.json({ success: true, migration: updated });
  } catch (error) {
    console.error("[ADMIN_MIGRATIONS_VERIFY]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
