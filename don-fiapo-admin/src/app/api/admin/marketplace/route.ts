import { NextResponse } from "next/server";
import { getMarketplaceDashboardData } from "@/lib/blockchain/marketplace";

/**
 * GET /api/admin/marketplace
 * Returns marketplace dashboard data from on-chain contract
 */
export async function GET() {
  try {
    const data = await getMarketplaceDashboardData();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[API Marketplace] Error:", error);
    return NextResponse.json(
      {
        stats: {
          activeListings: 0,
          activeAuctions: 0,
          activeTrades: 0,
          totalVolume: 0,
          totalVolumeFormatted: "0",
          icoSalesCompleted: false,
          paymentMode: "Apenas LUNES",
          feeBps: 600,
          tradFeeBps: 300,
        },
        connected: false,
        error: error instanceof Error ? error.message : "Erro interno",
      },
      { status: 200 }
    );
  }
}
