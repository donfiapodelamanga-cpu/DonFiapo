import { db } from "@/lib/db";
import { applyTrustScoreDelta } from "./fraud-engine";

// ==========================================
// REFERRAL ANTI-FRAUD ENGINE
// ==========================================
// Protects against: self-referral, multi-account farms,
// IP clustering, velocity abuse, ghost accounts,
// device fingerprint reuse, and wallet recycling.

// ── Configuration ────────────────────────────────────────────────

/** Max referrals a single user can receive per hour */
const REFERRER_VELOCITY_LIMIT = 5;
const REFERRER_VELOCITY_WINDOW_MS = 60 * 60 * 1000; // 1 hour

/** Max referrals from the same IP in 24h */
const IP_CLUSTER_LIMIT = 3;
const IP_CLUSTER_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

/** Min account age for referred user to qualify (prevents instant-qualify) */
const MIN_QUALIFICATION_AGE_MS = 30 * 60 * 1000; // 30 minutes after signup

/** Minimum X account age to be considered trustworthy */
const MIN_X_ACCOUNT_AGE_DAYS = 7;

/** Min X followers for referred user to not be suspicious */
const MIN_X_FOLLOWERS = 3;

/** Fraud score thresholds */
const FRAUD_SCORE_FLAG = 50;   // Auto-flag referral for review
const FRAUD_SCORE_REJECT = 80; // Auto-reject referral

// ── Types ────────────────────────────────────────────────────────

export interface ReferralFraudResult {
  allowed: boolean;
  fraudScore: number;
  signals: FraudSignal[];
  flagReason: string | null;
}

export interface FraudSignal {
  rule: string;
  score: number;
  detail: string;
}

// ── Main Fraud Check ─────────────────────────────────────────────

/**
 * Run all anti-fraud checks before recording a referral.
 * Returns a fraud score (0-100) and whether the referral should proceed.
 */
