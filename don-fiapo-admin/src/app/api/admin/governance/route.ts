import { NextResponse } from "next/server";

const GOVERNANCE_CONTRACT = process.env.GOVERNANCE_CONTRACT || "";

const STATIC_CONFIG = {
  config: {
    quorum: "51%",
    votingPeriod: "3 dias",
    timelockPeriod: "1 dia",
    proposalFeeFiapo: "1,000 FIAPO",
    proposalFeeUsdt: "100 USDT",
    voteFeeFiapo: "100 FIAPO",
    voteFeeUsdt: "10 USDT",
    maxVotesPerHour: 10,
    requiresStaking: true,
  },
  proposalTypes: [
    { type: "ConfigChange", label: "Alteração de Config", description: "Mudanças em parâmetros do sistema" },
    { type: "Emergency", label: "Emergência", description: "Ações de emergência com timelock reduzido" },
    { type: "Upgrade", label: "Upgrade", description: "Atualizações de contratos" },
    { type: "Marketing", label: "Marketing", description: "Propostas de marketing e parcerias" },
    { type: "Development", label: "Desenvolvimento", description: "Propostas de desenvolvimento técnico" },
  ],
  feeDistribution: {
    team: "40%",
    staking: "25%",
    rewards: "20%",
    burn: "10%",
    noble: "5%",
  },
};

/**
 * GET /api/admin/governance
 * Returns Governance contract data (on-chain when available, static fallback)
 */
export async function GET() {
  try {
    // TODO: When governance ABI is available, query on-chain:
    // - Active proposals count
    // - Total votes cast
    // - Treasury balance from fees
    // - Recent proposals list
    return NextResponse.json({
      ...STATIC_CONFIG,
      configured: !!GOVERNANCE_CONTRACT,
      connected: false,
      contractAddress: GOVERNANCE_CONTRACT,
      onChainStats: null,
      activeProposals: 0,
      totalProposals: 0,
      note: !GOVERNANCE_CONTRACT
        ? "GOVERNANCE_CONTRACT not configured in .env"
        : "Contract configured — ABI integration pending deployment",
    });
  } catch (error) {
    console.error("[API Governance] Error:", error);
    return NextResponse.json({
      ...STATIC_CONFIG,
      configured: !!GOVERNANCE_CONTRACT,
      connected: false,
      contractAddress: GOVERNANCE_CONTRACT,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
