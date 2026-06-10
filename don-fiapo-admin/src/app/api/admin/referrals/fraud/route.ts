import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/server/admin-auth";
import { fetchWebApi, webApiProxyErrorMessage, webApiProxyErrorStatus } from "@/lib/server/web-api";

/**
 * GET /api/admin/referrals/fraud
 * Proxy to don-fiapo-web — fraud summary + flagged referrals
 */
export async function GET(req: NextRequest) {
  const auth = requireAdminAuth(req, "marketing");
  if (!auth.ok) return auth.response;

  try {
    const res = await fetchWebApi("/api/admin/referrals/fraud", {
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("[ADMIN_REFERRAL_FRAUD_PROXY_GET]", error);
    return NextResponse.json({ error: webApiProxyErrorMessage(error) }, { status: webApiProxyErrorStatus(error) });
  }
}

/**
 * POST /api/admin/referrals/fraud
 * Proxy to don-fiapo-web — approve, reject, audit
 */
export async function POST(req: NextRequest) {
  const auth = requireAdminAuth(req, "marketing");
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const res = await fetchWebApi("/api/admin/referrals/fraud", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("[ADMIN_REFERRAL_FRAUD_PROXY_POST]", error);
    return NextResponse.json({ error: webApiProxyErrorMessage(error) }, { status: webApiProxyErrorStatus(error) });
  }
}
