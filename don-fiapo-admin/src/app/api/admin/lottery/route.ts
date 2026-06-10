import { NextResponse } from "next/server";

const LOTTERY_CONTRACT = process.env.LOTTERY_CONTRACT || "";

const STATIC_CONFIG = {
  monthly: {
    name: "God Looked at You",
    description: "Sorteio mensal — 5% das taxas mensais",
    prizes: { first: "50%", second: "30%", third: "20%" },
    interval: "30 dias",
    minBalance: "1,000 FIAPO",
    maxBalance: "10,000,000 FIAPO",
    antiWhale: "Exclui top 100 carteiras",
  },
  christmas: {
    name: "Sorteio de Natal",
    description: "Sorteio anual — 5% das taxas anuais",
    prizes: { first: "60%", second: "25%", third: "15%" },
    interval: "Anual (Dezembro)",
    minBalance: "1,000 FIAPO",
    maxBalance: "10,000,000 FIAPO",
    antiWhale: "Exclui top 100 carteiras",
  },
};

/**
 * GET /api/admin/lottery
 * Returns Lottery contract data (on-chain when available, static fallback)
 */
export async function GET() {
  try {
    // TODO: When lottery ABI is available, query on-chain:
    // - Current pool balance
    // - Total participants
    // - Last draw date/winners
    // - Next draw countdown
    return NextResponse.json({
      ...STATIC_CONFIG,
      configured: !!LOTTERY_CONTRACT,
      connected: false,
      contractAddress: LOTTERY_CONTRACT,
      onChainStats: null,
      currentPool: 0,
      totalParticipants: 0,
      totalDraws: 0,
      note: !LOTTERY_CONTRACT
        ? "LOTTERY_CONTRACT not configured in .env"
        : "Contract configured — ABI integration pending deployment",
    });
  } catch (error) {
    console.error("[API Lottery] Error:", error);
    return NextResponse.json({
      ...STATIC_CONFIG,
      configured: !!LOTTERY_CONTRACT,
      connected: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
