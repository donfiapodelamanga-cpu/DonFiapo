import { NextResponse } from "next/server";
import { fetchWebApi, webApiProxyErrorMessage, webApiProxyErrorStatus } from "@/lib/server/web-api";

/**
 * GET /api/admin/spin/stats
 * Proxy to don-fiapo-web /api/admin/spin/stats
 */
export async function GET() {
  try {
    const res = await fetchWebApi("/api/admin/spin/stats", {
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("[ADMIN_SPIN_STATS_PROXY]", error);
    return NextResponse.json(
      { error: webApiProxyErrorMessage(error) },
      { status: webApiProxyErrorStatus(error) },
    );
  }
}
