import { NextRequest, NextResponse } from "next/server";

const WEB_API = process.env.WEB_API_URL || "http://localhost:3000";
const ADMIN_KEY = process.env.ADMIN_API_KEY || "";

/**
 * GET /api/admin/referrals/fraud
 * Proxy to don-fiapo-web — fraud summary + flagged referrals
 */
export async function GET() {
  try {
    const res = await fetch(`${WEB_API}/api/admin/referrals/fraud`, {
      headers: { "x-admin-key": ADMIN_KEY },
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("[ADMIN_REFERRAL_FRAUD_PROXY_GET]", error);
    return NextResponse.json({ error: "Failed to connect to web API" }, { status: 502 });
  }
}

/**
 * POST /api/admin/referrals/fraud
 * Proxy to don-fiapo-web — approve, reject, audit
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(`${WEB_API}/api/admin/referrals/fraud`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_KEY },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("[ADMIN_REFERRAL_FRAUD_PROXY_POST]", error);
    return NextResponse.json({ error: "Failed to connect to web API" }, { status: 502 });
  }
}
