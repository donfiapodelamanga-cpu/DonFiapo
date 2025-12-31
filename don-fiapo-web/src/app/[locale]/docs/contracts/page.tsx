"use client";

import { motion } from "framer-motion";
import { Copy, ExternalLink, Shield, AlertTriangle, CheckCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { API_CONFIG } from "@/lib/api/config";
import { useToast } from "@/components/ui/toast";

export default function ContractsPage() {
    const { addToast } = useToast();

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        addToast("success", "Copied!", `${label} copied to clipboard`);
    };

    const contracts = [
        {
            name: "Token Contract (FIAPO)",
            address: API_CONFIG.contracts.donFiapo,
            description: "The main ERC-20/PSP-22 token contract for Don Fiapo.",
            explorerUrl: `https://blockexplorer.lunes.io/address/${API_CONFIG.contracts.donFiapo}`, // Hypothetical explorer URL
            network: "Lunes Network",
            status: "Verified",
            features: ["Minting", "Burnable", "Pausable"],
        },
        {
            name: "Solana Payment Receiver",
            address: API_CONFIG.solana.receiverWallet || "Pending Configuration",
            description: "Wallet for receiving USDT/USDC payments for NFT minting.",
            explorerUrl: `https://solscan.io/account/${API_CONFIG.solana.receiverWallet}`,
            network: "Solana Mainnet",
            status: "Active",
            features: ["Payments", "Treasury"],
        }
    ];

    return (
        <div className="min-h-screen pt-24 pb-16">
            <div className="container mx-auto px-4 max-w-4xl">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
                    <div className="flex items-center gap-2 text-golden mb-4">
                        <Shield className="w-8 h-8" />
                        <span className="font-display text-xl">Official Contracts</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold font-display text-foreground mb-4">
                        Smart Contracts & Addresses
                    </h1>
                    <p className="text-xl text-muted-foreground">
                        Verify all official contract addresses to ensure security.
                        <br />
                        <span className="text-red-400 font-bold text-sm flex items-center gap-2 mt-2">
                            <AlertTriangle className="w-4 h-4" />
                            Never send funds to unverified addresses.
                        </span>
                    </p>
                </motion.div>

                <div className="space-y-6">
                    {contracts.map((contract, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <Card className="bg-card border-golden/20 overflow-hidden">
                                <CardHeader className="bg-golden/5 border-b border-golden/10">
                                    <div className="flex justify-between items-start md:items-center flex-col md:flex-row gap-4">
                                        <div>
                                            <CardTitle className="text-xl text-golden flex items-center gap-2">
                                                {contract.name}
                                                {contract.status === "Verified" && (
                                                    <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs font-normal border border-green-500/30 flex items-center gap-1">
                                                        <CheckCircle className="w-3 h-3" /> Verified
                                                    </span>
                                                )}
                                            </CardTitle>
                                            <CardDescription className="mt-1">
                                                Network: <span className="text-foreground font-medium">{contract.network}</span>
                                            </CardDescription>
                                        </div>
                                        {contract.features && (
                                            <div className="flex gap-2">
                                                {contract.features.map(f => (
                                                    <span key={f} className="text-xs px-2 py-1 rounded bg-background border border-border text-muted-foreground">
                                                        {f}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    <p className="text-muted-foreground mb-4">{contract.description}</p>

                                    <div className="bg-background rounded-lg p-4 border border-border flex flex-col md:flex-row gap-4 items-center justify-between group hover:border-golden/30 transition-colors">
                                        <code className="text-sm md:text-base font-mono text-golden break-all">
                                            {contract.address}
                                        </code>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-muted-foreground hover:text-golden"
                                                onClick={() => copyToClipboard(contract.address, contract.name)}
                                            >
                                                <Copy className="w-4 h-4 mr-2" />
                                                Copy
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="text-golden border-golden/30 hover:bg-golden/10"
                                                onClick={() => window.open(contract.explorerUrl, '_blank')}
                                                disabled={contract.address === "Pending Configuration"}
                                            >
                                                <ExternalLink className="w-4 h-4 mr-2" />
                                                Explorer
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="mt-12 p-6 bg-blue-500/5 border border-blue-500/20 rounded-xl"
                >
                    <div className="flex gap-4">
                        <Shield className="w-6 h-6 text-blue-400 shrink-0" />
                        <div>
                            <h3 className="font-bold text-blue-400 mb-2">Security Verification</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                Always verify the contract address matches correctly on the official explorer.
                                Don Fiapo team will NEVER ask for your private keys or seed phrase.
                            </p>
                            <Button variant="link" className="text-blue-400 p-0 h-auto" onClick={() => window.open('/docs/security', '_self')}>
                                View Security Audit Report &rarr;
                            </Button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
