import { NextRequest, NextResponse } from "next/server";
import { getLeaderboard, findUserByWallet } from "@/lib/missions/service";
import { rateLimit, getClientIP } from "@/lib/security";

/**
 * GET /api/leaderboard?wallet=<address>&limit=100
 * Returns the leaderboard with optional current user highlight
 */
export async function GET(req: NextRequest) {
  try {
    // Rate limit: 30 requests per minute per IP
    const ip = getClientIP(req);
    const rl = rateLimit(`leaderboard:${ip}`, 30, 60_000);
    if (rl) return rl;

    const wallet = req.nextUrl.searchParams.get("wallet");
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "100", 10);
    let userId: string | undefined;

    if (wallet) {
      const found = await findUserByWallet(wallet);
      if (found) userId = found;
    }

    const leaderboard = await getLeaderboard(userId, Math.min(limit, 500));

    return NextResponse.json(leaderboard);
  } catch (error) {
    console.error("[LEADERBOARD_ERROR]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
