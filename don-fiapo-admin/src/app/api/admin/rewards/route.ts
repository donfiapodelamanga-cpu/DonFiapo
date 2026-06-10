import { NextResponse } from "next/server";

const REWARDS_CONTRACT = process.env.REWARDS_CONTRACT || "";

const STATIC_CONFIG = {
  config: {
    maxRankingSize: 12,
    excludeTopWallets: 100,
    minBalance: "1,000 FIAPO",
    maxBalance: "10,000,000 FIAPO",
    rewardPercentages: [25, 18, 13, 10, 8, 7, 5, 4, 3, 3, 2, 2],
  },
  scoringWeights: {
    balance: 25,
    staking: 30,
    burn: 20,
    transactions: 10,
    affiliates: 10,
    governance: 5,
  },
  rankingTypes: [
    { id: 0, name: "Saldo Mensal", description: "Ranking por saldo de FIAPO (excluindo top 100 wallets)" },
    { id: 1, name: "Staking", description: "Ranking por volume em staking" },
    { id: 2, name: "Burn", description: "Ranking por volume queimado" },
    { id: 3, name: "Afiliados", description: "Ranking por quantidade de afiliados" },
    { id: 4, name: "Geral", description: "Combinação ponderada de todos os critérios" },
  ],
};

/**
 * GET /api/admin/rewards
 * Returns Rewards contract data (on-chain when available, static fallback)
 */
export async function GET() {
  try {
    // TODO: When rewards ABI is available, query on-chain:
    // - Current ranking data
    // - Total rewards distributed
    // - Active ranking period
    return NextResponse.json({
      ...STATIC_CONFIG,
      configured: !!REWARDS_CONTRACT,
      connected: false,
      contractAddress: REWARDS_CONTRACT,
      onChainStats: null,
      totalDistributed: 0,
      activeRankings: 0,
      note: !REWARDS_CONTRACT
        ? "REWARDS_CONTRACT not configured in .env"
        : "Contract configured — ABI integration pending deployment",
    });
  } catch (error) {
    console.error("[API Rewards] Error:", error);
    return NextResponse.json({
      ...STATIC_CONFIG,
      configured: !!REWARDS_CONTRACT,
      connected: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
