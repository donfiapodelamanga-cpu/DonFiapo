/**
 * Oracle Service API Client
 * 
 * Handles communication with the Oracle service for Solana payment verification
 */

import { API_CONFIG } from './config';
import {
  buildOracleNftMintPaymentCreatePayload,
  buildOracleStakingPaymentCreatePayload,
  oraclePaymentCreatePath,
  oraclePaymentStatusPath,
  oraclePaymentVerifyPath,
  oracleUsdToAtomic,
} from './oracle-payment';

export interface StakingPaymentRequest {
  lunesAccount: string;
  stakingType: string;
  paymentMethod: 'usdt';
  fiapoAmount: number;
  expectedSender: string;
}

export interface NftMintPaymentRequest {
  lunesAccount: string;
  tierId: number;
  quantity: number;
  expectedSender: string;
}

export interface PaymentResponse {
  paymentId: string;
  payToAddress: string;
  amount: number;
  amountUsdt: number;
  expiresAt: number;
  instructions: string;
}

export interface VerifyRequest {
  paymentId: string;
  transactionHash: string;
}

export interface VerifyResponse {
  success: boolean;
  message: string;
  solana: {
    transactionHash: string;
    sender: string;
    amount: number;
    confirmations: number;
  };
  lunes: {
    transactionHash: string;
    blockNumber: number;
  };
}

export interface PaymentStatus {
  id: string;
  expectedAmount: number;
  lunesAccount: string;
  fiapoAmount: number;
  createdAt: number;
  expiresAt: number;
  status: 'pending' | 'expired' | 'completed';
}

class OracleClient {
  private baseUrl: string;

  constructor() {
    // Use local proxy instead of direct URL
    this.baseUrl = '';
  }

  /**
   * Check if the oracle service is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      const data = await response.json();
      return data.status === 'ok';
    } catch {
      return false;
    }
  }

  async createStakingPayment(request: StakingPaymentRequest): Promise<PaymentResponse> {
    const response = await fetch(`${this.baseUrl}${oraclePaymentCreatePath()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildOracleStakingPaymentCreatePayload(request)),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create staking payment');
    }

    return response.json();
  }

  async createNftMintPayment(request: NftMintPaymentRequest): Promise<PaymentResponse> {
    const response = await fetch(`${this.baseUrl}${oraclePaymentCreatePath()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildOracleNftMintPaymentCreatePayload(request)),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create NFT payment');
    }

    return response.json();
  }

  /**
   * Verify a payment and confirm on Lunes contract
   */
  async verifyPayment(request: VerifyRequest): Promise<VerifyResponse> {
    const response = await fetch(`${this.baseUrl}${oraclePaymentVerifyPath()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to verify payment');
    }

    return response.json();
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(paymentId: string): Promise<PaymentStatus> {
    const response = await fetch(`${this.baseUrl}${oraclePaymentStatusPath(paymentId)}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Payment not found');
    }

    return response.json();
  }

  /**
   * Calculate USDT amount for a given USD price
   * USDT has 6 decimals on Solana
   */
  usdToUsdtAtomic(usdAmount: number): number {
    return oracleUsdToAtomic(usdAmount);
  }

  /**
   * Convert USDT atomic units to USD display
   */
  usdtAtomicToUsd(atomicAmount: number): number {
    return atomicAmount / 1_000_000;
  }
}

export const oracleClient = new OracleClient();
