import { NextResponse } from "next/server";
import { getICODashboardData } from "@/lib/blockchain/ico";

/**
 * GET /api/admin/ico
 * Returns full ICO dashboard data from on-chain contract
 */
export async function GET() {
  try {
    const data = await getICODashboardData();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[API ICO] Error:", error);
    return NextResponse.json(
      {
        stats: {
          totalNftsMinted: 0,
          totalRaisedUsdCents: 0,
          totalRaisedUsd: 0,
          totalTokensMined: 0,
          totalTokensClaimed: 0,
          uniqueParticipants: 0,
          icoActive: false,
          miningActive: false,
        },
        tiers: [],
        evolutionStats: { totalEvolutions: 0, totalNftsBurned: 0 },
        rarityStats: [],
        connected: false,
        error: error instanceof Error ? error.message : "Erro interno",
      },
      { status: 200 } // Return 200 even on error so UI can show fallback
    );
  }
}
