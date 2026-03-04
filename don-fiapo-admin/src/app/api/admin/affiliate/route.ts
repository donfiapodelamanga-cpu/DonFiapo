import { NextResponse } from "next/server";

const AFFILIATE_CONTRACT = process.env.AFFILIATE_CONTRACT || "";

const STATIC_CONFIG = {
  config: {
    enabled: true,
    boostPerAffiliateBps: 50,
    maxBoostBps: 500,
    minStakingForActive: "1,000 FIAPO",
    maxDirectReferrals: 100,
    leaderboardSize: 100,
  },
  commissions: {
    level1: { bps: 250, percent: "2.5%", label: "Nível 1 (Direto)" },
    level2: { bps: 100, percent: "1%", label: "Nível 2 (Indireto)" },
    total: { bps: 350, percent: "3.5%", label: "Total Máximo" },
  },
  apyBoost: {
    perAffiliate: "0.5%",
    maxBoost: "5%",
    requirement: "Afiliado ativo = staking mín. 1,000 FIAPO",
    example: [
      { affiliates: 1, boost: "0.5%" },
      { affiliates: 3, boost: "1.5%" },
      { affiliates: 5, boost: "2.5%" },
      { affiliates: 10, boost: "5.0% (máx)" },
    ],
  },
  leaderboard: {
    maxEntries: 100,
    sortCriteria: "Earnings DESC → Direct Referrals DESC",
    updateTriggers: ["Novo referral registrado", "Comissão paga", "Atividade de referido atualizada"],
  },
};

/**
 * GET /api/admin/affiliate
 * Returns Affiliate contract data (on-chain when available, static fallback)
 */
export async function GET() {
  try {
    // TODO: When affiliate ABI is available, query on-chain:
    // - Total affiliates registered
    // - Total commissions paid
    // - Top affiliates leaderboard
    // - Active referral count
    return NextResponse.json({
      ...STATIC_CONFIG,
      configured: !!AFFILIATE_CONTRACT,
      connected: false,
      contractAddress: AFFILIATE_CONTRACT,
      onChainStats: null,
      totalAffiliates: 0,
      totalCommissionsPaid: 0,
      note: !AFFILIATE_CONTRACT
        ? "AFFILIATE_CONTRACT not configured in .env"
        : "Contract configured — ABI integration pending deployment",
    });
  } catch (error) {
    console.error("[API Affiliate] Error:", error);
    return NextResponse.json({
      ...STATIC_CONFIG,
      configured: !!AFFILIATE_CONTRACT,
      connected: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
