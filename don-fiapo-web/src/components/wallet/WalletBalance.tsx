"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { getNativeBalance } from '@/lib/api/contract';
import { useWalletStore } from '@/lib/stores';
import { useMissions } from '@/hooks/useMissions';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, QrCode, Copy, Check } from 'lucide-react';
import LunesLogo from '@/components/icons/LunesLogo';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function WalletBalance() {
    const { lunesAddress } = useWalletStore();
    const [lunesBalance, setLunesBalance] = useState<bigint>(BigInt(0));
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    // Fetch user's off-chain balance (FIAPO)
    const { score, loading: missionsLoading, fetchMissions } = useMissions(lunesAddress || undefined);

    useEffect(() => {
        if (!lunesAddress) return;

        const fetchBalances = async () => {
            setLoading(true);
            try {
                const native = await getNativeBalance(lunesAddress);
                setLunesBalance(native);
            } catch (err) {
                console.error('Failed to fetch balances:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchBalances();
        fetchMissions(); // also fetch FIAPO balance on load
        const interval = setInterval(() => {
            fetchBalances();
            fetchMissions();
        }, 10000);
        return () => clearInterval(interval);
    }, [lunesAddress, fetchMissions]);

    const formatLunes = (val: bigint) => (Number(val) / 10 ** 8).toLocaleString('en-US', {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4
    });

    const copyAddress = () => {
        if (lunesAddress) {
            navigator.clipboard.writeText(lunesAddress);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Lunes Balance */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <Card className="bg-card/50 backdrop-blur border-purple-500/30 hover:border-purple-500/50 transition-colors h-full">
                    <CardContent className="pt-6 relative">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-[#00F890]/10 flex items-center justify-center text-[#00F890]">
                                <LunesLogo size={28} />
                            </div>
                            <div className="text-sm text-muted-foreground">Native $Lunes</div>
                        </div>
                        <div className="text-3xl font-bold text-purple-400 flex items-baseline gap-2 mb-4">
                            {loading ? (
                                <Loader2 className="w-6 h-6 animate-spin" />
                            ) : (
                                formatLunes(lunesBalance)
                            )}
                            <span className="text-lg text-purple-300">$LUNES</span>
                        </div>

                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10">
                                    <QrCode className="w-4 h-4 mr-2" />
                                    Receive $Lunes
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-[#1E1E1E] border-purple-500/30 text-white">
                                <DialogHeader>
                                    <DialogTitle className="text-center text-purple-400">Receive Assets</DialogTitle>
                                </DialogHeader>
                                <div className="flex flex-col items-center py-6 space-y-4">
                                    {/* Placeholder for QR Code - In a real app use qrcode.react */}
                                    <div className="p-4 bg-white rounded-xl">
                                        <QrCode className="w-32 h-32 text-black" />
                                    </div>
                                    <div className="text-center space-y-2 w-full">
                                        <p className="text-sm text-gray-400">Your Lunes Address</p>
                                        <p className="text-xs text-muted-foreground mb-2">(Send only Lunes Chain assets to this address)</p>
                                        <div className="flex items-center gap-2 p-3 bg-black/40 rounded-lg border border-purple-500/20 w-full">
                                            <code className="text-xs text-gray-300 truncate flex-1 font-mono">
                                                {lunesAddress}
                                            </code>
                                            <Button variant="ghost" size="icon" onClick={copyAddress} className="h-6 w-6 shrink-0 text-purple-400">
                                                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </CardContent>
                </Card>
            </motion.div>

            {/* FIAPO Balance */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <Card className="bg-card/50 backdrop-blur border-golden/20 hover:border-golden/50 transition-colors h-full">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="relative w-10 h-10 rounded-full border border-golden/20 overflow-hidden shrink-0">
                                <Image
                                    src="/images/logo-round.png"
                                    alt="Don Fiapo Logo"
                                    fill
                                    sizes="40px"
                                    className="object-contain"
                                />
                            </div>
                            <div className="text-sm text-muted-foreground">$FIAPO Token</div>
                        </div>
                        <div className="text-3xl font-bold text-golden flex items-baseline gap-2 mb-4">
                            {missionsLoading && !score ? (
                                <Loader2 className="w-6 h-6 animate-spin" />
                            ) : (
                                score ? score.offchainScore.toLocaleString('en-US') : "0"
                            )}
                            <span className="text-lg text-golden/70">$FIAPO</span>
                        </div>

                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="border-golden/30 text-golden hover:bg-golden/10">
                                    <QrCode className="w-4 h-4 mr-2" />
                                    Receive $FIAPO
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-[#1E1E1E] border-golden/30 text-white">
                                <DialogHeader>
                                    <DialogTitle className="text-center text-golden">Receive $FIAPO</DialogTitle>
                                </DialogHeader>
                                <div className="flex flex-col items-center py-6 space-y-4">
                                    <div className="p-4 bg-white rounded-xl">
                                        <QrCode className="w-32 h-32 text-black" />
                                    </div>
                                    <div className="text-center space-y-2 w-full">
                                        <p className="text-sm text-gray-400">Your Lunes Address</p>
                                        <p className="text-xs text-muted-foreground mb-2">(Send only Lunes Chain assets)</p>
                                        <div className="flex items-center gap-2 p-3 bg-black/40 rounded-lg border border-golden/20 w-full">
                                            <code className="text-xs text-gray-300 truncate flex-1 font-mono">
                                                {lunesAddress}
                                            </code>
                                            <Button variant="ghost" size="icon" onClick={copyAddress} className="h-6 w-6 shrink-0 text-golden">
                                                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
