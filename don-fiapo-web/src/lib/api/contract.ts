/**
 * Contract API Client
 * 
 * Handles communication with the Don Fiapo smart contract on Lunes Network
 */

// Type-only imports (these are removed during compilation, no runtime impact)
import type { ApiPromise } from '@polkadot/api';
import type { ContractPromise } from '@polkadot/api-contract';
import { API_CONFIG, LUNES_RPC_ENDPOINTS } from './config';
import { CONTRACT_ABI, type NFTData } from './contract-abi';


// Module-level cache for connections
let api: ApiPromise | null = null;
let contract: ContractPromise | null = null;
let connectionPromise: Promise<ContractPromise | null> | null = null;
let connectionFailed = false;
let lastConnectionAttempt = 0;
let currentEndpointIndex = 0;
const CONNECTION_RETRY_DELAY = 30000; // 30 seconds between retries

// Helper for numeric conversion from contract
export const parseBigInt = (val: any): bigint => {
  if (typeof val === 'bigint') return val;
  if (typeof val === 'number') return BigInt(val);
  if (typeof val === 'string') return BigInt(val.replace(/,/g, '') || '0');
  return BigInt(0);
};

export const parseNum = (val: any): number => {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return parseInt(val.replace(/,/g, ''), 10) || 0;
  return 0;
};

export const parseArray = (val: any): any[] => {
  if (Array.isArray(val)) return val;
  if (val && typeof val === 'object') {
    return Object.values(val);
  }
  return [];
};

/**
 * ICO Contract Error Mapping
 * Maps contract error indices to user-friendly messages
 */
const ICO_ERROR_MESSAGES: Record<number, { code: string; message: string; userMessage: string }> = {
  0: { code: 'ICONotActive', message: 'ICO is not active', userMessage: 'ico.errors.ICONotActive' },
  1: { code: 'NFTNotFound', message: 'NFT not found', userMessage: 'ico.errors.NFTNotFound' },
  2: { code: 'NotNFTOwner', message: 'Not the NFT owner', userMessage: 'ico.errors.NotNFTOwner' },
  3: { code: 'NFTInactive', message: 'NFT is inactive', userMessage: 'ico.errors.NFTInactive' },
  4: { code: 'MiningNotStarted', message: 'Mining has not started', userMessage: 'ico.errors.MiningNotStarted' },
  5: { code: 'MiningEnded', message: 'Mining has ended', userMessage: 'ico.errors.MiningEnded' },
  6: { code: 'NoTokensToClaim', message: 'No tokens to claim', userMessage: 'ico.errors.NoTokensToClaim' },
  7: { code: 'InsufficientNFTs', message: 'Insufficient NFTs', userMessage: 'ico.errors.InsufficientNFTs' },
  8: { code: 'InvalidNFTCount', message: 'Invalid NFT count', userMessage: 'ico.errors.InvalidNFTCount' },
  9: { code: 'InvalidNFTType', message: 'Invalid NFT type', userMessage: 'ico.errors.InvalidNFTType' },
  10: { code: 'MaxSupplyReached', message: 'Max supply reached', userMessage: 'ico.errors.MaxSupplyReached' },
  11: { code: 'PaymentRequired', message: 'Payment required', userMessage: 'ico.errors.PaymentRequired' },
  12: { code: 'PaymentAmountMismatch', message: 'Payment amount mismatch', userMessage: 'ico.errors.PaymentAmountMismatch' },
  13: { code: 'PaymentAlreadyUsed', message: 'Payment already used', userMessage: 'ico.errors.PaymentAlreadyUsed' },
  14: { code: 'InvalidTransactionHash', message: 'Invalid transaction hash', userMessage: 'ico.errors.InvalidTransactionHash' },
  15: { code: 'FreeMintAlreadyUsed', message: 'Free mint limit reached', userMessage: 'ico.errors.FreeMintAlreadyUsed' },
  16: { code: 'EvolutionNotAllowed', message: 'Evolution not allowed', userMessage: 'ico.errors.EvolutionNotAllowed' },
  17: { code: 'CoreContractError', message: 'Core contract error', userMessage: 'ico.errors.CoreContractError' },
  18: { code: 'Unauthorized', message: 'Unauthorized', userMessage: 'ico.errors.Unauthorized' },
  // Mapping 25 (0x19) which appears to be ContractReverted or similar in this Runtime
  25: { code: 'ContractReverted', message: 'Contract Reverted', userMessage: 'ico.errors.ContractReverted' },
};

/**
 * Decode contract dispatch error to user-friendly message
 */
export function decodeContractError(dispatchError: any, api?: any): string {
  if (!dispatchError) return 'Erro desconhecido';

  // Handle string errors (already decoded)
  if (typeof dispatchError === 'string') {
    // Try to parse JSON error format
    try {
      const parsed = JSON.parse(dispatchError);
      if (parsed.module?.error || parsed.Module?.error) {
        const errorHex = parsed.module?.error || parsed.Module?.error;
        // Extract first byte (error index in little-endian)
        const errorIndex = parseInt(errorHex.slice(2, 4), 16);
        const icoError = ICO_ERROR_MESSAGES[errorIndex];
        if (icoError) {
          return icoError.userMessage;
        }
      }
    } catch {
      // Not JSON, return as is
    }
    return dispatchError;
  }

  // Handle DispatchError object via API Registry
  if (dispatchError.isModule && api) {
    try {
      const decoded = api.registry.findMetaError(dispatchError.asModule);
      // Map known errors
      const errorName = decoded.name;
      const icoError = Object.values(ICO_ERROR_MESSAGES).find(e => e.code === errorName);
      if (icoError) {
        return icoError.userMessage;
      }
      return `${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`;
    } catch {
      // Fallback
    }
  }

  // Handle raw error object with module info (toHuman)
  const rawError = dispatchError.toHuman?.() || dispatchError.toString?.() || dispatchError;
  const moduleError = rawError?.module?.error || rawError?.Module?.error;

  if (typeof rawError === 'object' && moduleError) {
    const errorHex = moduleError;
    const errorIndex = parseInt(errorHex.slice(2, 4), 16);
    const icoError = ICO_ERROR_MESSAGES[errorIndex];
    if (icoError) {
      return icoError.userMessage;
    }
  }

  return dispatchError.toString?.() || 'Erro desconhecido na transação';
}

/**
 * Check if we should attempt connection
 */
function shouldAttemptConnection(): boolean {
  if (!connectionFailed) return true;
  const now = Date.now();
  if (now - lastConnectionAttempt > CONNECTION_RETRY_DELAY) {
    connectionFailed = false; // Reset and try again
    return true;
  }
  return false;
}

/**
 * Get the next RPC endpoint (rotate through available endpoints)
 */
function getNextEndpoint(): string {
  const endpoint = LUNES_RPC_ENDPOINTS[currentEndpointIndex];
  currentEndpointIndex = (currentEndpointIndex + 1) % LUNES_RPC_ENDPOINTS.length;
  return endpoint;
}

/**
 * Get injector for signing transactions (dynamic import to avoid SSR)
 */
async function getInjector(address: string) {
  const { web3FromAddress } = await import('@polkadot/extension-dapp');
  return web3FromAddress(address);
}

/**
 * Helper to get robust gas limit for Lunes
 */
export const getGasLimit = (api: any) => {
  return {
    gasLimit: api.registry.createType('WeightV2', {
      refTime: 6_000_000_000,
      proofSize: 1024 * 1024, // 1MB
    }) as any,
    storageDepositLimit: null
  };
};

/**
 * Try to connect to a specific RPC endpoint
 */
async function tryConnect(endpoint: string, timeout: number = 15000): Promise<ApiPromise | null> {
  const [{ ApiPromise, WsProvider }] = await Promise.all([
    import('@polkadot/api'),
  ]);

  return new Promise((resolve) => {
    const provider = new WsProvider(endpoint, false);
    let resolved = false;
    let apiInstance: ApiPromise | null = null;

    const cleanup = () => {
      if (!resolved) {
        resolved = true;
        if (apiInstance) {
          apiInstance.disconnect().catch(() => { });
        } else {
          provider.disconnect().catch(() => { });
        }
      }
    };

    const timeoutId = setTimeout(() => {
      console.info(`[Contract] Connection timeout for: ${endpoint}`);
      cleanup();
      resolve(null);
    }, timeout);

    provider.on('error', (error) => {
      if (!resolved) {
        console.info(`[Contract] WebSocket error for ${endpoint}:`, error?.message || 'Unknown error');
        clearTimeout(timeoutId);
        cleanup();
        resolve(null);
      }
    });

    provider.on('disconnected', () => {
      if (!resolved) {
        console.info(`[Contract] WebSocket disconnected: ${endpoint}`);
        clearTimeout(timeoutId);
        cleanup();
        resolve(null);
      }
    });

    // Start connection
    provider.connect().catch((error) => {
      console.info(`[Contract] Provider connect failed:`, error?.message || 'Unknown');
      clearTimeout(timeoutId);
      cleanup();
      resolve(null);
    });

    // Wait for connected event, then create API
    provider.on('connected', async () => {
      try {
        apiInstance = await ApiPromise.create({
          provider,
          throwOnConnect: true,
        });

        // Wait for API to be ready
        await apiInstance.isReady;

        if (!resolved) {
          clearTimeout(timeoutId);
          resolved = true;
          console.info(`[Contract] Successfully connected to: ${endpoint}`);
          resolve(apiInstance);
        }
      } catch (error: any) {
        console.info(`[Contract] API create failed:`, error?.message || 'Unknown');
        clearTimeout(timeoutId);
        cleanup();
        resolve(null);
      }
    });
  });
}


