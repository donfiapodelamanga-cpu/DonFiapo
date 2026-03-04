"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Zap, Crown, CheckCircle2, Trophy, Users, Clock, Coins } from "lucide-react";
import { useWalletStore } from "@/lib/stores";

interface EarlyBirdStatus {
  totalAmount: number;
  maxSlots: number;
  slotsClaimed: number;
  slotsRemaining: number;
  percentFilled: number;
  lunesPerSlot: number;
  isFull: boolean;
  isActive: boolean;
  userClaim: {
    slotNumber: number;
    lunesAmount: number;
    claimedAt: string;
  } | null;
}

export function EarlyBirdBanner() {
  const { lunesAddress } = useWalletStore();
  const [status, setStatus] = useState<EarlyBirdStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const url = lunesAddress
        ? `/api/airdrop/early-bird-status?wallet=${encodeURIComponent(lunesAddress)}`
        : "/api/airdrop/early-bird-status";
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data.slotsClaimed === "number") setStatus(data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [lunesAddress]);

  useEffect(() => {
    fetchStatus();
    // Refresh every 60s
    const interval = setInterval(fetchStatus, 60_000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  if (loading || !status) return null;

  const pct = Math.min(100, status.percentFilled);
  const urgencyColor =
    pct >= 90 ? "from-red-600 to-red-400" :
    pct >= 70 ? "from-orange-500 to-amber-400" :
    "from-golden/80 to-golden";

  const progressBarColor =
    pct >= 90 ? "bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]" :
    pct >= 70 ? "bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.5)]" :
    "bg-golden shadow-[0_0_15px_rgba(201,166,91,0.4)]";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative rounded-2xl border border-[#C9A65B]/20 bg-[#14110E] overflow-hidden shadow-xl"
    >
      {/* Top glowing edge */}
      <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${urgencyColor}`} />

      <div className="p-5 md:p-7">
        {/* Header row */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#2B1E14] border border-white/5 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-golden" />
            </div>
            <div>
              <h3 className="text-xl font-bold flex items-center gap-3 font-display text-foreground">
                Early Bird Distribution
                {status.isFull && (
                  <span className="text-[10px] font-bold tracking-widest uppercase bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full">
                    Closed
                  </span>
                )}
                {!status.isFull && pct >= 90 && (
                  <span className="text-[10px] font-bold tracking-widest uppercase bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full animate-pulse">
                    Ending Soon
                  </span>
                )}
              </h3>
              <p className="text-sm text-[#B89E6A] mt-1 max-w-lg">
                First <span className="text-golden">30,000</span> users to complete a mission share{" "}
                <span className="text-golden">100,000 LUNES</span>
              </p>
            </div>
          </div>

          {/* Per slot allocation */}
          <div className="flex items-center gap-3 bg-[#2B1E14]/50 border border-white/5 rounded-xl px-4 py-2.5 shrink-0">
            <Coins className="w-4 h-4 text-[#B89E6A]" />
            <div className="text-right">
              <p className="text-[10px] text-[#B89E6A]">Per slot</p>
              <p className="font-bold text-sm text-foreground">≈{status.lunesPerSlot.toFixed(2)} LUNES</p>
            </div>
          </div>
        </div>

        {/* Progress bar section */}
        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-[#B89E6A]">
            <span className="flex items-center gap-1.5 text-[11px]">
              <Users className="w-3.5 h-3.5 opacity-60" />
              {status.slotsClaimed.toLocaleString("en-US")} slots claimed
            </span>
            <span className={`text-[11px] ${status.isFull ? "text-red-500" : pct >= 70 ? "text-orange-400" : "text-[#B89E6A]"}`}>
              {status.slotsRemaining.toLocaleString("en-US")} remaining
            </span>
          </div>
          <div className="h-1.5 w-full bg-[#2B1E14] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className={`h-full rounded-full ${progressBarColor}`}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-[#B89E6A]/50">
            <span>0</span>
            <span>{pct.toFixed(1)}% filled</span>
            <span>30,000</span>
          </div>
        </div>
      </div>

      {/* Tabular Stats Row */}
      <div className="grid grid-cols-3 border-y border-white/5 bg-[#1A1612]">
        <div className="p-4 text-center border-r border-white/5">
          <p className="text-[11px] text-[#B89E6A] mb-1">Total Pool</p>
          <p className="font-bold text-base text-foreground">100,000 <span className="text-xs text-[#B89E6A]">LUNES</span></p>
        </div>
        <div className="p-4 text-center border-r border-white/5">
          <p className="text-[11px] text-[#B89E6A] mb-1">Slots Filled</p>
          <p className="font-bold text-base text-foreground">{status.slotsClaimed.toLocaleString("en-US")}</p>
        </div>
        <div className="p-4 text-center">
          <p className="text-[11px] text-[#B89E6A] mb-1">Available</p>
          <p className={`font-bold text-base ${status.isFull ? "text-red-500" : "text-green-400"}`}>
            {status.isFull ? "0" : status.slotsRemaining.toLocaleString("en-US")}
          </p>
        </div>
      </div>

      {/* Action / User Status Area */}
      <div className="p-5 md:p-6 bg-[#14110E]">
        {status.userClaim ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-3"
          >
            <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
            <p className="text-sm text-[#B89E6A]">
              Slot <span className="text-foreground">#{status.userClaim.slotNumber.toLocaleString("en-US")}</span> secured. You will receive <span className="text-golden font-bold">≈{status.userClaim.lunesAmount.toFixed(2)} LUNES</span>.
            </p>
          </motion.div>
        ) : status.isFull ? (
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-red-500 shrink-0" />
            <p className="text-sm text-red-300/80">
              All 30,000 slots are claimed.
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-[#B89E6A] shrink-0" />
            <p className="text-sm text-[#B89E6A]">
              Complete any mission to automatically secure your Early Bird slot and <span className="text-golden font-bold">≈{status.lunesPerSlot.toFixed(2)} LUNES</span> allocation.
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
