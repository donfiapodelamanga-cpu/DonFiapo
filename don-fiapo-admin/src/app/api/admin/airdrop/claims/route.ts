import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/server/admin-auth";
import { fetchWebApi, webApiProxyErrorMessage, webApiProxyErrorStatus } from "@/lib/server/web-api";

/**
 * GET /api/admin/airdrop/claims
 * Proxies Early Bird claims list from web app.
 */
export async function GET(req: NextRequest) {
  const auth = requireAdminAuth(req, "transactions");
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const qs = searchParams.toString();
    const res = await fetchWebApi(`/api/admin/airdrop/claims${qs ? `?${qs}` : ""}`, {
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("[CLAIMS_PROXY_GET]", error);
    return NextResponse.json({ error: webApiProxyErrorMessage(error) }, { status: webApiProxyErrorStatus(error) });
  }
}

/**
 * PATCH /api/admin/airdrop/claims
 * Proxies mark-as-distributed action to web app.
 */
export async function PATCH(req: NextRequest) {
  const auth = requireAdminAuth(req, "transactions");
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const res = await fetchWebApi("/api/admin/airdrop/claims", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("[CLAIMS_PROXY_PATCH]", error);
    return NextResponse.json({ error: webApiProxyErrorMessage(error) }, { status: webApiProxyErrorStatus(error) });
  }
}
