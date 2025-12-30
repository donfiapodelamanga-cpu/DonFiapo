"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, CheckCircle, AlertCircle, Copy, ExternalLink, Wallet, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useStakingFee, StakingFeeResult } from '@/hooks/use-staking-fee';
import { useToast } from '@/components/ui/toast';

interface StakingPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPaymentConfirmed: (paymentId: string) => void;
    fiapoAmount: number;
    stakingType: string;
    stakingTypeName: string;
}

type PaymentMethod = 'lusdt' | 'usdt';
type Step = 'select-method' | 'awaiting-payment' | 'confirming' | 'confirmed' | 'failed';

export function StakingPaymentModal({
    isOpen,
    onClose,
    onPaymentConfirmed,
    fiapoAmount,
    stakingType,
    stakingTypeName,
}: StakingPaymentModalProps) {
    const [step, setStep] = useState<Step>('select-method');
    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
    const [feeResult, setFeeResult] = useState<StakingFeeResult | null>(null);
    const [copied, setCopied] = useState(false);

    const { addToast } = useToast();
    const {
        calculateEntryFee,
        createPaymentRequest,
        checkPaymentStatus,
        cancelPayment,
        paymentRequest,
        loading,
        error,
    } = useStakingFee();

    // Calculate fee on mount
    useEffect(() => {
        if (isOpen && fiapoAmount > 0) {
            const result = calculateEntryFee(fiapoAmount);
            setFeeResult(result);
        }
    }, [isOpen, fiapoAmount, calculateEntryFee]);

    // Poll for payment status
    useEffect(() => {
        if (step !== 'awaiting-payment' || !paymentRequest) return;

        const interval = setInterval(async () => {
            const status = await checkPaymentStatus(paymentRequest.id);

            if (status === 'confirming') {
                setStep('confirming');
            } else if (status === 'confirmed') {
                setStep('confirmed');
                clearInterval(interval);
            } else if (status === 'failed') {
                setStep('failed');
                clearInterval(interval);
            }
        }, 5000); // Check every 5 seconds

        return () => clearInterval(interval);
    }, [step, paymentRequest, checkPaymentStatus]);

    // Handle method selection
    const handleSelectMethod = async (method: PaymentMethod) => {
        setSelectedMethod(method);

        try {
            await createPaymentRequest(fiapoAmount, stakingType, method);
            setStep('awaiting-payment');
        } catch (err) {
            addToast('error', 'Payment Error', err instanceof Error ? err.message : 'Failed to create payment');
        }
    };

    // Handle copy address
    const handleCopyAddress = () => {
        if (paymentRequest?.recipientAddress) {
            navigator.clipboard.writeText(paymentRequest.recipientAddress);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // Handle payment confirmed
    const handleConfirmed = () => {
        if (paymentRequest) {
            onPaymentConfirmed(paymentRequest.id);
            onClose();
        }
    };

    // Reset on close
    const handleClose = () => {
        setStep('select-method');
        setSelectedMethod(null);
        cancelPayment();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                onClick={handleClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-md"
                >
                    <Card className="bg-background border-border">
                        <CardHeader className="relative">
                            <button
                                onClick={handleClose}
                                className="absolute right-4 top-4 p-2 hover:bg-muted rounded-lg transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                            <CardTitle className="text-xl">Staking Entry Fee</CardTitle>
                            <CardDescription>
                                Pay the entry fee to stake {fiapoAmount.toLocaleString()} FIAPO in {stakingTypeName}
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-6">
                            {/* Fee Summary */}
                            {feeResult && (
                                <div className="bg-golden/10 border border-golden/30 rounded-xl p-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-muted-foreground">Amount to Stake</span>
                                        <span className="font-bold">{fiapoAmount.toLocaleString()} FIAPO</span>
                                    </div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-muted-foreground">Fee Rate ({feeResult.tier})</span>
                                        <span className="font-medium">{feeResult.feePercent}%</span>
                                    </div>
                                    <div className="border-t border-golden/30 pt-2 mt-2">
                                        <div className="flex justify-between items-center">
                                            <span className="font-medium">Entry Fee</span>
                                            <span className="text-xl font-bold text-golden">
                                                {feeResult.feeAmountLusdt.toLocaleString()} LUSDT
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step: Select Payment Method */}
                            {step === 'select-method' && (
                                <div className="space-y-3">
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Select your preferred payment method:
                                    </p>
                                    <button
                                        onClick={() => handleSelectMethod('lusdt')}
                                        disabled={loading}
                                        className="w-full p-4 rounded-xl border border-border hover:border-golden bg-card transition-colors flex items-center gap-4"
                                    >
                                        <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                                            <Wallet className="w-6 h-6 text-blue-400" />
                                        </div>
                                        <div className="text-left flex-1">
                                            <p className="font-medium">LUSDT (Lunes Network)</p>
                                            <p className="text-sm text-muted-foreground">Pay directly from your Lunes wallet</p>
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => handleSelectMethod('usdt')}
                                        disabled={loading}
                                        className="w-full p-4 rounded-xl border border-border hover:border-golden bg-card transition-colors flex items-center gap-4"
                                    >
                                        <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                                            <DollarSign className="w-6 h-6 text-green-400" />
                                        </div>
                                        <div className="text-left flex-1">
                                            <p className="font-medium">USDT (Solana Network)</p>
                                            <p className="text-sm text-muted-foreground">Pay from your Solana wallet</p>
                                        </div>
                                    </button>
                                </div>
                            )}

                            {/* Step: Awaiting Payment */}
                            {step === 'awaiting-payment' && paymentRequest && (
                                <div className="space-y-4">
                                    <div className="text-center py-4">
                                        <Loader2 className="w-12 h-12 text-golden animate-spin mx-auto mb-4" />
                                        <p className="font-medium">Waiting for payment...</p>
                                        <p className="text-sm text-muted-foreground">
                                            Send exactly {feeResult?.feeAmountLusdt.toLocaleString()} {selectedMethod?.toUpperCase()} to:
                                        </p>
                                    </div>

                                    <div className="bg-card rounded-xl p-4">
                                        <div className="flex items-center justify-between gap-2">
                                            <code className="text-xs break-all flex-1">
                                                {paymentRequest.recipientAddress}
                                            </code>
                                            <button
                                                onClick={handleCopyAddress}
                                                className="p-2 hover:bg-muted rounded-lg transition-colors"
                                            >
                                                {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    <p className="text-xs text-muted-foreground text-center">
                                        Payment expires in {Math.ceil((paymentRequest.expiresAt - Date.now()) / 60000)} minutes
                                    </p>
                                </div>
                            )}

                            {/* Step: Confirming */}
                            {step === 'confirming' && (
                                <div className="text-center py-8">
                                    <Loader2 className="w-12 h-12 text-golden animate-spin mx-auto mb-4" />
                                    <p className="font-medium">Payment received!</p>
                                    <p className="text-sm text-muted-foreground">
                                        Confirming transaction on blockchain...
                                    </p>
                                </div>
                            )}

                            {/* Step: Confirmed */}
                            {step === 'confirmed' && (
                                <div className="text-center py-8">
                                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                                    <p className="font-medium text-lg">Payment Confirmed!</p>
                                    <p className="text-sm text-muted-foreground">
                                        Your stake is now being processed.
                                    </p>
                                </div>
                            )}

                            {/* Step: Failed */}
                            {step === 'failed' && (
                                <div className="text-center py-8">
                                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                                    <p className="font-medium text-lg">Payment Failed</p>
                                    <p className="text-sm text-muted-foreground">
                                        {error || 'Transaction could not be verified. Please try again.'}
                                    </p>
                                </div>
                            )}
                        </CardContent>

                        <CardFooter className="flex gap-3">
                            {step === 'confirmed' ? (
                                <Button className="w-full" onClick={handleConfirmed}>
                                    Complete Staking
                                </Button>
                            ) : step === 'failed' ? (
                                <>
                                    <Button variant="outline" className="flex-1" onClick={handleClose}>
                                        Cancel
                                    </Button>
                                    <Button className="flex-1" onClick={() => setStep('select-method')}>
                                        Try Again
                                    </Button>
                                </>
                            ) : (
                                <Button variant="outline" className="w-full" onClick={handleClose}>
                                    Cancel
                                </Button>
                            )}
                        </CardFooter>
                    </Card>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

export default StakingPaymentModal;
