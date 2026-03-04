import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "crypto";
import { db } from "@/lib/db";
import { findOrCreateUserByWallet } from "@/lib/missions/service";
import { calculateMissionPoints, calculateTotalScore, calculateRank } from "@/lib/missions/score-engine";
import { tryClaimEarlyBirdSlot } from "@/lib/missions/early-bird";
import { rateLimit, validateWalletOrError } from "@/lib/security";
import { sendUsdtToUser, sendLunesToUser } from "@/lib/prizes/payout";

const SPIN_MISSION_ID = "m-spin-game";

// ══════════════════════════════════════════════════════════════════════════════
// PRIZE TABLE — Optimized for REVENUE CAPTURE
//
// Strategy: Wheel looks exciting and generous, but real cost is very low.
//   - "Jackpot" (100K FIAPO) = marketing hook, costs ~$0.10 at $0.00001
//   - USDT prizes tiny (max $5), heavily capped
//   - Most spins land on 0.5 FIAPO (~$0), +1 SPIN (free), or MISS
//   - Revenue per spin avg ~$0.07 → EV payout ~$0.003 → 95%+ margin
//
// ┌─────────────────┬────────┬──────────┬──────────┬─────────────────────────┐
// │ Segment         │ Weight │ Prob %   │ DailyCap │ Real cost               │
// ├─────────────────┼────────┼──────────┼──────────┼─────────────────────────┤
// │ 0: 100K FIAPO  │      1 │  0.001%  │    1     │ ~$0.10 (marketing)      │
// │ 1: 50K FIAPO   │      4 │  0.004%  │    1     │ ~$0.05                  │
// │ 2: 0.5 FIAPO   │  14000 │ 14.00%   │    ∞     │ ~$0 (negligible)        │
// │ 3: 5 USDT      │     15 │  0.015%  │    1     │ $5.00 max               │
// │ 4: 1K FIAPO    │     50 │  0.05%   │    2     │ ~$0.01                  │
// │ 5: 0.5 FIAPO   │  14000 │ 14.00%   │    ∞     │ ~$0                     │
// │ 6: 1 USDT      │     80 │  0.08%   │    5     │ $1.00 max               │
// │ 7: +1 SPIN     │   6000 │  6.00%   │    ∞     │ $0 (engagement only)    │
// │ 8: 0.5 FIAPO   │  14000 │ 14.00%   │    ∞     │ ~$0                     │
// │ 9: 100 FIAPO   │    850 │  0.85%   │   10     │ ~$0.001                 │
// │10: 1 LUNES     │   1000 │  1.00%   │    ∞     │ $0 (partner token)      │
// │11: MISS        │  50000 │ 50.00%   │    ∞     │ $0                      │
// ├─────────────────┼────────┼──────────┼──────────┼─────────────────────────┤
// │ TOTAL           │ 100000 │ 100%     │          │ EV ≈ $0.003/spin        │
// └─────────────────┴────────┴──────────┴──────────┴─────────────────────────┘
// ══════════════════════════════════════════════════════════════════════════════

interface PrizeDef {
  index: number;
  label: string;
  sublabel: string;
  tier: "jackpot" | "rare" | "uncommon" | "common" | "miss";
  weight: number;
  dailyCap: number; // max times this prize can be won per day (0 = unlimited)
}

const PRIZE_TABLE: PrizeDef[] = [
  { index: 0, label: "100K", sublabel: "FIAPO", tier: "jackpot", weight: 1, dailyCap: 1 },
  { index: 1, label: "50K", sublabel: "FIAPO", tier: "rare", weight: 4, dailyCap: 1 },
  { index: 2, label: "0.5", sublabel: "FIAPO", tier: "common", weight: 14000, dailyCap: 0 },
  { index: 3, label: "5", sublabel: "USDT", tier: "rare", weight: 15, dailyCap: 1 },
  { index: 4, label: "1K", sublabel: "FIAPO", tier: "uncommon", weight: 50, dailyCap: 2 },
  { index: 5, label: "0.5", sublabel: "FIAPO", tier: "common", weight: 14000, dailyCap: 0 },
  { index: 6, label: "1", sublabel: "USDT", tier: "uncommon", weight: 80, dailyCap: 5 },
  { index: 7, label: "+1", sublabel: "SPIN", tier: "uncommon", weight: 6000, dailyCap: 0 },
  { index: 8, label: "0.5", sublabel: "FIAPO", tier: "common", weight: 14000, dailyCap: 0 },
  { index: 9, label: "100", sublabel: "FIAPO", tier: "uncommon", weight: 850, dailyCap: 10 },
  { index: 10, label: "1", sublabel: "LUNES", tier: "uncommon", weight: 1000, dailyCap: 0 },
  { index: 11, label: "MISS", sublabel: "Try again", tier: "miss", weight: 50000, dailyCap: 0 },
];

