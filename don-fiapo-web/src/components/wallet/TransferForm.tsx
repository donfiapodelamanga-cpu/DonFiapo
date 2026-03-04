"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { transferNative } from '@/lib/api/contract';
import { useWalletStore } from '@/lib/stores';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Send, Loader2, CheckCircle, XCircle } from 'lucide-react';
import LunesLogo from '@/components/icons/LunesLogo';

export default function TransferForm() {
    const { lunesAddress } = useWalletStore();
    const [asset, setAsset] = useState<'lunes' | 'fiapo'>('lunes');
    const [recipient, setRecipient] = useState('');
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');

    const handleTransfer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!lunesAddress) return;

        setLoading(true);
        setStatus('idle');
        setErrorMsg('');

        try {
            const amountBig = BigInt(Math.floor(Number(amount) * 10 ** 8));

            let txHash = '';
            if (asset === 'lunes') {
                txHash = await transferNative(lunesAddress, recipient, amountBig);
            } else {
                // FIAPO transfer requires PSP22 contract integration
                throw new Error('FIAPO transfer not yet available');
            }

            console.log('Transfer success:', txHash);
            setStatus('success');
            setRecipient('');
            setAmount('');

            // Save local history
            saveLocalHistory(asset, recipient, amount, txHash);

        } catch (err: any) {
            console.error('Transfer failed:', err);
            setStatus('error');
            setErrorMsg(err.message || 'Transfer failed');
        } finally {
            setLoading(false);
        }
    };

    const saveLocalHistory = (asset: string, to: string, amt: string, hash: string) => {
        try {
            if (!lunesAddress) return;
            const key = `wallet_history_${lunesAddress}`;
            const existing = JSON.parse(localStorage.getItem(key) || '[]');
            const newRecord = {
                type: 'Sent',
                asset: asset.toUpperCase(),
                amount: amt,
                to: to,
                hash: hash,
                timestamp: Date.now()
            };
            localStorage.setItem(key, JSON.stringify([newRecord, ...existing].slice(0, 50)));
        } catch (e) {
            console.warn('Failed to save history', e);
        }
    };

    return (
        <Card className="bg-card/50 backdrop-blur border-purple-500/20">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Send className="w-5 h-5 text-purple-400" />
                    <h3 className="text-xl font-bold">Send Assets</h3>
                </div>
            </CardHeader>
            <CardContent>
                <form
                    onSubmit={handleTransfer}
                    className="space-y-4"
                    {...{
                        "to-name": "transferAssets",
                        "to-description": "Transfer LUNES or FIAPO tokens to another wallet",
                        "to-auto-submit": "true"
                    } as any}
                >
                    {/* Asset Selector */}
                    <div className="flex gap-2 p-1 bg-background/50 rounded-lg">
                        <button
                            type="button"
                            onClick={() => setAsset('lunes')}
                            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${asset === 'lunes'
                                ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            <LunesLogo size={20} /> $Lunes
                        </button>
                        <button
                            type="button"
                            onClick={() => setAsset('fiapo')}
                            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${asset === 'fiapo'
                                ? 'bg-golden text-background shadow-lg shadow-golden/20'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            <div className="relative w-5 h-5 rounded-full overflow-hidden">
                                <Image
                                    src="/images/logo-round.png"
                                    alt="Logo"
                                    fill
                                    sizes="20px"
                                    className="object-contain"
                                />
                            </div>
                            $FIAPO
                        </button>
                    </div>

                    {/* Recipient */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Recipient Address</label>
                        <input
                            type="text"
                            required
                            value={recipient}
                            onChange={(e) => setRecipient(e.target.value)}
                            className="w-full bg-background border border-golden/30 rounded-lg px-4 py-3 focus:outline-none focus:border-golden transition-colors"
                            placeholder="5..."
                            {...{ "to-param-title": "recipientAddress" } as any}
                        />
                    </div>

                    {/* Amount */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Amount</label>
                        <input
                            type="number"
                            required
                            step="0.0001"
                            min="0"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full bg-background border border-golden/30 rounded-lg px-4 py-3 focus:outline-none focus:border-golden transition-colors"
                            placeholder="0.00"
                            {...{ "to-param-title": "amountToTransfer" } as any}
                        />
                    </div>

                    {/* Submit */}
                    <Button
                        type="submit"
                        disabled={loading || !lunesAddress}
                        className="w-full"
                        size="lg"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4 mr-2" />
                                Send Now
                            </>
                        )}
                    </Button>

                    {/* Status Messages */}
                    {status === 'success' && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-3 bg-green-500/10 border border-green-500/30 text-green-400 rounded-lg text-sm flex items-center gap-2"
                        >
                            <CheckCircle className="w-4 h-4" />
                            Transfer successful!
                        </motion.div>
                    )}
                    {status === 'error' && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm flex items-center gap-2"
                        >
                            <XCircle className="w-4 h-4" />
                            {errorMsg}
                        </motion.div>
                    )}
                </form>
            </CardContent>
        </Card>
    );
}
