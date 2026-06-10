import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/server/admin-auth";
import { fetchWebApi, webApiProxyErrorMessage, webApiProxyErrorStatus } from "@/lib/server/web-api";

/**
 * GET /api/admin/missions/completions?status=PENDING
 * Proxy to don-fiapo-web
 */
export async function GET(req: NextRequest) {
  const auth = requireAdminAuth(req);
  if (!auth.ok) return auth.response;

  try {
    const status = req.nextUrl.searchParams.get("status") || "PENDING";
    const res = await fetchWebApi(`/api/admin/missions/completions?status=${encodeURIComponent(status)}`, {
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("[ADMIN_COMPLETIONS_PROXY]", error);
    return NextResponse.json({ error: webApiProxyErrorMessage(error) }, { status: webApiProxyErrorStatus(error) });
  }
}
