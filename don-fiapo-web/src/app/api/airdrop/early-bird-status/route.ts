import { NextRequest, NextResponse } from "next/server";
import { getEarlyBirdStatus } from "@/lib/missions/early-bird";
import { findOrCreateUserByWallet } from "@/lib/missions/service";

/**
 * GET /api/airdrop/early-bird-status?wallet=<address>
 * Returns Early Bird pool status + user's claim if wallet provided.
 */
export async function GET(req: NextRequest) {
  try {
    const wallet = req.nextUrl.searchParams.get("wallet");

    let userId: string | undefined;
    if (wallet) {
      try {
        userId = await findOrCreateUserByWallet(wallet);
      } catch {
        // ignore — just return public status
      }
    }

    const status = await getEarlyBirdStatus(userId);
    if (!status) {
      return NextResponse.json({ error: "Early Bird pool not found" }, { status: 404 });
    }

    return NextResponse.json(status);
  } catch (error) {
    console.error("[EARLY_BIRD_STATUS]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
