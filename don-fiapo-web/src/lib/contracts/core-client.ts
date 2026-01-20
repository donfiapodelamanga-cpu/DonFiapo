/**
 * Core Token Client (PSP22)
 * 
 * Cliente para interações com o contrato Core do token FIAPO.
 */

import { initializeContract, getGasLimit, getInjector, parseBigInt, unwrapResult } from './client';
import CORE_ABI from './fiapo_core.json';

const CONTRACT_NAME = 'core' as const;

/**
 * Inicializar contrato Core
 */
async function getContract() {
  return initializeContract(CONTRACT_NAME, CORE_ABI);
}

/**
 * Obter saldo de tokens FIAPO
 */
export async function getBalance(address: string): Promise<bigint> {
  const contract = await getContract();
  if (!contract) return BigInt(0);

  try {
    const { result, output } = await contract.query.balanceOf(
      address,
      getGasLimit(contract.api),
      address
    );

    if (result.isOk && output) {
      const data = unwrapResult(output.toHuman());
      return parseBigInt(data);
    }
  } catch (error) {
    console.warn('[Core] Error fetching balance:', error);
  }

  return BigInt(0);
}

/**
 * Obter supply total
 */
export async function getTotalSupply(): Promise<bigint> {
  const contract = await getContract();
  if (!contract) return BigInt(0);

  try {
    const { result, output } = await contract.query.totalSupply(
      contract.address,
      getGasLimit(contract.api)
    );

    if (result.isOk && output) {
      const data = unwrapResult(output.toHuman());
      return parseBigInt(data);
    }
  } catch (error) {
    console.warn('[Core] Error fetching total supply:', error);
  }

  return BigInt(0);
}

/**
 * Transferir tokens
 */
export async function transfer(
  from: string,
  to: string,
  amount: bigint
): Promise<string> {
  const contract = await getContract();
  if (!contract) throw new Error('Contract not available');

  const injector = await getInjector(from);

  const tx = contract.tx.transfer(
    getGasLimit(contract.api),
    to,
    amount.toString()
  );

  return new Promise((resolve, reject) => {
    tx.signAndSend(from, { signer: injector.signer }, ({ status, txHash, dispatchError }) => {
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
 * Aprovar allowance
 */
export async function approve(
  owner: string,
  spender: string,
  amount: bigint
): Promise<string> {
  const contract = await getContract();
  if (!contract) throw new Error('Contract not available');

  const injector = await getInjector(owner);

  const tx = contract.tx.approve(
    getGasLimit(contract.api),
    spender,
    amount.toString()
  );

  return new Promise((resolve, reject) => {
    tx.signAndSend(owner, { signer: injector.signer }, ({ status, txHash, dispatchError }) => {
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
 * Obter allowance
 */
export async function getAllowance(owner: string, spender: string): Promise<bigint> {
  const contract = await getContract();
  if (!contract) return BigInt(0);

  try {
    const { result, output } = await contract.query.allowance(
      owner,
      getGasLimit(contract.api),
      owner,
      spender
    );

    if (result.isOk && output) {
      const data = unwrapResult(output.toHuman());
      return parseBigInt(data);
    }
  } catch (error) {
    console.warn('[Core] Error fetching allowance:', error);
  }

  return BigInt(0);
}

/**
 * Queimar tokens
 */
export async function burn(address: string, amount: bigint): Promise<string> {
  const contract = await getContract();
  if (!contract) throw new Error('Contract not available');

  const injector = await getInjector(address);

  const tx = contract.tx.burn(
    getGasLimit(contract.api),
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
