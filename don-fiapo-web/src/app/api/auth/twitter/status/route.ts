import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { findOrCreateUserByWallet } from "@/lib/missions/service";

/**
 * GET /api/auth/twitter/status?wallet=<address>
 * Returns whether the wallet's user has an X account connected.
 */
export async function GET(req: NextRequest) {
  try {
    const wallet = req.nextUrl.searchParams.get("wallet");
    if (!wallet) {
      return NextResponse.json({ connected: false });
    }

    const userId = await findOrCreateUserByWallet(wallet);
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        xId: true,
        xUsername: true,
        telegramId: true,
        telegramUsername: true,
        trustScore: true,
      },
    });

    return NextResponse.json({
      x: user?.xId
        ? { connected: true, username: user.xUsername }
        : { connected: false },
      telegram: user?.telegramId
        ? { connected: true, username: user.telegramUsername }
        : { connected: false },
      trustScore: user?.trustScore ?? 100,
    });
  } catch (error) {
    console.error("[AUTH_TWITTER_STATUS]", error);
    return NextResponse.json({ connected: false }, { status: 500 });
  }
}
