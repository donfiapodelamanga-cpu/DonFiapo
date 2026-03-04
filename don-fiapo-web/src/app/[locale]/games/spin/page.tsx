"use client";

import { FC, useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Ticket, Trophy, Zap, Crown, RefreshCw, ChevronRight, Star, X, CheckCircle2, Wallet, Lock } from 'lucide-react';
import { SpinBuyModal, SpinPackage } from '@/components/games/SpinBuyModal';
import { useWalletStore } from '@/lib/stores';
import { cn } from '@/lib/utils';

// ── Prize definitions ────────────────────────────────────────────────────────

interface Prize {
  index: number;
  label: string;
  sublabel: string;
  color: string;
  bgColor: string;
  tier: 'jackpot' | 'rare' | 'uncommon' | 'common' | 'miss';
}

const PRIZES: Prize[] = [
  { index: 0, label: '100K', sublabel: 'FIAPO', color: '#FFD700', bgColor: '#7C5C00', tier: 'jackpot' },
  { index: 1, label: '50K', sublabel: 'FIAPO', color: '#FFA500', bgColor: '#6B3A00', tier: 'rare' },
  { index: 2, label: '0.5', sublabel: 'FIAPO', color: '#1ABC9C', bgColor: '#0D5C4A', tier: 'common' },
  { index: 3, label: '5', sublabel: 'USDT', color: '#27AE60', bgColor: '#0D4A1E', tier: 'rare' },
  { index: 4, label: '1K', sublabel: 'FIAPO', color: '#3498DB', bgColor: '#0D2E4A', tier: 'uncommon' },
  { index: 5, label: '0.5', sublabel: 'FIAPO', color: '#1ABC9C', bgColor: '#0D5C4A', tier: 'common' },
  { index: 6, label: '1', sublabel: 'USDT', color: '#2ECC71', bgColor: '#0D4A22', tier: 'uncommon' },
  { index: 7, label: '+1', sublabel: 'SPIN', color: '#F39C12', bgColor: '#5C3900', tier: 'uncommon' },
  { index: 8, label: '0.5', sublabel: 'FIAPO', color: '#1ABC9C', bgColor: '#0D5C4A', tier: 'common' },
  { index: 9, label: '100', sublabel: 'FIAPO', color: '#9B59B6', bgColor: '#3D1A5C', tier: 'uncommon' },
  { index: 10, label: '1', sublabel: 'LUNES', color: '#E67E22', bgColor: '#5C3200', tier: 'uncommon' },
  { index: 11, label: 'MISS', sublabel: 'Try again', color: '#607D8B', bgColor: '#263238', tier: 'miss' },
];

const NUM_SEGMENTS = PRIZES.length;
const SEGMENT_ANGLE = 360 / NUM_SEGMENTS;
const SPIN_DURATION = 4200;

const FREE_SPINS = 3;

// ── SVG Wheel ────────────────────────────────────────────────────────────────

