"use client";

import { useState, useCallback, useMemo } from 'react';
import { useWalletStore } from '@/lib/stores/wallet-store';

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

            // Call Oracle to create payment
            const response = await fetch(`${process.env.NEXT_PUBLIC_ORACLE_URL}/api/staking/create-payment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fiapoAmount,
                    feeAmount: paymentMethod === 'lusdt' ? feeResult.feeAmountLusdt : feeResult.feeAmountUsdt,
                    stakingType,
                    paymentMethod,
                    lunesAddress,
                    solanaAddress,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to create payment request');
            }

            const data = await response.json();

            const request: PaymentRequest = {
                id: data.paymentId,
                fiapoAmount,
                feeAmount: feeResult.feeAmountLusdt,
                stakingType,
                paymentMethod,
                recipientAddress: data.recipientAddress,
                status: 'pending',
                createdAt: Date.now(),
                expiresAt: Date.now() + 30 * 60 * 1000, // 30 minutes
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
     * Check payment status
     */
    const checkPaymentStatus = useCallback(async (paymentId: string): Promise<PaymentRequest['status']> => {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_ORACLE_URL}/api/staking/payment-status/${paymentId}`);

            if (!response.ok) {
                throw new Error('Failed to check payment status');
            }

            const data = await response.json();

            if (paymentRequest && paymentRequest.id === paymentId) {
                setPaymentRequest(prev => prev ? { ...prev, status: data.status } : null);
            }

            return data.status;
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