/**
 * Initialize connection to Lunes Network with RPC failover
 */
export async function initializeContract(): Promise<ContractPromise | null> {
  // Skip on server-side (window is not defined)
  if (typeof window === 'undefined') {
    return null;
  }

  // Return existing connection if available
  if (contract && api?.isConnected) {
    return contract;
  }

  // Return pending connection promise if exists
  if (connectionPromise) {
    return connectionPromise;
  }

  // Skip if connection recently failed
  if (!shouldAttemptConnection()) {
    console.info('[Contract] Skipping connection attempt - will retry in',
      Math.ceil((CONNECTION_RETRY_DELAY - (Date.now() - lastConnectionAttempt)) / 1000), 'seconds');
    return null;
  }

  lastConnectionAttempt = Date.now();

  connectionPromise = (async () => {
    try {
      // Dynamic imports - only loaded on client side
      const [{ ContractPromise: ContractPromiseClass }] = await Promise.all([
        import('@polkadot/api-contract'),
      ]);

      // Try each endpoint until one succeeds
      let connectedApi: ApiPromise | null = null;
      const triedEndpoints: string[] = [];

      const endpoints = ['ws://127.0.0.1:9944'];
      for (let i = 0; i < endpoints.length; i++) {
        const endpoint = endpoints[i];
        triedEndpoints.push(endpoint);
        console.info(`[Contract] Trying RPC endpoint: ${endpoint}`);

        connectedApi = await tryConnect(endpoint, 8000);

        if (connectedApi) {
          console.info(`[Contract] Connected to: ${endpoint}`);
          break;
        } else {
          console.info(`[Contract] Failed to connect to: ${endpoint}`);
        }
      }

      if (!connectedApi) {
        console.info('[Contract] All RPC endpoints failed, using mock data');
        connectionFailed = true;
        connectionPromise = null;
        return null;
      }

      api = connectedApi;

      // Load the contract
      const abiMessages = (CONTRACT_ABI as any).spec?.messages || [];
      console.log(`[Contract] Initializing with address: ${API_CONFIG.contracts.donFiapo}`);
      console.log(`[Contract] ABI contains ${abiMessages.length} messages. Has get_ico_stats? ${!!abiMessages.find((m: any) => m.label === 'get_ico_stats')}`);

      contract = new ContractPromiseClass(
        api,
        CONTRACT_ABI as any,
        API_CONFIG.contracts.donFiapo
      );

      connectionFailed = false;
      console.log('[Contract] Connected to Lunes Network');
      connectionPromise = null; // Clear promise so next call returns direct contract
      return contract;
    } catch (error) {
      connectionFailed = true;
      connectionPromise = null;
      console.warn('[Contract] Failed to connect to Lunes Network:', error instanceof Error ? error.message : 'Unknown error');
      console.warn('[Contract] Using fallback data. Will retry connection in', CONNECTION_RETRY_DELAY / 1000, 'seconds');
      return null;
    }
  })();

  return connectionPromise;
}

/**
 * Get token balance for an account
 */
export async function getBalance(address: string): Promise<bigint> {
  const contractInstance = await initializeContract();
  if (!contractInstance) return BigInt(0);

  const { result, output } = await contractInstance.query.balanceOf(
    address, // caller
    getGasLimit(contractInstance.api),
    address  // account to check
  );

  if (result.isOk && output) {
    return BigInt(output.toHuman() as string);
  }

  return BigInt(0);
}

/**
 * Get native LUNES balance for an account (chain balance, not PSP22 tokens)
 */
export async function getNativeBalance(address: string): Promise<bigint> {
  if (!api) {
    // Try to initialize if not available
    await initializeContract();
  }

  if (!api) {
    console.warn('[Contract] API not available for native balance query');
    return BigInt(0);
  }

  try {
    const accountInfo = await api.query.system.account(address) as any;
    const { data: { free } } = accountInfo;
    return BigInt(free.toString());
  } catch (error) {
    console.warn('[Contract] Error fetching native balance:', error);
    return BigInt(0);
  }
}

/**
 * Get staking position
 */
export async function getStakingPosition(address: string, stakingType: string): Promise<{
  amount: bigint;
  startTime: number;
  currentApy: number;
  pendingRewards: bigint;
} | null> {
  const contractInstance = await initializeContract();
  if (!contractInstance) return null;

  const { result, output } = await contractInstance.query.getStakingPosition(
    address,
    getGasLimit(contractInstance.api),
    address,
    stakingType
  );

  if (result.isOk && output) {
    const data = output.toHuman() as any;
    if (data) {
      return {
        amount: BigInt(data.amount || 0),
        startTime: parseInt(data.startTime || 0),
        currentApy: parseFloat(data.currentApy || 0),
        pendingRewards: BigInt(data.pendingRewards || 0),
      };
    }
  }

  return null;
}

/**
 * Stake tokens
 */
export async function stake(
  address: string,
  stakingType: string,
  amount: bigint
): Promise<string> {
  const contractInstance = await initializeContract();
  if (!contractInstance) throw new Error('Contract not available - network offline');
  const injector = await getInjector(address);

  const tx = contractInstance.tx.stake(
    getGasLimit(contractInstance.api),
    stakingType,
    amount.toString()
  );

  return new Promise((resolve, reject) => {
    tx.signAndSend(address, { signer: injector.signer }, ({ status, txHash, dispatchError }) => {
      if (status.isFinalized) {
        if (dispatchError) {
          reject(new Error(decodeContractError(dispatchError)));
        } else {
          resolve(txHash.toHex());
        }
      }
    }).catch(reject);
  });
}

/**
 * Unstake tokens
 */
export async function unstake(
  address: string,
  stakingType: string
): Promise<string> {
  const contractInstance = await initializeContract();
  if (!contractInstance) throw new Error('Contract not available - network offline');
  const injector = await getInjector(address);

  const tx = contractInstance.tx.unstake(
    getGasLimit(contractInstance.api),
    stakingType
  );

  return new Promise((resolve, reject) => {
    tx.signAndSend(address, { signer: injector.signer }, ({ status, txHash, dispatchError }) => {
      if (status.isFinalized) {
        if (dispatchError) {
          reject(new Error(decodeContractError(dispatchError)));
        } else {
          resolve(txHash.toHex());
        }
      }
    }).catch(reject);
  });
}

/**
 * Claim staking rewards
 */
export async function claimRewards(
  address: string,
  stakingType: string
): Promise<string> {
  const contractInstance = await initializeContract();
  if (!contractInstance) throw new Error('Contract not available - network offline');
  const injector = await getInjector(address);

  const tx = contractInstance.tx.claimRewards(
    getGasLimit(contractInstance.api),
    stakingType
  );

  return new Promise((resolve, reject) => {
    tx.signAndSend(address, { signer: injector.signer }, ({ status, txHash, dispatchError }) => {
      if (status.isFinalized) {
        if (dispatchError) {
          reject(new Error(decodeContractError(dispatchError)));
        } else {
          resolve(txHash.toHex());
        }
      }
    }).catch(reject);
  });
}

/**
 * Get user's NFTs
 */
