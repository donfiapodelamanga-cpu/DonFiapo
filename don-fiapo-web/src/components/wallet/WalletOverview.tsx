"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useWalletStore } from '@/lib/stores';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import WalletBalance from '@/components/wallet/WalletBalance';
import TransferForm from '@/components/wallet/TransferForm';
import { Clock, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

export default function WalletOverview() {
    const { lunesAddress } = useWalletStore();
    const [history, setHistory] = useState<any[]>([]);

    // Load history from local storage
    useEffect(() => {
        if (!lunesAddress) return;
        const loadHistory = () => {
            const key = `wallet_history_${lunesAddress}`;
            const stored = localStorage.getItem(key);
            if (stored) {
                setHistory(JSON.parse(stored));
            }
        };

        loadHistory();
        const interval = setInterval(loadHistory, 2000);
        return () => clearInterval(interval);
    }, [lunesAddress]);

    return (
        <div className="space-y-8">
            {/* Balances */}
            <WalletBalance />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Transfer Form */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <TransferForm />
                </motion.div>

                {/* Recent Activity */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <Card className="bg-card/50 backdrop-blur border-golden/20">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Clock className="w-5 h-5 text-golden" />
                                <h3 className="text-xl font-bold">Recent Activity</h3>
                                <span className="text-xs text-muted-foreground">(Local Session)</span>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {history.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                        <p>No recent transactions found.</p>
                                        <p className="text-xs mt-1">Transactions will appear here after you send assets.</p>
                                    </div>
                                ) : (
                                    history.slice(0, 5).map((tx, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-golden/10 hover:border-golden/30 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'Sent'
                                                        ? 'bg-red-500/20 text-red-400'
                                                        : 'bg-green-500/20 text-green-400'
                                                    }`}>
                                                    {tx.type === 'Sent' ? (
                                                        <ArrowUpRight className="w-5 h-5" />
                                                    ) : (
                                                        <ArrowDownLeft className="w-5 h-5" />
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-medium">{tx.type} {tx.asset}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {new Date(tx.timestamp).toLocaleString()}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className={`font-mono font-bold ${tx.type === 'Sent' ? 'text-red-400' : 'text-green-400'
                                                    }`}>
                                                    {tx.type === 'Sent' ? '-' : '+'}{tx.amount}
                                                </div>
                                                <div className="text-xs text-muted-foreground truncate w-20" title={tx.hash}>
                                                    {tx.hash?.slice(0, 6)}...{tx.hash?.slice(-4)}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </div>
    );
}
