import { NextRequest, NextResponse } from "next/server";

const WEB_API = process.env.WEB_API_URL || "http://localhost:3000";
const ADMIN_KEY = process.env.ADMIN_API_KEY || "";

/**
 * GET /api/admin/airdrop/claims
 * Proxies Early Bird claims list from web app.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const qs = searchParams.toString();
    const res = await fetch(
      `${WEB_API}/api/admin/airdrop/claims${qs ? `?${qs}` : ""}`,
      {
        headers: { "x-admin-key": ADMIN_KEY },
        cache: "no-store",
      }
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("[CLAIMS_PROXY_GET]", error);
    return NextResponse.json({ error: "Failed to connect to web API" }, { status: 502 });
  }
}

/**
 * PATCH /api/admin/airdrop/claims
 * Proxies mark-as-distributed action to web app.
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(`${WEB_API}/api/admin/airdrop/claims`, {
      method: "PATCH",
      headers: {
        "x-admin-key": ADMIN_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("[CLAIMS_PROXY_PATCH]", error);
    return NextResponse.json({ error: "Failed to connect to web API" }, { status: 502 });
  }
}
