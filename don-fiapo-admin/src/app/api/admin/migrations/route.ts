import { NextRequest, NextResponse } from "next/server";

const WEB_API = process.env.WEB_API_URL || "http://localhost:3000";
const ADMIN_KEY = process.env.ADMIN_API_KEY || "";

/**
 * GET /api/admin/migrations?status=PENDING
 * Proxy to don-fiapo-web to list migrations
 */
export async function GET(req: NextRequest) {
  try {
    const status = req.nextUrl.searchParams.get("status") || "PENDING";
    const res = await fetch(`${WEB_API}/api/admin/migrations?status=${status}`, {
      headers: { "x-admin-key": ADMIN_KEY },
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("[ADMIN_MIGRATIONS_GET]", error);
    return NextResponse.json({ error: "Failed to connect to web API" }, { status: 502 });
  }
}

/**
 * POST /api/admin/migrations/verify
 * Proxy to don-fiapo-web to approve/reject a migration
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(`${WEB_API}/api/admin/migrations/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_KEY },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("[ADMIN_MIGRATIONS_VERIFY]", error);
    return NextResponse.json({ error: "Failed to connect to web API" }, { status: 502 });
  }
}