export async function getUserNFTs(address: string): Promise<{
  tokenId: number;
  nftType: number;
  mintedAt: number;
  minedTokens: bigint;
  claimedTokens: bigint;
  lastMiningTimestamp: number;
  miningBonusBps: number;
}[]> {
  const contractInstance = await initializeContract();
  if (!contractInstance) return [];

  const { result, output } = await contractInstance.query.getUserNfts(
    address,
    getGasLimit(contractInstance.api),
    address
  );

  console.log('[getUserNFTs] Query result:', JSON.stringify({
    isOk: result.isOk,
    hasOutput: !!output,
    rawOutput: output?.toHuman(),
    address,
    resultError: result.isErr ? result.asErr.toString() : null,
    outputError: output ? null : 'Output is null'
  }, null, 2));

  if (result.isOk && output) {
    const rawData = output.toHuman();

    // Handle nested Ok result
    let nftIds: string[] = [];
    if (Array.isArray(rawData)) {
      nftIds = rawData as string[];
    } else if (typeof rawData === 'object' && rawData !== null && 'Ok' in (rawData as object)) {
      const okData = (rawData as any).Ok;
      if (Array.isArray(okData)) {
        nftIds = okData as string[];
      }
    }

    if (nftIds.length === 0) return [];

    console.log('[getUserNFTs] Fetching details for IDs:', nftIds);

    // Fetch details for each NFT
    const nftDetailsPromises = nftIds.map(async (idStr) => {
      const nftId = parseInt(idStr.replace(/,/g, ''), 10);
      if (isNaN(nftId)) return null;

      try {
        const detailQuery = await contractInstance.query.getNft(
          address,
          getGasLimit(contractInstance.api),
          nftId
        );

        if (detailQuery.result.isOk && detailQuery.output) {
          const detailData = detailQuery.output.toHuman() as any;
          const nft = detailData?.Ok;

          if (!nft) return null;

          // Filter out inactive (burned) NFTs
          const isActive = nft.active === true || nft.active === 'true';
          if (!isActive) return null;

          // Helper to parse type
          let nftTypeNum = 0;
          const nftType = nft.tier || nft.nftType || nft.nft_type; // Contract uses 'tier'
          if (typeof nftType === 'string') {
            const typeMap: Record<string, number> = { 'Free': 0, 'Tier2': 1, 'Tier3': 2, 'Tier4': 3, 'Tier5': 4, 'Tier6': 5, 'Tier7': 6 };
            nftTypeNum = typeMap[nftType] ?? 0;
          } else if (typeof nftType === 'object' && nftType !== null) {
            const key = Object.keys(nftType)[0];
            const typeMap: Record<string, number> = { 'Free': 0, 'Tier2': 1, 'Tier3': 2, 'Tier4': 3, 'Tier5': 4, 'Tier6': 5, 'Tier7': 6 };
            nftTypeNum = typeMap[key] ?? 0;
          }

          const parseNum = (val: any) => typeof val === 'string' ? parseInt(val.replace(/,/g, ''), 10) : val;
          const parseBig = (val: any) => typeof val === 'string' ? BigInt(val.replace(/,/g, '')) : BigInt(val);

          const claimed = parseBig(nft.tokensClaimed || nft.tokens_claimed || 0);

          return {
            tokenId: nftId,
            nftType: nftTypeNum,
            mintedAt: parseNum(nft.createdAt || nft.created_at),
            minedTokens: parseBig(nft.tokensMined || nft.tokens_mined || 0),
            claimedTokens: claimed,
            lastMiningTimestamp: parseNum(nft.lastMiningTimestamp || nft.last_mining_timestamp),
            miningBonusBps: parseNum(nft.miningBonusBps || nft.mining_bonus_bps || 0),
          };
        }
      } catch (err) {
        console.warn(`Failed to fetch NFT ${nftId}:`, err);
      }
      return null;
    });

    const results = await Promise.all(nftDetailsPromises);
    return results.filter(n => n !== null) as any[];
  }

  console.warn('[getUserNFTs] Query failed or no output');
  return [];
}

/**
 * Mint NFT (requires payment confirmation from oracle for paid tiers)
 * Contract signature: mint_nft(nft_type: u8, lunes_balance: u128, payment_proof: Option<PaymentProof>)
 */
export async function mintNFT(
  address: string,
  nftType: number,
  lunesBalance: bigint | number = 0,
  paymentProof: { transactionHash: string; senderAddress: string; amountUsdt: number; timestamp: number } | null = null
): Promise<string> {
  const contractInstance = await initializeContract();
  if (!contractInstance) throw new Error('Contract not available - network offline');
  const injector = await getInjector(address);

  // Convert payment proof to contract format or null
  const proof = paymentProof ? {
    transaction_hash: paymentProof.transactionHash,
    sender_address: paymentProof.senderAddress,
    amount_usdt: paymentProof.amountUsdt,
    timestamp: paymentProof.timestamp,
  } : null;

  // Use high gas limit (refTime and proofSize) - adjust based on contract complexity
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gasLimit = api!.registry.createType('WeightV2', {
    refTime: BigInt(100_000_000_000), // 100 billion ref_time
    proofSize: BigInt(10_000_000),     // 10 million proof_size
  }) as any;

  let tx: any;

  // Dry-Run to catch logical errors (like Limits) before sending TX
  if (nftType === 0) {
    console.log('[Contract] Simulating Free Mint (dry-run)...');
    try {
      const { result, output } = await contractInstance.query.mintFree(
        address,
        { gasLimit, storageDepositLimit: null }
      );

      // Check for contract logic errors (Result::Err)
      if (result.isOk && output) {
        const human = output.toHuman() as any;
        if (human && typeof human === 'object' && (human.Err || human.err)) {
          const errCode = human.Err || human.err;
          console.warn('[DryRun] Free Mint failed:', errCode);
          const mapped = Object.values(ICO_ERROR_MESSAGES).find(e => e.code === errCode || e.code === errCode?.toString());
          if (mapped) throw new Error(mapped.userMessage);
          throw new Error(`Erro simulado: ${JSON.stringify(errCode)}`);
        }
      }
    } catch (e) {
      // If dry run throws specific error, rethrow it
      if (e instanceof Error && !e.message.includes('Simulating')) throw e;
      console.warn('[DryRun] Simulation exception (ignoring):', e);
    }

    // Free Mint - mint_free() takes no args
    console.log('[Contract] Executing Free Mint (mint_free)');
    tx = contractInstance.tx.mintFree(
      { gasLimit, storageDepositLimit: null }
    );
  } else {
    // Paid Mint - mint_paid(tier, payment_hash)
    if (!proof || !proof.transaction_hash) {
      throw new Error('Payment proof transaction hash required for paid mint');
    }

    // Dry Run Paid
    console.log('[Contract] Simulating Paid Mint (dry-run)...');
    try {
      const { result, output } = await contractInstance.query.mintPaid(
        address,
        { gasLimit, storageDepositLimit: null },
        nftType,
        proof.transaction_hash
      );

      if (result.isOk && output) {
        const human = output.toHuman() as any;
        if (human && typeof human === 'object' && (human.Err || human.err)) {
          const errCode = human.Err || human.err;
          console.warn('[DryRun] Paid Mint failed:', errCode);
          const mapped = Object.values(ICO_ERROR_MESSAGES).find(e => e.code === errCode || e.code === errCode?.toString());
          if (mapped) throw new Error(mapped.userMessage);
          throw new Error(`Erro simulado: ${JSON.stringify(errCode)}`);
        }
      }
    } catch (e) {
      if (e instanceof Error && !e.message.includes('Simulating')) throw e;
      console.warn('[DryRun] Simulation exception:', e);
    }

    console.log('[Contract] Executing Paid Mint (mint_paid)');
    tx = contractInstance.tx.mintPaid(
      { gasLimit, storageDepositLimit: null },
      nftType,
      proof.transaction_hash
    );
  }

  return new Promise((resolve, reject) => {
    tx.signAndSend(address, { signer: injector.signer }, ({ status, txHash, dispatchError }: any) => {
      if (status.isFinalized) {
        if (dispatchError) {
          reject(new Error(decodeContractError(dispatchError)));
        } else {
          resolve(txHash.toHex());
        }
      }
    }).catch(reject);
  });
}

/**
 * Claim mined tokens from NFT
 */
export async function claimMinedTokens(
  address: string,
  tokenId: number
): Promise<string> {
  const contractInstance = await initializeContract();
  if (!contractInstance) throw new Error('Contract not available - network offline');
  const injector = await getInjector(address);

  const tx = contractInstance.tx.claimTokens(
    getGasLimit(contractInstance.api),
    tokenId
  );

  return new Promise((resolve, reject) => {
    tx.signAndSend(address, { signer: injector.signer }, ({ status, txHash, dispatchError }) => {
      if (status.isFinalized) {
        if (dispatchError) {
          reject(new Error(decodeContractError(dispatchError)));
        } else {
          resolve(txHash.toHex());
        }
      }
    }).catch(reject);
  });
}

/**
 * Get airdrop claim status
 */
export async function getAirdropStatus(address: string): Promise<{
  eligible: boolean;
  amount: bigint;
  claimed: boolean;
}> {
  const contractInstance = await initializeContract();
  if (!contractInstance) return { eligible: false, amount: BigInt(0), claimed: false };

  const { result, output } = await contractInstance.query.getAirdropStatus(
    address,
    getGasLimit(contractInstance.api),
    address
  );

  if (result.isOk && output) {
    const data = output.toHuman() as any;
    return {
      eligible: data?.eligible || false,
      amount: BigInt(data?.amount || 0),
      claimed: data?.claimed || false,
    };
  }

  return { eligible: false, amount: BigInt(0), claimed: false };
}

/**
 * Claim airdrop
 */
export async function claimAirdrop(
  address: string,
  proof: string[]
): Promise<string> {
  const contractInstance = await initializeContract();
  if (!contractInstance) throw new Error('Contract not available - network offline');
  const injector = await getInjector(address);

  const tx = contractInstance.tx.claimAirdrop(
    getGasLimit(contractInstance.api),
    proof
  );

  return new Promise((resolve, reject) => {
    tx.signAndSend(address, { signer: injector.signer }, ({ status, txHash, dispatchError }) => {
      if (status.isFinalized) {
        if (dispatchError) {
          reject(new Error(decodeContractError(dispatchError)));
        } else {
          resolve(txHash.toHex());
        }
      }
    }).catch(reject);
  });
}

/**
 * Contract NFT Configuration
 */
export interface ContractNFTConfig {
  priceUsdtCents: number;
  maxSupply: number;
  minted: number;
  mintedEvolution: number;
  burned: number;
  tokensPerNft: bigint;
  dailyMiningRate: bigint;
  active: boolean;
}

/**
 * Get NFT Configurations (including mint counts)
 */
