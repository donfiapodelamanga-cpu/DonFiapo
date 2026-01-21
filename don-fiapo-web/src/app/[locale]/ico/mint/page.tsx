"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import Image from "next/image";
import { Crown, Minus, Plus, CreditCard, Wallet, ArrowLeft, Check, Info, Loader2, Copy, ExternalLink, Clock, Sparkles, Flame } from "lucide-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Link } from "@/lib/navigation";
import { useWalletStore } from "@/lib/stores";
import { useMintNFT } from "@/hooks/usePayment";
import { useSolana } from "@/hooks/useSolana";
import { useICOStats, useNftConfigs } from "@/hooks/useContract";
import { useToast } from "@/components/ui/toast";
import { API_CONFIG } from "@/lib/api/config";
import { ConnectWalletModal } from "@/components/wallet/connect-wallet-modal";

// Consistent number formatting to avoid SSR hydration mismatch
// Uses 'en-US' locale for consistent server/client rendering
function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

// Use NFT tiers from config
const nftTiers = API_CONFIG.nftTiers.map((tier) => ({
  id: tier.id,
  name: tier.name,
  shortName: tier.shortName,
  price: tier.price,
  miningRate: tier.dailyMining,
  totalMining: tier.totalMining,
  supply: tier.supply,
  image: tier.image,
  color: tier.color,
  available: tier.supply, // Will come from contract
}));

const paymentMethods = [
  { id: "usdt", name: "USDT", icon: "$", description: "Pay with USDT on Solana" },
  { id: "usdc", name: "USDC", icon: "$", description: "Pay with USDC on Solana" },
];

