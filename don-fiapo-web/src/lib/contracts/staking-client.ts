/**
 * Staking Client
 * 
 * Cliente para interações com o contrato de Staking.
 */

import { initializeContract, getGasLimit, getInjector, parseBigInt, parseNum, unwrapResult } from './client';

// ABI será importado após o build dos contratos
// import STAKING_ABI from './staking.json';
const STAKING_ABI = {}; // Placeholder - substituir pelo ABI real

const CONTRACT_NAME = 'staking' as const;

export interface StakingPosition {
  amount: bigint;
  startTime: number;
  poolType: string;
  pendingRewards: bigint;
  lastClaimTime: number;
}

export interface StakingPoolInfo {
  poolType: string;
  totalStaked: bigint;
  totalStakers: number;
  baseApy: number;
  maxApy: number;
  paymentFrequency: string;
}

/**
 * Inicializar contrato Staking
 */
async function getContract() {
  return initializeContract(CONTRACT_NAME, STAKING_ABI);
}

/**
 * Obter posição de staking do usuário
 */
export async function getStakingPosition(
  address: string,
  poolType: string
): Promise<StakingPosition | null> {
  const contract = await getContract();
  if (!contract) return null;

  try {
    const { result, output } = await contract.query.getStakingPosition(
      address,
      getGasLimit(contract.api),
      address,
      poolType
    );

    if (result.isOk && output) {
      const data = unwrapResult<any>(output.toHuman());
      if (data) {
        return {
          amount: parseBigInt(data.amount),
          startTime: parseNum(data.startTime || data.start_time),
          poolType: data.poolType || data.pool_type || poolType,
          pendingRewards: parseBigInt(data.pendingRewards || data.pending_rewards),
          lastClaimTime: parseNum(data.lastClaimTime || data.last_claim_time),
        };
      }
    }
  } catch (error) {
    console.warn('[Staking] Error fetching position:', error);
  }

  return null;
}

/**
 * Obter informações da pool
 */
export async function getPoolInfo(poolType: string): Promise<StakingPoolInfo | null> {
  const contract = await getContract();
  if (!contract) return null;

  try {
    const { result, output } = await contract.query.getPoolInfo(
      contract.address,
      getGasLimit(contract.api),
      poolType
    );

    if (result.isOk && output) {
      const data = unwrapResult<any>(output.toHuman());
      if (data) {
        return {
          poolType: data.poolType || data.pool_type || poolType,
          totalStaked: parseBigInt(data.totalStaked || data.total_staked),
          totalStakers: parseNum(data.totalStakers || data.total_stakers),
          baseApy: parseNum(data.baseApy || data.base_apy),
          maxApy: parseNum(data.maxApy || data.max_apy),
          paymentFrequency: data.paymentFrequency || data.payment_frequency || 'daily',
        };
      }
    }
  } catch (error) {
    console.warn('[Staking] Error fetching pool info:', error);
  }

  return null;
}

/**
 * Fazer stake
 */
export async function stake(
  address: string,
  poolType: string,
  amount: bigint
): Promise<string> {
  const contract = await getContract();
  if (!contract) throw new Error('Staking contract not available');

  const injector = await getInjector(address);

  const tx = contract.tx.stake(
    getGasLimit(contract.api),
    poolType,
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
 * Fazer unstake
 */
export async function unstake(address: string, poolType: string): Promise<string> {
  const contract = await getContract();
  if (!contract) throw new Error('Staking contract not available');

  const injector = await getInjector(address);

  const tx = contract.tx.unstake(
    getGasLimit(contract.api),
    poolType
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
 * Claim rewards
 */
export async function claimRewards(address: string, poolType: string): Promise<string> {
  const contract = await getContract();
  if (!contract) throw new Error('Staking contract not available');

  const injector = await getInjector(address);

  const tx = contract.tx.claimRewards(
    getGasLimit(contract.api),
    poolType
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
 * Calcular APY atual
 */
export async function calculateCurrentApy(
  address: string,
  poolType: string
): Promise<number> {
  const contract = await getContract();
  if (!contract) return 0;

  try {
    const { result, output } = await contract.query.calculateCurrentApy(
      address,
      getGasLimit(contract.api),
      address,
      poolType
    );

    if (result.isOk && output) {
      const data = unwrapResult(output.toHuman());
      return parseNum(data) / 100; // bps to %
    }
  } catch (error) {
    console.warn('[Staking] Error calculating APY:', error);
  }

  return 0;
}
