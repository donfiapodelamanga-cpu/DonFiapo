"use client";

import { useState, useCallback } from 'react';
import { useWalletStore } from '@/lib/stores/wallet-store';
import { oracleClient, PaymentResponse } from '@/lib/api/oracle';
import { API_CONFIG } from '@/lib/api/config';

export type PaymentStatus = 'idle' | 'creating' | 'waiting' | 'verifying' | 'confirmed' | 'error';

interface UsePaymentOptions {
  onSuccess?: (txHash: string) => void;
  onError?: (error: string) => void;
}

/**
 * Hook for handling USDT payments via Solana
 */
export function usePayment(options?: UsePaymentOptions) {
  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [payment, setPayment] = useState<PaymentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { lunesAddress, lunesConnected } = useWalletStore();

  /**
   * Create a new payment request
   */
  const createPayment = useCallback(async (usdAmount: number, fiapoAmount: number) => {
    if (!lunesConnected || !lunesAddress) {
      throw new Error('Wallet not connected');
    }

    setStatus('creating');
    setError(null);

    try {
      const response = await oracleClient.createPayment({
        lunesAccount: lunesAddress,
        fiapoAmount,
        expectedAmount: oracleClient.usdToUsdtAtomic(usdAmount),
      });

      setPayment(response);
      setStatus('waiting');
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create payment';
      setError(message);
      setStatus('error');
      options?.onError?.(message);
      throw new Error(message);
    }
  }, [lunesAddress, lunesConnected, options]);

  /**
   * Verify a payment after user has sent USDT
   */
  const verifyPayment = useCallback(async (transactionHash: string) => {
    if (!payment) {
      throw new Error('No pending payment');
    }

    setStatus('verifying');
    setError(null);

    try {
      const result = await oracleClient.verifyPayment({
        paymentId: payment.paymentId,
        transactionHash,
      });

      if (result.success) {
        setStatus('confirmed');
        options?.onSuccess?.(result.lunes.transactionHash);
        return result;
      } else {
        throw new Error('Payment verification failed');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to verify payment';
      setError(message);
      setStatus('error');
      options?.onError?.(message);
      throw new Error(message);
    }
  }, [payment, options]);

  /**
   * Check current payment status
   */
  const checkStatus = useCallback(async () => {
    if (!payment) return null;

    try {
      return await oracleClient.getPaymentStatus(payment.paymentId);
    } catch {
      return null;
    }
  }, [payment]);

  /**
   * Reset the payment state
   */
  const reset = useCallback(() => {
    setStatus('idle');
    setPayment(null);
    setError(null);
  }, []);

  /**
   * Calculate NFT purchase amount
   */
  const calculateNFTPrice = (tierId: number, quantity: number) => {
    const tier = API_CONFIG.nftTiers.find(t => t.id === tierId);
    if (!tier) throw new Error('Invalid tier');
    return tier.price * quantity;
  };

  return {
    status,
    payment,
    error,
    createPayment,
    verifyPayment,
    checkStatus,
    reset,
    calculateNFTPrice,
    isProcessing: ['creating', 'verifying'].includes(status),
    isWaiting: status === 'waiting',
    isConfirmed: status === 'confirmed',
    hasError: status === 'error',
  };
}

/**
 * Hook for NFT minting with payment
 */
export function useMintNFT() {
  const payment = usePayment();
  const [mintedTokenId, setMintedTokenId] = useState<number | null>(null);

  const mintNFT = useCallback(async (tierId: number, quantity: number) => {
    const price = payment.calculateNFTPrice(tierId, quantity);
    const fiapoAmount = API_CONFIG.nftTiers[tierId].totalMining * quantity;

    // Create payment request
    const paymentResponse = await payment.createPayment(price, fiapoAmount);
    
    return {
      paymentId: paymentResponse.paymentId,
      payToAddress: paymentResponse.payToAddress,
      amount: paymentResponse.amountUsdt,
      instructions: paymentResponse.instructions,
    };
  }, [payment]);

  const confirmMint = useCallback(async (transactionHash: string) => {
    const result = await payment.verifyPayment(transactionHash);
    
    // After payment is confirmed, the oracle will trigger the mint on the contract
    // The token ID will be emitted in an event
    // For now, we just return the confirmation
    
    return result;
  }, [payment]);

  return {
    ...payment,
    mintedTokenId,
    mintNFT,
    confirmMint,
  };
}
