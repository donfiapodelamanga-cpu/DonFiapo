import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { findUserByWallet } from "@/lib/missions/service";
import { FREE_SPINS, getSpinBalanceForUser } from "@/lib/games/spin-balance";

const SPIN_MISSION_ID = "m-spin-game";

/**
 * POST /api/games/spin
 * DEPRECATED — This endpoint previously accepted prizeIndex from the client,
 * allowing users to choose their own prize. Use /api/games/spin/roll instead,
 * which uses server-side cryptographic RNG.
 *
 * Returns 410 Gone to signal deprecation.
 */
export async function POST() {
  return NextResponse.json(
    { error: "This endpoint is deprecated. Use /api/games/spin/roll instead." },
    { status: 410 }
  );
}

/**
 * GET /api/games/spin?wallet=<address>
 * Returns spin stats AND real spin balance for the user.
 *
 * Balance = FREE_SPINS + purchased(confirmed) - total spins used
 * Note: Contract uses Staking Boost (not +1 SPIN), so no bonus spins.
 */
export async function GET(req: NextRequest) {
  try {
    const wallet = req.nextUrl.searchParams.get("wallet");
    if (!wallet) return NextResponse.json({ totalSpins: 0, spinBalance: FREE_SPINS, missionCompleted: false });

    const userId = await findUserByWallet(wallet).catch(() => null);
    if (!userId) return NextResponse.json({ totalSpins: 0, spinBalance: FREE_SPINS, missionCompleted: false });

    const [balance, missionCompletion] = await Promise.all([
      getSpinBalanceForUser(db, userId),
      db.missionCompletion.findFirst({
        where: { userId, missionId: SPIN_MISSION_ID, status: "VERIFIED" },
      }),
    ]);

    return NextResponse.json({
      totalSpins: balance.totalSpins,
      spinBalance: balance.spinBalance,
      missionCompleted: !!missionCompletion,
      earnedPoints: missionCompletion?.earnedPoints ?? 0,
    });
  } catch (error) {
    console.error("[SPIN_GET]", error);
    return NextResponse.json({ totalSpins: 0, spinBalance: FREE_SPINS, missionCompleted: false });
  }
}