export async function getIcoNftConfigs(): Promise<ContractNFTConfig[] | null> {
  const contractInstance = await initializeContract();
  if (!contractInstance) return null;

  try {
    const { result, output } = await contractInstance.query.getIcoNftConfigs(
      API_CONFIG.contracts.donFiapo,
      getGasLimit(contractInstance.api)
    );

    if (result.isOk && output) {
      const data = output.toHuman() as any;
      console.log('[Contract] NFT Configs Raw:', JSON.stringify(data, null, 2));

      // Helper to cleanup number formatting (remove commas)
      const cleanNum = (val: string | number) => typeof val === 'string' ? val.replace(/,/g, '') : val;

      // Handle both direct array and wrapped Result (Ok: [])
      let items = data;
      if (data && typeof data === 'object' && 'Ok' in data) {
        items = data.Ok;
      }

      if (Array.isArray(items)) {
        /* START DEBUG LOG */
        console.log('[Contract] Configs Loaded (Debug):', items.map((i: any) => ({
          tier: i.priceUsdtCents || '0',
          minted: i.minted,
          mintedEvolution: i.mintedEvolution || i.minted_evolution
        })));
        /* END DEBUG LOG */

        return items.map((item: any) => {
          const mDirect = parseInt(cleanNum(item.minted || '0').toString());
          const mEvo = parseInt(cleanNum(item.mintedEvolution || item.minted_evolution || '0').toString());

          return {
            priceUsdtCents: parseInt(cleanNum(item.priceUsdtCents || item.price_usdt_cents || '0').toString()),
            maxSupply: parseInt(cleanNum(item.maxSupply || item.max_supply || '0').toString()),
            minted: mDirect + mEvo,
            mintedEvolution: mEvo,
            burned: parseInt(cleanNum(item.burned || '0').toString()),
            tokensPerNft: BigInt(cleanNum(item.tokensPerNft || item.tokens_per_nft || '0').toString()),
            dailyMiningRate: BigInt(cleanNum(item.dailyMiningRate || item.daily_mining_rate || '0').toString()),
            active: !!(item.active),
          };
        });
      }
    }
  } catch (error) {
    console.warn('[Contract] Error fetching NFT configs:', error);
  }
  return null;
}

/**
 * ICO Statistics
 */
export interface ICOStats {
  totalNftsMinted: number;
  totalRaisedUsdtCents: bigint;
  totalTokensMined: bigint;
  totalTokensVesting: bigint;
  totalVestingStaked: bigint;
  uniqueParticipants: number;
  icoActive: boolean;
  miningActive: boolean;
  evolvedPerType: number[];
  totalCreatedPerType: number[];
}

/**
 * Get ICO statistics
 */
export async function getICOStats(): Promise<ICOStats | null> {
  const contractInstance = await initializeContract();
  if (!contractInstance) return null;

  try {
    const { result, output } = await contractInstance.query.getStats(
      API_CONFIG.contracts.donFiapo,
      getGasLimit(contractInstance.api)
    );

    if (result.isOk && output) {
      const rawData = output.toHuman() as any;
      console.log('[Contract] ICO Stats Raw Data:', JSON.stringify(rawData, null, 2));

      // Handle nested Ok result
      const data = (rawData && typeof rawData === 'object' && 'Ok' in rawData) ? rawData.Ok : rawData;

      if (!data) {
        console.warn('[Contract] No data found in ICO stats response');
        return null;
      }

      return {
        totalNftsMinted: parseNum(data.totalNftsMinted || data.total_nfts_minted || '0'),
        totalRaisedUsdtCents: parseBigInt(data.totalRaisedUsdtCents || data.total_raised_usdt_cents || '0'),
        totalTokensMined: parseBigInt(data.totalTokensMined || data.total_tokens_mined || '0'),
        totalTokensVesting: parseBigInt(data.totalTokensVesting || data.total_tokens_vesting || '0'),
        totalVestingStaked: parseBigInt(data.totalVestingStaked || data.total_vesting_staked || '0'),
        uniqueParticipants: parseNum(data.uniqueParticipants || data.unique_participants || '0'),
        icoActive: !!(data.icoActive || data.ico_active),
        miningActive: !!(data.miningActive || data.mining_active),
        evolvedPerType: parseArray(data.evolvedPerType || data.evolved_per_type).map((v: any) => parseNum(v)),
        totalCreatedPerType: parseArray(data.totalCreatedPerType || data.total_created_per_type).map((v: any) => parseNum(v)),
      };
    }
  } catch (error) {
    console.warn('[Contract] Error fetching ICO stats:', error);
  }
  return null;
}

/**
 * Get affiliate info
 */
export async function getAffiliateInfo(address: string): Promise<{
  referralCode: string;
  referredBy: string | null;
  totalReferrals: number;
  totalEarnings: bigint;
}> {
  const contractInstance = await initializeContract();
  if (!contractInstance) return { referralCode: '', referredBy: null, totalReferrals: 0, totalEarnings: BigInt(0) };

  const { result, output } = await contractInstance.query.getAffiliateInfo(
    address,
    getGasLimit(contractInstance.api),
    address
  );

  if (result.isOk && output) {
    const data = output.toHuman() as any;
    return {
      referralCode: data?.referralCode || '',
      referredBy: data?.referredBy || null,
      totalReferrals: parseInt(data?.totalReferrals || 0),
      totalEarnings: BigInt(data?.totalEarnings || 0),
    };
  }

  return { referralCode: '', referredBy: null, totalReferrals: 0, totalEarnings: BigInt(0) };
}

/**
 * Register with referral code
 */
export async function registerWithReferral(
  address: string,
  referralCode: string
): Promise<string> {
  const contractInstance = await initializeContract();
  if (!contractInstance) throw new Error('Contract not available - network offline');
  const injector = await getInjector(address);

  const tx = contractInstance.tx.registerAffiliate(
    getGasLimit(contractInstance.api),
    referralCode
  );

  return new Promise((resolve, reject) => {
    tx.signAndSend(address, { signer: injector.signer }, ({ status, txHash, dispatchError }) => {
      if (status.isFinalized) {
        if (dispatchError) {
          reject(new Error(decodeContractError(dispatchError)));
        } else {
          resolve(txHash.toHex());
        }
      }
    }).catch(reject);
  });
}

/**
 * Get staking pool configuration from contract
 */
export async function getStakingPoolConfig(stakingType: string): Promise<{
  apy: number;
  minStake: bigint;
  lockPeriod: number;
  totalStaked: bigint;
  totalStakers: number;
}> {
  try {
    const contractInstance = await initializeContract();
    if (contractInstance) {
      // Map frontend stakingType string to contract enum
      const typeMap: Record<string, string> = {
        'don-burn': 'DonBurn',
        'don-lunes': 'DonLunes',
        'don-fiapo': 'DonFiapo',
        'DonBurn': 'DonBurn',
        'DonLunes': 'DonLunes',
        'DonFiapo': 'DonFiapo'
      };

      const mappedType = typeMap[stakingType] || 'DonFiapo';

      const { result, output } = await contractInstance.query.getStakingConfig(
        contractInstance.address,
        getGasLimit(contractInstance.api),
        mappedType
      );

      if (result.isOk && output) {
        const data = output.toHuman() as any;
        if (data?.Ok) {
          const config = data.Ok;
          return {
            apy: parseNum(config.apy) / 100, // bps to %
            minStake: parseBigInt(config.minStake),
            lockPeriod: parseNum(config.lockPeriod),
            totalStaked: parseBigInt(config.totalStaked),
            totalStakers: parseNum(config.totalStakers),
          };
        }
      }
    }
  } catch (error) {
    console.warn('[Contract] Error fetching staking pool config:', error);
  }

  // Fallback to local configuration from API_CONFIG
  const poolConfig = API_CONFIG.stakingPools[stakingType] || API_CONFIG.stakingPools['don-fiapo'];
  return {
    apy: poolConfig?.apy || 10,
    minStake: BigInt(poolConfig?.minStake || 100000) * BigInt(10 ** API_CONFIG.token.decimals),
    lockPeriod: poolConfig?.lockDays || 90,
    totalStaked: BigInt(0),
    totalStakers: 0,
  };
}

/**
 * Get ranking data
 */
export async function getRankingData(rankingType: string): Promise<any[]> {
  try {
    const contractInstance = await initializeContract();
    if (!contractInstance) return [];

    // Map frontend rankingType to contract enum
    const typeMap: Record<string, string> = {
      'holders': 'Holders',
      'stakers': 'Stakers',
      'burners': 'Burners',
      'affiliates': 'Affiliates',
      'governance': 'Governance',
      'general': 'General'
    };

    const mappedType = typeMap[rankingType.toLowerCase()] || 'General';

    const { result, output } = await contractInstance.query.getRankingData(
      contractInstance.address,
      getGasLimit(contractInstance.api),
      mappedType
    );

    if (result.isOk && output) {
      const data = output.toHuman() as any;
      if (Array.isArray(data)) return data;
      if (data?.Ok && Array.isArray(data.Ok)) return data.Ok;
    }
  } catch (e) {
    console.warn('Failed to fetch ranking data:', e);
  }
  return [];
}

/**
 * Get core governance-related statistics from the contract
 */
