/**
 * Marketplace Contract Integration for Admin Panel
 * 
 * Queries the fiapo_marketplace contract on Lunes Network for:
 * - Active listings, auctions, trades counts
 * - Total volume
 * - Payment mode & ICO completion status
 */

import { ApiPromise, WsProvider } from "@polkadot/api";
import { ContractPromise } from "@polkadot/api-contract";
import { MARKETPLACE_CONTRACT_ABI } from "./marketplace-abi";

const LUNES_RPC = process.env.LUNES_RPC_URL || "wss://ws.lunes.io";
const MARKETPLACE_CONTRACT_ADDRESS = process.env.MARKETPLACE_CONTRACT || "";
const SCALE = 100_000_000;

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
  return new ContractPromise(api, MARKETPLACE_CONTRACT_ABI as any, MARKETPLACE_CONTRACT_ADDRESS);
}

function decodeQueryResult(result: any): any {
  if (result?.result?.isOk) {
    try { return result.output?.toHuman(); } catch { return result.output?.toJSON(); }
  }
  return null;
}

// ==================== Interfaces ====================

export interface MarketplaceStats {
  activeListings: number;
  activeAuctions: number;
  activeTrades: number;
  totalVolume: number;
  totalVolumeFormatted: string;
  icoSalesCompleted: boolean;
  paymentMode: string; // "LUNES" or "LUNES + FIAPO"
  feeBps: number;
  tradFeeBps: number;
}

export interface MarketplaceDashboardData {
  stats: MarketplaceStats;
  connected: boolean;
  error?: string;
}

// ==================== Query Functions ====================

export async function getMarketplaceDashboardData(): Promise<MarketplaceDashboardData> {
  if (!MARKETPLACE_CONTRACT_ADDRESS) {
    return {
      stats: emptyStats(),
      connected: false,
      error: "MARKETPLACE_CONTRACT não configurado no .env",
    };
  }

  try {
    const api = await getApi();
    const contract = getContract(api);
    const ALICE = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";

    const [listingsRes, auctionsRes, tradesRes, volumeRes, icoRes, modeRes] = await Promise.all([
      contract.query.getActiveListings(ALICE, { gasLimit: -1 }).catch(() => null),
      contract.query.getActiveAuctions(ALICE, { gasLimit: -1 }).catch(() => null),
      contract.query.getActiveTrades(ALICE, { gasLimit: -1 }).catch(() => null),
      contract.query.totalVolume(ALICE, { gasLimit: -1 }).catch(() => null),
      contract.query.isIcoSalesCompleted(ALICE, { gasLimit: -1 }).catch(() => null),
      contract.query.paymentMode(ALICE, { gasLimit: -1 }).catch(() => null),
    ]);

    const listings = listingsRes ? decodeQueryResult(listingsRes) : null;
    const auctions = auctionsRes ? decodeQueryResult(auctionsRes) : null;
    const trades = tradesRes ? decodeQueryResult(tradesRes) : null;
    const volume = volumeRes ? decodeQueryResult(volumeRes) : null;
    const icoCompleted = icoRes ? decodeQueryResult(icoRes) : false;
    const mode = modeRes ? decodeQueryResult(modeRes) : 0;

    const totalVolumeRaw = parseBigNumber(volume || "0");
    const totalVolume = totalVolumeRaw / SCALE;

    return {
      stats: {
        activeListings: Array.isArray(listings) ? listings.length : 0,
        activeAuctions: Array.isArray(auctions) ? auctions.length : 0,
        activeTrades: Array.isArray(trades) ? trades.length : 0,
        totalVolume,
        totalVolumeFormatted: formatTokens(totalVolumeRaw),
        icoSalesCompleted: icoCompleted === true,
        paymentMode: parseNumber(mode) === 2 ? "LUNES + FIAPO" : "Apenas LUNES",
        feeBps: 600, // Default from contract constructor
        tradFeeBps: 300,
      },
      connected: true,
    };
  } catch (error) {
    console.error("[Marketplace] Dashboard data error:", error);
    return {
      stats: emptyStats(),
      connected: false,
      error: `Falha ao conectar: ${error instanceof Error ? error.message : "erro desconhecido"}`,
    };
  }
}

// ==================== Helpers ====================

function emptyStats(): MarketplaceStats {
  return {
    activeListings: 0,
    activeAuctions: 0,
    activeTrades: 0,
    totalVolume: 0,
    totalVolumeFormatted: "0",
    icoSalesCompleted: false,
    paymentMode: "Apenas LUNES",
    feeBps: 600,
    tradFeeBps: 300,
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
