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

  // Skip if connection recently failed
  if (!shouldAttemptConnection()) {
    console.info('[Contract] Skipping connection attempt - will retry in',
      Math.ceil((CONNECTION_RETRY_DELAY - (Date.now() - lastConnectionAttempt)) / 1000), 'seconds');
    return null;
  }

  lastConnectionAttempt = Date.now();

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
      return null;
    }

    api = connectedApi;

    // Load the contract
    contract = new ContractPromiseClass(
      api,
      CONTRACT_ABI as any,
      API_CONFIG.contracts.donFiapo
    );


    connectionFailed = false;
    console.log('[Contract] Connected to Lunes Network');
    return contract;
  } catch (error) {
    connectionFailed = true;
    console.warn('[Contract] Failed to connect to Lunes Network:', error instanceof Error ? error.message : 'Unknown error');
    console.warn('[Contract] Using fallback data. Will retry connection in', CONNECTION_RETRY_DELAY / 1000, 'seconds');
    return null;
  }
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
          reject(new Error(dispatchError.toString()));
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
          reject(new Error(dispatchError.toString()));
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
          reject(new Error(dispatchError.toString()));
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
    console.log('[getUserNFTs] Raw data type:', typeof rawData, Array.isArray(rawData) ? 'is array' : 'not array');

    // Handle nested Ok result (Rust Result type)
    let data = rawData;
    if (typeof rawData === 'object' && rawData !== null && 'Ok' in (rawData as object)) {
      data = (rawData as any).Ok;
    }
    console.log('[getUserNFTs] Extracted data:', data);

    if (!Array.isArray(data)) {
      console.warn('[getUserNFTs] Data is not an array, returning empty');
      return [];
    }

    // Map contract NFTData fields to frontend format
    // Contract returns: id, nft_type, created_at, tokens_mined, tokens_claimed, etc.
    return data.map((nft: any) => {
      // Handle nft_type which can be an enum like "Free" or { Tier2: null }
      let nftTypeNum = 0;
      const nftType = nft.nft_type || nft.nftType;
      if (typeof nftType === 'string') {
        const typeMap: Record<string, number> = { 'Free': 0, 'Tier2': 1, 'Tier3': 2, 'Tier4': 3, 'Tier5': 4, 'Tier6': 5, 'Tier7': 6 };
        nftTypeNum = typeMap[nftType] ?? 0;
      } else if (typeof nftType === 'object' && nftType !== null) {
        const key = Object.keys(nftType)[0];
        const typeMap: Record<string, number> = { 'Free': 0, 'Tier2': 1, 'Tier3': 2, 'Tier4': 3, 'Tier5': 4, 'Tier6': 5, 'Tier7': 6 };
        nftTypeNum = typeMap[key] ?? 0;
      }

      // Parse numeric values
      const parseNum = (val: any): number => {
        if (typeof val === 'number') return val;
        if (typeof val === 'string') return parseInt(val.replace(/,/g, ''), 10) || 0;
        return 0;
      };

      const parseBigInt = (val: any): bigint => {
        if (typeof val === 'bigint') return val;
        if (typeof val === 'number') return BigInt(val);
        if (typeof val === 'string') return BigInt(val.replace(/,/g, '') || '0');
        return BigInt(0);
      };

      return {
        tokenId: parseNum(nft.id || nft.tokenId || nft.token_id),
        nftType: nftTypeNum,
        mintedAt: parseNum(nft.created_at || nft.createdAt || nft.mintedAt || nft.minted_at),
        minedTokens: parseBigInt(nft.tokens_mined || nft.tokensMined || nft.minedTokens || nft.mined_tokens),
        claimedTokens: parseBigInt(nft.tokens_claimed || nft.tokensClaimed || nft.claimedTokens || nft.claimed_tokens),
      };
    });
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
    proofSize: BigInt(1_000_000),     // 1 million proof_size
  }) as any;

  const tx = contractInstance.tx.mintNft(
    { gasLimit, storageDepositLimit: null },
    nftType,
    BigInt(lunesBalance),
    proof
  );

  return new Promise((resolve, reject) => {
    tx.signAndSend(address, { signer: injector.signer }, ({ status, txHash, dispatchError }) => {
      if (status.isFinalized) {
        if (dispatchError) {
          reject(new Error(dispatchError.toString()));
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
          reject(new Error(dispatchError.toString()));
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
          reject(new Error(dispatchError.toString()));
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
        return items.map((item: any) => ({
          priceUsdtCents: parseInt(cleanNum(item.priceUsdtCents || item.price_usdt_cents || '0').toString()),
          maxSupply: parseInt(cleanNum(item.maxSupply || item.max_supply || '0').toString()),
          minted: parseInt(cleanNum(item.minted || '0').toString()),
          tokensPerNft: BigInt(cleanNum(item.tokensPerNft || item.tokens_per_nft || '0').toString()),
          dailyMiningRate: BigInt(cleanNum(item.dailyMiningRate || item.daily_mining_rate || '0').toString()),
          active: !!(item.active),
        }));
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
}

/**
 * Get ICO statistics
 */
export async function getICOStats(): Promise<ICOStats | null> {
  const contractInstance = await initializeContract();
  if (!contractInstance) return null;

  try {
    const { result, output } = await contractInstance.query.getIcoStats(
      API_CONFIG.contracts.donFiapo,
      getGasLimit(contractInstance.api)
    );

    if (result.isOk && output) {
      const data = output.toHuman() as any;
      console.log('[Contract] ICO Stats Raw:', JSON.stringify(data, null, 2));

      // Helper to cleanup number formatting (remove commas)
      const cleanNum = (val: string | number) => typeof val === 'string' ? val.replace(/,/g, '') : val;

      return {
        totalNftsMinted: parseInt(cleanNum(data?.totalNftsMinted || data?.total_nfts_minted || '0').toString()),
        totalRaisedUsdtCents: BigInt(cleanNum(data?.totalRaisedUsdtCents || data?.total_raised_usdt_cents || '0').toString()),
        totalTokensMined: BigInt(cleanNum(data?.totalTokensMined || data?.total_tokens_mined || '0').toString()),
        totalTokensVesting: BigInt(cleanNum(data?.totalTokensVesting || data?.total_tokens_vesting || '0').toString()),
        totalVestingStaked: BigInt(cleanNum(data?.totalVestingStaked || data?.total_vesting_staked || '0').toString()),
        uniqueParticipants: parseInt(cleanNum(data?.uniqueParticipants || data?.unique_participants || '0').toString()),
        icoActive: !!(data?.icoActive || data?.ico_active),
        miningActive: !!(data?.miningActive || data?.mining_active),
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
          reject(new Error(dispatchError.toString()));
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
    const { result, output } = await contractInstance.query.getVisualAttributes(
      contractInstance.address,
      getGasLimit(contractInstance.api),
      nftId
    );

    if (result.isOk && output) {
      const data = output.toHuman() as any;
      if (data?.Ok) {
        return {
          rarity: (data.Ok.rarity || 'common').toLowerCase() as VisualRarity,
          attributes: data.Ok.attributes || [],
          seedHash: parseInt(data.Ok.seedHash || 0),
          revealed: data.Ok.revealed ?? true,
        };
      }
    }
  } catch (e) {
    console.warn('Failed to fetch NFT visual attributes:', e);
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
      return {
        totalEvolutions: parseInt(data?.[0] || 0),
        totalBurned: parseInt(data?.[1] || 0),
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
      return {
        common: parseInt(data?.[0] || 0),
        uncommon: parseInt(data?.[1] || 0),
        rare: parseInt(data?.[2] || 0),
        epic: parseInt(data?.[3] || 0),
        legendary: parseInt(data?.[4] || 0),
        total: parseInt(data?.[5] || 0),
      };
    }
  } catch (e) {
    console.warn('Failed to fetch rarity stats:', e);
  }

  return { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0, total: 0 };
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
        nftIdsBigInt
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
      nftIdsBigInt
    );

    return new Promise((resolve, reject) => {
      tx.signAndSend(address, { signer: injector.signer }, ({ status, events, dispatchError }) => {
        console.log('[evolveNFTs] Tx status:', status.type);

        if (dispatchError) {
          if (dispatchError.isModule) {
            const decoded = api?.registry.findMetaError(dispatchError.asModule);
            reject(new Error(`${decoded?.section}.${decoded?.name}: ${decoded?.docs.join(' ')}`));
          } else {
            reject(new Error(dispatchError.toString()));
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
export async function canEvolveNFTs(nftIds: number[], address: string): Promise<{
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
    // Convert to BigInt for u64 - polkadot-js should auto-encode Vec<u64>
    const nftIdsBigInt = nftIds.map(id => BigInt(id));
    console.log('[canEvolve] Checking with IDs (BigInt):', nftIdsBigInt.map(n => n.toString()));

    console.log('[canEvolve] Calling query.canEvolve with BigInt array...');
    const { result, output } = await contractInstance.query.canEvolve(
      address, // Use the user's address as caller (Origin) to pass ownership check
      getGasLimit(contractInstance.api),
      nftIdsBigInt
    );

    console.log('[canEvolve] Query completed. result.isOk:', result.isOk);
    console.log('[canEvolve] result.toHuman():', result.toHuman());
    if (output) {
      console.log('[canEvolve] output.toHuman():', output.toHuman());
    }

    if (result.isOk && output) {
      const data = output.toHuman() as any;
      console.log('[canEvolve] Parsed data:', data);
      if (data?.Ok !== undefined) {
        // Handle nested Ok (Result<Result<u8, Error>, LangError>)
        const innerData = data.Ok;
        if (typeof innerData === 'object' && innerData?.Ok !== undefined) {
          return {
            canEvolve: true,
            resultTier: parseInt(innerData.Ok),
            error: null,
          };
        } else if (typeof innerData === 'object' && innerData?.Err !== undefined) {
          return {
            canEvolve: false,
            resultTier: null,
            error: JSON.stringify(innerData.Err),
          };
        } else {
          return {
            canEvolve: true,
            resultTier: parseInt(innerData),
            error: null,
          };
        }
      } else if (data?.Err) {
        return {
          canEvolve: false,
          resultTier: null,
          error: JSON.stringify(data.Err),
        };
      }
    } else if (result.isErr) {
      console.error('[canEvolve] Query failed with error:', result.asErr?.toHuman?.() || result.toHuman());
      return {
        canEvolve: false,
        resultTier: null,
        error: 'Query failed: ' + JSON.stringify(result.toHuman()),
      };
    }
  } catch (e) {
    console.error('[canEvolve] Exception caught:', e);
    return { canEvolve: false, resultTier: null, error: String(e) };
  }

  return { canEvolve: false, resultTier: null, error: 'Unknown error' };
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
          reject(new Error(dispatchError.toString()));
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
          reject(new Error(dispatchError.toString()));
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
          reject(new Error(dispatchError.toString()));
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
