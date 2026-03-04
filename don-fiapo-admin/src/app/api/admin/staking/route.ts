import { NextResponse } from "next/server";
import { getStakingDashboardData } from "@/lib/blockchain/staking";

/**
 * GET /api/admin/staking
 * Returns staking dashboard data from on-chain contract
 */
export async function GET() {
  try {
    const data = await getStakingDashboardData();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[API Staking] Error:", error);
    return NextResponse.json(
      {
        stats: {
          totalStaked: 0,
          totalStakedFormatted: "0",
          totalStakers: 0,
          totalRewardsDistributed: 0,
          totalRewardsFormatted: "0",
          activePositions: 0,
        },
        pools: [],
        connected: false,
        error: error instanceof Error ? error.message : "Erro interno",
      },
      { status: 200 }
    );
  }
}
