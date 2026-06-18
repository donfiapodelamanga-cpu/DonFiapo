import { NextRequest, NextResponse } from "next/server";
import { fetchWebApi, webApiProxyErrorMessage, webApiProxyErrorStatus } from "@/lib/server/web-api";
import { requireAdminAuth } from "@/lib/server/admin-auth";

/**
 * POST /api/admin/missions/verify
 * Approve/reject a mission completion (proxy)
 */
export async function POST(req: NextRequest) {
  // Auditoria 2026-06-18 — crítico #5: este proxy injeta a ADMIN_API_KEY privilegiada
  // via fetchWebApi; exigir permissão de domínio server-side ANTES de proxiar o payout.
  const auth = requireAdminAuth(req, "marketing");
  if (!auth.ok) return auth.response;
  try {
    const body = await req.json();
    const res = await fetchWebApi("/api/missions/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("[ADMIN_VERIFY_PROXY]", error);
    return NextResponse.json({ error: webApiProxyErrorMessage(error) }, { status: webApiProxyErrorStatus(error) });
  }
}