const TOTAL_WEIGHT = PRIZE_TABLE.reduce((sum, p) => sum + p.weight, 0); // 100000

// ── Daily caps tracking via DB (persistent across server restarts) ─────────────
async function isDailyCappedFromDB(prize: PrizeDef): Promise<boolean> {
  if (prize.dailyCap === 0) return false;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const count = await db.spinResult.count({
    where: {
      prizeIndex: prize.index,
      playedAt: { gte: todayStart },
    },
  });

  return count >= prize.dailyCap;
}

/**
 * Cryptographically secure weighted prize selection with DB-backed daily caps.
 * If a prize is capped, rerolls. Ultimate fallback: MISS.
 */
async function pickPrizeServer(): Promise<PrizeDef> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const roll = randomInt(0, TOTAL_WEIGHT);
    let acc = 0;
    for (const prize of PRIZE_TABLE) {
      acc += prize.weight;
      if (roll < acc) {
        const capped = await isDailyCappedFromDB(prize);
        if (!capped) {
          return prize;
        }
        break; // this prize is capped, reroll
      }
    }
  }
  // All attempts hit capped prizes → return MISS (safe fallback)
  return PRIZE_TABLE[PRIZE_TABLE.length - 1];
}

/**
 * POST /api/games/spin/roll
 * Server-side RNG: determines the prize and returns the prizeIndex.
 * The frontend animates to the correct segment.
 *
 * Body: { wallet: string }
 * Response: { prizeIndex, label, sublabel, tier, missionCompleted?, earnedPoints?, message?, pendingUsdtReward? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { wallet } = body;

    // Validate wallet format
    const walletError = validateWalletOrError(wallet);
    if (walletError) return walletError;

    // Rate limit: 10 spins per minute per wallet
    const rl = rateLimit(`spin:${wallet}`, 10, 60_000);
    if (rl) return rl;

    // Find/create user
    const userId = await findOrCreateUserByWallet(wallet);
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // ── Server-side prize determination with DB-backed daily caps ──
    const prize = await pickPrizeServer();

    // Record spin in DB (this also increments the daily cap counter for DB queries)
    await db.spinResult.create({
      data: {
        userId,
        prizeIndex: prize.index,
        prizeLabel: prize.label,
        prizeSublabel: prize.sublabel,
        tier: prize.tier,
      },
    }).catch(() => null);

    // ── FIX 1: Credit FIAPO prize to offchain balance ──
    let earnedFiapo = 0;
    if (prize.sublabel === "FIAPO") {
      if (prize.label.endsWith("K")) {
        earnedFiapo = parseFloat(prize.label.replace("K", "")) * 1000;
      } else {
        earnedFiapo = parseFloat(prize.label);
      }

      if (!isNaN(earnedFiapo) && earnedFiapo > 0) {
        const updatedUser = await db.user.update({
          where: { id: userId },
          data: { offchainScore: { increment: earnedFiapo } },
        });

        const totalScore = calculateTotalScore(
          updatedUser.offchainScore,
          updatedUser.onchainScore,
          updatedUser.multiplier
        );
        const newRank = calculateRank(totalScore);
        await db.user.update({
          where: { id: userId },
          data: { totalScore, rank: newRank },
        });
      }
    }

    // ── FIX 2: Credit +1 FREE SPIN via SpinPurchase record ──
    let bonusSpinGranted = false;
    if (prize.sublabel === "SPIN") {
      await db.spinPurchase.create({
        data: {
          userId,
          spins: 1,
          priceUsdt: 0,
          status: "CONFIRMED",
          confirmedAt: new Date(),
          paymentId: `free-spin-${Date.now()}-${userId.slice(0, 8)}`,
        },
      }).catch(() => null);
      bonusSpinGranted = true;
    }

    // ── FIX 3: USDT — send immediately on-chain to user's Solana wallet ──
    let pendingUsdtReward: number | null = null;
    let usdtTxHash: string | undefined;
    if (prize.sublabel === "USDT") {
      const usdtAmount = parseFloat(prize.label);
      if (user.solanaWallet) {
        const payoutResult = await sendUsdtToUser(user.solanaWallet, usdtAmount);
        if (payoutResult.success) {
          usdtTxHash = payoutResult.txHash;
        } else {
          // Payout failed — fall back to pending distribution via admin
          pendingUsdtReward = usdtAmount;
          console.error("[SPIN_USDT_PAYOUT]", payoutResult.error);
        }
      } else {
        // No Solana wallet on record — queue for admin distribution
        pendingUsdtReward = usdtAmount;
      }
    }

    // ── LUNES — send immediately on-chain to user's Lunes wallet address ──
    let lunesTxHash: string | undefined;
    if (prize.sublabel === "LUNES") {
      const lunesAmount = parseFloat(prize.label);
      const payoutResult = await sendLunesToUser(user.walletAddress, lunesAmount);
      if (!payoutResult.success) {
        console.error("[SPIN_LUNES_PAYOUT]", payoutResult.error);
      } else {
        lunesTxHash = payoutResult.txHash;
      }
    }

    // ── Mission auto-complete on first spin ──
    let missionCompleted = false;
    let earnedPoints = 0;
    const usdtDelivered = prize.sublabel === "USDT" && usdtTxHash;
    const lunesDelivered = prize.sublabel === "LUNES" && lunesTxHash;
    let message: string;
    if (prize.sublabel === "SPIN") {
      message = "🎰 +1 Free Spin added to your balance!";
    } else if (usdtDelivered) {
      message = `💵 $${prize.label} USDT sent to your Solana wallet! Tx: ${usdtTxHash!.slice(0, 12)}…`;
    } else if (pendingUsdtReward) {
      message = `💵 $${pendingUsdtReward} USDT queued — add your Solana wallet in your profile to receive prizes!`;
    } else if (lunesDelivered) {
      message = `⭐ ${prize.label} LUNES sent to your wallet! Tx: ${lunesTxHash!.slice(0, 12)}…`;
    } else {
      message = "Spin recorded";
    }

    const mission = await db.mission.findUnique({ where: { id: SPIN_MISSION_ID } });
    if (mission?.isActive) {
      const alreadyCompleted = await db.missionCompletion.findFirst({
        where: { userId, missionId: SPIN_MISSION_ID, status: "VERIFIED" },
      });

      if (!alreadyCompleted) {
        const pending = await db.missionCompletion.findFirst({
          where: { userId, missionId: SPIN_MISSION_ID, status: "PENDING" },
        });

        if (!pending) {
          earnedPoints = calculateMissionPoints(
            mission.basePoints,
            mission.multiplier,
            mission.type as "OFFCHAIN" | "ONCHAIN",
            user.rank as any
          );

          await db.missionCompletion.create({
            data: {
              userId,
              missionId: SPIN_MISSION_ID,
              status: "VERIFIED",
              earnedPoints,
              verifiedAt: new Date(),
              proofMetadata: JSON.stringify({
                wallet,
                prizeIndex: prize.index,
                prizeLabel: prize.label,
                tier: prize.tier,
                verifiedBy: "server-rng",
              }),
            },
          });

          const scoreField = mission.type === "ONCHAIN" ? "onchainScore" : "offchainScore";
          const updatedUser = await db.user.update({
            where: { id: userId },
            data: { [scoreField]: { increment: earnedPoints } },
          });

          const totalScore = calculateTotalScore(updatedUser.offchainScore, updatedUser.onchainScore, updatedUser.multiplier);
          const newRank = calculateRank(totalScore);
          await db.user.update({
            where: { id: userId },
            data: { totalScore, rank: newRank },
          });

          await tryClaimEarlyBirdSlot(userId);

          missionCompleted = true;
          if (prize.sublabel !== "SPIN" && prize.sublabel !== "USDT" && prize.sublabel !== "LUNES") {
            message = `Mission "${mission.name}" completed! +${earnedPoints} points`;
          }
        }
      }
    }

    return NextResponse.json({
      prizeIndex: prize.index,
      label: prize.label,
      sublabel: prize.sublabel,
      tier: prize.tier,
      missionCompleted,
      earnedPoints,
      message,
      bonusSpinGranted,
      pendingUsdtReward,
      usdtTxHash,
      lunesTxHash,
    });
  } catch (error) {
    console.error("[SPIN_ROLL_API]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
