/**
 * Contract API Client
 * 
 * Handles communication with the Don Fiapo smart contract on Lunes Network
 */

// Type-only imports (these are removed during compilation, no runtime impact)
import type { ApiPromise } from '@polkadot/api';
import type { ContractPromise } from '@polkadot/api-contract';
import { API_CONFIG, LUNES_RPC_ENDPOINTS } from './config';
import { CONTRACT_ABI } from './contract-abi';

// Module-level cache for connections
let api: ApiPromise | null = null;
let contract: ContractPromise | null = null;
let connectionFailed = false;
let lastConnectionAttempt = 0;
let currentEndpointIndex = 0;
const CONNECTION_RETRY_DELAY = 30000; // 30 seconds between retries

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

    for (let i = 0; i < LUNES_RPC_ENDPOINTS.length; i++) {
      const endpoint = getNextEndpoint();
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
    { gasLimit: -1 },
    address  // account to check
  );

  if (result.isOk && output) {
    return BigInt(output.toHuman() as string);
  }

  return BigInt(0);
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
    { gasLimit: -1 },
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
    { gasLimit: -1, storageDepositLimit: null },
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
    { gasLimit: -1, storageDepositLimit: null },
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
    { gasLimit: -1, storageDepositLimit: null },
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
    { gasLimit: -1 },
    address
  );

  if (result.isOk && output) {
    const data = output.toHuman() as any[];
    return data?.map((nft: any) => ({
      tokenId: parseInt(nft.tokenId),
      nftType: parseInt(nft.nftType),
      mintedAt: parseInt(nft.mintedAt),
      minedTokens: BigInt(nft.minedTokens || 0),
      claimedTokens: BigInt(nft.claimedTokens || 0),
    })) || [];
  }

  return [];
}

/**
 * Mint NFT (requires payment confirmation from oracle)
 */
export async function mintNFT(
  address: string,
  nftType: number,
  quantity: number
): Promise<string> {
  const contractInstance = await initializeContract();
  if (!contractInstance) throw new Error('Contract not available - network offline');
  const injector = await getInjector(address);

  const tx = contractInstance.tx.mintNft(
    { gasLimit: -1, storageDepositLimit: null },
    nftType,
    quantity
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
    { gasLimit: -1, storageDepositLimit: null },
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
    { gasLimit: -1 },
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
    { gasLimit: -1, storageDepositLimit: null },
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
    { gasLimit: -1 },
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
    { gasLimit: -1, storageDepositLimit: null },
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
 * Get staking pool configuration
 */
export async function getStakingPoolConfig(stakingType: string): Promise<{
  apy: number;
  minStake: bigint;
  lockPeriod: number;
  totalStaked: bigint;
  totalStakers: number;
}> {
  // NOTE: getStakingConfig method doesn't exist in contract yet
  // Using local configuration from API_CONFIG
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
        { gasLimit: -1 }
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
      { gasLimit: -1 },
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
      { gasLimit: -1 },
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

/**
 * Get ICO/NFT mining statistics
 */
export async function getICOStats(): Promise<{
  totalNFTsMinted: number;
  totalTokensMined: bigint;
  miningActive: boolean;
  miningEndTime: number;
}> {
  try {
    const contractInstance = await initializeContract();
    if (!contractInstance) throw new Error('Not connected');

    const { result, output } = await contractInstance.query.getIcoStats(
      API_CONFIG.contracts.donFiapo,
      { gasLimit: -1 }
    );

    if (result.isOk && output) {
      const data = output.toHuman() as any;
      return {
        totalNFTsMinted: parseInt(data?.totalNFTsMinted || 0),
        totalTokensMined: BigInt(data?.totalTokensMined || 0),
        miningActive: data?.miningActive || false,
        miningEndTime: parseInt(data?.miningEndTime || 0),
      };
    }
  } catch (e) {
    console.warn('Failed to fetch ICO stats from contract:', e);
  }

  // Fallback values
  return {
    totalNFTsMinted: 0,
    totalTokensMined: BigInt(0),
    miningActive: true,
    miningEndTime: Date.now() + 112 * 24 * 60 * 60 * 1000,
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
      { gasLimit: -1 },
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
      { gasLimit: -1 },
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
      { gasLimit: -1 }
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
      { gasLimit: -1 }
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

  try {
    const injector = await getInjector(address);

    // Estimate gas
    const { gasRequired } = await contractInstance.query.evolveNfts(
      address,
      { gasLimit: -1 },
      nftIds
    );

    // Execute transaction
    const tx = contractInstance.tx.evolveNfts(
      { gasLimit: gasRequired },
      nftIds
    );

    return new Promise((resolve, reject) => {
      tx.signAndSend(address, { signer: injector.signer }, ({ status, events, dispatchError }) => {
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
export async function canEvolveNFTs(nftIds: number[]): Promise<{
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
    const { result, output } = await contractInstance.query.canEvolve(
      contractInstance.address,
      { gasLimit: -1 },
      nftIds
    );

    if (result.isOk && output) {
      const data = output.toHuman() as any;
      if (data?.Ok) {
        return {
          canEvolve: true,
          resultTier: parseInt(data.Ok),
          error: null,
        };
      } else if (data?.Err) {
        return {
          canEvolve: false,
          resultTier: null,
          error: data.Err,
        };
      }
    }
  } catch (e) {
    console.warn('Failed to check evolution eligibility:', e);
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
    { gasLimit: -1, storageDepositLimit: null }
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
    { gasLimit: -1, storageDepositLimit: null },
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
    { gasLimit: -1, storageDepositLimit: null },
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
