"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Wallet, Send, Download, History, Copy, Check, ExternalLink, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useWalletStore } from "@/lib/stores";
import { formatAddress, formatBalance } from "@/lib/utils/format";

// Mock transaction history
const transactions = [
  { id: 1, type: "receive", amount: "50,000", from: "5Grw...utQY", date: "2024-12-01", status: "completed" },
  { id: 2, type: "send", amount: "10,000", to: "5FHn...94ty", date: "2024-11-28", status: "completed" },
  { id: 3, type: "stake", amount: "100,000", pool: "Don Fiapo", date: "2024-11-25", status: "completed" },
  { id: 4, type: "claim", amount: "5,000", source: "Airdrop", date: "2024-11-20", status: "completed" },
];

export default function WalletPage() {
  const t = useTranslations("wallet");
  const [copied, setCopied] = useState(false);
  const { lunesConnected, lunesAddress, lunesBalance } = useWalletStore();

  const handleCopy = async () => {
    if (lunesAddress) {
      await navigator.clipboard.writeText(lunesAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold font-display text-golden mb-4">👛 {t("title")}</h1>
          <p className="text-xl text-muted-foreground">Manage your $FIAPO tokens</p>
        </motion.div>

        {!lunesConnected ? (
          <Card className="max-w-md mx-auto bg-card">
            <CardContent className="pt-6 text-center py-12">
              <Wallet className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">Connect your wallet to view balance</p>
              <Button>Connect Wallet</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Balance Card */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:col-span-1"
            >
              <Card className="bg-gradient-to-br from-golden/20 to-purple-500/10 border-golden h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-golden" />
                    {t("balance")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <p className="text-4xl font-bold text-golden">{formatBalance(lunesBalance)}</p>
                    <p className="text-sm text-muted-foreground mt-1">≈ $0.00 USD</p>
                  </div>

                  {/* Address */}
                  <div className="bg-background/50 rounded-xl p-4">
                    <p className="text-xs text-muted-foreground mb-2">Wallet Address</p>
                    <div className="flex items-center gap-2">
                      <code className="text-sm flex-1 truncate">{lunesAddress}</code>
                      <button onClick={handleCopy} className="p-2 hover:bg-muted rounded-lg transition-colors">
                        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" className="flex-col h-auto py-4">
                      <Send className="w-5 h-5 mb-1" />
                      <span className="text-xs">{t("send")}</span>
                    </Button>
                    <Button variant="outline" className="flex-col h-auto py-4">
                      <Download className="w-5 h-5 mb-1" />
                      <span className="text-xs">{t("receive")}</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Transaction History */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:col-span-2"
            >
              <Card className="bg-card h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="w-5 h-5 text-golden" />
                    {t("history")}
                  </CardTitle>
                  <CardDescription>Recent transactions</CardDescription>
                </CardHeader>
                <CardContent>
                  {transactions.length === 0 ? (
                    <div className="text-center py-12">
                      <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No transactions yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {transactions.map((tx) => (
                        <div
                          key={tx.id}
                          className="flex items-center gap-4 p-4 bg-background rounded-xl hover:bg-muted/50 transition-colors"
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            tx.type === "receive" || tx.type === "claim" 
                              ? "bg-green-500/20" 
                              : "bg-red-500/20"
                          }`}>
                            {tx.type === "receive" || tx.type === "claim" ? (
                              <ArrowDownLeft className="w-5 h-5 text-green-500" />
                            ) : (
                              <ArrowUpRight className="w-5 h-5 text-red-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium capitalize">{tx.type}</p>
                            <p className="text-sm text-muted-foreground truncate">
                              {tx.type === "receive" && `From ${tx.from}`}
                              {tx.type === "send" && `To ${tx.to}`}
                              {tx.type === "stake" && `${tx.pool} Pool`}
                              {tx.type === "claim" && tx.source}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold ${
                              tx.type === "receive" || tx.type === "claim" 
                                ? "text-green-500" 
                                : "text-red-500"
                            }`}>
                              {tx.type === "receive" || tx.type === "claim" ? "+" : "-"}{tx.amount}
                            </p>
                            <p className="text-xs text-muted-foreground">{tx.date}</p>
                          </div>
                          <button className="p-2 hover:bg-card rounded-lg transition-colors">
                            <ExternalLink className="w-4 h-4 text-muted-foreground" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
