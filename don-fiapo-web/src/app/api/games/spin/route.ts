import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { findUserByWallet } from "@/lib/missions/service";

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

const FREE_SPINS = 3;

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

    const [totalSpins, purchasedSpins, missionCompletion] = await Promise.all([
      // Total spins used
      db.spinResult.count({ where: { userId } }).catch(() => 0),
      // Total purchased spins (confirmed only)
      db.spinPurchase.aggregate({
        where: { userId, status: "CONFIRMED" },
        _sum: { spins: true },
      }).then(r => r._sum.spins ?? 0).catch(() => 0),
      // Mission status
      db.missionCompletion.findFirst({
        where: { userId, missionId: SPIN_MISSION_ID, status: "VERIFIED" },
      }),
    ]);

    const spinBalance = Math.max(0, FREE_SPINS + purchasedSpins - totalSpins);

    return NextResponse.json({
      totalSpins,
      spinBalance,
      missionCompleted: !!missionCompletion,
      earnedPoints: missionCompletion?.earnedPoints ?? 0,
    });
  } catch (error) {
    console.error("[SPIN_GET]", error);
    return NextResponse.json({ totalSpins: 0, spinBalance: FREE_SPINS, missionCompleted: false });
  }
}
