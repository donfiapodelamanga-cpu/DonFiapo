import { NextResponse } from "next/server";

const WEB_API = process.env.WEB_API_URL || "http://localhost:3000";
const ADMIN_KEY = process.env.ADMIN_API_KEY || "";

/**
 * GET /api/admin/spin/stats
 * Proxy to don-fiapo-web /api/admin/spin/stats
 */
export async function GET() {
  try {
    const res = await fetch(`${WEB_API}/api/admin/spin/stats`, {
      headers: { "x-admin-key": ADMIN_KEY },
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("[ADMIN_SPIN_STATS_PROXY]", error);
    return NextResponse.json({ error: "Failed to connect to web API" }, { status: 502 });
  }
}
