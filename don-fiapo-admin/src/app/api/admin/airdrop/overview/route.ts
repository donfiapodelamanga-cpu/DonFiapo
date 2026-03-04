import { NextResponse } from "next/server";

const WEB_API = process.env.WEB_API_URL || "http://localhost:3000";
const ADMIN_KEY = process.env.ADMIN_API_KEY || "";
const AIRDROP_CONTRACT = process.env.AIRDROP_CONTRACT || "";
const REWARDS_CONTRACT = process.env.REWARDS_CONTRACT || "";

/**
 * Attempts an on-chain dry-run query via the contract helper.
 * Returns null on any failure (contract not deployed, RPC unavailable, etc.)
 */
async function tryOnChainQuery<T>(
  contractAddress: string,
  method: string,
  args: unknown[] = []
): Promise<T | null> {
  if (!contractAddress) return null;
  try {
    const { queryContract } = await import("@/lib/blockchain/contract-helper");
    // ABI is loaded dynamically — will be null until contract is compiled & ABI placed in /lib/abi/
    const abiModule = await import(`@/lib/abi/${method.split("_")[0]}.json`).catch(() => null);
    if (!abiModule) return null;
    const result = await queryContract(contractAddress, abiModule.default ?? abiModule, method, args);
    return result as T;
  } catch {
    return null;
  }
}

/**
 * GET /api/admin/airdrop/overview
 *
 * Unified response merging:
 *   1. ON-CHAIN — FiapoAirdrop contract (FIAPO distribution by points)
 *   2. ON-CHAIN — FiapoRewards contract (FIAPO monthly ranking)
 *   3. OFF-CHAIN — RewardPool DB (LUNES Early Bird + Mission pools)
 */
export async function GET() {
  const [airdropRes, rewardPoolsRes] = await Promise.allSettled([
    fetch(`http://localhost:${process.env.PORT || 3001}/api/admin/airdrop`).catch(() => null),
    fetch(`${WEB_API}/api/admin/airdrop/reward-pools`, {
      headers: { "x-admin-key": ADMIN_KEY },
      cache: "no-store",
    }).catch(() => null),
  ]);

  // ── On-chain airdrop static/live config ──────────────────────────────────
  let airdropConfig: Record<string, unknown> = {};
  let airdropConnected = false;
  if (airdropRes.status === "fulfilled" && airdropRes.value?.ok) {
    try {
      airdropConfig = await airdropRes.value.json();
      airdropConnected = (airdropConfig.connected as boolean) ?? false;
    } catch { /* ignore */ }
  }

  // ── On-chain rewards live query (when contract is deployed) ───────────────
  interface RewardsFundResult { Ok?: string | number }
  interface RewardsTotalResult { Ok?: string | number }

  const [rewardsFund, rewardsTotal] = await Promise.all([
    tryOnChainQuery<RewardsFundResult>(REWARDS_CONTRACT, "rewards_get_rewards_fund"),
    tryOnChainQuery<RewardsTotalResult>(REWARDS_CONTRACT, "rewards_total_distributed"),
  ]);

  const onChainRewards = {
    configured: !!REWARDS_CONTRACT,
    connected: !!rewardsFund,
    contractAddress: REWARDS_CONTRACT || null,
    rewardsFund: rewardsFund ? Number((rewardsFund as RewardsFundResult).Ok ?? 0) / 1e8 : null,
    totalDistributed: rewardsTotal ? Number((rewardsTotal as RewardsTotalResult).Ok ?? 0) / 1e8 : null,
  };

  // ── Off-chain LUNES pools ─────────────────────────────────────────────────
  let offChain: Record<string, unknown> = {
    pools: [],
    earlyBird: null,
    totals: { totalAllocatedLunes: 0, totalCommittedLunes: 0, totalPendingLunes: 0, totalRemainingLunes: 0 },
    error: null,
  };

  if (rewardPoolsRes.status === "fulfilled" && rewardPoolsRes.value?.ok) {
    try {
      offChain = await rewardPoolsRes.value.json();
    } catch {
      offChain.error = "Failed to parse reward pools response";
    }
  } else {
    offChain.error = "Web API unreachable";
  }

  // ── Distribution rates (from contract spec) ───────────────────────────────
  const distributionRates = (airdropConfig.distributionRates as Record<string, number>) ?? {
    holders: 25,
    stakers: 30,
    burners: 20,
    affiliates: 10,
    nftHolders: 15,
  };

  const allocationFIAPO = (airdropConfig.allocation as Record<string, string>) ?? {
    totalTokens: "30,500,000,000",
    percentage: "5.08%",
  };

  return NextResponse.json({
    // ── On-chain ────────────────────────────────────────────────────────────
    onChain: {
      airdrop: {
        configured: !!AIRDROP_CONTRACT,
        connected: airdropConnected,
        contractAddress: AIRDROP_CONTRACT || null,
        isActive: (airdropConfig.onChainStats as Record<string, unknown> | null)?.isActive ?? false,
        currentRound: (airdropConfig.onChainStats as Record<string, unknown> | null)?.currentRound ?? 0,
        totalTokens: (airdropConfig.onChainStats as Record<string, unknown> | null)?.totalTokens ?? null,
        totalPoints: (airdropConfig.onChainStats as Record<string, unknown> | null)?.totalPoints ?? null,
        tokenSymbol: "FIAPO",
        allocation: allocationFIAPO,
        distributionRates,
        pointsSources: (airdropConfig.pointsSources as unknown[]) ?? [
          { source: "Saldo FIAPO", points: "1 pt / FIAPO", weight: "25%" },
          { source: "Staking", points: "2 pts / FIAPO staked", weight: "30%" },
          { source: "Burn", points: "5 pts / FIAPO queimado", weight: "20%" },
          { source: "Afiliados", points: "Baseado em rede", weight: "10%" },
          { source: "NFT Holders", points: "100 pts × tier multiplier", weight: "15%" },
        ],
        config: (airdropConfig.config as unknown) ?? null,
      },
      rewards: onChainRewards,
    },
    // ── Off-chain ───────────────────────────────────────────────────────────
    offChain: {
      tokenSymbol: "LUNES",
      pools: (offChain.pools as unknown[]) ?? [],
      earlyBird: (offChain.earlyBird as unknown) ?? null,
      totals: (offChain.totals as Record<string, number>) ?? {},
      error: (offChain.error as string | null) ?? null,
    },
  });
}
