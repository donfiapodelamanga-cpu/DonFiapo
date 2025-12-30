/**
 * Oracle Service API Client
 * 
 * Handles communication with the Oracle service for Solana payment verification
 */

import { API_CONFIG } from './config';

export interface PaymentRequest {
  lunesAccount: string;
  fiapoAmount: number;
  expectedAmount: number; // in USDT atomic units (6 decimals)
  expectedSender?: string;
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
    this.baseUrl = '/api/oracle';
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

  /**
   * Create a pending payment request
   */
  async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
    const response = await fetch(`${this.baseUrl}/api/payment/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create payment');
    }

    return response.json();
  }

  /**
   * Verify a payment and confirm on Lunes contract
   */
  async verifyPayment(request: VerifyRequest): Promise<VerifyResponse> {
    const response = await fetch(`${this.baseUrl}/api/payment/verify`, {
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
    const response = await fetch(`${this.baseUrl}/api/payment/${paymentId}`);

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
    return Math.floor(usdAmount * 1_000_000);
  }

  /**
   * Convert USDT atomic units to USD display
   */
  usdtAtomicToUsd(atomicAmount: number): number {
    return atomicAmount / 1_000_000;
  }
}

export const oracleClient = new OracleClient();
