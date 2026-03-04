/**
 * ICO Contract Integration for Admin Panel
 * 
 * Queries the fiapo_ico contract on Lunes Network for:
 * - ICO Stats (total minted, raised, participants, status)
 * - Tier configs (price, supply, minted, mining rates)
 * - Evolution & rarity stats
 */

import { ApiPromise, WsProvider } from "@polkadot/api";
import { ContractPromise } from "@polkadot/api-contract";
import { ICO_CONTRACT_ABI, TIER_NAMES, TIER_PRICES_USD } from "./ico-abi";

const LUNES_RPC = process.env.LUNES_RPC_URL || "wss://ws.lunes.io";
const ICO_CONTRACT_ADDRESS = process.env.ICO_CONTRACT || "";
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

      provider.on("disconnected", () => {
        apiInstance = null;
        connectionPromise = null;
      });

      return api;
    } catch (error) {
      connectionPromise = null;
      throw error;
    }
  })();

  return connectionPromise;
}

function getContract(api: ApiPromise): ContractPromise {
  return new ContractPromise(api, ICO_CONTRACT_ABI as any, ICO_CONTRACT_ADDRESS);
}

// Helper to decode contract query result
function decodeQueryResult(result: any): any {
  if (result?.result?.isOk) {
    const output = result.output;
    if (output) {
      // Try to get human-readable JSON
      try {
        return output.toHuman();
      } catch {
        return output.toJSON();
      }
    }
  }
  return null;
}

// ==================== Interfaces ====================

export interface ICOStats {
  totalNftsMinted: number;
  totalRaisedUsdCents: number;
  totalRaisedUsd: number;
  totalTokensMined: number;
  totalTokensClaimed: number;
  uniqueParticipants: number;
  icoActive: boolean;
  miningActive: boolean;
}

export interface TierConfig {
  tier: number;
  name: string;
  priceUsdCents: number;
  priceUsd: number;
  maxSupply: number;
  minted: number;
  mintedEvolution: number;
  burned: number;
  tokensPerNft: number;
  dailyMiningRate: number;
  active: boolean;
  progress: number; // percentage minted
}

export interface EvolutionStats {
  totalEvolutions: number;
  totalNftsBurned: number;
}

export interface RarityStats {
  name: string;
  count: number;
}

export interface ICODashboardData {
  stats: ICOStats;
  tiers: TierConfig[];
  evolutionStats: EvolutionStats;
  rarityStats: RarityStats[];
  connected: boolean;
  error?: string;
}

// ==================== Query Functions ====================

/**
 * Get ICO stats from the contract
 */
export async function getICOStats(): Promise<ICOStats | null> {
  try {
    const api = await getApi();
    const contract = getContract(api);
    const ALICE = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";

    const result = await contract.query.getStats(ALICE, { gasLimit: -1 });
    const data = decodeQueryResult(result);

    if (!data) return null;

    // data is ICOStats struct
    const totalRaisedCents = parseNumber(data.totalRaisedUsdtCents || data.total_raised_usdt_cents || 0);
    const totalClaimed = parseBigNumber(data.totalTokensClaimed || data.total_tokens_claimed || "0");

    return {
      totalNftsMinted: parseNumber(data.totalNftsMinted || data.total_nfts_minted || 0),
      totalRaisedUsdCents: totalRaisedCents,
      totalRaisedUsd: totalRaisedCents / 100,
      totalTokensMined: parseBigNumber(data.totalTokensMined || data.total_tokens_mined || "0") / SCALE,
      totalTokensClaimed: totalClaimed / SCALE,
      uniqueParticipants: parseNumber(data.uniqueParticipants || data.unique_participants || 0),
      icoActive: data.icoActive ?? data.ico_active ?? false,
      miningActive: data.miningActive ?? data.mining_active ?? false,
    };
  } catch (error) {
    console.error("[ICO] getICOStats error:", error);
    return null;
  }
}

/**
 * Get all tier configs from the contract
 */
export async function getTierConfigs(): Promise<TierConfig[]> {
  try {
    const api = await getApi();
    const contract = getContract(api);
    const ALICE = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";

    const result = await contract.query.getIcoNftConfigs(ALICE, { gasLimit: -1 });
    const data = decodeQueryResult(result);

    if (!data || !Array.isArray(data)) return [];

    return data.map((config: any, index: number) => {
      const minted = parseNumber(config.minted || 0);
      const maxSupply = parseNumber(config.maxSupply || config.max_supply || 0);

      return {
        tier: index,
        name: TIER_NAMES[index] || `Tier ${index}`,
        priceUsdCents: parseNumber(config.priceUsdtCents || config.price_usdt_cents || 0),
        priceUsd: TIER_PRICES_USD[index] || 0,
        maxSupply,
        minted,
        mintedEvolution: parseNumber(config.mintedEvolution || config.minted_evolution || 0),
        burned: parseNumber(config.burned || 0),
        tokensPerNft: parseBigNumber(config.tokensPerNft || config.tokens_per_nft || "0") / SCALE,
        dailyMiningRate: parseBigNumber(config.dailyMiningRate || config.daily_mining_rate || "0") / SCALE,
        active: config.active ?? true,
        progress: maxSupply > 0 ? Math.round((minted / maxSupply) * 100) : 0,
      };
    });
  } catch (error) {
    console.error("[ICO] getTierConfigs error:", error);
    return [];
  }
}

