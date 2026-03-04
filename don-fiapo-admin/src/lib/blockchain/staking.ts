/**
 * Staking Contract Integration for Admin Panel
 * 
 * Queries the fiapo_staking contract on Lunes Network for:
 * - Staking Stats (TVL, stakers, rewards distributed, active positions)
 * - Pool configs (APY, min period, penalties)
 */

import { ApiPromise, WsProvider } from "@polkadot/api";
import { ContractPromise } from "@polkadot/api-contract";
import { STAKING_CONTRACT_ABI, POOL_CONFIGS } from "./staking-abi";

const LUNES_RPC = process.env.LUNES_RPC_URL || "wss://ws.lunes.io";
const STAKING_CONTRACT_ADDRESS = process.env.STAKING_CONTRACT || "";
const SCALE = 100_000_000; // 10^8

let apiInstance: ApiPromise | null = null;
let connectionPromise: Promise<ApiPromise> | null = null;

async function getApi(): Promise<ApiPromise> {
  if (apiInstance && apiInstance.isConnected) return apiInstance;
  if (connectionPromise) return connectionPromise;

  connectionPromise = (async () => {
    try {
      const provider = new WsProvider(LUNES_RPC, 5000);
      const api = await ApiPromise.create({ provider, noInitWarn: true });
      await api.isReady;
      apiInstance = api;
      provider.on("disconnected", () => { apiInstance = null; connectionPromise = null; });
      return api;
    } catch (error) {
      connectionPromise = null;
      throw error;
    }
  })();

  return connectionPromise;
}

function getContract(api: ApiPromise): ContractPromise {
  return new ContractPromise(api, STAKING_CONTRACT_ABI as any, STAKING_CONTRACT_ADDRESS);
}

function decodeQueryResult(result: any): any {
  if (result?.result?.isOk) {
    try { return result.output?.toHuman(); } catch { return result.output?.toJSON(); }
  }
  return null;
}

// ==================== Interfaces ====================

export interface StakingStats {
  totalStaked: number;
  totalStakedFormatted: string;
  totalStakers: number;
  totalRewardsDistributed: number;
  totalRewardsFormatted: string;
  activePositions: number;
}

export interface PoolInfo {
  id: number;
  name: string;
  apyRange: string;
  frequency: string;
  minDays: number;
  color: string;
}

export interface StakingDashboardData {
  stats: StakingStats;
  pools: PoolInfo[];
  connected: boolean;
  error?: string;
}

// ==================== Query Functions ====================

export async function getStakingStats(): Promise<StakingStats | null> {
  try {
    const api = await getApi();
    const contract = getContract(api);
    const ALICE = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";

    const result = await contract.query.getStats(ALICE, { gasLimit: -1 });
    const data = decodeQueryResult(result);

    if (!data) return null;

    const totalStaked = parseBigNumber(data.totalStaked || data.total_staked || "0");
    const totalRewards = parseBigNumber(data.totalRewardsDistributed || data.total_rewards_distributed || "0");

    return {
      totalStaked: totalStaked / SCALE,
      totalStakedFormatted: formatTokens(totalStaked),
      totalStakers: parseNumber(data.totalStakers || data.total_stakers || 0),
      totalRewardsDistributed: totalRewards / SCALE,
      totalRewardsFormatted: formatTokens(totalRewards),
      activePositions: parseNumber(data.activePositions || data.active_positions || 0),
    };
  } catch (error) {
    console.error("[Staking] getStakingStats error:", error);
    return null;
  }
}

export async function getStakingDashboardData(): Promise<StakingDashboardData> {
  if (!STAKING_CONTRACT_ADDRESS) {
    return {
      stats: emptyStats(),
      pools: getPoolInfos(),
      connected: false,
      error: "STAKING_CONTRACT não configurado no .env",
    };
  }

  try {
    const stats = await getStakingStats();

    return {
      stats: stats || emptyStats(),
      pools: getPoolInfos(),
      connected: true,
    };
  } catch (error) {
    console.error("[Staking] Dashboard data error:", error);
    return {
      stats: emptyStats(),
      pools: getPoolInfos(),
      connected: false,
      error: `Falha ao conectar: ${error instanceof Error ? error.message : "erro desconhecido"}`,
    };
  }
}

// ==================== Helpers ====================

function getPoolInfos(): PoolInfo[] {
  return Object.entries(POOL_CONFIGS).map(([id, config]) => ({
    id: parseInt(id),
    ...config,
  }));
}

function emptyStats(): StakingStats {
  return {
    totalStaked: 0,
    totalStakedFormatted: "0",
    totalStakers: 0,
    totalRewardsDistributed: 0,
    totalRewardsFormatted: "0",
    activePositions: 0,
  };
}

function formatTokens(raw: number): string {
  const value = raw / SCALE;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function parseNumber(value: any): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseInt(value.replace(/,/g, ""), 10) || 0;
  return 0;
}

function parseBigNumber(value: any): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") { const n = Number(value.replace(/,/g, "")); return isNaN(n) ? 0 : n; }
  if (typeof value === "bigint") return Number(value);
  return 0;
}