export async function getCoreGovernanceStats(): Promise<{
  totalProposals: number;
  activeProposals: number;
  totalVotes: number;
  totalParticipants: number;
  treasuryBalance: bigint;
}> {
  try {
    const contractInstance = await initializeContract();
    if (!contractInstance) return { totalProposals: 0, activeProposals: 0, totalVotes: 0, totalParticipants: 0, treasuryBalance: BigInt(0) };

    const { result, output } = await contractInstance.query.getGovernanceStats(
      contractInstance.address,
      getGasLimit(contractInstance.api)
    );

    if (result.isOk && output) {
      const data = output.toHuman() as any;
      if (data) {
        return {
          totalProposals: parseNum(data.totalProposals || data.total_proposals),
          activeProposals: parseNum(data.activeProposals || data.active_proposals),
          totalVotes: parseNum(data.totalVotes || data.total_votes),
          totalParticipants: parseNum(data.totalParticipants || data.total_participants),
          treasuryBalance: parseBigInt(data.treasuryBalance || data.treasury_balance),
        };
      }
    }
  } catch (e) {
    console.warn('Failed to fetch governance stats:', e);
  }

  return { totalProposals: 0, activeProposals: 0, totalVotes: 0, totalParticipants: 0, treasuryBalance: BigInt(0) };
}

/**
 * Airdrop User Data - points breakdown
 */
export interface AirdropUserData {
  roundId: number;
  balancePoints: bigint;
  stakingPoints: bigint;
  burningPoints: bigint;
  affiliatePoints: bigint;
  totalPoints: bigint;
  claimed: boolean;
  eligible: boolean;
  estimatedTokens: bigint;
}

/**
 * Airdrop Config from contract
 */
export interface AirdropConfig {
  isActive: boolean;
  distributionStartBlock: number;
  distributionEndBlock: number;
  minBalance: bigint;
  minTransactions: number;
  pointsPerFiapo: number;
  pointsPerStake: number;
  pointsPerBurn: number;
  affiliateMultiplier: number;
  secondLevelAffiliateMultiplier: number;
  maxParticipants: number;
  distributionRates: {
    holders: number;
    stakers: number;
    burners: number;
    affiliates: number;
  };
}

/**
 * Airdrop Round Info
 */
export interface AirdropRound {
  id: number;
  totalPoints: bigint;
  totalParticipants: number;
  tokensPerPoint: bigint;
  isDistributed: boolean;
  closedAt: number | null;
  totalDistributed: bigint;
}

/**
 * Get global airdrop statistics
/**
 * Get global airdrop statistics
 */
export async function getAirdropStats(): Promise<{
  totalAmount: bigint;
  totalClaimed: bigint;
  eligibleWallets: number;
  claimedWallets: number;
  endTime: number;
  currentRound: number;
  isActive: boolean;
}> {
  try {
    const contractInstance = await initializeContract();
    if (contractInstance) {
      const { result, output } = await contractInstance.query.getAirdropStats(
        contractInstance.address,
        getGasLimit(contractInstance.api)
      );

      if (result.isOk && output) {
        const data = output.toHuman() as any;
        if (data?.Ok) {
          return {
            totalAmount: BigInt(data.Ok.totalAmount?.replace(/,/g, '') || 0),
            totalClaimed: BigInt(data.Ok.totalClaimed?.replace(/,/g, '') || 0),
            eligibleWallets: parseInt(data.Ok.eligibleWallets?.replace(/,/g, '') || '0'),
            claimedWallets: parseInt(data.Ok.claimedWallets?.replace(/,/g, '') || '0'),
            endTime: parseInt(data.Ok.endTime?.replace(/,/g, '') || '0'),
            currentRound: parseInt(data.Ok.currentRound?.replace(/,/g, '') || '1'),
            isActive: data.Ok.isActive || false,
          };
        }
      }
    }

    // Fallback: No data yet (contract not deployed)
    console.info('[Airdrop] Using initial stats (contract not deployed yet)');
    return {
      totalAmount: BigInt(0),
      totalClaimed: BigInt(0),
      eligibleWallets: 0,
      claimedWallets: 0,
      endTime: 0,
      currentRound: 1,
      isActive: false,
    };
  } catch (error) {
    console.info('[Airdrop] Using initial stats:', error);
    return {
      totalAmount: BigInt(0),
      totalClaimed: BigInt(0),
      eligibleWallets: 0,
      claimedWallets: 0,
      endTime: 0,
      currentRound: 1,
      isActive: false,
    };
  }
}


/**
 * Get user's airdrop data with points breakdown
 */
export async function getUserAirdropData(address: string): Promise<AirdropUserData> {
  try {
    const contractInstance = await initializeContract();
    if (!contractInstance) throw new Error('Not connected');

    const { result, output } = await contractInstance.query.getUserAirdropData(
      address,
      getGasLimit(contractInstance.api),
      address
    );

    if (result.isOk && output) {
      const data = output.toHuman() as any;
      if (data?.Ok) {
        const balancePoints = BigInt(data.Ok.balancePoints?.replace(/,/g, '') || 0);
        const stakingPoints = BigInt(data.Ok.stakingPoints?.replace(/,/g, '') || 0);
        const burningPoints = BigInt(data.Ok.burningPoints?.replace(/,/g, '') || 0);
        const affiliatePoints = BigInt(data.Ok.affiliatePoints?.replace(/,/g, '') || 0);
        const totalPoints = balancePoints + stakingPoints + burningPoints + affiliatePoints;

        return {
          roundId: parseInt(data.Ok.roundId || 1),
          balancePoints,
          stakingPoints,
          burningPoints,
          affiliatePoints,
          totalPoints,
          claimed: data.Ok.claimed || false,
          eligible: totalPoints > BigInt(0),
          estimatedTokens: BigInt(data.Ok.estimatedTokens?.replace(/,/g, '') || 0),
        };
      }
    }
  } catch (e) {
    console.warn('Failed to fetch user airdrop data:', e);
  }

  // Fallback - not eligible
  return {
    roundId: 1,
    balancePoints: BigInt(0),
    stakingPoints: BigInt(0),
    burningPoints: BigInt(0),
    affiliatePoints: BigInt(0),
    totalPoints: BigInt(0),
    claimed: false,
    eligible: false,
    estimatedTokens: BigInt(0),
  };
}

/**
 * Get airdrop configuration
 */
export async function getAirdropConfig(): Promise<AirdropConfig> {
  // NOTE: getAirdropConfig method doesn't exist in contract yet
  // Using static configuration values
  return {
    isActive: true,
    distributionStartBlock: 0,
    distributionEndBlock: 2592000,
    minBalance: BigInt(1000) * BigInt(10 ** 8),
    minTransactions: 3,
    pointsPerFiapo: 1,
    pointsPerStake: 2,
    pointsPerBurn: 5,
    affiliateMultiplier: 10,
    secondLevelAffiliateMultiplier: 5,
    maxParticipants: 10000,
    distributionRates: {
      holders: 30,
      stakers: 35,
      burners: 20,
      affiliates: 15,
    },
  };
}

/**
 * Check user eligibility for airdrop
 */
export async function checkAirdropEligibility(address: string): Promise<{
  eligible: boolean;
  reason: string | null;
  score: bigint;
}> {
  try {
    const contractInstance = await initializeContract();
    if (!contractInstance) throw new Error('Not connected');

    const { result, output } = await contractInstance.query.isEligible(
      address,
      getGasLimit(contractInstance.api),
      address
    );

    if (result.isOk && output) {
      const isEligible = output.toHuman() as boolean;

      // Get user score
      const userData = await getUserAirdropData(address);

      return {
        eligible: isEligible,
        reason: isEligible ? null : 'Insufficient points or airdrop not active',
        score: userData.totalPoints,
      };
    }
  } catch (e) {
    console.warn('Failed to check eligibility:', e);
  }

  return {
    eligible: false,
    reason: 'Could not verify eligibility',
    score: BigInt(0),
  };
}

// ============================================================================
// NFT EVOLUTION & RARITY FUNCTIONS
// ============================================================================

/**
 * Visual rarity types
 */
export type VisualRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

/**
 * Visual attributes for an NFT
 */
export interface NFTVisualAttributes {
  rarity: VisualRarity;
  attributes: string[];
  seedHash: number;
  revealed: boolean;
}

/**
 * Evolution result
 */
export interface EvolutionResult {
  newNftId: number;
  newTier: number;
  bonusBps: number;
  burnedNftIds: number[];
}

/**
 * Get visual attributes for an NFT
 */
export async function getNFTVisualAttributes(nftId: number): Promise<NFTVisualAttributes | null> {
  const contractInstance = await initializeContract();
  if (!contractInstance) {
    // Return simulated rarity based on RNG
    const rarities: VisualRarity[] = ['common', 'common', 'common', 'common', 'common', 'common', 'common', 'uncommon', 'uncommon', 'rare'];
    const randomIndex = (nftId * 7919) % rarities.length;
    return {
      rarity: rarities[randomIndex],
      attributes: [],
      seedHash: nftId,
      revealed: true,
    };
  }

  try {
    const { result, output } = await contractInstance.query.getNft(
      contractInstance.address,
      getGasLimit(contractInstance.api),
      nftId
    );

    if (result.isOk && output) {
      const data = output.toHuman() as any;
      const nftData = data?.Ok;

      if (nftData) {
        // Map from NFTData.visual_rarity enum
        const rarityEnum = nftData.visualRarity || nftData.visual_rarity || 'Common';
        // Handle string enum or object enum { Common: null }
        let rarityStr = 'common';

        if (typeof rarityEnum === 'string') {
          rarityStr = rarityEnum.toLowerCase();
        } else if (typeof rarityEnum === 'object') {
          rarityStr = Object.keys(rarityEnum)[0].toLowerCase();
        }

        return {
          rarity: rarityStr as VisualRarity,
          attributes: [], // Attributes not stored in contract yet
          seedHash: nftId, // Use ID as seed
          revealed: true,
        };
      }
    }
  } catch (e) {
    console.warn('Failed to fetch NFT details for visual attrs:', e);
  }

  return null;
}

