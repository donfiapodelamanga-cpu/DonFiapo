import { NextRequest, NextResponse } from "next/server";

const WEB_API = process.env.WEB_API_URL || "http://localhost:3000";
const ADMIN_KEY = process.env.ADMIN_API_KEY || "";

/**
 * GET /api/admin/missions/milestones
 * Proxy to don-fiapo-web
 */
export async function GET() {
  try {
    const res = await fetch(`${WEB_API}/api/admin/missions/milestones`, {
      headers: { "x-admin-key": ADMIN_KEY },
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("[ADMIN_MILESTONES_PROXY_GET]", error);
    return NextResponse.json({ error: "Failed to connect to web API" }, { status: 502 });
  }
}

/**
 * POST /api/admin/missions/milestones
 * Proxy to don-fiapo-web (seed or create)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(`${WEB_API}/api/admin/missions/milestones`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_KEY },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("[ADMIN_MILESTONES_PROXY_POST]", error);
    return NextResponse.json({ error: "Failed to connect to web API" }, { status: 502 });
  }
}

/**
 * PATCH /api/admin/missions/milestones
 * Proxy to don-fiapo-web (update milestone)
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(`${WEB_API}/api/admin/missions/milestones`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_KEY },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("[ADMIN_MILESTONES_PROXY_PATCH]", error);
    return NextResponse.json({ error: "Failed to connect to web API" }, { status: 502 });
  }
}
