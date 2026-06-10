import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/server/admin-auth";
import { fetchWebApi, webApiProxyErrorMessage, webApiProxyErrorStatus } from "@/lib/server/web-api";

/**
 * GET /api/admin/migrations?status=PENDING
 * Proxy to don-fiapo-web to list migrations
 */
export async function GET(req: NextRequest) {
  const auth = requireAdminAuth(req, "transactions");
  if (!auth.ok) return auth.response;

  try {
    const status = req.nextUrl.searchParams.get("status") || "PENDING";
    const res = await fetchWebApi(`/api/admin/migrations?status=${encodeURIComponent(status)}`, {
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("[ADMIN_MIGRATIONS_GET]", error);
    return NextResponse.json({ error: webApiProxyErrorMessage(error) }, { status: webApiProxyErrorStatus(error) });
  }
}

/**
 * POST /api/admin/migrations/verify
 * Proxy to don-fiapo-web to approve/reject a migration
 */
export async function POST(req: NextRequest) {
  const auth = requireAdminAuth(req, "transactions");
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const res = await fetchWebApi("/api/admin/migrations/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("[ADMIN_MIGRATIONS_VERIFY]", error);
    return NextResponse.json({ error: webApiProxyErrorMessage(error) }, { status: webApiProxyErrorStatus(error) });
  }
}
