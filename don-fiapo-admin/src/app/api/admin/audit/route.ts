import { NextRequest, NextResponse } from "next/server";
import { getAuditLogs } from "@/lib/audit";

/**
 * GET /api/admin/audit?entity=Noble&limit=50&offset=0
 * Returns audit logs with optional filters
 */
export async function GET(req: NextRequest) {
  try {
    const entity = req.nextUrl.searchParams.get("entity") || undefined;
    const adminEmail = req.nextUrl.searchParams.get("admin") || undefined;
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "50");
    const offset = parseInt(req.nextUrl.searchParams.get("offset") || "0");

    const logs = await getAuditLogs({ entity, adminEmail, limit, offset });

    return NextResponse.json(logs);
  } catch (error) {
    console.error("[API Audit] Error:", error);
    return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
  }
}
