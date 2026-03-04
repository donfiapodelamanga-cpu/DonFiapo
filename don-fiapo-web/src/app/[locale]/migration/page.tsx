"use client";

declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      connect: () => Promise<{ publicKey: { toString: () => string } }>;
      signTransaction: (tx: any) => Promise<any>;
    };
  }
}

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { getAssociatedTokenAddress, createTransferInstruction } from "@solana/spl-token";
import { 
  ArrowRight, CheckCircle2, Crown, Wallet, Send, 
  Gift, Info, ExternalLink, Loader2, HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useWalletStore } from "@/lib/stores";

// Environment variables
const SOLANA_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC || "https://api.mainnet-beta.solana.com";
const TREASURY_WALLET_FALLBACK = process.env.NEXT_PUBLIC_TREASURY_SOLANA || "";
const FIAPO_SOLANA_MINT = process.env.NEXT_PUBLIC_FIAPO_SOLANA_MINT || "";

// Wallet tutorial links
const PHANTOM_GUIDE = "https://phantom.app/learn/getting-started";
const LUNES_GUIDE = "https://lfrfrj.medium.com/lunes-web-wallet-beginners-guide-d8d7d3a2f77a";

export default function MigrationPage() {
  const { addToast } = useToast();
  const { lunesAddress, lunesConnected } = useWalletStore();

  // Fetch treasury wallet from admin system wallets with env fallback
  const [TREASURY_WALLET, setTreasuryWallet] = useState(TREASURY_WALLET_FALLBACK);
  useEffect(() => {
    import("@/lib/api/system-wallets").then(({ getSystemWalletAddress }) => {
      getSystemWalletAddress("migration_treasury").then((addr) => {
        if (addr) setTreasuryWallet(addr);
      });
    });
  }, []);
  
  const [solanaConnected, setSolanaConnected] = useState(false);
  const [solanaAddress, setSolanaAddress] = useState<string | null>(null);
  
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState(1);
  const [migrating, setMigrating] = useState(false);

  const connectSolana = async () => {
    try {
      if (!window.solana || !window.solana.isPhantom) {
        addToast("error", "Wallet Not Found", "Please install the Phantom Wallet extension.");
        window.open("https://phantom.app/", "_blank");
        return;
      }
      
      const response = await window.solana.connect();
      setSolanaAddress(response.publicKey.toString());
      setSolanaConnected(true);
      setStep(2);
      addToast("success", "Wallet Connected", "The Royal Summons has been accepted!");
    } catch (err) {
      console.error(err);
      addToast("error", "Connection Error", "Could not connect to your Solana wallet.");
    }
  };

  const handleMigrate = async () => {
    if (!solanaConnected || !solanaAddress) return addToast("error", "Error", "Connect your Solana wallet first.");
    if (!lunesConnected || !lunesAddress) return addToast("error", "Error", "Connect your Lunes wallet first.");
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return addToast("error", "Error", "Enter a valid amount.");

    setMigrating(true);
    
    try {
      const connection = new Connection(SOLANA_RPC, "confirmed");
      const fromPubkey = new PublicKey(solanaAddress);
      const toPubkey = new PublicKey(TREASURY_WALLET);
      const mintPubkey = new PublicKey(FIAPO_SOLANA_MINT);

      const fromTokenAccount = await getAssociatedTokenAddress(mintPubkey, fromPubkey);
      const toTokenAccount = await getAssociatedTokenAddress(mintPubkey, toPubkey);

      const transferAmount = BigInt(Number(amount) * 10 ** 8);

      const transaction = new Transaction().add(
        createTransferInstruction(
          fromTokenAccount,
          toTokenAccount,
          fromPubkey,
          transferAmount
        )
      );

      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromPubkey;

      const signedTransaction = await window.solana!.signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signedTransaction.serialize());
      await connection.confirmTransaction(signature);

      const res = await fetch("/api/migration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          solanaTxHash: signature,
          solanaSender: solanaAddress,
          lunesRecipient: lunesAddress,
          amountSolana: Number(amount),
          userId: "user-from-session-or-wallet",
        }),
      });

      if (!res.ok) throw new Error("Failed to register migration.");

      setStep(4);
      addToast("success", "The Tribute Has Been Accepted!", "Your new Lunes tokens (+2% bonus) will arrive shortly.");
    } catch (err: any) {
      console.error(err);
      addToast("error", "Migration Failed", err.message || "Please try again later.");
    } finally {
      setMigrating(false);
    }
  };

  const bonusAmount = amount ? (Number(amount) * 0.02).toFixed(2) : "0.00";
  const totalReceive = amount ? (Number(amount) * 1.02).toFixed(2) : "0.00";

  const STEPS = [
    { num: 1, title: "The Summons", icon: Wallet },
    { num: 2, title: "New Home", icon: Crown },
    { num: 3, title: "The Tribute", icon: Send },
    { num: 4, title: "The Reward", icon: Gift },
  ];

  return (
    <div className="min-h-screen bg-background pt-24 pb-12 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 inset-x-0 h-[500px] bg-gradient-to-b from-golden/10 to-transparent pointer-events-none" />
      <div className="absolute top-40 left-20 w-72 h-72 bg-purple-500/10 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute top-60 right-20 w-96 h-96 bg-golden/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10 max-w-4xl">
        
        {/* Header */}
        <div className="text-center mb-12">
          <motion.div 
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-golden/10 border border-golden/30 text-golden text-sm font-bold mb-6"
          >
            <Crown className="w-4 h-4" />
            The Unification Decree
          </motion.div>
          <h1 className="text-4xl md:text-6xl font-black font-display text-foreground mb-4">
            The Great Exodus <br/>
            <span className="text-golden">To Lunes</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            By royal decree, all nobles who participated in the GemPad presale on Solana must migrate their treasures to the Lunes Network.
            <strong className="text-golden"> As a reward for your loyalty, you will receive 2% extra $FIAPO.</strong>
          </p>
        </div>

        {/* Supply & Burn Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <div className="bg-card/60 border border-golden/20 rounded-xl p-5 text-center">
            <p className="text-xs text-muted-foreground mb-1">Total Supply</p>
            <p className="text-2xl font-black text-golden">600,000,000,000</p>
            <p className="text-xs text-muted-foreground mt-1">$FIAPO on Lunes Network</p>
          </div>
          <div className="bg-card/60 border border-purple-500/20 rounded-xl p-5 text-center">
            <p className="text-xs text-muted-foreground mb-1">Presale Allocation</p>
            <p className="text-2xl font-black text-purple-400">150,000,000,000</p>
            <p className="text-xs text-muted-foreground mt-1">25% via GemPad (Solana)</p>
          </div>
          <div className="bg-card/60 border border-red-500/20 rounded-xl p-5 text-center">
            <p className="text-xs text-muted-foreground mb-1">Solana Tokens</p>
            <p className="text-2xl font-black text-red-400">Will Be Burned</p>
            <p className="text-xs text-muted-foreground mt-1">Permanently removed</p>
          </div>
        </div>

        {/* Important Notice */}
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5 mb-10 space-y-3">
          <h3 className="text-sm font-bold text-red-400 flex items-center gap-2">
            <Info className="w-4 h-4" /> Important: What Happens to Solana Tokens
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The $FIAPO token was originally sold on the <strong className="text-foreground">Solana network via GemPad</strong> as 
            part of the presale (25% of total supply = 150 billion tokens). However, <strong className="text-foreground">$FIAPO&apos;s native 
            blockchain is Lunes Network</strong>, not Solana.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            After migration, <strong className="text-red-400">all Solana-based $FIAPO tokens sent to the treasury will be permanently 
            burned</strong> (destroyed). They will cease to exist on the Solana blockchain entirely. In return, you receive 
            the equivalent amount of <strong className="text-golden">native $FIAPO on Lunes + a 2% loyalty bonus</strong> as a reward 
            for completing the migration.
          </p>
          <div className="flex flex-wrap gap-4 pt-2 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-purple-400" />
              <span className="text-muted-foreground">Solana $FIAPO (temporary)</span>
              <ArrowRight className="w-3 h-3 text-muted-foreground" />
              <span className="text-red-400 font-bold">Burned</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-golden" />
              <span className="text-muted-foreground">Lunes $FIAPO (native)</span>
              <ArrowRight className="w-3 h-3 text-muted-foreground" />
              <span className="text-green-400 font-bold">Your wallet + 2%</span>
            </div>
          </div>
        </div>

        {/* Steps Tracker */}
        <div className="flex items-center justify-between mb-8 relative">
          <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-neutral-800 -z-10" />
          
          {STEPS.map((s) => (
            <div key={s.num} className="flex flex-col items-center gap-2 bg-background px-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-colors ${
                step >= s.num 
                  ? "bg-golden/20 border-golden text-golden" 
                  : "bg-neutral-900 border-neutral-800 text-neutral-500"
              }`}>
                {step > s.num ? <CheckCircle2 className="w-5 h-5" /> : <s.icon className="w-5 h-5" />}
              </div>
              <span className={`text-xs font-bold ${step >= s.num ? "text-foreground" : "text-neutral-500"}`}>
                {s.title}
              </span>
            </div>
          ))}
        </div>

        {/* Interactive Card */}
        <Card className="bg-card/80 border-golden/30 shadow-2xl shadow-golden/10 backdrop-blur-xl">
          <CardContent className="p-6 sm:p-10">
            
            {/* Step 1: Connect Solana */}
            {step === 1 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-6 py-8">
                <div className="w-20 h-20 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Wallet className="w-10 h-10 text-purple-400" />
                </div>
                <h2 className="text-2xl font-bold">Identify Your Origin</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Connect the Solana wallet (Phantom or Solflare) you used during the GemPad presale to access your old treasures.
                </p>
                <Button onClick={connectSolana} className="glow-gold text-lg h-14 px-8">
                  Connect Solana Wallet
                </Button>
                <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                  <HelpCircle className="w-3 h-3" />
                  <span>New to Solana?</span>
                  <a href={PHANTOM_GUIDE} target="_blank" rel="noreferrer" className="text-purple-400 hover:underline flex items-center gap-0.5">
                    Phantom Wallet Guide <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </motion.div>
            )}

            {/* Step 2: Connect Lunes */}
            {step === 2 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-6 py-8">
                <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Crown className="w-10 h-10 text-blue-400" />
                </div>
                <h2 className="text-2xl font-bold">Prepare Your New Home</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Now, connect your Lunes wallet. This is where your new $FIAPO tokens (plus the 2% loyalty bonus) will be sent.
                </p>
                {lunesConnected ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 font-mono text-sm inline-block min-w-[200px]">
                      Lunes: {lunesAddress?.slice(0, 8)}...{lunesAddress?.slice(-6)}
                    </div>
                    <div>
                      <Button onClick={() => setStep(3)} className="glow-gold text-lg h-14 px-8 w-full max-w-sm mx-auto">
                        Continue the Journey <ArrowRight className="ml-2 w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-yellow-500/80 text-sm bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 max-w-md mx-auto">
                      You need to connect your Lunes wallet first. Use the wallet button in the top navigation bar.
                    </p>
                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                      <HelpCircle className="w-3 h-3" />
                      <span>Don&apos;t have a Lunes wallet?</span>
                      <a href={LUNES_GUIDE} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline flex items-center gap-0.5">
                        Lunes Wallet Guide <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 3: Migration Form */}
            {step === 3 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                  <div className="bg-neutral-900/50 p-4 rounded-xl border border-neutral-800">
                    <p className="text-xs text-neutral-500 mb-1">Sending from (Solana)</p>
                    <p className="font-mono text-sm text-purple-400">{solanaAddress?.slice(0,8)}...{solanaAddress?.slice(-6)}</p>
                  </div>
                  <div className="hidden md:flex justify-center text-golden">
                    <ArrowRight className="w-6 h-6" />
                  </div>
                  <div className="bg-neutral-900/50 p-4 rounded-xl border border-neutral-800">
                    <p className="text-xs text-neutral-500 mb-1">Receiving on (Lunes)</p>
                    <p className="font-mono text-sm text-blue-400">{lunesAddress?.slice(0,8)}...{lunesAddress?.slice(-6)}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-sm font-bold text-neutral-300">Amount to Migrate</label>
                  <div className="relative">
                    <Input 
                      type="number" 
                      placeholder="0.00" 
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="h-16 text-2xl pl-4 pr-32 bg-neutral-900/50 border-neutral-800"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-golden font-bold text-sm">
                      $FIAPO (SOL)
                    </div>
                  </div>
                </div>

                <div className="bg-golden/5 border border-golden/20 rounded-xl p-6 space-y-4">
                  <h4 className="font-bold text-golden flex items-center gap-2">
                    <Info className="w-4 h-4" /> The Royal Blessing (2% Bonus)
                  </h4>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-neutral-400">Migrating:</span>
                    <span className="font-mono text-white">{amount || "0"} FIAPO</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-neutral-400">Crown Bonus (+2%):</span>
                    <span className="font-mono text-green-400">+{bonusAmount} FIAPO</span>
                  </div>
                  <div className="h-px bg-golden/20 my-2" />
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span className="text-golden">You Will Receive (Lunes):</span>
                    <span className="font-mono text-golden">{totalReceive} FIAPO</span>
                  </div>
                </div>

                <Button 
                  onClick={handleMigrate} 
                  disabled={migrating || !amount || Number(amount) <= 0}
                  className="w-full glow-gold text-lg h-14"
                >
                  {migrating ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Signing Decree (Migrating...)</>
                  ) : (
                    <><Send className="w-5 h-5 mr-2" /> Pay Tribute &amp; Migrate</>
                  )}
                </Button>
                
                <p className="text-xs text-center text-neutral-500">
                  By clicking, your Solana wallet will prompt you to approve the transfer to the royal treasury.<br/>
                  This does not involve automated oracles; the new tokens will be deposited in a guaranteed manner.
                </p>
              </motion.div>
            )}

            {/* Step 4: Success */}
            {step === 4 && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-6 py-8">
                <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/30">
                  <Gift className="w-12 h-12 text-green-400" />
                </div>
                <h2 className="text-3xl font-bold text-golden">Migration Started!</h2>
                <p className="text-muted-foreground max-w-md mx-auto text-lg">
                  The King has received your Solana tokens. Our scribes are processing the delivery.
                  Soon, <strong>{totalReceive} $FIAPO</strong> will arrive in your Lunes wallet.
                </p>
                
                <div className="bg-neutral-900/50 rounded-xl p-4 inline-block mx-auto text-left space-y-2 mt-4">
                  <p className="text-sm text-neutral-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400" /> Solana transaction confirmed
                  </p>
                  <p className="text-sm text-neutral-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400" /> Recorded in the Royal Ledger
                  </p>
                  <p className="text-sm text-yellow-500 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Awaiting deposit on Lunes
                  </p>
                </div>

                <div className="pt-8">
                  <Button variant="outline" onClick={() => window.location.href = "/"} className="border-golden/30 text-golden hover:bg-golden/10">
                    Return to the Kingdom (Home)
                  </Button>
                </div>
              </motion.div>
            )}

          </CardContent>
        </Card>

        {/* Wallet Tutorial Links */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
          <a href={PHANTOM_GUIDE} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-purple-400 transition-colors">
            <HelpCircle className="w-4 h-4" /> How to use Phantom Wallet <ExternalLink className="w-3 h-3" />
          </a>
          <span className="text-neutral-700">|</span>
          <a href={LUNES_GUIDE} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-blue-400 transition-colors">
            <HelpCircle className="w-4 h-4" /> How to use Lunes Wallet <ExternalLink className="w-3 h-3" />
          </a>
          <span className="text-neutral-700">|</span>
          <a href="https://solsale.app/presale/2m8QMqiJW1iKv4W3eFbBujKHD9yHVYX1qiVPnPrDGGJP" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-golden transition-colors">
            <ExternalLink className="w-4 h-4" /> Original GemPad Presale
          </a>
        </div>
      </div>
    </div>
  );
}