/**
 * Get evolution stats
 */
export async function getEvolutionStats(): Promise<EvolutionStats | null> {
  try {
    const api = await getApi();
    const contract = getContract(api);
    const ALICE = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";

    const result = await contract.query.getEvolutionStats(ALICE, { gasLimit: -1 });
    const data = decodeQueryResult(result);

    if (!data) return null;

    // Returns tuple (u64, u64)
    if (Array.isArray(data)) {
      return {
        totalEvolutions: parseNumber(data[0] || 0),
        totalNftsBurned: parseNumber(data[1] || 0),
      };
    }

    return {
      totalEvolutions: parseNumber(data.totalEvolutions || data[0] || 0),
      totalNftsBurned: parseNumber(data.totalNftsBurned || data[1] || 0),
    };
  } catch (error) {
    console.error("[ICO] getEvolutionStats error:", error);
    return null;
  }
}

/**
 * Get rarity stats
 */
export async function getRarityStats(): Promise<RarityStats[]> {
  try {
    const api = await getApi();
    const contract = getContract(api);
    const ALICE = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";

    const result = await contract.query.getRarityStats(ALICE, { gasLimit: -1 });
    const data = decodeQueryResult(result);

    if (!data || !Array.isArray(data)) return [];

    const rarityNames = ["Common", "Uncommon", "Rare", "Epic", "Legendary"];

    return data.map((item: any, index: number) => {
      // Each item is a tuple (VisualRarity, u32)
      const count = Array.isArray(item) ? parseNumber(item[1] || 0) : parseNumber(item.count || item[1] || 0);
      return {
        name: rarityNames[index] || `Rarity ${index}`,
        count,
      };
    });
  } catch (error) {
    console.error("[ICO] getRarityStats error:", error);
    return [];
  }
}

/**
 * Get total NFTs count
 */
export async function getTotalNfts(): Promise<number> {
  try {
    const api = await getApi();
    const contract = getContract(api);
    const ALICE = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";

    const result = await contract.query.totalNfts(ALICE, { gasLimit: -1 });
    const data = decodeQueryResult(result);
    return parseNumber(data || 0);
  } catch (error) {
    console.error("[ICO] getTotalNfts error:", error);
    return 0;
  }
}

/**
 * Get full ICO dashboard data in one call
 */
export async function getICODashboardData(): Promise<ICODashboardData> {
  if (!ICO_CONTRACT_ADDRESS) {
    return {
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
      error: "ICO_CONTRACT não configurado no .env",
    };
  }

  try {
    const [stats, tiers, evolutionStats, rarityStats] = await Promise.all([
      getICOStats(),
      getTierConfigs(),
      getEvolutionStats(),
      getRarityStats(),
    ]);

    return {
      stats: stats || {
        totalNftsMinted: 0,
        totalRaisedUsdCents: 0,
        totalRaisedUsd: 0,
        totalTokensMined: 0,
        totalTokensClaimed: 0,
        uniqueParticipants: 0,
        icoActive: false,
        miningActive: false,
      },
      tiers: tiers || [],
      evolutionStats: evolutionStats || { totalEvolutions: 0, totalNftsBurned: 0 },
      rarityStats: rarityStats || [],
      connected: true,
    };
  } catch (error) {
    console.error("[ICO] Dashboard data error:", error);
    return {
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
      error: `Falha ao conectar: ${error instanceof Error ? error.message : "erro desconhecido"}`,
    };
  }
}

/**
 * Check if ICO contract is configured and reachable
 */
export async function checkICOHealth(): Promise<{
  configured: boolean;
  connected: boolean;
  contractAddress: string;
  error?: string;
}> {
  const configured = !!ICO_CONTRACT_ADDRESS;
  if (!configured) {
    return { configured, connected: false, contractAddress: "", error: "ICO_CONTRACT não configurado" };
  }

  try {
    const api = await getApi();
    const connected = api.isConnected;
    return { configured, connected, contractAddress: ICO_CONTRACT_ADDRESS };
  } catch (error) {
    return {
      configured,
      connected: false,
      contractAddress: ICO_CONTRACT_ADDRESS,
      error: error instanceof Error ? error.message : "Falha na conexão",
    };
  }
}

/**
 * Disconnect from Lunes
 */
export async function disconnectICO(): Promise<void> {
  if (apiInstance) {
    await apiInstance.disconnect();
    apiInstance = null;
    connectionPromise = null;
  }
}

// ==================== Helpers ====================

function parseNumber(value: any): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/,/g, "");
    return parseInt(cleaned, 10) || 0;
  }
  return 0;
}

function parseBigNumber(value: any): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/,/g, "");
    const num = Number(cleaned);
    return isNaN(num) ? 0 : num;
  }
  if (typeof value === "bigint") return Number(value);
  return 0;
}
