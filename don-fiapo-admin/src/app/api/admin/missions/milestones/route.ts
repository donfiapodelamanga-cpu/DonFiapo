import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/server/admin-auth";
import { fetchWebApi, webApiProxyErrorMessage, webApiProxyErrorStatus } from "@/lib/server/web-api";

/**
 * GET /api/admin/missions/milestones
 * Proxy to don-fiapo-web
 */
export async function GET(req: NextRequest) {
  const auth = requireAdminAuth(req, "marketing");
  if (!auth.ok) return auth.response;

  try {
    const res = await fetchWebApi("/api/admin/missions/milestones", {
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("[ADMIN_MILESTONES_PROXY_GET]", error);
    return NextResponse.json({ error: webApiProxyErrorMessage(error) }, { status: webApiProxyErrorStatus(error) });
  }
}

/**
 * POST /api/admin/missions/milestones
 * Proxy to don-fiapo-web (seed or create)
 */
export async function POST(req: NextRequest) {
  const auth = requireAdminAuth(req, "marketing");
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const res = await fetchWebApi("/api/admin/missions/milestones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("[ADMIN_MILESTONES_PROXY_POST]", error);
    return NextResponse.json({ error: webApiProxyErrorMessage(error) }, { status: webApiProxyErrorStatus(error) });
  }
}

/**
 * PATCH /api/admin/missions/milestones
 * Proxy to don-fiapo-web (update milestone)
 */
export async function PATCH(req: NextRequest) {
  const auth = requireAdminAuth(req, "marketing");
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const res = await fetchWebApi("/api/admin/missions/milestones", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("[ADMIN_MILESTONES_PROXY_PATCH]", error);
    return NextResponse.json({ error: webApiProxyErrorMessage(error) }, { status: webApiProxyErrorStatus(error) });
  }
}
