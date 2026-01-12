"use client";

import { motion } from "framer-motion";
import { Wallet, ArrowRight, ExternalLink, AlertCircle, CheckCircle, Smartphone, Globe, Download } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const wallets = [
    {
        name: "Polkadot.js Apps",
        description: "Recommended - Complete interface for all Lunes features",
        platform: "Web",
        difficulty: "Medium",
        icon: Globe,
        color: "text-pink-500",
        bgColor: "bg-pink-500/10",
        recommended: true,
        features: ["Full chain access", "Governance", "Staking", "Smart Contracts"],
        directLink: "https://dev.lunes.io/?rpc=wss://ws.lunes.io#/accounts",
        extensionLink: "https://polkadot.js.org/extension/",
    },
    {
        name: "Talisman",
        description: "Modern multi-chain wallet with intuitive interface",
        platform: "Browser Extension",
        difficulty: "Easy",
        icon: Wallet,
        color: "text-purple-500",
        bgColor: "bg-purple-500/10",
        features: ["Multi-chain", "NFT Support", "Portfolio View", "dApp Browser"],
        directLink: "https://talisman.xyz",
    },
    {
        name: "SubWallet",
        description: "Popular wallet for Polkadot ecosystem with mobile support",
        platform: "Extension & Mobile",
        difficulty: "Easy",
        icon: Smartphone,
        color: "text-green-500",
        bgColor: "bg-green-500/10",
        features: ["Mobile App", "QR Payments", "Staking", "History"],
        directLink: "https://subwallet.app",
    },
    {
        name: "Nova Wallet",
        description: "Premium mobile wallet for Polkadot networks",
        platform: "Mobile",
        difficulty: "Easy",
        icon: Smartphone,
        color: "text-blue-500",
        bgColor: "bg-blue-500/10",
        features: ["Premium UI", "Staking APY", "Crowdloans", "dApp Browser"],
        directLink: "https://novawallet.io",
    },
];

const networkInfo = {
    name: "Lunes",
    rpc: "wss://ws.lunes.io",
    rpcBackup: "wss://ws-lunes-main-02.lunes.io",
    token: "LUNES",
    decimals: 8,
    ss58: 42,
};

