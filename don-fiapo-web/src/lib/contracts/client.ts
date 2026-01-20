/**
 * Contract Client Base
 * 
 * Cliente base para conexão com contratos Ink! do ecossistema Don Fiapo.
 */

import type { ApiPromise } from '@polkadot/api';
import type { ContractPromise } from '@polkadot/api-contract';
import { CONTRACT_ADDRESSES, type ContractAddresses } from './addresses';

// Cache de conexões
let api: ApiPromise | null = null;
const contractCache: Partial<Record<keyof ContractAddresses, ContractPromise>> = {};
let connectionFailed = false;
let lastConnectionAttempt = 0;

const CONNECTION_RETRY_DELAY = 30000; // 30 segundos

// RPC Endpoints
const RPC_ENDPOINTS = [
  process.env.NEXT_PUBLIC_LUNES_RPC || 'ws://127.0.0.1:9944',
];

/**
 * Verifica se deve tentar conexão
 */
function shouldAttemptConnection(): boolean {
  if (!connectionFailed) return true;
  const now = Date.now();
  if (now - lastConnectionAttempt > CONNECTION_RETRY_DELAY) {
    connectionFailed = false;
    return true;
  }
  return false;
}

/**
 * Obter gas limit para transações
 */
export const getGasLimit = (apiInstance: ApiPromise) => {
  return {
    gasLimit: apiInstance.registry.createType('WeightV2', {
      refTime: 6_000_000_000,
      proofSize: 1024 * 1024,
    }) as unknown,
    storageDepositLimit: null
  };
};

/**
 * Obter gas limit alto para operações complexas
 */
export const getHighGasLimit = (apiInstance: ApiPromise) => {
  return {
    gasLimit: apiInstance.registry.createType('WeightV2', {
      refTime: BigInt(100_000_000_000),
      proofSize: BigInt(1_000_000),
    }) as unknown,
    storageDepositLimit: null
  };
};

/**
 * Tentar conectar a um endpoint RPC
 */
async function tryConnect(endpoint: string, timeout: number = 15000): Promise<ApiPromise | null> {
  const { ApiPromise, WsProvider } = await import('@polkadot/api');

  return new Promise((resolve) => {
    const provider = new WsProvider(endpoint, false);
    let resolved = false;
    let apiInstance: ApiPromise | null = null;

    const cleanup = () => {
      if (!resolved) {
        resolved = true;
        if (apiInstance) {
          apiInstance.disconnect().catch(() => {});
        } else {
          provider.disconnect().catch(() => {});
        }
      }
    };

    const timeoutId = setTimeout(() => {
      console.info(`[Contract] Connection timeout: ${endpoint}`);
      cleanup();
      resolve(null);
    }, timeout);

    provider.on('error', () => {
      if (!resolved) {
        clearTimeout(timeoutId);
        cleanup();
        resolve(null);
      }
    });

    provider.on('disconnected', () => {
      if (!resolved) {
        clearTimeout(timeoutId);
        cleanup();
        resolve(null);
      }
    });

    provider.connect().catch(() => {
      clearTimeout(timeoutId);
      cleanup();
      resolve(null);
    });

    provider.on('connected', async () => {
      try {
        apiInstance = await ApiPromise.create({
          provider,
          throwOnConnect: true,
        });
        await apiInstance.isReady;

        if (!resolved) {
          clearTimeout(timeoutId);
          resolved = true;
          console.info(`[Contract] Connected to: ${endpoint}`);
          resolve(apiInstance);
        }
      } catch {
        clearTimeout(timeoutId);
        cleanup();
        resolve(null);
      }
    });
  });
}

/**
 * Inicializar conexão com a rede Lunes
 */
export async function initializeApi(): Promise<ApiPromise | null> {
  if (typeof window === 'undefined') return null;

  if (api?.isConnected) return api;

  if (!shouldAttemptConnection()) {
    return null;
  }

  lastConnectionAttempt = Date.now();

  try {
    for (const endpoint of RPC_ENDPOINTS) {
      console.info(`[Contract] Trying: ${endpoint}`);
      const connectedApi = await tryConnect(endpoint, 8000);
      
      if (connectedApi) {
        api = connectedApi;
        connectionFailed = false;
        return api;
      }
    }

    connectionFailed = true;
    console.warn('[Contract] All endpoints failed');
    return null;
  } catch (error) {
    connectionFailed = true;
    console.warn('[Contract] Connection error:', error);
    return null;
  }
}

/**
 * Obter API conectada
 */
export function getApi(): ApiPromise | null {
  return api;
}

/**
 * Inicializar um contrato específico
 */
export async function initializeContract(
  contractName: keyof ContractAddresses,
  abi: unknown
): Promise<ContractPromise | null> {
  if (typeof window === 'undefined') return null;

  // Retornar do cache se disponível
  if (contractCache[contractName] && api?.isConnected) {
    return contractCache[contractName]!;
  }

  const address = CONTRACT_ADDRESSES[contractName];
  if (!address) {
    console.warn(`[Contract] Address not configured: ${contractName}`);
    return null;
  }

  const apiInstance = await initializeApi();
  if (!apiInstance) return null;

  try {
    const { ContractPromise } = await import('@polkadot/api-contract');
    
    const contract = new ContractPromise(apiInstance, abi as any, address);
    contractCache[contractName] = contract;
    
    console.info(`[Contract] Initialized: ${contractName} at ${address}`);
    return contract;
  } catch (error) {
    console.warn(`[Contract] Failed to initialize ${contractName}:`, error);
    return null;
  }
}

/**
 * Obter injector para assinatura de transações
 */
export async function getInjector(address: string) {
  const { web3FromAddress } = await import('@polkadot/extension-dapp');
  return web3FromAddress(address);
}

/**
 * Helpers de parsing
 */
export const parseBigInt = (val: unknown): bigint => {
  if (typeof val === 'bigint') return val;
  if (typeof val === 'number') return BigInt(val);
  if (typeof val === 'string') return BigInt(val.replace(/,/g, '') || '0');
  return BigInt(0);
};

export const parseNum = (val: unknown): number => {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return parseInt(val.replace(/,/g, ''), 10) || 0;
  return 0;
};

export const parseArray = (val: unknown): unknown[] => {
  if (Array.isArray(val)) return val;
  if (val && typeof val === 'object') {
    return Object.values(val);
  }
  return [];
};

/**
 * Extrair resultado de resposta do contrato (unwrap Result<T, E>)
 */
export function unwrapResult<T>(data: unknown): T | null {
  if (!data) return null;
  if (typeof data === 'object' && data !== null && 'Ok' in (data as object)) {
    return (data as { Ok: T }).Ok;
  }
  return data as T;
}

/**
 * Limpar cache de contratos
 */
export function clearContractCache(): void {
  Object.keys(contractCache).forEach(key => {
    delete contractCache[key as keyof ContractAddresses];
  });
}

/**
 * Desconectar da rede
 */
export async function disconnect(): Promise<void> {
  clearContractCache();
  if (api) {
    await api.disconnect();
    api = null;
  }
}
