import { NextRequest, NextResponse } from "next/server";
import { getMissions, submitMissionCompletion, findOrCreateUserByWallet, getUserScore } from "@/lib/missions/service";

/**
 * GET /api/missions?wallet=<address>
 * Returns all active missions, with user completion status if wallet is provided
 */
export async function GET(req: NextRequest) {
  try {
    const wallet = req.nextUrl.searchParams.get("wallet");
    let userId: string | undefined;

    if (wallet) {
      userId = await findOrCreateUserByWallet(wallet);
    }

    const missions = await getMissions(userId);
    const score = userId ? await getUserScore(userId) : null;

    return NextResponse.json({ missions, score });
  } catch (error) {
    console.error("[MISSIONS_GET_ERROR]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

/**
 * POST /api/missions
 * Body: { wallet: string, missionId: string, proof?: string }
 * Submit a mission for verification
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { wallet, missionId, proof } = body;

    if (!wallet || !missionId) {
      return NextResponse.json({ error: "wallet and missionId are required" }, { status: 400 });
    }

    const userId = await findOrCreateUserByWallet(wallet);
    const result = await submitMissionCompletion(userId, missionId, proof);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[MISSIONS_POST_ERROR]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
