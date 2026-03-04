"use client";

import { useState, useEffect } from "react";
import { Crown, Settings, Save, AlertTriangle, CheckCircle2, Loader2, TrendingUp, Users, DollarSign, Vote, ShoppingBag, Layers, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { useWalletStore } from "@/lib/stores";
import { useToast } from "@/components/ui/toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatAddress } from "@/lib/utils/format";
import {
    useAffiliateInfo,
    useReferrals,
    formatAffiliateBalance,
} from "@/hooks/use-affiliate";
import { useSolana } from "@/hooks/useSolana";
import type { NobleInfo } from "@/hooks/use-noble-status";
import LunesLogo from "@/components/icons/LunesLogo";

// Revenue source definitions — shows only the Parceiro's commission %
const REVENUE_SOURCES = [
    { id: 'ico', name: 'ICO (NFT Sales)', fee: '7%', icon: Layers, color: 'text-purple-500' },
    { id: 'marketplace', name: 'Marketplace Fees', fee: '10%', icon: ShoppingBag, color: 'text-blue-500' },
    { id: 'staking', name: 'Staking Entry Fees', fee: '5%', icon: TrendingUp, color: 'text-green-500' },
    { id: 'gov', name: 'Governance (Proposals/Votes)', fee: '5%', icon: Vote, color: 'text-orange-500' },
];

interface NobleDashboardProps {
    /** If true, renders without the outer page wrapper (for embedding in tabs) */
    embedded?: boolean;
    /** Noble info from the DB (registered by commercial team) */
    nobleInfo?: NobleInfo | null;
}

export default function NobleDashboard({ embedded = false, nobleInfo }: NobleDashboardProps) {
    const { addToast } = useToast();
    const { lunesConnected, lunesAddress } = useWalletStore();
    const solana = useSolana();

    const [loading, setLoading] = useState(false);
    const [solanaWallet, setSolanaWallet] = useState(nobleInfo?.solanaWallet || "");

    // Load saved Solana wallet from DB on mount
    useEffect(() => {
        if (!lunesAddress) return;
        fetch(`/api/user/wallet?lunesAddress=${encodeURIComponent(lunesAddress)}`)
            .then(res => res.json())
            .then(data => {
                if (data.solanaWallet) setSolanaWallet(data.solanaWallet);
            })
            .catch(() => {});
    }, [lunesAddress]);

    // Real data hooks
    const { info, loading: infoLoading } = useAffiliateInfo(lunesAddress, { autoRefresh: true });
    const { referrals, loading: referralsLoading } = useReferrals(lunesAddress);

    const handleSave = async () => {
        if (!solanaWallet) {
            addToast("error", "Error", "Solana Wallet Address is required.");
            return;
        }
        setLoading(true);
        try {
            const res = await fetch("/api/user/wallet", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ lunesAddress, solanaWallet }),
            });
            if (res.ok) {
                addToast("success", "Saved", "Solana wallet configured successfully.");
            } else {
                const err = await res.json().catch(() => ({}));
                addToast("error", "Error", err.error || "Failed to save wallet.");
            }
        } catch {
            addToast("error", "Error", "Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (!lunesConnected) {
        return (
            <div className={embedded ? "py-12" : "min-h-screen pt-32 pb-16"} >
                <div className="flex flex-col items-center justify-center">
                    <Crown className="w-16 h-16 text-golden mb-4 opacity-50" />
                    <h1 className="text-2xl font-bold mb-2">Order of Nobles</h1>
                    <p className="text-muted-foreground mb-6">Connect your wallet to access the transparency dashboard.</p>
                </div>
            </div>
        );
    }

    const pendingFiapo = info?.pendingRewards || BigInt(0);
    const totalReferrals = info?.totalReferrals || 0;

    const content = (
        <div className={embedded ? "" : "container mx-auto px-4 max-w-6xl"}>

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-full bg-golden/20 ring-1 ring-golden">
                            <Crown className="w-6 h-6 text-golden" />
                        </div>
                        <h2 className={embedded ? "text-2xl font-bold font-display text-golden" : "text-3xl font-bold font-display text-golden"}>
                            Noble Dashboard
                        </h2>
                        {nobleInfo && (
                            <span className="px-2 py-0.5 text-xs font-bold rounded bg-golden/10 text-golden border border-golden/20">
                                {nobleInfo.tier}
                            </span>
                        )}
                    </div>
                    <p className="text-muted-foreground text-sm">
                        {nobleInfo ? (
                            <>Welcome, <span className="text-foreground font-semibold">{nobleInfo.name}</span> — <span className="font-mono text-xs">{formatAddress(lunesAddress || "")}</span></>
                        ) : (
                            <>Welcome, <span className="text-foreground font-mono">{formatAddress(lunesAddress || "")}</span>. Here is your financial transparency report.</>
                        )}
                    </p>
                </div>

                <div className="flex items-center gap-4 bg-card p-3 rounded-xl border border-border">
                    <div className="text-right">
                        <p className="text-xs text-muted-foreground">Noble Contract</p>
                        <div className="flex items-center justify-end gap-2 text-yellow-400 text-sm font-bold">
                            <Clock className="w-3 h-3" />
                            Pending Deployment
                        </div>
                    </div>
                </div>
            </div>

            <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="bg-card border border-border">
                    <TabsTrigger value="overview">Overview & Revenue</TabsTrigger>
                    <TabsTrigger value="referrals">Referrals</TabsTrigger>
                    <TabsTrigger value="settings">Settings & Wallets</TabsTrigger>
                </TabsList>

                {/* OVERVIEW TAB */}
                <TabsContent value="overview" className="space-y-6">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card className="bg-card border-golden/20">
                            <CardContent className="pt-6">
                                <div className="flex justify-between items-start mb-2">
                                    <p className="text-sm text-muted-foreground">Pending FIAPO</p>
                                    <Crown className="w-4 h-4 text-golden" />
                                </div>
                                <h3 className="text-2xl font-bold text-white">
                                    {infoLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : formatAffiliateBalance(pendingFiapo)}
                                </h3>
                                <p className="text-xs text-golden mt-1">FIAPO</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-card border-golden/20">
                            <CardContent className="pt-6">
                                <div className="flex justify-between items-start mb-2">
                                    <p className="text-sm text-muted-foreground">Pending USDT</p>
                                    <DollarSign className="w-4 h-4 text-green-500" />
                                </div>
                                <h3 className="text-2xl font-bold text-white">$0.00</h3>
                                <p className="text-xs text-muted-foreground mt-1">Available after contract deployment</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-card border-golden/20">
                            <CardContent className="pt-6">
                                <div className="flex justify-between items-start mb-2">
                                    <p className="text-sm text-muted-foreground">Pending LUNES</p>
                                    <span className="text-[#00F890]"><LunesLogo size={18} /></span>
                                </div>
                                <h3 className="text-2xl font-bold text-white">0</h3>
                                <p className="text-xs text-muted-foreground mt-1">Available after contract deployment</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-card border-golden/20">
                            <CardContent className="pt-6">
                                <div className="flex justify-between items-start mb-2">
                                    <p className="text-sm text-muted-foreground">Total Referrals</p>
                                    <Users className="w-4 h-4 text-muted-foreground" />
                                </div>
                                <h3 className="text-2xl font-bold text-white">
                                    {infoLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : totalReferrals}
                                </h3>
                                <p className="text-xs text-muted-foreground mt-1">From affiliate contract</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Revenue Source Structure */}
                    <Card className="bg-card">
                        <CardHeader>
                            <CardTitle>Revenue Sources</CardTitle>
                            <CardDescription>Fee structure for Noble revenue sharing. Earnings will appear once contracts are deployed.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {REVENUE_SOURCES.map((source) => (
                                    <div key={source.id} className="flex items-center justify-between p-4 rounded-lg bg-background/40 border border-border/50">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-3 rounded-lg bg-background`}>
                                                <source.icon className={`w-5 h-5 ${source.color}`} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-sm">{source.name}</h4>
                                                <span className="text-xs px-2 py-0.5 rounded bg-golden/10 text-golden border border-golden/20">
                                                    Fee: {source.fee}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-muted-foreground">—</p>
                                            <p className="text-xs text-muted-foreground">No data yet</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-6 p-4 rounded-lg bg-yellow-500/5 border border-yellow-500/20 text-center">
                                <Clock className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
                                <p className="text-sm text-yellow-400 font-medium">Revenue tracking coming soon</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Detailed per-source earnings will be available once Noble contracts are deployed on-chain.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* REFERRALS TAB */}
                <TabsContent value="referrals">
                    <Card className="bg-card">
                        <CardHeader>
                            <CardTitle>Your Referrals</CardTitle>
                            <CardDescription>Users referred via the affiliate contract.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {referralsLoading ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="w-8 h-8 animate-spin text-golden" />
                                </div>
                            ) : referrals.length === 0 ? (
                                <div className="text-center py-12">
                                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                                    <p className="text-muted-foreground font-medium">No referrals yet</p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Share your referral link on the Affiliate page to start earning rewards.
                                    </p>
                                </div>
                            ) : (
                                <div className="rounded-md border border-border">
                                    <div className="grid grid-cols-4 gap-4 p-4 border-b border-border bg-muted/50 font-bold text-sm">
                                        <div>Address</div>
                                        <div>Joined</div>
                                        <div>Level</div>
                                        <div className="text-right">Status</div>
                                    </div>
                                    <div className="divide-y divide-border">
                                        {referrals.map((ref, i) => (
                                            <div key={i} className="grid grid-cols-4 gap-4 p-4 text-sm items-center hover:bg-muted/20 transition-colors">
                                                <div className="font-mono text-muted-foreground">{formatAddress(ref.address, 6)}</div>
                                                <div>{new Date(ref.joinedAt).toLocaleDateString()}</div>
                                                <div>
                                                    <span className={`px-2 py-0.5 rounded-full text-xs border ${
                                                        ref.level === 1 
                                                            ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' 
                                                            : 'bg-purple-500/10 text-purple-500 border-purple-500/20'
                                                    }`}>
                                                        Level {ref.level}
                                                    </span>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`w-2 h-2 inline-block rounded-full mr-1 ${ref.isActive ? 'bg-green-500' : 'bg-gray-500'}`} />
                                                    {ref.isActive ? 'Active' : 'Inactive'}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* SETTINGS TAB */}
                <TabsContent value="settings">
                    <Card className="bg-card">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Settings className="text-golden" />
                                Payout Configuration
                            </CardTitle>
                            <CardDescription>
                                Verify your wallet addresses to ensure you receive the 3-currency basket.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                {/* LUNES CARD */}
                                <div className="p-4 rounded-lg bg-background/50 border border-border flex flex-col items-center text-center">
                                    <div className="w-10 h-10 rounded-full bg-[#00F890]/10 flex items-center justify-center text-[#00F890] mb-2">
                                        <LunesLogo size={28} />
                                    </div>
                                    <h3 className="font-bold">LUNES</h3>
                                    <p className="text-xs text-muted-foreground">Network Fee & Market</p>
                                    <div className="mt-2 flex items-center text-xs text-green-500">
                                        <CheckCircle2 className="w-3 h-3 mr-1" /> Connected
                                    </div>
                                </div>
                                {/* FIAPO CARD */}
                                <div className="p-4 rounded-lg bg-background/50 border border-border flex flex-col items-center text-center">
                                    <div className="w-10 h-10 rounded-full bg-golden/20 text-golden flex items-center justify-center mb-2">
                                        <Crown className="w-5 h-5" />
                                    </div>
                                    <h3 className="font-bold">FIAPO</h3>
                                    <p className="text-xs text-muted-foreground">Gov & Rewards</p>
                                    <div className="mt-2 flex items-center text-xs text-green-500">
                                        <CheckCircle2 className="w-3 h-3 mr-1" /> Connected
                                    </div>
                                </div>
                                {/* USDT CARD */}
                                <div className="p-4 rounded-lg bg-background/50 border border-border flex flex-col items-center text-center">
                                    <div className="w-10 h-10 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center mb-2">
                                        <span className="font-bold">$</span>
                                    </div>
                                    <h3 className="font-bold">USDT</h3>
                                    <p className="text-xs text-muted-foreground">Solana Network</p>
                                    {solana.connected ? (
                                        <div className="mt-2 flex items-center text-xs text-green-500">
                                            <CheckCircle2 className="w-3 h-3 mr-1" /> {formatAddress(solana.address || "", 4)}
                                        </div>
                                    ) : solanaWallet ? (
                                        <div className="mt-2 flex items-center text-xs text-green-500">
                                            <CheckCircle2 className="w-3 h-3 mr-1" /> Configured
                                        </div>
                                    ) : (
                                        <div className="mt-2 flex items-center text-xs text-red-500">
                                            <AlertTriangle className="w-3 h-3 mr-1" /> Required
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2 pt-2 border-t border-border">
                                <Label htmlFor="solana-wallet" className="flex items-center gap-2">
                                    Solana Wallet Address (USDT)
                                    <span className="text-xs text-golden">(Required)</span>
                                </Label>
                                <Input
                                    id="solana-wallet"
                                    placeholder="Enter your Solana wallet address"
                                    value={solana.connected ? (solana.address || "") : solanaWallet}
                                    onChange={(e) => setSolanaWallet(e.target.value)}
                                    disabled={solana.connected}
                                    className="border-golden/50"
                                />
                                {solana.connected && (
                                    <p className="text-xs text-muted-foreground">Auto-filled from your connected Solana wallet.</p>
                                )}
                            </div>
                        </CardContent>
                        <CardFooter className="border-t border-border pt-6 flex justify-end">
                            <Button
                                onClick={handleSave}
                                disabled={loading || (!solanaWallet && !solana.connected)}
                                className="bg-golden text-black hover:bg-golden/90 min-w-[140px]"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                Save Configuration
                            </Button>
                        </CardFooter>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );

    if (embedded) {
        return content;
    }

    return (
        <div className="min-h-screen pt-24 pb-16">
            {content}
        </div>
    );
}