export default function MintPage() {
  const t = useTranslations("ico");
  const { addToast } = useToast();
  const [selectedTier, setSelectedTier] = useState(nftTiers[0]);
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<"usdt" | "usdc">("usdt");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [paymentStep, setPaymentStep] = useState<"idle" | "paying" | "verifying" | "success">("idle");
  const [isLunesModalOpen, setIsLunesModalOpen] = useState(false);

  const { lunesConnected, lunesAddress } = useWalletStore();
  const { connected: solanaConnected, publicKey } = useWallet();
  const { sendUSDT, sendUSDC, isReady: solanaReady } = useSolana();

  // ICO Stats for Prestige Bonus
  const { stats: icoStats, fetchStats: fetchICOStats } = useICOStats();
  const { configs: nftConfigs, fetchConfigs: fetchNftConfigs } = useNftConfigs();

  useEffect(() => {
    fetchICOStats();
    fetchNftConfigs();
  }, [fetchICOStats, fetchNftConfigs]);

  // Merge static config with real data
  const tiersWithData = nftTiers.map((tier) => {
    const remote = nftConfigs?.[tier.id];
    if (remote) {
      return {
        ...tier,
        available: Math.max(0, remote.maxSupply - remote.minted), // Sales availability
        minted: remote.minted,
        mintedEvolution: remote.mintedEvolution,
        maxSupply: remote.maxSupply
      };
    }
    // Fallback for free tier if not in contract list or just default
    if (tier.id === 0) return { ...tier, minted: 0, mintedEvolution: 0, maxSupply: 10000 };
    return { ...tier, minted: 0, mintedEvolution: 0, maxSupply: tier.supply };
  });

  const activeTier = tiersWithData.find(t => t.id === selectedTier.id) || tiersWithData[0];

  // Cooldown State
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [checkingCooldown, setCheckingCooldown] = useState(false);

  // Check cooldown when Free Tier selected or Wallet connects

  useEffect(() => {
    async function checkCooldown() {
      if (selectedTier.id !== 0 || !lunesAddress) {
        setCooldownRemaining(0);
        return;
      }

      setCheckingCooldown(true);
      try {
        const contract = await import('@/lib/api/contract');
        const remaining = await contract.getRemainingCooldown(lunesAddress);
        setCooldownRemaining(remaining);
      } catch (e) {
        console.error("Failed to check cooldown", e);
      } finally {
        setCheckingCooldown(false);
      }
    }

    checkCooldown();
  }, [selectedTier.id, lunesAddress]);

  // Format milliseconds to hours and minutes
  const formatCooldown = (ms: number) => {
    const hours = Math.ceil(ms / (1000 * 60 * 60));
    const minutes = Math.ceil((ms % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const {
    status,
    payment,
    isProcessing,
    isWaiting,
    isConfirmed,
    mintNFT,
    confirmMint,
    reset
  } = useMintNFT();

  const totalPrice = selectedTier.price * quantity;
  const maxQuantity = Math.min(5, selectedTier.available);

  // Receiver wallet from config
  const receiverWallet = API_CONFIG.solana.receiverWallet;

  // Handle automatic payment flow
  const handlePaidMint = async () => {
    if (!lunesConnected) {
      addToast("error", "Connect Lunes Wallet", "You need to connect your Lunes wallet first to receive the NFT.");
      setIsLunesModalOpen(true);
      return;
    }

    if (!solanaReady) {
      addToast("error", "Connect Solana Wallet", "You need to connect your Solana wallet to pay with USDT/USDC.");
      return;
    }

    if (!receiverWallet) {
      addToast("error", "Configuration Error", "Payment receiver not configured. Please contact support.");
      return;
    }

    setIsProcessingPayment(true);
    setPaymentStep("paying");

    try {
      // Step 1: Send USDT/USDC payment via Solana wallet
      const sendFn = paymentMethod === "usdt" ? sendUSDT : sendUSDC;
      const result = await sendFn(totalPrice, receiverWallet);

      if (!result.success) {
        throw new Error("Payment failed");
      }

      setPaymentStep("verifying");
      addToast("info", "Payment Sent!", "Verifying your payment...");

      // Step 2: Create payment request in Oracle and verify
      await mintNFT(selectedTier.id, quantity);

      // Step 3: Submit the Solana transaction hash for verification
      await confirmMint(result.signature);

      setPaymentStep("success");
      addToast("success", "NFT Minted!", "Your Royal NFT is now mining FIAPO!");
      fetchICOStats(); // Refresh stats to show updated counts

    } catch (err) {
      console.error("Mint error:", err);
      const message = err instanceof Error ? err.message : "Unknown error";

      // Check if user rejected the transaction
      if (message.includes("User rejected") || message.includes("cancelled")) {
        addToast("info", "Payment Cancelled", "You cancelled the transaction.");
      } else {
        addToast("error", "Mint Failed", message);
      }
      setPaymentStep("idle");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Handle free mint
  const handleFreeMint = async () => {
    if (!lunesConnected || !lunesAddress) {
      addToast("error", "Connect Wallet", "Connect your Lunes wallet to claim a free NFT.");
      setIsLunesModalOpen(true);
      return;
    }

    // Free mint - tier 0 with $0 price (direct contract call, no Oracle needed)
    setIsMinting(true);
    try {
      const freeTier = API_CONFIG.nftTiers[0];
      addToast("info", "Minting NFT...", "Please confirm the transaction in your wallet and wait for blockchain confirmation.");

      // Import contract module
      const contract = await import('@/lib/api/contract');

      // Query native LUNES balance for contract validation
      let lunesBalance = BigInt(0);
      try {
        lunesBalance = await contract.getNativeBalance(lunesAddress);
        console.log('[Mint] Native LUNES balance:', lunesBalance.toString());
      } catch (balanceError) {
        console.warn('[Mint] Could not fetch LUNES balance, proceeding with 0:', balanceError);
      }

      // Call mintNFT with tier 0 = free, actual LUNES balance, no proof
      const result = await contract.mintNFT(lunesAddress, 0, lunesBalance, null);

      addToast("success", "NFT Minted!", `You received a ${freeTier.shortName} NFT! Transaction Hash: ${result.slice(0, 6)}...${result.slice(-6)}`);
      setPaymentStep("success");
      fetchICOStats(); // Refresh stats
    } catch (error) {
      console.error("[Mint] Free mint error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to mint free NFT";

      // Provide more helpful error messages
      if (errorMessage.includes("balance too low") || errorMessage.includes("Inability to pay")) {
        addToast(
          "error",
          "Insufficient LUNES for Gas Fees",
          "Your wallet needs native LUNES tokens to pay for transaction fees. Get LUNES from an exchange or the Lunes faucet."
        );
      } else if (errorMessage.includes("InvalidOperation")) {
        addToast("error", "Mint Failed", "You may have reached the free NFT limit (5 per wallet).");
      } else if (errorMessage.includes("User rejected") || errorMessage.includes("Cancelled")) {
        addToast("info", "Transaction Cancelled", "You cancelled the transaction.");
      } else {
        addToast("error", "Mint Failed", errorMessage);
      }
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4">
        <Link href="/ico" className="inline-flex items-center gap-2 text-muted-foreground hover:text-golden mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to NFTs
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold font-display text-golden mb-4">👑 Mint Royal NFT</h1>
          <p className="text-xl text-muted-foreground">Choose your tier and join the kingdom</p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Tier Selection */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-2">
            <Card className="bg-card">
              <CardHeader>
                <CardTitle>Select NFT Tier</CardTitle>
                <CardDescription>Each tier provides different mining rewards</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Free NFT Requirements Info */}
                <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                    <div className="text-sm text-blue-200">
                      <p className="font-medium">Free NFT Requirements:</p>
                      <ul className="mt-1 text-xs text-blue-300 space-y-0.5">
                        <li>• First free NFT: No LUNES required</li>
                        <li>• 2nd-5th free NFT: Hold at least <span className="font-bold text-blue-200">10 LUNES</span></li>
                        <li>• Maximum <span className="font-bold text-blue-200">5 free NFTs</span> per wallet</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {tiersWithData.map((tier) => (
                    <button
                      key={tier.id}
                      onClick={() => { setSelectedTier(tier); setQuantity(1); }}
                      disabled={tier.available === 0}
                      className={`rounded-xl border-2 transition-all text-left overflow-hidden ${selectedTier.id === tier.id
                        ? "border-golden ring-2 ring-golden/30"
                        : "border-border hover:border-golden/50"
                        } ${tier.available === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <div className="relative w-full aspect-[3/4] bg-gradient-to-br from-black/20 to-black/60">
                        <Image
                          src={tier.image}
                          alt={tier.name}
                          fill
                          className="object-contain"
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        />
                        {selectedTier.id === tier.id && (
                          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-golden flex items-center justify-center">
                            <Check className="w-4 h-4 text-background" />
                          </div>
                        )}
                        {tier.price === 0 && (
                          <div className="absolute top-2 left-2 px-2 py-1 bg-green-500 text-white text-xs font-bold rounded-full">
                            FREE
                          </div>
                        )}
                        <div className={`absolute bottom-0 left-0 right-0 h-1 ${tier.color}`} />
                      </div>
                      <div className="p-3">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-bold text-sm leading-tight">{tier.shortName}</span>
                          <span className="text-lg font-bold text-golden">
                            {tier.price === 0 ? "FREE" : `$${tier.price}`}
                          </span>
                        </div>

                        <div className="space-y-2 mt-2">
                          <div className="text-xs text-green-500 font-medium border-b border-border/50 pb-1">
                            +{formatNumber(tier.miningRate)} FIAPO/day
                          </div>

                          <div className="grid grid-cols-2 gap-1 text-[10px] text-muted-foreground bg-black/20 p-1.5 rounded-md">
                            <div className="flex flex-col">
                              <span className="opacity-70">Sales</span>
                              <span className={tier.available < 100 ? "text-red-400 font-mono" : "text-green-400 font-mono"}>
                                {tier.minted !== undefined ? `${tier.minted}/${tier.maxSupply}` : '...'}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="opacity-70">Evolution</span>
                              <span className="text-blue-400 font-mono">
                                {tier.mintedEvolution || '-'}
                              </span>
                            </div>
                          </div>

                          {(tier.mintedEvolution !== undefined && tier.mintedEvolution < 100) && (
                            <div className="flex items-center gap-1 bg-purple-500/10 text-purple-400 text-[9px] px-1.5 py-0.5 rounded border border-purple-500/20">
                              <Sparkles className="w-2.5 h-2.5 shrink-0" />
                              <span>First 100 (Global) Bonus!</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Mint Summary */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <Card className="bg-background border-2 border-golden sticky top-24">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-golden" />
                  Mint Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Selected NFT */}
                <div className="bg-card rounded-xl overflow-hidden">
                  <div className="relative w-full aspect-video">
                    <Image
                      src={selectedTier.image}
                      alt={selectedTier.name}
                      fill
                      className="object-contain"
                      sizes="400px"
                    />
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-muted-foreground mb-1">Selected</p>
                    <div className="flex justify-between items-center">
                      <p className="text-lg font-bold leading-tight">{selectedTier.name}</p>
                      {icoStats && icoStats.totalCreatedPerType && icoStats.totalCreatedPerType[selectedTier.id] !== undefined && icoStats.totalCreatedPerType[selectedTier.id] <= 100 && (
                        <span className="bg-purple-500/20 text-purple-400 text-xs px-2 py-1 rounded-full border border-purple-500/30 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          {t('prestige.title')}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-green-500 mt-1">+{formatNumber(selectedTier.miningRate)} FIAPO/day</p>

                    {/* Prestige Bonus Info Alert */}
                    {icoStats && (
                      <div className="mt-3 p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg text-[11px]">
                        <div className="flex items-center gap-2 mb-1">
                          <Flame className="w-3 h-3 text-purple-400" />
                          <span className="font-bold text-purple-300">{t('prestige.title')}</span>
                        </div>
                        <p className="text-purple-200/70">
                          {icoStats.totalCreatedPerType && icoStats.totalCreatedPerType[selectedTier.id] !== undefined ? (
                            icoStats.totalCreatedPerType[selectedTier.id] < 100
                              ? t('prestige.earlyAdopter', {
                                amount: formatNumber((API_CONFIG.nftTiers[selectedTier.id] as any).prestigeBonus?.first || 0),
                                remaining: 100 - icoStats.totalCreatedPerType[selectedTier.id]
                              })
                              : t('prestige.lastSurvivor')
                          ) : (
                            "Waiting for contract data..."
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quantity */}
                {selectedTier.price > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Quantity (max 5)</p>
                    <div className="flex items-center gap-4">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="text-2xl font-bold w-12 text-center">{quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
                        disabled={quantity >= maxQuantity}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Payment Method */}
                {selectedTier.price > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Payment Method</p>
                    <div className="flex gap-2">
                      {paymentMethods.map((method) => (
                        <button
                          key={method.id}
                          onClick={() => setPaymentMethod(method.id as "usdt" | "usdc")}
                          className={`flex-1 py-3 px-4 rounded-xl border-2 font-medium transition-all ${paymentMethod === method.id
                            ? "border-golden bg-golden/10 text-golden"
                            : "border-border hover:border-golden/50"
                            }`}
                        >
                          {method.icon} {method.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Wallet Connection Status */}
                {selectedTier.price > 0 && (
                  <div className="space-y-2">
                    <div className={`flex items-center gap-2 text-sm ${lunesConnected ? "text-green-500" : "text-muted-foreground"}`}>
                      <div className={`w-2 h-2 rounded-full ${lunesConnected ? "bg-green-500" : "bg-muted"}`} />
                      Lunes Wallet: {lunesConnected ? "Connected" : "Not Connected"}
                    </div>
                    <div className={`flex items-center gap-2 text-sm ${solanaConnected ? "text-green-500" : "text-muted-foreground"}`}>
                      <div className={`w-2 h-2 rounded-full ${solanaConnected ? "bg-green-500" : "bg-muted"}`} />
                      Solana Wallet: {solanaConnected ? publicKey?.toBase58().slice(0, 8) + "..." : "Not Connected"}
                    </div>
                  </div>
                )}

                {/* Total */}
                <div className="border-t border-border pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total</span>
                    <span className="text-3xl font-bold text-golden">
                      {totalPrice === 0 ? "FREE" : `$${totalPrice}`}
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div className="bg-golden/10 border border-golden/30 rounded-xl p-3 flex gap-2">
                  <Info className="w-4 h-4 text-golden shrink-0 mt-0.5" />
                  <p className="text-xs text-golden">
                    Mining starts immediately after mint. Tokens can be claimed after 112 days.
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex-col gap-3">
                {paymentStep === "success" ? (
                  // Success state
                  <div className="w-full text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                      <Check className="w-8 h-8 text-green-500" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xl font-bold text-green-500">NFT Minted Successfully!</p>
                      <p className="text-sm text-muted-foreground">Your NFT is now mining FIAPO tokens</p>
                    </div>

                    {/* Prestige Bonus Celebration */}
                    {icoStats && icoStats.totalCreatedPerType[selectedTier.id] <= 100 && (
                      <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="p-4 bg-purple-500/20 border-2 border-purple-500/50 rounded-2xl flex flex-col items-center gap-2 animate-pulse"
                      >
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-purple-400" />
                          <span className="text-lg font-black text-purple-300 uppercase tracking-tight">
                            {t('prestige.congrats')}
                          </span>
                          <Sparkles className="w-5 h-5 text-purple-400" />
                        </div>
                        <p className="text-purple-200 text-xs font-medium">{t('prestige.congratsDesc')}</p>
                      </motion.div>
                    )}

                    <Button asChild className="w-full">
                      <Link href="/ico/my-nfts">View My NFTs</Link>
                    </Button>
                  </div>
                ) : !lunesConnected ? (
                  // Need Lunes wallet
                  <Button
                    size="xl"
                    className="w-full"
                    variant="outline"
                    onClick={() => setIsLunesModalOpen(true)}
                  >
                    <Wallet className="w-5 h-5 mr-2" />
                    Connect Lunes Wallet First
                  </Button>
                ) : selectedTier.price > 0 && !solanaConnected ? (
                  // Need Solana wallet for payment - use official button
                  <div className="w-full flex justify-center">
                    <WalletMultiButton className="!bg-golden hover:!bg-golden/80 !rounded-xl !h-14 !text-background !font-bold !w-full" />
                  </div>
                ) : (
                  // Ready to mint
                  <Button
                    size="xl"
                    className="w-full glow-gold"
                    onClick={totalPrice === 0 ? handleFreeMint : handlePaidMint}
                    disabled={isProcessingPayment || isMinting || (totalPrice === 0 && cooldownRemaining > 0)}
                  >
                    {isProcessingPayment ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {paymentStep === "paying" ? "Confirm in Wallet..." : "Verifying Payment..."}
                      </>
                    ) : isMinting ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Minting Your NFT...
                      </>
                    ) : totalPrice === 0 && cooldownRemaining > 0 ? (
                      <span className="flex items-center justify-center text-yellow-500">
                        <Clock className="w-5 h-5 mr-2" />
                        Cooldown: {formatCooldown(cooldownRemaining)}
                      </span>
                    ) : (
                      <span className="flex items-center justify-center">
                        <CreditCard className="w-5 h-5 mr-2" />
                        {totalPrice === 0 ? "Claim Free NFT" : `Pay $${totalPrice} & Mint`}
                      </span>
                    )}
                  </Button>
                )}
              </CardFooter>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Lunes Wallet Modal */}
      <ConnectWalletModal
        isOpen={isLunesModalOpen}
        onClose={() => setIsLunesModalOpen(false)}
      />
    </div>
  );
}
