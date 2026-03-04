import { NextRequest, NextResponse } from "next/server";

const WEB_API = process.env.WEB_API_URL || "http://localhost:3000";
const ADMIN_KEY = process.env.ADMIN_API_KEY || "";

/**
 * GET /api/admin/missions/completions?status=PENDING
 * Proxy to don-fiapo-web
 */
export async function GET(req: NextRequest) {
  try {
    const status = req.nextUrl.searchParams.get("status") || "PENDING";
    const res = await fetch(`${WEB_API}/api/admin/missions/completions?status=${status}`, {
      headers: { "x-admin-key": ADMIN_KEY },
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[ADMIN_COMPLETIONS_PROXY]", error);
    return NextResponse.json({ error: "Failed to connect to web API" }, { status: 502 });
  }
}
