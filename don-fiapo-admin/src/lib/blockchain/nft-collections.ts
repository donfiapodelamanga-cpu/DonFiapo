/**
 * NFT Collections - Blockchain Integration Service
 * 
 * Conecta o admin panel ao contrato fiapo_nft_collections na Lunes Network.
 * Usa @polkadot/api + @polkadot/api-contract para dry-run queries e
 * submissão de transações via Keyring (admin server-side).
 * 
 * Fluxo: Admin DB (Prisma) → API sync → Contrato on-chain
 */

import { ApiPromise, WsProvider, Keyring } from "@polkadot/api";
import { ContractPromise } from "@polkadot/api-contract";
import { NFT_COLLECTIONS_ABI, RARITY_MAP, CURRENCY_MAP, STATUS_MAP } from "./nft-collections-abi";

const LUNES_RPC = process.env.LUNES_RPC_URL || "wss://ws.lunes.io";
const NFT_CONTRACT_ADDRESS = process.env.NFT_COLLECTIONS_CONTRACT || "";
const ADMIN_SEED = process.env.LUNES_ADMIN_SEED || "";
const LUNES_DECIMALS = 8;

let apiInstance: ApiPromise | null = null;
let contractInstance: ContractPromise | null = null;

/**
 * Conectar à Lunes Network e inicializar o contrato
 */
async function getContract(): Promise<{ api: ApiPromise; contract: ContractPromise }> {
  if (apiInstance?.isConnected && contractInstance) {
    return { api: apiInstance, contract: contractInstance };
  }

  if (!NFT_CONTRACT_ADDRESS) {
    throw new Error("NFT_COLLECTIONS_CONTRACT não configurado no .env");
  }

  console.log(`[NFTCollections] Connecting to ${LUNES_RPC}...`);
  const provider = new WsProvider(LUNES_RPC, 5000);
  const api = await ApiPromise.create({ provider, noInitWarn: true });
  await api.isReady;

  const contract = new ContractPromise(api, NFT_COLLECTIONS_ABI as any, NFT_CONTRACT_ADDRESS);

  apiInstance = api;
  contractInstance = contract;

  console.log(`[NFTCollections] Connected. Contract: ${NFT_CONTRACT_ADDRESS}`);
  return { api, contract };
}

/**
 * Obter signer do admin (server-side via seed phrase)
 */
function getAdminKeyring() {
  if (!ADMIN_SEED) {
    throw new Error("LUNES_ADMIN_SEED não configurado no .env");
  }
  const keyring = new Keyring({ type: "sr25519" });
  return keyring.addFromUri(ADMIN_SEED);
}

/**
 * Gas limit padrão para transações
 */
function getGasLimit(api: ApiPromise) {
  return {
    gasLimit: api.registry.createType("WeightV2", {
      refTime: BigInt(50_000_000_000),
      proofSize: BigInt(1_000_000),
    }) as any,
    storageDepositLimit: null,
  };
}

/**
 * Converter preço float (ex: 10.5 LUNES) para Balance on-chain (u128 com decimais)
 */
function priceToBalance(price: number): bigint {
  return BigInt(Math.round(price * 10 ** LUNES_DECIMALS));
}

/**
 * Executar transação e aguardar finalização
 */
async function submitTx(
  api: ApiPromise,
  tx: any,
  signer: any
): Promise<{ blockHash: string; success: boolean; error?: string }> {
  return new Promise((resolve, reject) => {
    tx.signAndSend(signer, ({ status, dispatchError }: any) => {
      if (status.isFinalized) {
        if (dispatchError) {
          let errorMsg = "Transaction failed";
          if (dispatchError.isModule) {
            try {
              const decoded = api.registry.findMetaError(dispatchError.asModule);
              errorMsg = `${decoded.section}.${decoded.name}: ${decoded.docs.join(" ")}`;
            } catch {
              errorMsg = dispatchError.toString();
            }
          }
          resolve({ blockHash: status.asFinalized.toString(), success: false, error: errorMsg });
        } else {
          resolve({ blockHash: status.asFinalized.toString(), success: true });
        }
      }
    }).catch((err: any) => reject(err));
  });
}

// ==================== Public API ====================

export interface SyncCollectionResult {
  success: boolean;
  contractCollectionId?: number;
  error?: string;
  blockHash?: string;
}

export interface SyncTokenResult {
  success: boolean;
  onChainTokenId?: number;
  error?: string;
  blockHash?: string;
}

/**
 * Criar coleção on-chain
 */