export async function checkReferralFraud(
  referrerId: string,
  referredId: string,
  metadata: {
    ipAddress?: string;
    fingerprint?: string;
    userAgent?: string;
  }
): Promise<ReferralFraudResult> {
  const signals: FraudSignal[] = [];

  // ── Rule 1: Self-referral ──────────────────────────────────
  if (referrerId === referredId) {
    return {
      allowed: false,
      fraudScore: 100,
      signals: [{ rule: "SELF_REFERRAL", score: 100, detail: "User tried to refer themselves" }],
      flagReason: "Self-referral attempt",
    };
  }

  // Load both users
  const [referrer, referred] = await Promise.all([
    db.user.findUnique({ where: { id: referrerId }, include: { wallets: true } }),
    db.user.findUnique({ where: { id: referredId }, include: { wallets: true } }),
  ]);

  if (!referrer || !referred) {
    return {
      allowed: false,
      fraudScore: 100,
      signals: [{ rule: "INVALID_USERS", score: 100, detail: "One or both user IDs not found" }],
      flagReason: "Invalid user IDs",
    };
  }

  // ── Rule 2: Referrer is banned ─────────────────────────────
  if (referrer.isBanned) {
    signals.push({ rule: "BANNED_REFERRER", score: 100, detail: "Referrer account is banned" });
    return { allowed: false, fraudScore: 100, signals, flagReason: "Referrer is banned" };
  }

  // ── Rule 3: Same IP as referrer ────────────────────────────
  if (metadata.ipAddress && referrer.lastIpAddress === metadata.ipAddress) {
    signals.push({
      rule: "SAME_IP_AS_REFERRER",
      score: 40,
      detail: `Referred user IP (${metadata.ipAddress}) matches referrer IP`,
    });
  }

  // ── Rule 4: Same device fingerprint as referrer ────────────
  if (metadata.fingerprint && referrer.deviceFingerprint === metadata.fingerprint) {
    signals.push({
      rule: "SAME_DEVICE_AS_REFERRER",
      score: 60,
      detail: "Same device fingerprint as referrer — likely same person",
    });
  }

  // ── Rule 5: IP cluster — too many referrals from same IP ───
  if (metadata.ipAddress) {
    const ipClusterWindow = new Date(Date.now() - IP_CLUSTER_WINDOW_MS);
    const sameIpReferrals = await db.referral.count({
      where: {
        referrerId,
        ipAddress: metadata.ipAddress,
        createdAt: { gte: ipClusterWindow },
      },
    });

    if (sameIpReferrals >= IP_CLUSTER_LIMIT) {
      signals.push({
        rule: "IP_CLUSTER",
        score: 35,
        detail: `${sameIpReferrals + 1} referrals from same IP in 24h (limit: ${IP_CLUSTER_LIMIT})`,
      });
    }
  }

  // ── Rule 6: Velocity — referrer getting too many referrals too fast ─
  const velocityWindow = new Date(Date.now() - REFERRER_VELOCITY_WINDOW_MS);
  const recentReferrals = await db.referral.count({
    where: {
      referrerId,
      createdAt: { gte: velocityWindow },
    },
  });

  if (recentReferrals >= REFERRER_VELOCITY_LIMIT) {
    signals.push({
      rule: "VELOCITY_LIMIT",
      score: 30,
      detail: `${recentReferrals + 1} referrals in last hour (limit: ${REFERRER_VELOCITY_LIMIT})`,
    });
  }

  // ── Rule 7: Device fingerprint reuse — referred device seen before ─
  if (metadata.fingerprint) {
    const existingWithFingerprint = await db.user.findFirst({
      where: {
        deviceFingerprint: metadata.fingerprint,
        id: { not: referredId },
      },
    });

    if (existingWithFingerprint) {
      signals.push({
        rule: "DEVICE_REUSE",
        score: 50,
        detail: `Device fingerprint already linked to user ${existingWithFingerprint.id.slice(0, 8)}`,
      });
    }
  }

  // ── Rule 8: Shared wallet — referred user has a wallet that's also on another account ─
  if (referred.wallets.length > 0) {
    for (const w of referred.wallets) {
      const otherWallets = await db.wallet.findMany({
        where: { address: w.address, userId: { not: referredId } },
      });
      if (otherWallets.length > 0) {
        signals.push({
          rule: "SHARED_WALLET",
          score: 70,
          detail: `Wallet ${w.address.slice(0, 12)}... is also linked to another user`,
        });
        break;
      }
    }
  }

  // ── Rule 9: New/suspicious X account (if linked) ──────────
  if (referred.xAccountCreatedAt) {
    const accountAgeDays = (Date.now() - referred.xAccountCreatedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (accountAgeDays < MIN_X_ACCOUNT_AGE_DAYS) {
      signals.push({
        rule: "NEW_X_ACCOUNT",
        score: 20,
        detail: `X account is only ${Math.floor(accountAgeDays)} days old (min: ${MIN_X_ACCOUNT_AGE_DAYS})`,
      });
    }
  }

  if (referred.xFollowersCount !== null && referred.xFollowersCount !== undefined && referred.xFollowersCount < MIN_X_FOLLOWERS) {
    signals.push({
      rule: "LOW_X_FOLLOWERS",
      score: 15,
      detail: `X account has only ${referred.xFollowersCount} followers (min: ${MIN_X_FOLLOWERS})`,
    });
  }

  // ── Rule 10: Referred user has low trust score ─────────────
  if (referred.trustScore < 50) {
    signals.push({
      rule: "LOW_TRUST_REFERRED",
      score: 20,
      detail: `Referred user trust score: ${referred.trustScore}`,
    });
  }

  // ── Rule 11: Referrer has low trust score ──────────────────
  if (referrer.trustScore < 30) {
    signals.push({
      rule: "LOW_TRUST_REFERRER",
      score: 25,
      detail: `Referrer trust score: ${referrer.trustScore}`,
    });
  }

  // ── Calculate total fraud score ────────────────────────────
  // Use max-dominant scoring: highest signal + 20% of remaining
  const sortedScores = signals.map((s) => s.score).sort((a, b) => b - a);
  let fraudScore = sortedScores[0] ?? 0;
  for (let i = 1; i < sortedScores.length; i++) {
    fraudScore += sortedScores[i] * 0.2;
  }
  fraudScore = Math.min(100, Math.round(fraudScore));

  // ── Determine outcome ──────────────────────────────────────
  const flagReason = signals.length > 0
    ? signals.map((s) => s.rule).join(", ")
    : null;

  if (fraudScore >= FRAUD_SCORE_REJECT) {
    return { allowed: false, fraudScore, signals, flagReason };
  }

  // Score >= FLAG threshold: allow but flag for admin review
  return { allowed: true, fraudScore, signals, flagReason };
}

// ── Qualification Guard ──────────────────────────────────────────

/**
 * Check if a referred user can qualify a referral (before awarding points).
 * Ensures the account isn't a throwaway ghost.
 */
export async function checkQualificationEligibility(
  referredUserId: string
): Promise<{ eligible: boolean; reason?: string }> {
  const referred = await db.user.findUnique({
    where: { id: referredUserId },
    include: { completions: { where: { status: "VERIFIED" }, take: 1 } },
  });

  if (!referred) return { eligible: false, reason: "User not found" };
  if (referred.isBanned) return { eligible: false, reason: "User is banned" };

  // Must have existed for at least MIN_QUALIFICATION_AGE_MS
  const accountAge = Date.now() - referred.createdAt.getTime();
  if (accountAge < MIN_QUALIFICATION_AGE_MS) {
    const remaining = Math.ceil((MIN_QUALIFICATION_AGE_MS - accountAge) / 60000);
    return { eligible: false, reason: `Account too new. Wait ${remaining} more minutes.` };
  }

  // Must have at least 1 verified mission completion (not just signup)
  if (referred.completions.length === 0) {
    return { eligible: false, reason: "Must complete at least 1 mission to qualify referral" };
  }

  // Trust score check
  if (referred.trustScore < 20) {
    return { eligible: false, reason: "Trust score too low to qualify referral" };
  }

  return { eligible: true };
}

// ── Post-referral monitoring ─────────────────────────────────────

/**
 * Periodic audit: check all PENDING referrals for newly discovered fraud patterns.
 * Should be called by a cron/scheduled job.
 */
export async function auditPendingReferrals(): Promise<{ flagged: number; rejected: number }> {
  let flagged = 0;
  let rejected = 0;

  const pending = await db.referral.findMany({
    where: { status: "PENDING", fraudScore: { lt: FRAUD_SCORE_FLAG } },
    include: { referrer: true, referred: true },
    take: 100,
  });

  for (const ref of pending) {
    // Check for mass-referrer patterns
    const totalReferrals = await db.referral.count({ where: { referrerId: ref.referrerId } });
    const qualifiedCount = await db.referral.count({
      where: { referrerId: ref.referrerId, status: "QUALIFIED" },
    });

    // If < 10% of referrals qualify, flag the rest
    if (totalReferrals > 10 && qualifiedCount / totalReferrals < 0.1) {
      await db.referral.update({
        where: { id: ref.id },
        data: {
          fraudScore: Math.max(ref.fraudScore, 55),
          flagReason: `Low qualification rate: ${qualifiedCount}/${totalReferrals} (${Math.round((qualifiedCount / totalReferrals) * 100)}%)`,
          status: "FLAGGED",
        },
      });
      flagged++;

      // Penalize referrer trust score
      await applyTrustScoreDelta(ref.referrerId, -10, [
        `REFERRAL_FARM_SUSPECT: only ${Math.round((qualifiedCount / totalReferrals) * 100)}% qualification rate`,
      ]);
    }

    // Check if referred account is a ghost (no activity after 7 days)
    const refAge = Date.now() - ref.createdAt.getTime();
    if (refAge > 7 * 24 * 60 * 60 * 1000) { // 7 days
      const completions = await db.missionCompletion.count({
        where: { userId: ref.referredId },
      });

      if (completions === 0) {
        await db.referral.update({
          where: { id: ref.id },
          data: {
            fraudScore: Math.max(ref.fraudScore, 60),
            flagReason: "Ghost account — no activity after 7 days",
            status: "FLAGGED",
          },
        });
        flagged++;
      }
    }
  }

  return { flagged, rejected };
}

// ── Admin helpers ────────────────────────────────────────────────

/**
 * Get referral fraud summary for admin dashboard.
 */
export async function getReferralFraudSummary() {
  const [total, pending, qualified, flagged, rejected, highFraud] = await Promise.all([
    db.referral.count(),
    db.referral.count({ where: { status: "PENDING" } }),
    db.referral.count({ where: { status: "QUALIFIED" } }),
    db.referral.count({ where: { status: "FLAGGED" } }),
    db.referral.count({ where: { status: "REJECTED" } }),
    db.referral.count({ where: { fraudScore: { gte: FRAUD_SCORE_FLAG } } }),
  ]);

  // Top suspicious referrers (most flagged referrals)
  const suspiciousReferrers = await db.referral.groupBy({
    by: ["referrerId"],
    where: { fraudScore: { gte: 30 } },
    _count: { id: true },
    _avg: { fraudScore: true },
    orderBy: { _count: { id: "desc" } },
    take: 10,
  });

  // IP clusters
  const ipClusters = await db.referral.groupBy({
    by: ["ipAddress"],
    where: { ipAddress: { not: null } },
    _count: { id: true },
    having: { id: { _count: { gt: IP_CLUSTER_LIMIT } } },
    orderBy: { _count: { id: "desc" } },
    take: 10,
  });

  return {
    total,
    pending,
    qualified,
    flagged,
    rejected,
    highFraud,
    qualificationRate: total > 0 ? Math.round((qualified / total) * 100) : 0,
    suspiciousReferrers: suspiciousReferrers.map((s) => ({
      referrerId: s.referrerId,
      flaggedCount: s._count.id,
      avgFraudScore: Math.round(s._avg.fraudScore ?? 0),
    })),
    ipClusters: ipClusters.map((c) => ({
      ip: c.ipAddress,
      count: c._count.id,
    })),
  };
}

/**
 * Admin action: reject a flagged referral and penalize referrer.
 */
export async function rejectReferral(referralId: string, reason: string): Promise<void> {
  const referral = await db.referral.findUnique({ where: { id: referralId } });
  if (!referral) return;

  // If points were already awarded, claw them back
  if (referral.earnedPoints > 0) {
    await db.user.update({
      where: { id: referral.referrerId },
      data: { offchainScore: { decrement: referral.earnedPoints } },
    });
  }

  await db.referral.update({
    where: { id: referralId },
    data: {
      status: "REJECTED",
      flagReason: reason,
      fraudScore: 100,
      earnedPoints: 0,
    },
  });

  // Penalize referrer
  await applyTrustScoreDelta(referral.referrerId, -15, [
    `REFERRAL_REJECTED: ${reason}`,
  ]);
}

/**
 * Admin action: approve a flagged referral as legitimate.
 */
export async function approveReferral(referralId: string): Promise<void> {
  await db.referral.update({
    where: { id: referralId },
    data: { status: "PENDING", flagReason: null, fraudScore: 0 },
  });
}
