/**
 * Cliente para interagir com o contrato Don Fiapo na rede Lunes
 * 
 * Este módulo chama o contrato para confirmar pagamentos verificados.
 */

import { ApiPromise, WsProvider, Keyring } from '@polkadot/api';
import { ContractPromise } from '@polkadot/api-contract';
import type { ISubmittableResult } from '@polkadot/types/types';
import type { WeightV2 } from '@polkadot/types/interfaces';
import * as fs from 'fs';
import * as path from 'path';

// Carrega o ABI completo gerado pelo cargo-contract
const loadContractAbi = () => {
  const abiPath = path.join(__dirname, 'don_fiapo.json');

  // Verifica se o arquivo existe
  if (!fs.existsSync(abiPath)) {
    console.warn('⚠️  ABI file not found at:', abiPath);
    console.warn('   Please build the contract with: cargo contract build');
    return null;
  }

  try {
    const abiContent = fs.readFileSync(abiPath, 'utf-8');
    return JSON.parse(abiContent);
  } catch (error) {
    console.error('❌ Error loading ABI:', error);
    return null;
  }
};

// ABI carregado do arquivo gerado pelo cargo-contract
const CONTRACT_ABI = loadContractAbi();


export interface ConfirmPaymentResult {
  success: boolean;
  transactionHash?: string;
  blockNumber?: number;
  error?: string;
}

export class LunesContractClient {
  private api: ApiPromise | null = null;
  private contract: ContractPromise | null = null;
  private keyring: Keyring | null = null;
  private oraclePair: any = null;

  constructor(
    private readonly rpcUrl: string,
    private readonly contractAddress: string,
    private readonly oracleSeed: string
  ) { }

  /**
   * Conecta à rede Lunes e inicializa o contrato
   */
  async connect(): Promise<void> {
    if (process.env.ENABLE_MOCK_PAYMENTS === 'true') {
      console.log('⚠️  MOCK MODE: Skipping Lunes connection');
      console.log(`   Mock Contract: ${this.contractAddress}`);
      return;
    }

    console.log(`Conectando à rede Lunes: ${this.rpcUrl}`);

    const provider = new WsProvider(this.rpcUrl);
    this.api = await ApiPromise.create({ provider });

    // Inicializa keyring com a conta do oracle
    this.keyring = new Keyring({ type: 'sr25519' });
    this.oraclePair = this.keyring.addFromUri(this.oracleSeed);

    console.log(`Oracle Account: ${this.oraclePair.address}`);
    console.log(`Contract Address: ${this.contractAddress}`);

    // Carrega o contrato
    // Em produção, carregue o ABI completo do arquivo JSON gerado pelo cargo-contract
    this.contract = new ContractPromise(this.api, CONTRACT_ABI as any, this.contractAddress);

    console.log('Conectado com sucesso!');
  }

  /**
   * Desconecta da rede
   */
  async disconnect(): Promise<void> {
    if (this.api) {
      await this.api.disconnect();
      this.api = null;
    }
  }

  /**
   * Confirma um pagamento Solana no contrato
   */
  async confirmSolanaPayment(
    transactionHash: string,
    senderAddress: string,
    amountUsdt: number,
    timestamp: number,
    blockNumber: number
  ): Promise<ConfirmPaymentResult> {
    if (process.env.ENABLE_MOCK_PAYMENTS === 'true') {
      console.log(`⚠️  MOCK MODE: Confirming payment ${transactionHash}`);
      return {
        success: true,
        transactionHash: `mock_lunes_tx_${Date.now()}`,
        blockNumber: 12345
      };
    }

    if (!this.api || !this.contract || !this.oraclePair) {
      return { success: false, error: 'Not connected' };
    }

    try {
      console.log(`Confirmando pagamento: ${transactionHash}`);
      console.log(`  Sender: ${senderAddress}`);
      console.log(`  Amount: ${amountUsdt} (${amountUsdt / 1_000_000} USDT)`);

      // Estima gas necessário
      const gasLimit: WeightV2 = this.api.registry.createType('WeightV2', {
        refTime: 100_000_000_000n,
        proofSize: 1_000_000n,
      }) as unknown as WeightV2;

      // Chama o contrato
      const tx = await this.contract.tx['confirmSolanaPayment'](
        { gasLimit, storageDepositLimit: null },
        transactionHash,
        senderAddress,
        amountUsdt,
        timestamp,
        blockNumber
      );

      // Envia a transação
      return new Promise((resolve) => {
        tx.signAndSend(this.oraclePair, (result: ISubmittableResult) => {
          const { status, dispatchError } = result;
          if (status.isInBlock || status.isFinalized) {
            if (dispatchError) {
              let errorMessage = 'Unknown error';

              if (dispatchError.isModule) {
                const decoded = this.api!.registry.findMetaError(dispatchError.asModule);
                errorMessage = `${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`;
              }

              resolve({
                success: false,
                error: errorMessage,
              });
            } else {
              resolve({
                success: true,
                transactionHash: tx.hash.toHex(),
                blockNumber: status.isInBlock
                  ? (status.asInBlock as any).blockNumber?.toNumber()
                  : undefined,
              });
            }
          }
        });
      });

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Verifica se uma transação já foi processada
   */
  async isTransactionProcessed(transactionHash: string): Promise<boolean> {
    if (!this.api || !this.contract) {
      throw new Error('Not connected');
    }

    try {
      const result = await this.contract.query['isTransactionProcessed'](
        this.oraclePair.address,
        { gasLimit: -1 },
        transactionHash
      );

      return result.output?.toHuman() === true;
    } catch {
      return false;
    }
  }

  /**
   * Retorna o endereço do oracle
   */
  getOracleAddress(): string {
    return this.oraclePair?.address || '';
  }
}
