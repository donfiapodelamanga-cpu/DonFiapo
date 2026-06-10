import { NextResponse } from "next/server";
import { fetchWebApi, webApiProxyErrorMessage, webApiProxyErrorStatus } from "@/lib/server/web-api";

/**
 * GET /api/admin/airdrop/reward-pools
 * Proxies reward pool + Early Bird liability data from the web app DB.
 */
export async function GET() {
  try {
    const res = await fetchWebApi("/api/admin/airdrop/reward-pools", {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Web API responded ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[REWARD_POOLS_PROXY]", error);
    return NextResponse.json(
      { error: webApiProxyErrorMessage(error, "Failed to fetch reward pools") },
      { status: webApiProxyErrorStatus(error) },
    );
  }
}
