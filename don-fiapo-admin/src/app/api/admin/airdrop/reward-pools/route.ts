import { NextResponse } from "next/server";

const WEB_API = process.env.WEB_API_URL || "http://localhost:3000";

/**
 * GET /api/admin/airdrop/reward-pools
 * Proxies reward pool + Early Bird liability data from the web app DB.
 */
export async function GET() {
  try {
    const res = await fetch(`${WEB_API}/api/admin/airdrop/reward-pools`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Web API responded ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[REWARD_POOLS_PROXY]", error);
    return NextResponse.json({ error: "Failed to fetch reward pools" }, { status: 502 });
  }
}