/**
 * Get effective mining rate for an NFT (includes evolution bonus)
 */
export async function getEffectiveMiningRate(nftId: number): Promise<bigint> {
  const contractInstance = await initializeContract();
  if (!contractInstance) return BigInt(0);

  try {
    const { result, output } = await contractInstance.query.getEffectiveMiningRate(
      contractInstance.address,
      getGasLimit(contractInstance.api),
      nftId
    );

    if (result.isOk && output) {
      const data = output.toHuman() as any;
      if (data?.Ok) {
        return BigInt(data.Ok.replace(/,/g, ''));
      }
    }
  } catch (e) {
    console.warn('Failed to fetch effective mining rate:', e);
  }

  return BigInt(0);
}

/**
 * Get Prestige Bonus info for an NFT
 * Returns: { amount: bigint, claimed: boolean, vestedAmount: bigint } | null
 */
export async function getPrestigeBonus(nftId: number): Promise<{ amount: bigint; claimed: boolean; vestedAmount: bigint; eligible: boolean } | null> {
  const contractInstance = await initializeContract();
  if (!contractInstance) return null;

  try {
    const { result, output } = await contractInstance.query.getPrestigeInfo(
      contractInstance.address,
      getGasLimit(contractInstance.api),
      nftId
    );

    if (result.isOk && output) {
      const data = output.toHuman() as any;
      // Output is Option<(PrestigeBonus, bool, u128)>
      // Human: Some: [{...}, false, "1,000"]

      const okData = data?.Ok !== undefined ? data.Ok : data; // Handle Result wrapper if present
      const someData = okData?.Some !== undefined ? okData.Some : okData; // Handle Option wrapper

      if (Array.isArray(someData)) {
        const [bonusInfo, claimed, vested] = someData;
        const amountStr = bonusInfo?.amount || '0';
        const vestedStr = vested || '0';

        return {
          amount: BigInt(amountStr.replace(/,/g, '')),
          claimed: !!claimed,
          vestedAmount: BigInt(vestedStr.replace(/,/g, '')),
          eligible: true
        };
      }
    }
  } catch (e) {
    console.warn('Failed to fetch prestige bonus:', e);
  }

  return { amount: BigInt(0), claimed: false, vestedAmount: BigInt(0), eligible: false };
}

/**
 * Claim Prestige Bonus
 */
export async function claimPrestigeBonus(
  address: string,
  nftId: number
): Promise<string> {
  const contractInstance = await initializeContract();
  if (!contractInstance) throw new Error('Contract not available');
  const injector = await getInjector(address);

  const tx = contractInstance.tx.claimPrestigeBonus(
    getGasLimit(contractInstance.api),
    nftId
  );

  return new Promise((resolve, reject) => {
    tx.signAndSend(address, { signer: injector.signer }, ({ status, txHash, dispatchError }) => {
      if (status.isFinalized) {
        if (dispatchError) {
          reject(new Error(decodeContractError(dispatchError)));
        } else {
          resolve(txHash.toHex());
        }
      }
    }).catch(reject);
  });
}

/**
 * Get evolution statistics
 */
export async function getEvolutionStats(): Promise<{ totalEvolutions: number; totalBurned: number }> {
  const contractInstance = await initializeContract();
  if (!contractInstance) {
    return { totalEvolutions: 0, totalBurned: 0 };
  }

  try {
    const { result, output } = await contractInstance.query.getEvolutionStats(
      contractInstance.address,
      getGasLimit(contractInstance.api)
    );

    if (result.isOk && output) {
      const data = output.toHuman() as any;
      console.log('[Contract] Evolution Stats Raw:', data);

      const stats = data?.Ok || data;
      return {
        totalEvolutions: parseNum(stats?.totalEvolutions || stats?.total_evolutions || 0),
        totalBurned: parseNum(stats?.totalNftsBurned || stats?.total_nfts_burned || 0),
      };
    }
  } catch (e) {
    console.warn('Failed to fetch evolution stats:', e);
  }

  return { totalEvolutions: 0, totalBurned: 0 };
}

/**
 * Get rarity distribution statistics
 */
export async function getRarityStats(): Promise<{
  common: number;
  uncommon: number;
  rare: number;
  epic: number;
  legendary: number;
  total: number;
}> {
  const contractInstance = await initializeContract();
  if (!contractInstance) {
    return { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0, total: 0 };
  }

  try {
    const { result, output } = await contractInstance.query.getRarityStats(
      contractInstance.address,
      getGasLimit(contractInstance.api)
    );

    if (result.isOk && output) {
      const data = output.toHuman() as any;
      console.log('[Contract] Rarity Stats Raw:', data);

      const stats = data?.Ok || data;
      const counts = stats?.rarityCounts || stats?.rarity_counts || {};

      return {
        common: parseNum(counts?.common || 0),
        uncommon: parseNum(counts?.uncommon || 0),
        rare: parseNum(counts?.rare || 0),
        epic: parseNum(counts?.epic || 0),
        legendary: parseNum(counts?.legendary || 0),
        total: parseNum(stats?.totalRolls || stats?.total_rolls || 0),
      };
    }
  } catch (e) {
    console.warn('Failed to fetch rarity stats:', e);
  }

  return { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0, total: 0 };
}

export interface EvolutionRecord {
  id: number;
  owner: string;
  burnedNftIds: number[];
  sourceTier: number;
  resultNftId: number;
  resultTier: number;
  bonusAppliedBps: number;
  timestamp: number;
}

/**
 * Get user evolution history
 */
export async function getUserEvolutions(address: string): Promise<EvolutionRecord[]> {
  const contractInstance = await initializeContract();
  if (!contractInstance) return [];

  const localKey = `donfiapo_evolution_history_${address}`;
  let localRecords: EvolutionRecord[] = [];

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(localKey);
      if (stored) {
        localRecords = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to read local evolution history', e);
    }
  }

  // Contract results
  let contractRecords: EvolutionRecord[] = [];
  try {
    const { result, output } = await contractInstance.query.getUserEvolutions(
      contractInstance.address,
      getGasLimit(contractInstance.api),
      address
    );

    if (result.isOk && output) {
      const data = output.toHuman() as any;
      const records = data?.Ok || data;
      if (Array.isArray(records)) {
        contractRecords = records.map((record: any) => ({
          id: parseNum(record.id),
          owner: record.owner,
          burnedNftIds: (record.burnedNftIds || record.burned_nft_ids || []).map((id: any) => parseNum(id)),
          sourceTier: parseNum(record.sourceTier || record.source_tier),
          resultNftId: parseNum(record.resultNftId || record.result_nft_id),
          resultTier: parseNum(record.resultTier || record.result_tier),
          bonusAppliedBps: parseNum(record.bonusAppliedBps || record.bonus_applied_bps),
          timestamp: parseNum(record.timestamp),
        }));
      }
    }
  } catch (e) {
    console.warn('Failed to fetch user evolutions from contract:', e);
  }

  // Merge records (prefer contract if ID conflict, though local IDs are likely timestamp-based)
  // Simple merge: Concat and dedupe by timestamp + resultNftId
  const allRecords = [...contractRecords, ...localRecords];

  // Deduplicate based on unique key (timestamp + resultID)
  const uniqueRecords = Array.from(new Map(allRecords.map(item =>
    [`${item.timestamp}-${item.resultNftId}`, item]
  )).values());

  // Sort by timestamp desc
  return uniqueRecords.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Evolve NFTs - Burns multiple NFTs of the same type to create a higher tier NFT
 * 
 * @param nftIds - Array of NFT IDs to burn (minimum 2, same type)
 * @param address - Wallet address performing the evolution
 * @returns Evolution result with new NFT ID and bonus info
 */
