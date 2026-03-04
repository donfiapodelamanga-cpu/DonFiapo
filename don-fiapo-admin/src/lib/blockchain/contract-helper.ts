/**
 * Shared helper for on-chain contract queries via Polkadot.js
 * Used by admin API routes that need to read contract state
 * with graceful fallback when contract is not deployed/configured
 */

import { ApiPromise, WsProvider } from "@polkadot/api";
import { ContractPromise } from "@polkadot/api-contract";

const LUNES_RPC = process.env.LUNES_RPC_URL || "wss://ws.lunes.io";
const DUMMY_CALLER = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";

let apiInstance: ApiPromise | null = null;
let connectionPromise: Promise<ApiPromise> | null = null;

export async function getApi(): Promise<ApiPromise> {
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

/**
 * Create a contract instance for querying
 */
export function createContract(api: ApiPromise, abi: any, address: string): ContractPromise {
  return new ContractPromise(api, abi, address);
}

/**
 * Safely decode a contract query result
 */
export function decodeResult(result: any): any {
  if (result?.result?.isOk) {
    try { return result.output?.toHuman(); } catch { return result.output?.toJSON(); }
  }
  return null;
}

/**
 * Execute a dry-run query on a contract method
 */
export async function queryContract(
  contractAddress: string,
  abi: any,
  method: string,
  args: any[] = []
): Promise<any> {
  const api = await getApi();
  const contract = createContract(api, abi, contractAddress);
  const result = await (contract.query as any)[method](DUMMY_CALLER, { gasLimit: -1 }, ...args);
  return decodeResult(result);
}

export const SCALE = 100_000_000; // 10^8

export function formatTokens(raw: number): string {
  const value = raw / SCALE;
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export function parseNumber(value: any): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseInt(value.replace(/,/g, ""), 10) || 0;
  return 0;
}
