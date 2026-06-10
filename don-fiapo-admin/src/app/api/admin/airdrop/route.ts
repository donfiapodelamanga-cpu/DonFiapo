import { NextResponse } from "next/server";
import { queryContract } from "@/lib/blockchain/contract-helper";

const AIRDROP_CONTRACT = process.env.AIRDROP_CONTRACT || "";

const STATIC_CONFIG = {
  config: {
    minBalance: "1,000 FIAPO",
    maxParticipants: 10000,
    pointsPerFiapo: 1,
    pointsPerStake: 2,
    pointsPerBurn: 5,
    pointsPerNFT: 100,
    nftTierMultipliers: [1, 2, 4, 6, 12, 30, 60],
  },
  distributionRates: {
    holders: 25,
    stakers: 30,
    burners: 20,
    affiliates: 10,
    nftHolders: 15,
  },
  pointsSources: [
    { source: "Saldo FIAPO", points: "1 pt / FIAPO", weight: "25%" },
    { source: "Staking", points: "2 pts / FIAPO staked", weight: "30%" },
    { source: "Burn", points: "5 pts / FIAPO queimado", weight: "20%" },
    { source: "Afiliados", points: "Baseado em rede", weight: "10%" },
    { source: "NFT Holders", points: "100 pts × tier multiplier", weight: "15%" },
  ],
  allocation: { totalTokens: "30,500,000,000", percentage: "5.08%" },
};

/**
 * GET /api/admin/airdrop
 * Returns Airdrop contract data (on-chain if available, static fallback)
 */
export async function GET() {
  // If contract is not configured, return static config
  if (!AIRDROP_CONTRACT) {
    return NextResponse.json({
      ...STATIC_CONFIG,
      configured: false,
      connected: false,
      contractAddress: "",
      onChainStats: null,
    });
  }

  // Try to read on-chain stats
  try {
    // Note: ABI not yet available — will be extracted when contract is compiled
    // For now, return configured status with static config
    return NextResponse.json({
      ...STATIC_CONFIG,
      configured: true,
      connected: false,
      contractAddress: AIRDROP_CONTRACT,
      onChainStats: null,
      note: "Contract configured but ABI integration pending deployment",
    });
  } catch (error) {
    console.error("[API Airdrop] On-chain query failed:", error);
    return NextResponse.json({
      ...STATIC_CONFIG,
      configured: true,
      connected: false,
      contractAddress: AIRDROP_CONTRACT,
      onChainStats: null,
      error: error instanceof Error ? error.message : "Connection failed",
    });
  }
}
