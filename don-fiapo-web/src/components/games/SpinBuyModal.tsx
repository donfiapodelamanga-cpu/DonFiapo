"use client";

import { FC, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, CheckCircle2, AlertCircle, ExternalLink, Wallet, ShieldCheck } from "lucide-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWalletStore } from "@/lib/stores";
import { useSolana } from "@/hooks/useSolana";
import { API_CONFIG } from "@/lib/api/config";
import { cn } from "@/lib/utils";

export interface SpinPackage {
  spins: number;
  price: number;
}

interface SpinBuyModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPackage: SpinPackage | null;
  onSpinsGranted: (spins: number) => void;
}

type Step = "connect" | "confirm" | "signing" | "confirming" | "success" | "error";

// Fallback treasury wallet
const TREASURY_FALLBACK = process.env.NEXT_PUBLIC_TREASURY_SOLANA || API_CONFIG.solana.receiverWallet;

export const SpinBuyModal: FC<SpinBuyModalProps> = ({
  isOpen, onClose, selectedPackage, onSpinsGranted,
}) => {
  const { lunesAddress, lunesConnected } = useWalletStore();
  const solana = useSolana();

  const [step, setStep] = useState<Step>("connect");
  const [txHash, setTxHash] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [usdtBalance, setUsdtBalance] = useState<number | null>(null);
  const [treasuryWallet, setTreasuryWallet] = useState(TREASURY_FALLBACK);

  // Fetch treasury wallet from admin system wallets
  useEffect(() => {
    import("@/lib/api/system-wallets").then(({ getSystemWalletAddress }) => {
      getSystemWalletAddress("spin_revenue").then((addr) => {
        if (addr) setTreasuryWallet(addr);
      });
    });
  }, []);

  // Reset when opening
  useEffect(() => {
    if (isOpen) {
      setStep(solana.connected ? "confirm" : "connect");
      setTxHash("");
      setErrorMsg("");
      setUsdtBalance(null);
    }
  }, [isOpen, solana.connected]);

  // When Solana wallet connects, move to confirm step and fetch balance
  useEffect(() => {
    if (isOpen && solana.connected) {
      setStep("confirm");
      solana.getTokenBalance("usdt").then(setUsdtBalance).catch(() => null);
    }
  }, [isOpen, solana.connected]);

  // ── Pay with Phantom/Solflare ──────────────────────────────────────────────

  const handlePay = useCallback(async () => {
    if (!selectedPackage || !lunesAddress || !solana.isReady) return;

    setStep("signing");
    setErrorMsg("");

    try {
      // 1. Register pending purchase in DB
      const paymentId = `spin_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await fetch("/api/games/spin/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: lunesAddress,
          spins: selectedPackage.spins,
          priceUsdt: selectedPackage.price,
          paymentId,
          payToAddress: treasuryWallet,
        }),
      });

      // 2. Send USDT via Solana wallet (opens Phantom/Solflare to sign)
      const result = await solana.sendUSDT(selectedPackage.price, treasuryWallet);

      if (!result.success) {
        throw new Error("Transaction failed");
      }

      setTxHash(result.signature);
      setStep("confirming");

      // 3. Confirm purchase in backend (grant spins)
      const confirmRes = await fetch("/api/games/spin/purchase", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, solanaTxHash: result.signature }),
      });
      const confirmData = await confirmRes.json();

      if (confirmData.success) {
        setStep("success");
        onSpinsGranted(confirmData.spinsGranted);
      } else {
        throw new Error("Failed to confirm purchase");
      }
    } catch (err: any) {
      const msg = err?.message || "Transaction failed";
      // User rejected in wallet
      if (msg.includes("User rejected") || msg.includes("rejected")) {
        setErrorMsg("Transaction cancelled by user.");
      } else if (msg.includes("insufficient") || msg.includes("Insufficient")) {
        setErrorMsg("Insufficient USDT balance in your Solana wallet.");
      } else {
        setErrorMsg(msg);
      }
      setStep("error");
    }
  }, [selectedPackage, lunesAddress, solana, onSpinsGranted]);

  if (!isOpen || !selectedPackage) return null;

  const hasEnoughBalance = usdtBalance !== null && usdtBalance >= selectedPackage.price;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={step !== "signing" && step !== "confirming" ? onClose : undefined}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="relative w-full max-w-md bg-neutral-950 border border-golden/20 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
              <div>
                <p className="font-bold text-golden text-lg">Buy Spins</p>
                <p className="text-xs text-neutral-500">
                  {selectedPackage.spins} spin{selectedPackage.spins > 1 ? "s" : ""} · {selectedPackage.price.toFixed(2)} USDT
                </p>
              </div>
              {step !== "signing" && step !== "confirming" && (
                <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Body */}
            <div className="px-6 py-5">

              {/* ── Step: Connect Solana Wallet ── */}
              {step === "connect" && (
                <div className="flex flex-col items-center gap-4 py-4">
                  <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center ring-1 ring-purple-500/30">
                    <Wallet className="w-8 h-8 text-purple-400" />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-white text-lg">Connect Solana Wallet</p>
                    <p className="text-sm text-neutral-400 mt-1">
                      Connect Phantom or Solflare to pay with USDT
                    </p>
                  </div>

                  {!lunesConnected && (
                    <div className="w-full bg-yellow-500/5 border border-yellow-500/20 rounded-xl px-4 py-3">
                      <p className="text-xs text-yellow-400 text-center">
                        You also need a Lunes wallet connected to receive spins.
                      </p>
                    </div>
                  )}

                  <div className="w-full flex justify-center [&_button]:!bg-purple-600 [&_button]:!rounded-xl [&_button]:!py-3 [&_button]:!px-6 [&_button]:!font-bold [&_button]:!text-sm">
                    <WalletMultiButton />
                  </div>

                  <p className="text-[10px] text-neutral-600 text-center">
                    Supports Phantom, Solflare, Backpack and other Solana wallets
                  </p>
                </div>
              )}

              {/* ── Step: Confirm Purchase ── */}
              {step === "confirm" && (
                <div className="space-y-4">
                  <div className="bg-neutral-900 rounded-xl p-4 space-y-2.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-400">Package</span>
                      <span className="font-bold text-white">{selectedPackage.spins} spins</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-400">Price</span>
                      <span className="font-bold text-golden">{selectedPackage.price.toFixed(2)} USDT</span>
                    </div>
                    <div className="border-t border-neutral-800 my-1" />
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-400">Pay from</span>
                      <span className="text-purple-400 font-mono text-xs">
                        {solana.address?.slice(0, 6)}…{solana.address?.slice(-4)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-400">USDT Balance</span>
                      {usdtBalance !== null ? (
                        <span className={cn("font-bold", hasEnoughBalance ? "text-green-400" : "text-red-400")}>
                          {usdtBalance.toFixed(2)} USDT
                        </span>
                      ) : (
                        <Loader2 className="w-4 h-4 text-neutral-500 animate-spin" />
                      )}
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-400">Receive at (Lunes)</span>
                      <span className="text-neutral-300 font-mono text-xs">
                        {lunesAddress?.slice(0, 6)}…{lunesAddress?.slice(-4)}
                      </span>
                    </div>
                  </div>

                  {usdtBalance !== null && !hasEnoughBalance && (
                    <div className="bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3">
                      <p className="text-xs text-red-400 text-center">
                        Insufficient balance. You need {selectedPackage.price.toFixed(2)} USDT but have {usdtBalance.toFixed(2)} USDT.
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-2 bg-neutral-900/50 rounded-lg px-3 py-2">
                    <ShieldCheck className="w-4 h-4 text-green-500 shrink-0" />
                    <p className="text-[11px] text-neutral-500">
                      Your wallet will open to sign the USDT transfer. Spins are credited instantly.
                    </p>
                  </div>

                  <button
                    onClick={handlePay}
                    disabled={!hasEnoughBalance || !lunesConnected}
                    className={cn(
                      "w-full font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2",
                      hasEnoughBalance && lunesConnected
                        ? "bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-purple-500/20"
                        : "bg-neutral-800 text-neutral-600 cursor-not-allowed"
                    )}
                  >
                    <Wallet className="w-4.5 h-4.5" />
                    Pay {selectedPackage.price.toFixed(2)} USDT
                  </button>

                  <button
                    onClick={() => setStep("connect")}
                    className="w-full text-xs text-neutral-500 hover:text-purple-400 transition-colors py-1"
                  >
                    Change Solana wallet
                  </button>
                </div>
              )}

              {/* ── Step: Signing in wallet ── */}
              {step === "signing" && (
                <div className="flex flex-col items-center gap-4 py-8">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center animate-pulse">
                      <Wallet className="w-8 h-8 text-purple-400" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-neutral-950 flex items-center justify-center">
                      <Loader2 className="w-4 h-4 text-golden animate-spin" />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-neutral-200 font-bold">Approve in your wallet</p>
                    <p className="text-xs text-neutral-500 mt-1">
                      Confirm the {selectedPackage.price.toFixed(2)} USDT transfer in Phantom or Solflare
                    </p>
                  </div>
                  <div className="w-full bg-yellow-500/5 border border-yellow-500/20 rounded-xl px-4 py-2.5 text-center">
                    <p className="text-[11px] text-yellow-400">
                      Do not close this window while the transaction is processing
                    </p>
                  </div>
                </div>
              )}

              {/* ── Step: Confirming on-chain ── */}
              {step === "confirming" && (
                <div className="flex flex-col items-center gap-4 py-8">
                  <Loader2 className="w-10 h-10 text-golden animate-spin" />
                  <div className="text-center">
                    <p className="text-neutral-200 font-bold">Confirming transaction…</p>
                    <p className="text-xs text-neutral-500 mt-1">
                      Waiting for blockchain confirmation and crediting spins
                    </p>
                  </div>
                  {txHash && (
                    <a
                      href={`https://solscan.io/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-golden transition-colors"
                    >
                      View on Solscan <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}

              {/* ── Step: Success ── */}
              {step === "success" && (
                <div className="flex flex-col items-center gap-4 py-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                    <CheckCircle2 className="w-9 h-9 text-green-400" />
                  </div>
                  <div>
                    <p className="text-xl font-black text-green-400">Payment Confirmed!</p>
                    <p className="text-neutral-400 text-sm mt-1">
                      <span className="text-golden font-bold">{selectedPackage.spins} spins</span> have been added to your balance.
                    </p>
                  </div>
                  {txHash && (
                    <a
                      href={`https://solscan.io/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-golden transition-colors"
                    >
                      View on Solscan <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  <button
                    onClick={onClose}
                    className="w-full bg-golden hover:bg-golden/90 text-black font-bold py-3 rounded-xl transition-all hover:scale-[1.02]"
                  >
                    Spin Now!
                  </button>
                </div>
              )}

              {/* ── Step: Error ── */}
              {step === "error" && (
                <div className="flex flex-col items-center gap-4 py-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                    <AlertCircle className="w-9 h-9 text-red-400" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-red-400">Payment Failed</p>
                    <p className="text-neutral-400 text-sm mt-1">
                      {errorMsg || "Unable to process transaction. Please try again."}
                    </p>
                  </div>
                  <div className="flex gap-3 w-full">
                    <button
                      onClick={() => setStep("confirm")}
                      className="flex-1 border border-golden/40 text-golden font-bold py-3 rounded-xl hover:bg-golden/10 transition-all"
                    >
                      Try Again
                    </button>
                    <button
                      onClick={onClose}
                      className="flex-1 bg-neutral-800 text-neutral-400 font-bold py-3 rounded-xl hover:bg-neutral-700 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
