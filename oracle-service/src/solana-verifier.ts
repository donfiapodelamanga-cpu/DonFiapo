/**
 * Verificador de Transações USDT na Solana
 * 
 * Migrado para @solana/kit (web3.js 2.0)
 * 
 * Este módulo verifica se uma transação USDT foi realmente realizada
 * e confirma os detalhes (valor, remetente, destinatário).
 */

import {
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  address,
  signature as createSignature,
  type Address,
  type Signature,
} from '@solana/kit';

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
  private rpc: ReturnType<typeof createSolanaRpc>;
  private rpcSubscriptions: ReturnType<typeof createSolanaRpcSubscriptions> | null = null;
  private usdtTokenAddress: Address;
  private receiverAddress: Address;
  private minConfirmations: number;
  private rpcUrl: string;
  private wsUrl: string;

  constructor(
    rpcUrl: string,
    usdtTokenAddress: string,
    receiverAddress: string,
    minConfirmations: number = 12
  ) {
    this.rpcUrl = rpcUrl;
    // Convert HTTP to WebSocket URL for subscriptions
    this.wsUrl = rpcUrl.replace('https://', 'wss://').replace('http://', 'ws://');

    this.rpc = createSolanaRpc(rpcUrl);
    this.usdtTokenAddress = address(usdtTokenAddress);
    this.receiverAddress = address(receiverAddress);
    this.minConfirmations = minConfirmations;
  }

  /**
   * Obtém detalhes da transferência sem validação prévia de valor/sender
   */
  async getTransferDetails(signatureStr: string): Promise<USDTTransactionDetails> {
    try {
      const sig = createSignature(signatureStr);

      const tx = await this.rpc.getTransaction(sig, {
        encoding: 'jsonParsed',
        maxSupportedTransactionVersion: 0,
      }).send();

      if (!tx) {
        return this.createErrorResult(signatureStr, 'Transaction not found');
      }

      const transferDetails = this.extractUSDTTransfer(tx);

      if (!transferDetails) {
        return this.createErrorResult(signatureStr, 'No USDT transfer found');
      }

      // Valida destinatário aqui
      if (transferDetails.receiver !== this.receiverAddress) {
        return this.createErrorResult(signatureStr, 'Invalid receiver');
      }

      const currentSlot = await this.rpc.getSlot().send();

      return {
        signature: signatureStr,
        sender: transferDetails.sender,
        receiver: transferDetails.receiver,
        amount: transferDetails.amount,
        slot: Number(tx.slot) || 0,
        blockTime: Number(tx.blockTime) || Math.floor(Date.now() / 1000),
        confirmations: Number(currentSlot) - (Number(tx.slot) || 0),
        isValid: true,
        error: undefined
      };
    } catch (e) {
      return this.createErrorResult(signatureStr, (e as Error).message);
    }
  }

  /**
   * Verifica uma transação USDT
   */
  async verifyTransaction(
    signatureStr: string,
    expectedAmount: number,
    expectedSender?: string
  ): Promise<USDTTransactionDetails> {
    try {
      const sig = createSignature(signatureStr);

      // 1. Busca a transação
      const tx = await this.rpc.getTransaction(sig, {
        encoding: 'jsonParsed',
        maxSupportedTransactionVersion: 0,
      }).send();

      if (!tx) {
        return this.createErrorResult(signatureStr, 'Transaction not found');
      }

      // 2. Verifica se a transação foi confirmada
      const currentSlot = await this.rpc.getSlot().send();
      const confirmations = Number(currentSlot) - (Number(tx.slot) || 0);

      if (confirmations < this.minConfirmations) {
        return this.createErrorResult(
          signatureStr,
          `Insufficient confirmations: ${confirmations}/${this.minConfirmations}`
        );
      }

      // 3. Verifica se a transação foi bem-sucedida
      if (tx.meta?.err) {
        return this.createErrorResult(signatureStr, 'Transaction failed');
      }

      // 4. Extrai detalhes da transferência USDT
      const transferDetails = this.extractUSDTTransfer(tx);

      if (!transferDetails) {
        return this.createErrorResult(signatureStr, 'No USDT transfer found in transaction');
      }

      // 5. Valida o destinatário
      if (transferDetails.receiver !== this.receiverAddress) {
        return this.createErrorResult(
          signatureStr,
          `Invalid receiver: expected ${this.receiverAddress}, got ${transferDetails.receiver}`
        );
      }

      // 6. Valida o valor
      if (transferDetails.amount !== expectedAmount) {
        return this.createErrorResult(
          signatureStr,
          `Amount mismatch: expected ${expectedAmount}, got ${transferDetails.amount}`
        );
      }

      // 7. Valida o remetente (se especificado)
      if (expectedSender && transferDetails.sender !== expectedSender) {
        return this.createErrorResult(
          signatureStr,
          `Sender mismatch: expected ${expectedSender}, got ${transferDetails.sender}`
        );
      }

      // Transação válida!
      return {
        signature: signatureStr,
        sender: transferDetails.sender,
        receiver: transferDetails.receiver,
        amount: transferDetails.amount,
        slot: Number(tx.slot) || 0,
        blockTime: Number(tx.blockTime) || Math.floor(Date.now() / 1000),
        confirmations,
        isValid: true,
      };

    } catch (error) {
      return this.createErrorResult(
        signatureStr,
        `Verification error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Extrai detalhes de transferência USDT de uma transação
   */
  private extractUSDTTransfer(
    tx: any
  ): { sender: string; receiver: string; amount: number } | null {
    const instructions = tx.transaction?.message?.instructions || [];

    for (const instruction of instructions) {
      // Verifica se é uma instrução parsed do Token Program
      if (instruction.parsed && instruction.program === 'spl-token') {
        const parsed = instruction.parsed;

        // Verifica transferência ou transferChecked
        if (parsed.type === 'transfer' || parsed.type === 'transferChecked') {
          const info = parsed.info;

          // Verifica se é USDT
          if (parsed.type === 'transferChecked' && info.mint !== this.usdtTokenAddress) {
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
          if (instruction.parsed && instruction.program === 'spl-token') {
            const parsed = instruction.parsed;
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
   * Nota: Em @solana/kit, usamos RPC subscriptions via WebSocket
   */
  async subscribeToTransactions(
    callback: (signature: string) => void
  ): Promise<number> {
    try {
      // Create RPC subscriptions client
      this.rpcSubscriptions = createSolanaRpcSubscriptions(this.wsUrl);

      // Subscribe to logs for the receiver address
      const logsNotifications = this.rpcSubscriptions.logsNotifications(
        { mentions: [this.receiverAddress] },
        { commitment: 'confirmed' }
      );
      const subscription = await logsNotifications.subscribe({ abortSignal: new AbortController().signal });

      // Process incoming notifications
      (async () => {
        for await (const notification of subscription) {
          if (notification.value && !notification.value.err) {
            callback(notification.value.signature);
          }
        }
      })();

      // Return a dummy subscription ID (the new API handles cleanup differently)
      return 1;
    } catch (error) {
      console.error('Failed to subscribe to transactions:', error);
      return 0;
    }
  }

  /**
   * Cancela subscription
   * Nota: Em @solana/kit 2.0, a gestão de subscriptions é diferente
   */
  async unsubscribe(subscriptionId: number): Promise<void> {
    // In @solana/kit, subscriptions are managed via async iterators
    // The subscription will be cleaned up when the iterator is no longer consumed
    this.rpcSubscriptions = null;
  }
}