const WheelSVG: FC<{ rotation: number; isSpinning: boolean; onSpin: () => void; disabled: boolean }> = ({
  rotation, isSpinning, onSpin, disabled,
}) => {
  const cx = 200;
  const cy = 200;
  const R = 190;
  const innerR = 52;

  const segments = PRIZES.map((prize, i) => {
    const startAngle = (i * SEGMENT_ANGLE - 90) * (Math.PI / 180);
    const endAngle = ((i + 1) * SEGMENT_ANGLE - 90) * (Math.PI / 180);
    const x1 = cx + R * Math.cos(startAngle);
    const y1 = cy + R * Math.sin(startAngle);
    const x2 = cx + R * Math.cos(endAngle);
    const y2 = cy + R * Math.sin(endAngle);
    const xi1 = cx + innerR * Math.cos(startAngle);
    const yi1 = cy + innerR * Math.sin(startAngle);
    const xi2 = cx + innerR * Math.cos(endAngle);
    const yi2 = cy + innerR * Math.sin(endAngle);
    const d = `M ${xi1} ${yi1} L ${x1} ${y1} A ${R} ${R} 0 0 1 ${x2} ${y2} L ${xi2} ${yi2} A ${innerR} ${innerR} 0 0 0 ${xi1} ${yi1} Z`;

    const midAngle = ((i + 0.5) * SEGMENT_ANGLE - 90) * (Math.PI / 180);
    const textR = (R + innerR) / 2;
    const tx = cx + textR * Math.cos(midAngle);
    const ty = cy + textR * Math.sin(midAngle);
    const textAngle = (i + 0.5) * SEGMENT_ANGLE;

    return { prize, d, tx, ty, textAngle };
  });

  return (
    <div className="relative flex items-center justify-center select-none" style={{ width: 420, height: 420 }}>
      {/* Outer glow ring */}
      <div className="absolute inset-0 rounded-full"
        style={{ boxShadow: isSpinning ? '0 0 60px 12px rgba(212,175,55,0.4)' : '0 0 30px 6px rgba(212,175,55,0.15)', transition: 'box-shadow 0.6s' }} />

      {/* Pointer */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30 -translate-y-1" style={{ filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.7))' }}>
        <svg width="28" height="40" viewBox="0 0 28 40">
          <polygon points="14,2 26,36 14,28 2,36" fill="#D4AF37" stroke="#7C5C00" strokeWidth="2" />
        </svg>
      </div>

      {/* Wheel */}
      <div
        className="relative rounded-full overflow-hidden shadow-2xl"
        style={{
          width: 400, height: 400,
          transform: `rotate(${rotation}deg)`,
          transition: isSpinning ? `transform ${SPIN_DURATION}ms cubic-bezier(0.17,0.67,0.12,0.99)` : 'none',
        }}
      >
        <svg width="400" height="400" viewBox="0 0 400 400">
          <defs>
            {PRIZES.map((p) => (
              <radialGradient key={p.index} id={`grad-${p.index}`} cx="60%" cy="40%" r="70%">
                <stop offset="0%" stopColor={p.color} stopOpacity="0.3" />
                <stop offset="100%" stopColor={p.bgColor} stopOpacity="1" />
              </radialGradient>
            ))}
          </defs>

          {/* Outer border ring */}
          <circle cx="200" cy="200" r="198" fill="none" stroke="#D4AF37" strokeWidth="4" />

          {segments.map(({ prize, d, tx, ty, textAngle }) => (
            <g key={prize.index}>
              <path d={d} fill={`url(#grad-${prize.index})`} stroke="#D4AF37" strokeWidth="1.5" />
              <g transform={`translate(${tx},${ty}) rotate(${textAngle})`}>
                <text textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="13" fontWeight="bold" fontFamily="system-ui" dy="-7"
                  style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                  {prize.label}
                </text>
                <text textAnchor="middle" dominantBaseline="middle" fill={prize.color} fontSize="9" fontWeight="600" fontFamily="system-ui" dy="8"
                  opacity="0.9">
                  {prize.sublabel}
                </text>
              </g>
            </g>
          ))}

          {/* Inner hub ring */}
          <circle cx="200" cy="200" r={innerR + 4} fill="#0a0a0a" stroke="#D4AF37" strokeWidth="3" />
          <circle cx="200" cy="200" r={innerR - 2} fill="#111" />
        </svg>
      </div>

      {/* Center button */}
      <button
        onClick={onSpin}
        disabled={disabled || isSpinning}
        data-spin-button
        className={cn(
          "absolute z-20 w-24 h-24 rounded-full flex flex-col items-center justify-center gap-0.5 transition-all duration-300 font-bold",
          "border-4 border-golden shadow-lg",
          disabled || isSpinning
            ? "bg-neutral-900 opacity-60 cursor-not-allowed"
            : "bg-background hover:bg-golden/10 hover:scale-105 active:scale-95 cursor-pointer"
        )}
        style={{ boxShadow: !disabled && !isSpinning ? '0 0 20px rgba(212,175,55,0.4)' : 'none' }}
      >
        {isSpinning ? (
          <RefreshCw className="w-8 h-8 text-golden animate-spin" />
        ) : (
          <>
            <Sparkles className="w-5 h-5 text-golden" />
            <span className="text-golden text-sm font-display font-bold leading-none">SPIN</span>
          </>
        )}
      </button>
    </div>
  );
};

// ── Prize Result Toast ───────────────────────────────────────────────────────

const PrizeToast: FC<{ prize: Prize | null; onDismiss: () => void }> = ({ prize, onDismiss }) => (
  <AnimatePresence>
    {prize && (
      <motion.div
        initial={{ opacity: 0, scale: 0.7, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: -10 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        className="relative rounded-2xl border p-4 text-center overflow-hidden"
        style={{ borderColor: prize.color + '60', background: prize.bgColor + 'cc' }}
      >
        {/* Shimmer bg */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

        {prize.tier === 'jackpot' && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2">
            <span className="text-xs font-bold px-3 py-0.5 rounded-full bg-golden text-black animate-pulse">⚡ JACKPOT!</span>
          </div>
        )}

        <div className="mt-3">
          <p className="text-xs font-medium opacity-60 mb-1">You won</p>
          <p className="text-4xl font-black leading-none" style={{ color: prize.color }}>{prize.label}</p>
          <p className="text-sm font-bold opacity-80" style={{ color: prize.color }}>{prize.sublabel}</p>
        </div>

        <button onClick={onDismiss} className="absolute top-2 right-2 opacity-40 hover:opacity-80 transition-opacity">
          <X className="w-4 h-4" />
        </button>
      </motion.div>
    )}
  </AnimatePresence>
);

// ── Spin packages ────────────────────────────────────────────────────────────

const spinPackages: SpinPackage[] = [
  { spins: 1, price: 1.00 },
  { spins: 10, price: 9.00 },
  { spins: 50, price: 40.00 },
  { spins: 100, price: 75.00 },
  { spins: 500, price: 300.00 },
];

const TIER_ICON: Record<string, typeof Star> = {
  jackpot: Crown,
  rare: Trophy,
  uncommon: Zap,
  common: Star,
  miss: X,
};

// ── Main Page ────────────────────────────────────────────────────────────────

const SpinPage: FC = () => {
  const { lunesAddress, lunesConnected } = useWalletStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<SpinPackage | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [spinBalance, setSpinBalance] = useState(0);
  const [lastPrize, setLastPrize] = useState<Prize | null>(null);
  const [totalSpins, setTotalSpins] = useState(0);
  const [winHistory, setWinHistory] = useState<Prize[]>([]);
  const [missionToast, setMissionToast] = useState<{ points: number; message: string } | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const accRotation = useRef(0);

  // Fetch real spin balance from API — requires wallet connection
  useEffect(() => {
    if (lunesConnected && lunesAddress) {
      setBalanceLoading(true);
      fetch(`/api/games/spin?wallet=${encodeURIComponent(lunesAddress)}`)
        .then(res => res.json())
        .then(data => {
          setSpinBalance(data.spinBalance ?? FREE_SPINS);
          setTotalSpins(data.totalSpins ?? 0);
        })
        .catch(() => {
          setSpinBalance(FREE_SPINS);
        })
        .finally(() => setBalanceLoading(false));
    } else {
      // Not connected — show 0 spins, prompt to connect
      setSpinBalance(0);
      setTotalSpins(0);
      setBalanceLoading(false);
    }
  }, [lunesConnected, lunesAddress]);

  /**
   * Compute the wheel rotation needed to place segment `prizeIndex` under the pointer.
   *
   * Geometry:
   * - SVG draws segment 0 starting at -90° (12 o'clock position).
   * - Segments go clockwise: seg 0 spans [0°,30°), seg 1 spans [30°,60°), etc.
   *   (All measured as CW offset from the 12 o'clock position.)
   * - The pointer is fixed at 12 o'clock.
   * - CSS `rotate(X deg)` rotates the wheel CW by X degrees.
   * - After rotating X° CW, the part of the wheel that was at "X° CW from 12" is now at 12.
   *
   * So to put the center of segment i under the pointer:
   *   X%360 = 360 - (i * SEGMENT_ANGLE + SEGMENT_ANGLE / 2)
   *
   * Verification: after the wheel stops at X degrees total,
   * the segment under the pointer is:
   *   normalised = X % 360
   *   segIndex   = floor((360 - normalised) / SEGMENT_ANGLE) % N
   */
  const computeRotation = useCallback((prizeIndex: number): number => {
    // Empirically verified formula:
    // CSS rotate(X deg) spins the wheel CW. After rotation, the segment
    // at the top (pointer) is: floor((360 - X%360) / SEGMENT_ANGLE) % N.
    // To land on segment i: X%360 = 360 - (i*SEGMENT_ANGLE + SEGMENT_ANGLE/2)
    const segCenterFromTop = prizeIndex * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
    const jitter = (Math.random() - 0.5) * (SEGMENT_ANGLE * 0.6); // ±9°
    const targetAngle = ((360 - segCenterFromTop + jitter) % 360 + 360) % 360;

    const fullSpins = (5 + Math.floor(Math.random() * 3)) * 360;
    const currentMod = ((accRotation.current % 360) + 360) % 360;
    const forwardDelta = ((targetAngle - currentMod) % 360 + 360) % 360;
    const totalDelta = fullSpins + (forwardDelta === 0 ? 360 : forwardDelta);
    accRotation.current += totalDelta;

    // Verification: which segment index does the final angle resolve to?
    const finalMod = ((accRotation.current % 360) + 360) % 360;
    const resolvedIndex = Math.floor(((360 - finalMod) % 360 + 360) % 360 / SEGMENT_ANGLE) % NUM_SEGMENTS;
    console.log(
      `[SPIN] target=seg${prizeIndex}(${PRIZES[prizeIndex].label}) → angle=${accRotation.current.toFixed(1)}° mod360=${finalMod.toFixed(1)}° → resolved=seg${resolvedIndex}(${PRIZES[resolvedIndex].label}) ${resolvedIndex === prizeIndex ? '✅' : '❌ MISMATCH'}`
    );

    return accRotation.current;
  }, []);

  const handleSpin = useCallback(async () => {
    // Must be connected to spin
    if (!lunesConnected || !lunesAddress) return;
    if (spinBalance <= 0 || isSpinning) return;

    setIsSpinning(true);
    setLastPrize(null);
    setSpinBalance(prev => prev - 1);
    setTotalSpins(prev => prev + 1);

    let prizeIndex: number = 11; // MISS fallback
    let missionData: {
      missionCompleted?: boolean;
      earnedPoints?: number;
      message?: string;
      bonusSpinGranted?: boolean;
      pendingUsdtReward?: number | null;
    } = {};

    // ── Server-side RNG (secure, all prizes via contract rules) ──
    try {
      const res = await fetch('/api/games/spin/roll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: lunesAddress }),
      });
      const data = await res.json();
      if (res.ok && typeof data.prizeIndex === 'number') {
        prizeIndex = data.prizeIndex;
        missionData = data;

        // FIX 2: +1 SPIN prize → credit a free spin back to the balance immediately
        if (data.bonusSpinGranted) {
          setSpinBalance(prev => prev + 1);
        }
      }
    } catch {
      // Network error — default to MISS
    }

    const prize = PRIZES[prizeIndex];
    const finalRotation = computeRotation(prizeIndex);
    setRotation(finalRotation);

    setTimeout(() => {
      setIsSpinning(false);
      setLastPrize(prize);
      if (prize.tier !== 'miss') {
        setWinHistory(prev => [prize, ...prev].slice(0, 5));
      }
      if (missionData.missionCompleted && missionData.earnedPoints) {
        setMissionToast({ points: missionData.earnedPoints, message: missionData.message ?? '' });
        setTimeout(() => setMissionToast(null), 5000);
      }
      // FIX 3: USDT toast — show pending distribution message
      if (missionData.pendingUsdtReward && missionData.pendingUsdtReward > 0) {
        setMissionToast({ points: 0, message: `💵 $${missionData.pendingUsdtReward} USDT — queued for distribution to your wallet!` });
        setTimeout(() => setMissionToast(null), 7000);
      }
    }, SPIN_DURATION + 200);
  }, [spinBalance, isSpinning, lunesConnected, lunesAddress, computeRotation]);

  const handlePackageSelect = (pkg: SpinPackage) => {
    setSelectedPackage(pkg);
    setIsModalOpen(true);
  };

  const handleSpinsGranted = useCallback((spins: number) => {
    setSpinBalance(prev => prev + spins);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden pt-28 pb-16 bg-background">
      {/* Background */}
      <div className="absolute inset-0 bg-repeat bg-center opacity-[0.03]" style={{ backgroundImage: 'url(/images/hero-bg.png)' }} />
      <div className="absolute inset-0 bg-gradient-to-b from-golden/5 via-transparent to-transparent pointer-events-none" />

      <div className="container mx-auto px-4 relative max-w-6xl">
        {/* Header */}
        <div className="text-center mb-10">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="inline-flex items-center gap-2 bg-golden/10 border border-golden/30 rounded-full px-4 py-1.5 text-golden text-xs font-semibold mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              Royal Fortune Wheel
            </div>
            <h1 className="text-5xl md:text-6xl font-bold font-display text-golden drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
              Spin & Win
            </h1>
            <p className="text-foreground/60 mt-2 max-w-md mx-auto text-sm">
              Spin the wheel for a chance to win FIAPO, USDT, and exclusive point boosts.
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* ── Wheel column ── */}
          <motion.div
            className="lg:col-span-7 flex flex-col items-center gap-6"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <WheelSVG
              rotation={rotation}
              isSpinning={isSpinning}
              onSpin={handleSpin}
              disabled={spinBalance <= 0}
            />

            {/* Not connected → prompt to connect wallet */}
            {!lunesConnected && !isSpinning && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="w-full max-w-sm bg-card border-2 border-golden/40 rounded-2xl p-5 text-center relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-golden/5 to-transparent pointer-events-none" />
                <Lock className="w-8 h-8 text-golden mx-auto mb-3" />
                <h3 className="text-lg font-bold text-golden mb-1">Connect to Play</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Connect your Lunes wallet to get 3 free spins and start winning real prizes!
                </p>
                <button
                  onClick={() => {
                    const btn = document.querySelector('[data-wallet-connect]') as HTMLButtonElement;
                    if (btn) btn.click();
                  }}
                  className="inline-flex items-center justify-center gap-2 bg-golden hover:bg-golden/90 text-black font-bold px-6 py-2.5 rounded-full transition-all hover:scale-105"
                >
                  <Wallet className="w-4 h-4" /> Connect Wallet
                </button>
              </motion.div>
            )}

            {/* Connected but no spins → Buy Spins */}
            {lunesConnected && spinBalance <= 0 && !isSpinning && !balanceLoading && (
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">No spins left</p>
                <button
                  onClick={() => handlePackageSelect(spinPackages[0])}
                  className="inline-flex items-center gap-2 bg-golden hover:bg-golden/90 text-black font-bold px-6 py-2.5 rounded-full transition-all hover:scale-105"
                >
                  <Ticket className="w-4 h-4" /> Buy Spins
                </button>
              </div>
            )}

            {/* Prize toast */}
            <div className="w-full max-w-sm">
              <PrizeToast prize={lastPrize} onDismiss={() => setLastPrize(null)} />
            </div>

            {/* Mission completion toast */}
            <AnimatePresence>
              {missionToast && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="w-full max-w-sm flex items-center gap-3 bg-green-900/60 border border-green-500/40 rounded-2xl px-4 py-3"
                >
                  <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                  <div>
                    <p className="text-green-300 font-bold text-sm">Mission Complete!</p>
                    <p className="text-green-400/80 text-xs">+{missionToast.points} points earned</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* ── Right panel ── */}
          <motion.div
            className="lg:col-span-5 flex flex-col gap-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            {/* Spin balance card */}
            <div className="bg-card/60 backdrop-blur-sm border border-golden/20 rounded-2xl p-5 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-golden/5 to-transparent pointer-events-none" />
              {!lunesConnected && (
                <div className="mb-2">
                  <span className="text-[10px] bg-golden/20 text-golden border border-golden/30 font-bold px-2 py-0.5 rounded-full">
                    CONNECT WALLET TO PLAY
                  </span>
                </div>
              )}
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mb-1">Spins Available</p>
              <p className={cn("text-7xl font-black leading-none tabular-nums", !lunesConnected || spinBalance === 0 ? "text-muted-foreground" : "text-golden")}
                style={{ textShadow: lunesConnected && spinBalance > 0 ? '0 0 20px rgba(212,175,55,0.4)' : 'none' }}>
                {balanceLoading ? '…' : lunesConnected ? spinBalance : '—'}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {lunesConnected ? `${totalSpins} total spins played` : '3 free spins on first connection'}
              </p>
            </div>

            {/* Buy spins */}
            <div className="bg-card/60 backdrop-blur-sm border border-golden/20 rounded-2xl p-5">
              <h3 className="font-bold text-sm text-golden uppercase tracking-widest flex items-center gap-2 mb-4">
                <Ticket className="w-4 h-4" /> Buy Spins
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {spinPackages.map((pkg, i) => (
                  <button
                    key={pkg.spins}
                    onClick={() => handlePackageSelect(pkg)}
                    className={cn(
                      "group flex items-center justify-between px-4 py-2.5 rounded-xl border transition-all duration-200",
                      i === 2
                        ? "border-golden bg-golden/10 hover:bg-golden/20"
                        : "border-golden/20 bg-transparent hover:border-golden/50 hover:bg-golden/5"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {i === 2 && <span className="text-[10px] bg-golden text-black font-bold px-1.5 py-0.5 rounded">BEST</span>}
                      <span className="font-bold text-foreground">
                        {pkg.spins} {pkg.spins === 1 ? 'spin' : 'spins'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-golden font-bold">{pkg.price.toFixed(2)} USDT</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-golden transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Recent wins */}
            {winHistory.length > 0 && (
              <div className="bg-card/60 backdrop-blur-sm border border-golden/20 rounded-2xl p-5">
                <h3 className="font-bold text-sm text-golden uppercase tracking-widest mb-3">Recent Wins</h3>
                <div className="space-y-2">
                  {winHistory.map((prize, i) => {
                    const Icon = TIER_ICON[prize.tier] ?? Star;
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg bg-background/40"
                      >
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: prize.bgColor }}>
                          <Icon className="w-3.5 h-3.5" style={{ color: prize.color }} />
                        </div>
                        <span className="text-sm font-bold" style={{ color: prize.color }}>{prize.label}</span>
                        <span className="text-xs text-muted-foreground">{prize.sublabel}</span>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Prize table */}
            <div className="bg-card/60 backdrop-blur-sm border border-golden/20 rounded-2xl p-5">
              <h3 className="font-bold text-sm text-golden uppercase tracking-widest mb-3">Prize Table</h3>
              <div className="space-y-1.5">
                {PRIZES.filter(p => p.tier !== 'miss').map(prize => {
                  const Icon = TIER_ICON[prize.tier] ?? Star;
                  return (
                    <div key={prize.index} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Icon className="w-3 h-3" style={{ color: prize.color }} />
                        <span className="font-medium" style={{ color: prize.color }}>{prize.label} {prize.sublabel}</span>
                      </div>
                      <span className="text-muted-foreground capitalize">{prize.tier}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <SpinBuyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedPackage={selectedPackage}
        onSpinsGranted={handleSpinsGranted}
      />
    </div>
  );
};

export default SpinPage;
