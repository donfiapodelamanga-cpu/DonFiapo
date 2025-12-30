/**
 * Verificador de Transações USDT na Solana
 * 
 * Este módulo verifica se uma transação USDT foi realmente realizada
 * e confirma os detalhes (valor, remetente, destinatário).
 */

import {
  Connection,
  PublicKey,
  ParsedTransactionWithMeta,
  ParsedInstruction,
} from '@solana/web3.js';

export interface USDTTransactionDetails {
  signature: string;
  sender: string;
  receiver: string;
  amount: number; // Em unidades USDT (6 decimais)
  slot: number;
  blockTime: number;
  confirmations: number;
  isValid: boolean;
  error?: string;
}

export class SolanaVerifier {
  private connection: Connection;
  private usdtTokenAddress: PublicKey;
  private receiverAddress: string;
  private minConfirmations: number;

  constructor(
    rpcUrl: string,
    usdtTokenAddress: string,
    receiverAddress: string,
    minConfirmations: number = 12
  ) {
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.usdtTokenAddress = new PublicKey(usdtTokenAddress);
    this.receiverAddress = receiverAddress;
    this.minConfirmations = minConfirmations;
  }

  /**
   * Obtém detalhes da transferência sem validação prévia de valor/sender
   */
  async getTransferDetails(signature: string): Promise<USDTTransactionDetails> {
    try {
      const tx = await this.connection.getParsedTransaction(signature, {
        maxSupportedTransactionVersion: 0,
      });

      if (!tx) {
        return this.createErrorResult(signature, 'Transaction not found');
      }

      const transferDetails = this.extractUSDTTransfer(tx);

      if (!transferDetails) {
        return this.createErrorResult(signature, 'No USDT transfer found');
      }

      // Valida destinatário aqui
      if (transferDetails.receiver !== this.receiverAddress) {
        return this.createErrorResult(signature, 'Invalid receiver');
      }

      const currentSlot = await this.connection.getSlot();

      return {
        signature,
        sender: transferDetails.sender,
        receiver: transferDetails.receiver,
        amount: transferDetails.amount,
        slot: tx.slot || 0,
        blockTime: tx.blockTime || Math.floor(Date.now() / 1000),
        confirmations: currentSlot - (tx.slot || 0),
        isValid: true,
        error: undefined
      };
    } catch (e) {
      return this.createErrorResult(signature, (e as Error).message);
    }
  }

  /**
   * Verifica uma transação USDT
   */
  async verifyTransaction(
    signature: string,
    expectedAmount: number,
    expectedSender?: string
  ): Promise<USDTTransactionDetails> {
    try {
      // 1. Busca a transação
      const tx = await this.connection.getParsedTransaction(signature, {
        maxSupportedTransactionVersion: 0,
      });

      if (!tx) {
        return this.createErrorResult(signature, 'Transaction not found');
      }

      // 2. Verifica se a transação foi confirmada
      const currentSlot = await this.connection.getSlot();
      const confirmations = currentSlot - (tx.slot || 0);

      if (confirmations < this.minConfirmations) {
        return this.createErrorResult(
          signature,
          `Insufficient confirmations: ${confirmations}/${this.minConfirmations}`
        );
      }

      // 3. Verifica se a transação foi bem-sucedida
      if (tx.meta?.err) {
        return this.createErrorResult(signature, 'Transaction failed');
      }

      // 4. Extrai detalhes da transferência USDT
      const transferDetails = this.extractUSDTTransfer(tx);

      if (!transferDetails) {
        return this.createErrorResult(signature, 'No USDT transfer found in transaction');
      }

      // 5. Valida o destinatário
      if (transferDetails.receiver !== this.receiverAddress) {
        return this.createErrorResult(
          signature,
          `Invalid receiver: expected ${this.receiverAddress}, got ${transferDetails.receiver}`
        );
      }

      // 6. Valida o valor
      if (transferDetails.amount !== expectedAmount) {
        return this.createErrorResult(
          signature,
          `Amount mismatch: expected ${expectedAmount}, got ${transferDetails.amount}`
        );
      }

      // 7. Valida o remetente (se especificado)
      if (expectedSender && transferDetails.sender !== expectedSender) {
        return this.createErrorResult(
          signature,
          `Sender mismatch: expected ${expectedSender}, got ${transferDetails.sender}`
        );
      }

      // Transação válida!
      return {
        signature,
        sender: transferDetails.sender,
        receiver: transferDetails.receiver,
        amount: transferDetails.amount,
        slot: tx.slot || 0,
        blockTime: tx.blockTime || Math.floor(Date.now() / 1000),
        confirmations,
        isValid: true,
      };

    } catch (error) {
      return this.createErrorResult(
        signature,
        `Verification error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Extrai detalhes de transferência USDT de uma transação
   */
  private extractUSDTTransfer(
    tx: ParsedTransactionWithMeta
  ): { sender: string; receiver: string; amount: number } | null {
    const instructions = tx.transaction.message.instructions;

    for (const instruction of instructions) {
      // Verifica se é uma instrução parsed do Token Program
      if ('parsed' in instruction && instruction.program === 'spl-token') {
        const parsed = (instruction as ParsedInstruction).parsed;

        // Verifica transferência ou transferChecked
        if (parsed.type === 'transfer' || parsed.type === 'transferChecked') {
          const info = parsed.info;

          // Verifica se é USDT
          if (parsed.type === 'transferChecked' && info.mint !== this.usdtTokenAddress.toString()) {
            continue;
          }

          return {
            sender: info.authority || info.source,
            receiver: info.destination,
            amount: parseInt(info.amount, 10),
          };
        }
      }
    }

    // Também verifica inner instructions
    if (tx.meta?.innerInstructions) {
      for (const innerIx of tx.meta.innerInstructions) {
        for (const instruction of innerIx.instructions) {
          if ('parsed' in instruction && instruction.program === 'spl-token') {
            const parsed = (instruction as ParsedInstruction).parsed;
            if (parsed.type === 'transfer' || parsed.type === 'transferChecked') {
              return {
                sender: parsed.info.authority || parsed.info.source,
                receiver: parsed.info.destination,
                amount: parseInt(parsed.info.amount, 10),
              };
            }
          }
        }
      }
    }

    return null;
  }

  /**
   * Cria resultado de erro
   */
  private createErrorResult(signature: string, error: string): USDTTransactionDetails {
    return {
      signature,
      sender: '',
      receiver: '',
      amount: 0,
      slot: 0,
      blockTime: 0,
      confirmations: 0,
      isValid: false,
      error,
    };
  }

  /**
   * Monitora novas transações para o endereço receptor
   */
  async subscribeToTransactions(
    callback: (signature: string) => void
  ): Promise<number> {
    const receiverPubkey = new PublicKey(this.receiverAddress);

    return this.connection.onLogs(
      receiverPubkey,
      (logs) => {
        if (!logs.err) {
          callback(logs.signature);
        }
      },
      'confirmed'
    );
  }

  /**
   * Cancela subscription
   */
  async unsubscribe(subscriptionId: number): Promise<void> {
    await this.connection.removeOnLogsListener(subscriptionId);
  }
}