export async function evolveNFTs(
  nftIds: number[],
  targetTier: number,
  address: string
): Promise<EvolutionResult | null> {
  const contractInstance = await initializeContract();
  if (!contractInstance) {
    throw new Error('Contract not connected');
  }

  if (nftIds.length < 2) {
    throw new Error('Minimum 2 NFTs required for evolution');
  }

  let injector: any;
  try {
    try {
      console.log('[evolveNFTs] 1. Getting injector for:', address);
      injector = await getInjector(address);
    } catch (err) {
      console.error('[evolveNFTs] Failed to get injector:', err);
      throw new Error('Failed to connect to wallet extension. Please check if Polkadot.js is enabled.');
    }

    // Convert to BigInt for u64 - polkadot-js should auto-encode Vec<u64>
    const nftIdsBigInt = nftIds.map(id => BigInt(id));
    console.log('[evolveNFTs] 2. Evolving IDs (BigInt):', nftIdsBigInt.map(n => n.toString()));

    // Estimate gas
    console.log('[evolveNFTs] 3. Estimating gas...');
    let gasRequired;
    try {
      const { gasRequired: estGas, result, output } = await contractInstance.query.evolveNfts(
        address,
        getGasLimit(contractInstance.api),
        nftIdsBigInt,
        targetTier
      );

      if (result.isErr) {
        console.error('[evolveNFTs] Gas estimation failed (Contract Error):', result.asErr.toString());
        throw new Error('Contract validation failed during gas estimation');
      }

      if (!estGas) {
        console.warn('[evolveNFTs] Gas estimation returned null, using default');
        gasRequired = getGasLimit(contractInstance.api).gasLimit;
      } else {
        gasRequired = estGas;
      }
      console.log('[evolveNFTs] Gas estimated:', gasRequired.toHuman());
    } catch (err) {
      console.error('[evolveNFTs] Gas estimation failed:', err);
      throw new Error('Failed to estimate gas. Please try again.');
    }

    // Execute transaction
    console.log('[evolveNFTs] 4. Sending transaction...');
    const tx = contractInstance.tx.evolveNfts(
      { gasLimit: gasRequired },
      nftIdsBigInt,
      targetTier
    );

    return new Promise((resolve, reject) => {
      tx.signAndSend(address, { signer: injector.signer }, ({ status, events, dispatchError }) => {
        console.log('[evolveNFTs] Tx status:', status.type);

        if (dispatchError) {
          if (dispatchError.isModule) {
            const decoded = api?.registry.findMetaError(dispatchError.asModule);
            reject(new Error(`${decoded?.section}.${decoded?.name}: ${decoded?.docs.join(' ')}`));
          } else {
            reject(new Error(decodeContractError(dispatchError)));
          }
          return;
        }

        if (status.isFinalized) {
          console.log('[evolveNFTs] Tx Finalized!');
          // Parse events to get the new NFT ID
          let newNftId = 0;
          let newTier = 0;
          let bonusBps = 0;

          events.forEach(({ event }) => {
            if (event.section === 'contracts' && event.method === 'ContractEmitted') {
              // Parse contract event data
              const eventData = event.data.toHuman() as any;
              // Extract evolution result from event
              if (eventData?.data) {
                try {
                  const parsed = JSON.parse(eventData.data);
                  newNftId = parsed.newNftId || 0;
                  newTier = parsed.newTier || 0;
                  bonusBps = parsed.bonusBps || 0;
                } catch {
                  // Event parsing failed, use defaults
                }
              }
            }
          });

          // Save to local storage for history persistence
          if (typeof window !== 'undefined') {
            try {
              const record: EvolutionRecord = {
                id: Date.now(), // Local ID
                owner: address,
                burnedNftIds: nftIds,
                sourceTier: API_CONFIG.nftTiers.findIndex(t => t.id === targetTier) - 1,
                resultNftId: newNftId,
                resultTier: newTier || targetTier,
                bonusAppliedBps: bonusBps,
                timestamp: Date.now()
              };

              const localKey = `donfiapo_evolution_history_${address}`;
              const stored = localStorage.getItem(localKey);
              const history = stored ? JSON.parse(stored) : [];
              history.push(record);
              localStorage.setItem(localKey, JSON.stringify(history));
            } catch (e) {
              console.warn('Failed to save local evolution history', e);
            }
          }

          resolve({
            newNftId,
            newTier,
            bonusBps,
            burnedNftIds: nftIds,
          });
        }
      }).catch(reject);
    });
  } catch (e) {
    console.error('Evolution failed:', e);
    throw e;
  }
}

/**
 * Check if NFTs can be evolved
 */