export default function WalletSetupPage() {
    return (
        <div className="min-h-screen pt-24 pb-16">
            <div className="container mx-auto px-4 max-w-5xl">
                {/* Header */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
                    <div className="flex items-center gap-2 text-golden mb-4">
                        <Wallet className="w-8 h-8" />
                        <span className="font-display text-xl">Wallet Configuration</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold font-display text-foreground mb-4">
                        Configure Your Wallet for Lunes Network
                    </h1>
                    <p className="text-xl text-muted-foreground">
                        Step-by-step guides to connect your wallet to the Lunes blockchain
                    </p>
                </motion.div>

                {/* Network Info Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mb-10"
                >
                    <Card className="bg-gradient-to-r from-golden/10 to-orange-500/10 border-golden/20">
                        <CardContent className="p-6">
                            <h3 className="text-lg font-bold text-golden mb-4 flex items-center gap-2">
                                <Globe className="w-5 h-5" />
                                Lunes Network Information
                            </h3>
                            <div className="grid md:grid-cols-2 gap-4 text-sm">
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Primary RPC:</span>
                                        <code className="text-golden bg-black/30 px-2 py-0.5 rounded text-xs">{networkInfo.rpc}</code>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Backup RPC:</span>
                                        <code className="text-orange-400 bg-black/30 px-2 py-0.5 rounded text-xs">{networkInfo.rpcBackup}</code>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Token:</span>
                                        <span className="font-bold text-foreground">{networkInfo.token}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Decimals:</span>
                                        <span className="text-foreground">{networkInfo.decimals}</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Buy LUNES Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="mb-10"
                >
                    <Card className="bg-card border-green-500/20">
                        <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                            <div>
                                <h3 className="text-lg font-bold text-foreground mb-1">💰 Where to Buy LUNES</h3>
                                <p className="text-muted-foreground text-sm">Purchase LUNES on BitStorage Exchange</p>
                            </div>
                            <a href="https://bitstorage.finance" target="_blank" rel="noopener noreferrer">
                                <Button className="bg-green-600 hover:bg-green-700 text-white gap-2">
                                    Buy on BitStorage
                                    <ExternalLink className="w-4 h-4" />
                                </Button>
                            </a>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Important Warning */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mb-10"
                >
                    <Card className="bg-amber-500/10 border-amber-500/30">
                        <CardContent className="p-6 flex gap-4">
                            <AlertCircle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-bold text-amber-500 mb-1">⚠️ Important: Update Metadata</h4>
                                <p className="text-sm text-muted-foreground">
                                    When connecting to Lunes for the <strong>first time</strong>, you MUST update the metadata in your wallet.
                                    This ensures your wallet can correctly sign transactions on the Lunes network.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Wallet Cards */}
                <div className="space-y-6">
                    {wallets.map((wallet, index) => (
                        <motion.div
                            key={wallet.name}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 + index * 0.1 }}
                        >
                            <Card className={`bg-card border-golden/10 overflow-hidden ${wallet.recommended ? 'ring-2 ring-golden/50' : ''}`}>
                                {wallet.recommended && (
                                    <div className="bg-golden text-black text-xs font-bold px-3 py-1 text-center">
                                        ⭐ RECOMMENDED
                                    </div>
                                )}
                                <CardContent className="p-6 md:p-8">
                                    <div className="flex flex-col md:flex-row gap-6">
                                        {/* Icon */}
                                        <div className="shrink-0">
                                            <div className={`w-16 h-16 rounded-2xl ${wallet.bgColor} flex items-center justify-center`}>
                                                <wallet.icon className={`w-8 h-8 ${wallet.color}`} />
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1">
                                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                                <h3 className="text-2xl font-bold font-display text-foreground">{wallet.name}</h3>
                                                <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">{wallet.platform}</span>
                                                <span className={`text-xs px-2 py-0.5 rounded ${wallet.difficulty === 'Easy' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                                    {wallet.difficulty}
                                                </span>
                                            </div>
                                            <p className="text-muted-foreground mb-4">{wallet.description}</p>

                                            {/* Features */}
                                            <div className="flex flex-wrap gap-2 mb-6">
                                                {wallet.features.map((feature) => (
                                                    <span key={feature} className="text-xs px-2 py-1 rounded-full bg-golden/10 text-golden flex items-center gap-1">
                                                        <CheckCircle className="w-3 h-3" />
                                                        {feature}
                                                    </span>
                                                ))}
                                            </div>

                                            {/* Setup Steps */}
                                            <div className="bg-muted/30 rounded-lg p-4 mb-4">
                                                <h4 className="font-semibold text-foreground mb-3">Quick Setup:</h4>
                                                <ol className="space-y-2 text-sm text-muted-foreground">
                                                    {wallet.name === "Polkadot.js Apps" ? (
                                                        <>
                                                            <li className="flex gap-2"><span className="text-golden font-bold">1.</span> Access the direct link below (pre-configured for Lunes)</li>
                                                            <li className="flex gap-2"><span className="text-golden font-bold">2.</span> Go to Settings → Metadata → Click "Update metadata"</li>
                                                            <li className="flex gap-2"><span className="text-golden font-bold">3.</span> Confirm the update in your browser extension</li>
                                                            <li className="flex gap-2"><span className="text-golden font-bold">4.</span> Create or import your account in Accounts section</li>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <li className="flex gap-2"><span className="text-golden font-bold">1.</span> Download and install {wallet.name}</li>
                                                            <li className="flex gap-2"><span className="text-golden font-bold">2.</span> Go to Settings → Manage Networks → Add Network</li>
                                                            <li className="flex gap-2"><span className="text-golden font-bold">3.</span> Enter RPC URL: <code className="bg-black/30 px-1 rounded text-xs text-golden">{networkInfo.rpc}</code></li>
                                                            <li className="flex gap-2"><span className="text-golden font-bold">4.</span> Save and update metadata when prompted</li>
                                                        </>
                                                    )}
                                                </ol>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex flex-wrap gap-3">
                                                <a href={wallet.directLink} target="_blank" rel="noopener noreferrer">
                                                    <Button variant="outline" className="group border-golden/30 text-golden hover:bg-golden/10">
                                                        {wallet.name === "Polkadot.js Apps" ? "Open Lunes Interface" : `Get ${wallet.name}`}
                                                        <ExternalLink className="w-4 h-4 ml-2" />
                                                    </Button>
                                                </a>
                                                {wallet.extensionLink && (
                                                    <a href={wallet.extensionLink} target="_blank" rel="noopener noreferrer">
                                                        <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                                                            <Download className="w-4 h-4 mr-2" />
                                                            Install Extension
                                                        </Button>
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>

                {/* Troubleshooting */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    className="mt-12"
                >
                    <h2 className="text-2xl font-bold font-display text-foreground mb-6">❓ Troubleshooting</h2>
                    <div className="grid md:grid-cols-2 gap-4">
                        <Card className="bg-card">
                            <CardContent className="p-4">
                                <h4 className="font-semibold text-red-400 mb-2">Unable to connect</h4>
                                <p className="text-sm text-muted-foreground">
                                    Try the backup RPC: <code className="text-xs bg-muted px-1 rounded">{networkInfo.rpcBackup}</code>
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="bg-card">
                            <CardContent className="p-4">
                                <h4 className="font-semibold text-red-400 mb-2">Unknown types error</h4>
                                <p className="text-sm text-muted-foreground">
                                    Update metadata in Settings → Metadata → "Update metadata"
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="bg-card">
                            <CardContent className="p-4">
                                <h4 className="font-semibold text-red-400 mb-2">Balance not showing</h4>
                                <p className="text-sm text-muted-foreground">
                                    Ensure Lunes network is enabled and wait for sync to complete
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="bg-card">
                            <CardContent className="p-4">
                                <h4 className="font-semibold text-red-400 mb-2">Transactions failing</h4>
                                <p className="text-sm text-muted-foreground">
                                    Check LUNES balance for fees and update metadata if needed
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
