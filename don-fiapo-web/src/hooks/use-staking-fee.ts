"use client";

import { useState, useCallback, useMemo } from 'react';
import { useWalletStore } from '@/lib/stores/wallet-store';
import { oracleClient } from '@/lib/api/oracle';
import { toStakingPaymentStatus } from '@/lib/api/oracle-payment';

// Entry fee tiers - matches contract fees/calculation.rs
const ENTRY_FEE_TIERS = [
    { maxAmount: 1_000, feePercent: 2 },      // 2% for up to 1,000 FIAPO
    { maxAmount: 10_000, feePercent: 1 },     // 1% for 1,001 - 10,000 FIAPO
    { maxAmount: 100_000, feePercent: 0.5 },  // 0.5% for 10,001 - 100,000 FIAPO
    { maxAmount: 500_000, feePercent: 0.25 }, // 0.25% for 100,001 - 500,000 FIAPO
    { maxAmount: Infinity, feePercent: 0.1 }, // 0.1% for 500,001+ FIAPO
];

// Fee distribution
export const FEE_DISTRIBUTION = {
    team: 10,      // 10% to team
    staking: 40,   // 40% to staking fund
    rewards: 50,   // 50% to rewards fund
};

export interface StakingFeeResult {
    fiapoAmount: number;
    feePercent: number;
    feeAmountLusdt: number;
    feeAmountUsdt: number;
    tier: string;
}

export interface PaymentRequest {
    id: string;
    fiapoAmount: number;
    feeAmount: number;
    stakingType: string;
    paymentMethod: 'lusdt' | 'usdt';
    recipientAddress: string;
    status: 'pending' | 'confirming' | 'confirmed' | 'failed';
    createdAt: number;
    expiresAt: number;
}

/**
 * Hook to calculate and manage staking entry fees
 */
export function useStakingFee() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);
    const { lunesAddress, solanaAddress } = useWalletStore();

    /**
     * Calculate entry fee based on FIAPO amount
     */
    const calculateEntryFee = useCallback((fiapoAmount: number): StakingFeeResult => {
        // Find applicable tier
        let feePercent = ENTRY_FEE_TIERS[0].feePercent;
        let tier = "Tier 1";

        for (let i = 0; i < ENTRY_FEE_TIERS.length; i++) {
            if (fiapoAmount <= ENTRY_FEE_TIERS[i].maxAmount) {
                feePercent = ENTRY_FEE_TIERS[i].feePercent;
                tier = `Tier ${i + 1}`;
                break;
            }
        }

        // Calculate fee amount (LUSDT and USDT are 1:1)
        const feeAmount = fiapoAmount * (feePercent / 100);

        return {
            fiapoAmount,
            feePercent,
            feeAmountLusdt: feeAmount,
            feeAmountUsdt: feeAmount,
            tier,
        };
    }, []);

    /**
     * Create a payment request via Oracle
     */
    const createPaymentRequest = useCallback(async (
        fiapoAmount: number,
        stakingType: string,
        paymentMethod: 'lusdt' | 'usdt'
    ): Promise<PaymentRequest> => {
        setLoading(true);
        setError(null);

        try {
            const feeResult = calculateEntryFee(fiapoAmount);
            const feeAmount = paymentMethod === 'lusdt' ? feeResult.feeAmountLusdt : feeResult.feeAmountUsdt;

            if (!lunesAddress) {
                throw new Error('Lunes wallet not connected');
            }

            if (paymentMethod === 'usdt' && !solanaAddress) {
                throw new Error('Solana wallet not connected');
            }

            if (paymentMethod !== 'usdt') {
                throw new Error('LUSDT payment verification is not connected yet');
            }

            if (!solanaAddress) {
                throw new Error('Solana wallet not connected');
            }

            const data = await oracleClient.createStakingPayment({
                lunesAccount: lunesAddress,
                stakingType,
                paymentMethod,
                fiapoAmount,
                expectedSender: solanaAddress,
            });

            const request: PaymentRequest = {
                id: data.paymentId,
                fiapoAmount,
                feeAmount,
                stakingType,
                paymentMethod,
                recipientAddress: data.payToAddress,
                status: 'pending',
                createdAt: Date.now(),
                expiresAt: data.expiresAt,
            };

            setPaymentRequest(request);
            return request;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to create payment';
            setError(message);
            throw new Error(message);
        } finally {
            setLoading(false);
        }
    }, [lunesAddress, solanaAddress, calculateEntryFee]);

    /**
     * Verify a payment after the user submits the Solana transaction hash
     */
    const verifyPayment = useCallback(async (paymentId: string, transactionHash: string): Promise<boolean> => {
        setLoading(true);
        setError(null);

        try {
            if (!transactionHash.trim()) {
                throw new Error('Transaction hash is required');
            }

            setPaymentRequest(prev => prev && prev.id === paymentId ? { ...prev, status: 'confirming' } : prev);

            const result = await oracleClient.verifyPayment({ paymentId, transactionHash: transactionHash.trim() });
            if (!result.success) {
                throw new Error(result.message || 'Payment verification failed');
            }

            setPaymentRequest(prev => prev && prev.id === paymentId ? { ...prev, status: 'confirmed' } : prev);
            return true;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to verify payment';
            setError(message);
            setPaymentRequest(prev => prev && prev.id === paymentId ? { ...prev, status: 'failed' } : prev);
            throw new Error(message);
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Check payment status
     */
    const checkPaymentStatus = useCallback(async (paymentId: string): Promise<PaymentRequest['status']> => {
        try {
            const data = await oracleClient.getPaymentStatus(paymentId);
            const status = toStakingPaymentStatus(data);

            if (paymentRequest && paymentRequest.id === paymentId) {
                setPaymentRequest(prev => prev ? { ...prev, status } : null);
            }

            return status;
        } catch (err) {
            console.error('Failed to check payment status:', err);
            return 'pending';
        }
    }, [paymentRequest]);

    /**
     * Cancel payment request
     */
    const cancelPayment = useCallback(() => {
        setPaymentRequest(null);
        setError(null);
    }, []);

    /**
     * Get fee tier info for display
     */
    const feeTiers = useMemo(() => ENTRY_FEE_TIERS.map((tier, i) => ({
        ...tier,
        label: i === 0
            ? `Up to ${tier.maxAmount.toLocaleString()} FIAPO`
            : i === ENTRY_FEE_TIERS.length - 1
                ? `Above ${ENTRY_FEE_TIERS[i - 1].maxAmount.toLocaleString()} FIAPO`
                : `${(ENTRY_FEE_TIERS[i - 1].maxAmount + 1).toLocaleString()} - ${tier.maxAmount.toLocaleString()} FIAPO`
    })), []);

    return {
        calculateEntryFee,
        createPaymentRequest,
        verifyPayment,
        checkPaymentStatus,
        cancelPayment,
        paymentRequest,
        feeTiers,
        feeDistribution: FEE_DISTRIBUTION,
        loading,
        error,
    };
}

export default useStakingFee;
