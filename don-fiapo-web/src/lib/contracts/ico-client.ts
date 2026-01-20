/**
 * ICO & NFT Mining Client
 * 
 * Cliente para interações com o contrato ICO e NFTs mineradores.
 */

import { initializeContract, getGasLimit, getHighGasLimit, getInjector, parseBigInt, parseNum, unwrapResult, getApi } from './client';

// ABI será importado após o build dos contratos
// import ICO_ABI from './ico.json';
const ICO_ABI = {}; // Placeholder - substituir pelo ABI real

const CONTRACT_NAME = 'ico' as const;

export interface NFTData {
  tokenId: number;
  nftType: number;
  mintedAt: number;
  minedTokens: bigint;
  claimedTokens: bigint;
  lastMiningTimestamp: number;
  miningBonusBps: number;
  visualRarity: string;
}

export interface NFTConfig {
  tier: number;
  priceUsdtCents: number;
  maxSupply: number;
  minted: number;
  tokensPerNft: bigint;
  dailyMiningRate: bigint;
  active: boolean;
}

export interface ICOStats {
  totalNftsMinted: number;
  totalRaisedUsdtCents: bigint;
  totalTokensMined: bigint;
  totalTokensVesting: bigint;
  uniqueParticipants: number;
  icoActive: boolean;
  miningActive: boolean;
  mintedPerType: number[];
}

/**
 * Inicializar contrato ICO
 */
async function getContract() {
  return initializeContract(CONTRACT_NAME, ICO_ABI);
}

/**
 * Obter NFTs do usuário
 */
export async function getUserNFTs(address: string): Promise<NFTData[]> {
  const contract = await getContract();
  if (!contract) return [];

  try {
    const { result, output } = await contract.query.getUserNfts(
      address,
      getGasLimit(contract.api),
      address
    );

    if (result.isOk && output) {
      const data = unwrapResult<any[]>(output.toHuman());
      
      if (!Array.isArray(data)) return [];

      return data.map((nft: any) => {
        // Parse nft_type enum
        let nftTypeNum = 0;
        const nftType = nft.nft_type || nft.nftType;
        if (typeof nftType === 'string') {
          const typeMap: Record<string, number> = { 
            'Free': 0, 'Tier2': 1, 'Tier3': 2, 'Tier4': 3, 
            'Tier5': 4, 'Tier6': 5, 'Tier7': 6 
          };
          nftTypeNum = typeMap[nftType] ?? 0;
        } else if (typeof nftType === 'object' && nftType !== null) {
          const key = Object.keys(nftType)[0];
          const typeMap: Record<string, number> = { 
            'Free': 0, 'Tier2': 1, 'Tier3': 2, 'Tier4': 3, 
            'Tier5': 4, 'Tier6': 5, 'Tier7': 6 
          };
          nftTypeNum = typeMap[key] ?? 0;
        }

        return {
          tokenId: parseNum(nft.id || nft.tokenId || nft.token_id),
          nftType: nftTypeNum,
          mintedAt: parseNum(nft.created_at || nft.createdAt || nft.mintedAt),
          minedTokens: parseBigInt(nft.tokens_mined || nft.tokensMined || nft.minedTokens),
          claimedTokens: parseBigInt(nft.tokens_claimed || nft.tokensClaimed || nft.claimedTokens),
          lastMiningTimestamp: parseNum(nft.last_mining_timestamp || nft.lastMiningTimestamp),
          miningBonusBps: parseNum(nft.mining_bonus_bps || nft.miningBonusBps),
          visualRarity: nft.visual_rarity || nft.visualRarity || 'Common',
        };
      });
    }
  } catch (error) {
    console.warn('[ICO] Error fetching user NFTs:', error);
  }

  return [];
}

/**
 * Mintar NFT
 */
export async function mintNFT(
  address: string,
  nftType: number,
  paymentProof?: {
    transactionHash: string;
    senderAddress: string;
    amountUsdt: number;
    timestamp: number;
  }
): Promise<string> {
  const contract = await getContract();
  if (!contract) throw new Error('ICO contract not available');

  const injector = await getInjector(address);
  const api = getApi();
  if (!api) throw new Error('API not available');

  const proof = paymentProof ? {
    transaction_hash: paymentProof.transactionHash,
    sender_address: paymentProof.senderAddress,
    amount_usdt: paymentProof.amountUsdt,
    timestamp: paymentProof.timestamp,
  } : null;

  const tx = contract.tx.mintNft(
    getHighGasLimit(api),
    nftType,
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
 * Claim tokens minerados
 */
export async function claimMinedTokens(
  address: string,
  tokenId: number
): Promise<string> {
  const contract = await getContract();
  if (!contract) throw new Error('ICO contract not available');

  const injector = await getInjector(address);

  const tx = contract.tx.claimTokens(
    getGasLimit(contract.api),
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
 * Evoluir NFTs
 */
export async function evolveNFTs(
  address: string,
  tokenId1: number,
  tokenId2: number
): Promise<string> {
  const contract = await getContract();
  if (!contract) throw new Error('ICO contract not available');

  const injector = await getInjector(address);

  const tx = contract.tx.evolveNft(
    getHighGasLimit(contract.api),
    tokenId1,
    tokenId2
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
 * Obter estatísticas do ICO
 */
export async function getICOStats(): Promise<ICOStats | null> {
  const contract = await getContract();
  if (!contract) return null;

  try {
    const { result, output } = await contract.query.getIcoStats(
      contract.address,
      getGasLimit(contract.api)
    );

    if (result.isOk && output) {
      const data = unwrapResult<any>(output.toHuman());
      if (data) {
        return {
          totalNftsMinted: parseNum(data.totalNftsMinted || data.total_nfts_minted),
          totalRaisedUsdtCents: parseBigInt(data.totalRaisedUsdtCents || data.total_raised_usdt_cents),
          totalTokensMined: parseBigInt(data.totalTokensMined || data.total_tokens_mined),
          totalTokensVesting: parseBigInt(data.totalTokensVesting || data.total_tokens_vesting),
          uniqueParticipants: parseNum(data.uniqueParticipants || data.unique_participants),
          icoActive: !!(data.icoActive || data.ico_active),
          miningActive: !!(data.miningActive || data.mining_active),
          mintedPerType: Array.isArray(data.mintedPerType || data.minted_per_type) 
            ? (data.mintedPerType || data.minted_per_type).map(parseNum)
            : [],
        };
      }
    }
  } catch (error) {
    console.warn('[ICO] Error fetching stats:', error);
  }

  return null;
}

/**
 * Obter configurações dos NFTs
 */
export async function getNFTConfigs(): Promise<NFTConfig[]> {
  const contract = await getContract();
  if (!contract) return [];

  try {
    const { result, output } = await contract.query.getIcoNftConfigs(
      contract.address,
      getGasLimit(contract.api)
    );

    if (result.isOk && output) {
      const data = unwrapResult<any[]>(output.toHuman());
      
      if (Array.isArray(data)) {
        return data.map((item: any, index: number) => ({
          tier: index,
          priceUsdtCents: parseNum(item.priceUsdtCents || item.price_usdt_cents),
          maxSupply: parseNum(item.maxSupply || item.max_supply),
          minted: parseNum(item.minted),
          tokensPerNft: parseBigInt(item.tokensPerNft || item.tokens_per_nft),
          dailyMiningRate: parseBigInt(item.dailyMiningRate || item.daily_mining_rate),
          active: !!(item.active),
        }));
      }
    }
  } catch (error) {
    console.warn('[ICO] Error fetching NFT configs:', error);
  }

  return [];
}