export async function canEvolveNFTs(nftIds: number[], targetTier: number, address: string): Promise<{
  canEvolve: boolean;
  resultTier: number | null;
  error: string | null;
}> {
  const contractInstance = await initializeContract();
  if (!contractInstance) {
    return { canEvolve: false, resultTier: null, error: 'Contract not connected' };
  }

  if (nftIds.length < 2) {
    return { canEvolve: false, resultTier: null, error: 'Minimum 2 NFTs required' };
  }

  try {
    // Convert to BigInt for u64
    const nftIdsBigInt = nftIds.map(id => BigInt(id));
    console.log('[canEvolve] Checking with IDs (BigInt):', nftIdsBigInt.map(n => n.toString()));

    // Use evolveNfts query as a dry-run check (simulating logic)
    // Rust: fn evolve_nfts(...) -> Result<EvolutionResult, ICOError>
    // Note: The UI calls this "canEvolve" but the contract method is "evolve_nfts" (tx) called as query.
    const { result, output } = await contractInstance.query.evolveNfts(
      address,
      getGasLimit(contractInstance.api),
      nftIdsBigInt,
      targetTier
    );

    if (result.isOk && output) {
      const response = output.toHuman() as any;
      console.log('[canEvolve] Contract response:', response);

      // Handle Result::Err from contract logic
      if (response && typeof response === 'object' && 'Err' in response) {
        let errStr = 'Contract Error';
        try {
          if (typeof response.Err === 'string') errStr = response.Err;
          else if (typeof response.Err === 'object') errStr = Object.keys(response.Err)[0];
        } catch (e) { }
        return { canEvolve: false, resultTier: null, error: errStr };
      }

      // Handle Result::Ok 
      if (response && typeof response === 'object' && 'Ok' in response) {
        const data = response.Ok;
        // data should be EvolutionResult { newTier: ..., ... }
        // Depending on how it's returned (camelCase vs snake_case keys from JSON)
        const newTier = data.newTier || data.new_tier || 0;
        return {
          canEvolve: true,
          resultTier: parseInt(newTier.toString()),
          error: null
        };
      }

      return { canEvolve: false, resultTier: null, error: 'Unknown response format from contract' };
    }

    // RPC or Network error
    if (result.isErr) {
      return { canEvolve: false, resultTier: null, error: result.asErr.toString() };
    }

    return { canEvolve: false, resultTier: null, error: 'No output from contract query' };
  } catch (e) {
    console.error('[canEvolve] Exception caught:', e);
    return { canEvolve: false, resultTier: null, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

/**
 * Claim affiliate rewards
 */
export async function claimAffiliateRewards(address: string): Promise<string> {
  const contractInstance = await initializeContract();
  if (!contractInstance) throw new Error('Contract not available - network offline');
  const injector = await getInjector(address);

  const tx = contractInstance.tx.claimAffiliateRewards(
    getGasLimit(contractInstance.api)
  );

  return new Promise((resolve, reject) => {
    tx.signAndSend(address, { signer: injector.signer }, ({ status, txHash, dispatchError }) => {
      if (status.isFinalized) {
        if (dispatchError) {
          reject(new Error(decodeContractError(dispatchError)));
        } else {
          resolve(txHash.toHex());
        }
      }
    }).catch(reject);
  });
}

/**
 * Vote on a governance proposal
 */
export async function voteOnProposal(
  address: string,
  proposalId: number,
  voteFor: boolean
): Promise<string> {
  const contractInstance = await initializeContract();
  if (!contractInstance) throw new Error('Contract not available - network offline');
  const injector = await getInjector(address);

  const tx = contractInstance.tx.vote(
    getGasLimit(contractInstance.api),
    proposalId,
    voteFor
  );

  return new Promise((resolve, reject) => {
    tx.signAndSend(address, { signer: injector.signer }, ({ status, txHash, dispatchError }) => {
      if (status.isFinalized) {
        if (dispatchError) {
          reject(new Error(decodeContractError(dispatchError)));
        } else {
          resolve(txHash.toHex());
        }
      }
    }).catch(reject);
  });
}

/**
 * Create a governance proposal
 */
export async function createProposal(
  address: string,
  proposalType: string,
  title: string,
  description: string
): Promise<string> {
  const contractInstance = await initializeContract();
  if (!contractInstance) throw new Error('Contract not available - network offline');
  const injector = await getInjector(address);

  const tx = contractInstance.tx.createProposal(
    getGasLimit(contractInstance.api),
    proposalType,
    title,
    description
  );

  return new Promise((resolve, reject) => {
    tx.signAndSend(address, { signer: injector.signer }, ({ status, txHash, dispatchError }) => {
      if (status.isFinalized) {
        if (dispatchError) {
          reject(new Error(decodeContractError(dispatchError)));
        } else {
          resolve(txHash.toHex());
        }
      }
    }).catch(reject);
  });
}

/**
 * Disconnect from the network
 */
export async function disconnect(): Promise<void> {
  if (api) {
    await api.disconnect();
    api = null;
    contract = null;
  }
}

/**
 * Get data for a specific NFT by ID
 */
export async function getNFT(nftId: number): Promise<NFTData | null> {
  try {
    const contractInstance = await initializeContract();
    if (!contractInstance) return null;

    const { result, output } = await contractInstance.query.getNft(
      contractInstance.address,
      getGasLimit(contractInstance.api),
      nftId
    );

    if (result.isOk && output) {
      const data = output.toHuman() as any;
      if (data?.Ok) {
        return {
          id: parseInt(data.Ok.id?.replace(/,/g, '') || '0'),
          nftType: (typeof data.Ok.nftType === 'string' ? parseNftType(data.Ok.nftType) : parseInt(data.Ok.nftType)),
          owner: data.Ok.owner,
          createdAt: parseInt(data.Ok.createdAt?.replace(/,/g, '') || '0'),
          tokensMined: BigInt(data.Ok.tokensMined?.replace(/,/g, '') || 0),
          tokensClaimed: BigInt(data.Ok.tokensClaimed?.replace(/,/g, '') || 0),
          lastMiningTimestamp: parseInt(data.Ok.lastMiningTimestamp?.replace(/,/g, '') || '0'),
          active: data.Ok.active,
          visualRarity: data.Ok.visualRarity || 'Common',
          evolutionCount: parseInt(data.Ok.evolutionCount?.replace(/,/g, '') || '0'),
          miningBonusBps: parseInt(data.Ok.miningBonusBps?.replace(/,/g, '') || '0'),
        };
      }
    }
  } catch (e) {
    console.warn(`Failed to fetch NFT ${nftId}:`, e);
  }
  return null;
}

export interface LeaderboardEntry {
  rank: number;
  address: string;
  nftId: number;
  tierId: number;
  rarity: string;
  evolutionCount: number;
  miningBonus: number;
  totalMined: number;
}

/**
 * Fetch all NFTs for leaderboard
 * Note: optimized for <1000 items. For larger sets, use an indexer.
 */
export async function getLeaderboardData(): Promise<LeaderboardEntry[]> {
  try {
    const stats = await getICOStats();
    if (!stats || !stats.totalNftsMinted) return [];

    const totalMinted = stats.totalNftsMinted;

    // Fetch all NFTs in parallel batches
    const promises = [];
    for (let i = 0; i < totalMinted; i++) {
      promises.push(getNFT(i));
    }

    const nfts = await Promise.all(promises);

    // Transform to leaderboard format
    return nfts
      .filter((nft): nft is NFTData => nft !== null)
      .map((nft, index) => ({
        rank: 0, // Assigned by caller or sorting
        address: nft.owner,
        nftId: nft.id,
        tierId: typeof nft.nftType === 'string' ? parseNftType(nft.nftType) : nft.nftType,
        rarity: (typeof nft.visualRarity === 'string' ? nft.visualRarity : 'Common').toLowerCase(),
        evolutionCount: nft.evolutionCount,
        miningBonus: nft.miningBonusBps / 100, // bps to %
        totalMined: Number(nft.tokensMined) / 100000000, // atomic to float (approx)
      }));
  } catch (e) {
    console.error('Failed to fetch leaderboard:', e);
    return [];
  }
}

function parseNftType(typeStr: any): number {
  // Basic helper if enum returns string
  if (typeStr === 'Free') return 0;
  if (typeStr === 'Tier2') return 1;
  if (typeStr === 'Tier3') return 2;
  if (typeStr === 'Tier4') return 3;
  if (typeStr === 'Tier5') return 4;
  if (typeStr === 'Tier6') return 5;
  if (typeStr === 'Tier7') return 6;
  return 0;
}

/**
 * Get the global free mint cooldown in milliseconds
 */
export async function getFreeMintCooldown(): Promise<number> {
  const contractInstance = await initializeContract();
  if (!contractInstance) return 0;

  try {
    const { result, output } = await contractInstance.query.getFreeMintCooldown(
      contractInstance.address,
      { gasLimit: -1 }
    );

    if (result.isOk && output) {
      return parseInt(output.toString().replace(/,/g, ''));
    }
  } catch (e) {
    console.warn('Failed to fetch cooldown config:', e);
  }
  return 0;
}

/**
 * Get remaining cooldown for a specific address in milliseconds
 */
export async function getRemainingCooldown(address: string): Promise<number> {
  const contractInstance = await initializeContract();
  if (!contractInstance) return 0;

  try {
    const { result, output } = await contractInstance.query.getRemainingCooldown(
      contractInstance.address,
      { gasLimit: -1 },
      address
    );

    if (result.isOk && output) {
      return parseInt(output.toString().replace(/,/g, ''));
    }
  } catch (e) {
    // console.warn('Failed to fetch remaining cooldown:', e);
  }
  return 0;
}

/**
 * ========== MARKETPLACE METHODS ==========
 */

/**
 * Check if the ICO is sold out
 */
export async function areAllNFTsSold(): Promise<boolean> {
  const contractInstance = await initializeContract();
  if (!contractInstance) return false;

  try {
    const { result, output } = await contractInstance.query.areAllNftsSold(
      contractInstance.address,
      { gasLimit: -1 }
    );

    if (result.isOk && output) {
      return output.toHuman() as any === true;
    }
  } catch (e) {
    console.error('Failed to check if all NFTs are sold:', e);
  }
  return false;
}

/**
 * Get all active listing IDs
 */
export async function getActiveListings(): Promise<number[]> {
  const contractInstance = await initializeContract();
  if (!contractInstance) return [];

  try {
    const { result, output } = await contractInstance.query.getActiveListings(
      contractInstance.address,
      { gasLimit: -1 }
    );

    if (result.isOk && output) {
      const data = output.toHuman() as any;
      if (!data || !data.Ok) return [];
      return (data.Ok as string[]).map(id => parseNum(id));
    }
  } catch (e) {
    console.error('Failed to fetch active listings:', e);
  }
  return [];
}

/**
 * Get listing details for an NFT
 */
export async function getListing(tokenId: number): Promise<any | null> {
  const contractInstance = await initializeContract();
  if (!contractInstance) return null;

  try {
    const { result, output } = await contractInstance.query.getListing(
      contractInstance.address,
      { gasLimit: -1 },
      tokenId
    );

    if (result.isOk && output) {
      const data = output.toHuman() as any;
      if (!data) return null;

      // The output is an Option, resolve it
      const val = data.Ok || data;
      if (!val || val === 'None') return null;

      return {
        seller: val.seller,
        tokenId: parseNum(val.tokenId),
        price: parseBigInt(val.price),
        isAuction: val.isAuction,
        auctionEnd: parseNum(val.auctionEnd),
        highestBid: parseBigInt(val.highestBid),
        highestBidder: val.highestBidder,
        isActive: val.isActive
      };
    }
  } catch (e) {
    console.error('Failed to fetch listing:', e);
  }
  return null;
}

/**
 * List an NFT for direct sale
 */
export async function listNFTForSale(address: string, tokenId: number, price: string): Promise<any> {
  const contractInstance = await initializeContract();
  if (!contractInstance) return null;
  const injector = await getInjector(address);

  return contractInstance.tx.listNftForSale(
    { gasLimit: getGasLimit(api).gasLimit, storageDepositLimit: null },
    tokenId,
    price
  ).signAndSend(address, { signer: injector.signer });
}

/**
 * List an NFT for auction
 */
export async function listNFTForAuction(address: string, tokenId: number, minPrice: string, duration: number): Promise<any> {
  const contractInstance = await initializeContract();
  if (!contractInstance) return null;
  const injector = await getInjector(address);

  return contractInstance.tx.listNftForAuction(
    { gasLimit: getGasLimit(api).gasLimit, storageDepositLimit: null },
    tokenId,
    minPrice,
    duration
  ).signAndSend(address, { signer: injector.signer });
}

/**
 * Buy an NFT (direct sale)
 */
export async function buyNFT(address: string, tokenId: number, price: string): Promise<any> {
  const contractInstance = await initializeContract();
  if (!contractInstance) return null;
  const injector = await getInjector(address);

  return contractInstance.tx.buyNft(
    { gasLimit: getGasLimit(api).gasLimit, storageDepositLimit: null, value: price },
    tokenId
  ).signAndSend(address, { signer: injector.signer });
}

/**
 * Bid on an NFT auction
 */
export async function bidNFT(address: string, tokenId: number, amount: string): Promise<any> {
  const contractInstance = await initializeContract();
  if (!contractInstance) return null;
  const injector = await getInjector(address);

  return contractInstance.tx.bidNft(
    { gasLimit: getGasLimit(api).gasLimit, storageDepositLimit: null, value: amount },
    tokenId
  ).signAndSend(address, { signer: injector.signer });
}

/**
 * Cancel an NFT listing
 */
export async function cancelListing(address: string, tokenId: number): Promise<any> {
  const contractInstance = await initializeContract();
  if (!contractInstance) return null;
  const injector = await getInjector(address);

  return contractInstance.tx.cancelListing(
    { gasLimit: getGasLimit(api).gasLimit, storageDepositLimit: null },
    tokenId
  ).signAndSend(address, { signer: injector.signer });
}

/**
 * Settle an ended auction
 */
export async function settleAuction(address: string, tokenId: number): Promise<any> {
  const contractInstance = await initializeContract();
  if (!contractInstance) return null;
  const injector = await getInjector(address);

  return contractInstance.tx.settleAuction(
    { gasLimit: getGasLimit(api).gasLimit, storageDepositLimit: null },
    tokenId
  ).signAndSend(address, { signer: injector.signer });
}

/**
 * Check if user has reached the free mint limit (Max 5)
 * Returns true if limit reached (>= 5 mints used)
 */
export async function hasReachedFreeMintLimit(address: string): Promise<boolean> {
  const contractInstance = await initializeContract();
  if (!contractInstance) return false;

  try {
    const { result, output } = await contractInstance.query.hasFreeMint(
      address,
      getGasLimit(contractInstance.api),
      address
    );

    if (result.isOk && output) {
      // Rust: fn has_free_mint -> bool { count >= 5 }
      const val = output.toHuman();
      return val === true || val === 'true';
    }
  } catch (error) {
    console.warn('[Contract] Error checking free mint limit:', error);
  }
  return false;
}