export async function createCollectionOnChain(
  name: string,
  symbol: string
): Promise<SyncCollectionResult> {
  try {
    const { api, contract } = await getContract();
    const signer = getAdminKeyring();
    const gasOpts = getGasLimit(api);

    // Dry-run para obter o collection_id que será criado
    const { result, output } = await contract.query.create_collection(
      signer.address,
      gasOpts,
      name,
      symbol
    );

    if (result.isErr) {
      return { success: false, error: `Dry-run failed: ${result.asErr.toString()}` };
    }

    const dryResult = output?.toHuman() as any;
    if (dryResult?.Err) {
      return { success: false, error: `Contract error: ${JSON.stringify(dryResult.Err)}` };
    }

    const expectedId = parseInt(
      typeof dryResult?.Ok === "string" ? dryResult.Ok.replace(/,/g, "") : dryResult?.Ok?.toString() || "0"
    );

    // Submeter transação real
    const tx = contract.tx.create_collection(gasOpts, name, symbol);
    const txResult = await submitTx(api, tx, signer);

    if (!txResult.success) {
      return { success: false, error: txResult.error, blockHash: txResult.blockHash };
    }

    return {
      success: true,
      contractCollectionId: expectedId,
      blockHash: txResult.blockHash,
    };
  } catch (error: any) {
    console.error("[NFTCollections] createCollectionOnChain error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Adicionar token (arte) on-chain
 */
export async function addTokenOnChain(
  collectionId: number,
  name: string,
  metadataUri: string,
  price: number,
  currency: string,
  supply: number,
  rarity: string | null
): Promise<SyncTokenResult> {
  try {
    const { api, contract } = await getContract();
    const signer = getAdminKeyring();
    const gasOpts = getGasLimit(api);

    const balancePrice = priceToBalance(price);
    const currencyU8 = CURRENCY_MAP[currency] ?? 0;
    const rarityU8 = rarity ? (RARITY_MAP[rarity] ?? 0) : 0;

    // Dry-run
    const { result, output } = await contract.query.add_token(
      signer.address,
      gasOpts,
      collectionId,
      name,
      metadataUri,
      balancePrice,
      currencyU8,
      supply,
      rarityU8
    );

    if (result.isErr) {
      return { success: false, error: `Dry-run failed: ${result.asErr.toString()}` };
    }

    const dryResult = output?.toHuman() as any;
    if (dryResult?.Err) {
      return { success: false, error: `Contract error: ${JSON.stringify(dryResult.Err)}` };
    }

    const expectedTokenId = parseInt(
      typeof dryResult?.Ok === "string" ? dryResult.Ok.replace(/,/g, "") : dryResult?.Ok?.toString() || "0"
    );

    // Submeter
    const tx = contract.tx.add_token(
      gasOpts,
      collectionId,
      name,
      metadataUri,
      balancePrice,
      currencyU8,
      supply,
      rarityU8
    );
    const txResult = await submitTx(api, tx, signer);

    if (!txResult.success) {
      return { success: false, error: txResult.error, blockHash: txResult.blockHash };
    }

    return {
      success: true,
      onChainTokenId: expectedTokenId,
      blockHash: txResult.blockHash,
    };
  } catch (error: any) {
    console.error("[NFTCollections] addTokenOnChain error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Atualizar metadata de um token on-chain
 */
export async function updateTokenMetadataOnChain(
  tokenId: number,
  metadataUri: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { api, contract } = await getContract();
    const signer = getAdminKeyring();
    const gasOpts = getGasLimit(api);

    const tx = contract.tx.update_token_metadata(gasOpts, tokenId, metadataUri);
    const txResult = await submitTx(api, tx, signer);

    return { success: txResult.success, error: txResult.error };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Atualizar preço de um token on-chain
 */
export async function updateTokenPriceOnChain(
  tokenId: number,
  price: number,
  currency: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { api, contract } = await getContract();
    const signer = getAdminKeyring();
    const gasOpts = getGasLimit(api);

    const balancePrice = priceToBalance(price);
    const currencyU8 = CURRENCY_MAP[currency] ?? 0;

    const tx = contract.tx.update_token_price(gasOpts, tokenId, balancePrice, currencyU8);
    const txResult = await submitTx(api, tx, signer);

    return { success: txResult.success, error: txResult.error };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Atualizar status da coleção on-chain
 */
export async function setCollectionStatusOnChain(
  collectionId: number,
  status: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { api, contract } = await getContract();
    const signer = getAdminKeyring();
    const gasOpts = getGasLimit(api);

    const statusU8 = STATUS_MAP[status] ?? 0;

    const tx = contract.tx.set_collection_status(gasOpts, collectionId, statusU8);
    const txResult = await submitTx(api, tx, signer);

    return { success: txResult.success, error: txResult.error };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Obter stats do contrato (query read-only)
 */
export async function getContractStats(): Promise<{
  totalCollections: number;
  totalTokens: number;
  totalMinted: number;
  volumeLunes: bigint;
  volumeFiapo: bigint;
} | null> {
  try {
    const { contract } = await getContract();
    const signer = getAdminKeyring();
    const gasOpts = getGasLimit(apiInstance!);

    const { result, output } = await contract.query.stats(signer.address, gasOpts);

    if (result.isOk && output) {
      const data = output.toHuman() as any;
      const vals = data?.Ok || data;
      if (Array.isArray(vals)) {
        const clean = (v: string) => BigInt((v || "0").replace(/,/g, ""));
        return {
          totalCollections: parseInt((vals[0] || "0").replace(/,/g, "")),
          totalTokens: parseInt((vals[1] || "0").replace(/,/g, "")),
          totalMinted: parseInt((vals[2] || "0").replace(/,/g, "")),
          volumeLunes: clean(vals[3]),
          volumeFiapo: clean(vals[4]),
        };
      }
    }
    return null;
  } catch (error) {
    console.error("[NFTCollections] getContractStats error:", error);
    return null;
  }
}

/**
 * Verificar se o contrato está configurado e acessível
 */
export async function checkContractHealth(): Promise<{
  configured: boolean;
  connected: boolean;
  contractAddress: string;
  error?: string;
}> {
  const configured = !!NFT_CONTRACT_ADDRESS && !!ADMIN_SEED;
  if (!configured) {
    return {
      configured: false,
      connected: false,
      contractAddress: NFT_CONTRACT_ADDRESS || "(não configurado)",
      error: "NFT_COLLECTIONS_CONTRACT ou LUNES_ADMIN_SEED não configurado no .env",
    };
  }

  try {
    await getContract();
    return {
      configured: true,
      connected: true,
      contractAddress: NFT_CONTRACT_ADDRESS,
    };
  } catch (error: any) {
    return {
      configured: true,
      connected: false,
      contractAddress: NFT_CONTRACT_ADDRESS,
      error: error.message,
    };
  }
}

/**
 * Desconectar da rede
 */
export async function disconnect(): Promise<void> {
  if (apiInstance) {
    await apiInstance.disconnect();
    apiInstance = null;
    contractInstance = null;
  }
}
