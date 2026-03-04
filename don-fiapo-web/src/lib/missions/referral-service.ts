import { db } from "@/lib/db";
import { calculateTotalScore, calculateRank } from "./score-engine";
import { REFERRAL_POINTS, REFERRAL_MILESTONE_TIERS } from "./types";
import { checkReferralFraud, checkQualificationEligibility } from "./referral-fraud";

// ==========================================
// REFERRAL TRACKING SERVICE
// ==========================================

// Default milestone definitions (used for seeding)
export const DEFAULT_MILESTONES = [
  { tier: 1,     name: "Primeiro Arauto",     bonusPoints: 50,     badge: "herald" },
  { tier: 5,     name: "Mensageiro Real",      bonusPoints: 200,    badge: "messenger" },
  { tier: 10,    name: "Embaixador",            bonusPoints: 500,    badge: "ambassador" },
  { tier: 30,    name: "Capitão de Recrutamento", bonusPoints: 1500, badge: "captain" },
  { tier: 50,    name: "General da Expansão",   bonusPoints: 3000,   badge: "general" },
  { tier: 100,   name: "Conquistador",          bonusPoints: 7500,   badge: "conqueror" },
  { tier: 1000,  name: "Lorde do Reino",        bonusPoints: 50000,  badge: "lord" },
  { tier: 5000,  name: "Grão-Mestre",           bonusPoints: 200000, badge: "grandmaster" },
  { tier: 10000, name: "Imperador Supremo",     bonusPoints: 500000, badge: "emperor" },
] as const;

/**
 * Record a referral when a new user joins via referral link.
 * Runs anti-fraud checks before persisting.
 */
export async function recordReferral(
  referrerId: string,
  referredId: string,
  metadata?: { ipAddress?: string; fingerprint?: string; userAgent?: string }
): Promise<{ success: boolean; message: string; fraudScore?: number }> {
  // Check if referred user already has a referrer
  const existing = await db.referral.findUnique({ where: { referredId } });
  if (existing) {
    return { success: false, message: "User already has a referrer" };
  }

  // Run anti-fraud checks
  const fraudResult = await checkReferralFraud(referrerId, referredId, metadata ?? {});

  if (!fraudResult.allowed) {
    // Still record but as REJECTED so we track the attempt
    await db.referral.create({
      data: {
        referrerId,
        referredId,
        status: "REJECTED",
        ipAddress: metadata?.ipAddress ?? null,
        fingerprint: metadata?.fingerprint ?? null,
        userAgent: metadata?.userAgent ?? null,
        fraudScore: fraudResult.fraudScore,
        flagReason: fraudResult.flagReason,
      },
    });
    console.warn(`[REFERRAL_FRAUD] Rejected: ${referrerId} -> ${referredId} | score=${fraudResult.fraudScore} | ${fraudResult.flagReason}`);
    return { success: false, message: "Referral not allowed", fraudScore: fraudResult.fraudScore };
  }

  // Determine initial status based on fraud score
  const initialStatus = fraudResult.fraudScore >= 50 ? "FLAGGED" : "PENDING";

  await db.referral.create({
    data: {
      referrerId,
      referredId,
      status: initialStatus,
      ipAddress: metadata?.ipAddress ?? null,
      fingerprint: metadata?.fingerprint ?? null,
      userAgent: metadata?.userAgent ?? null,
      fraudScore: fraudResult.fraudScore,
      flagReason: fraudResult.flagReason,
    },
  });

  if (initialStatus === "FLAGGED") {
    console.warn(`[REFERRAL_FRAUD] Flagged for review: ${referrerId} -> ${referredId} | score=${fraudResult.fraudScore}`);
  }

  return { success: true, message: "Referral recorded", fraudScore: fraudResult.fraudScore };
}

/**
 * Award referral points to the referrer when a referred friend completes an activity.
 * Called after a mission completion is verified.
 *
 * activityType: "SOCIAL" for free tasks, "NFT_MINT" for paid NFT mints
 */
export async function awardReferralPoints(
  referredUserId: string,
  activityType: "SOCIAL" | "NFT_MINT" | "WALLET_CONNECT"
): Promise<{ referrerId: string | null; pointsAwarded: number; milestoneBonuses: number[] }> {
  const result = { referrerId: null as string | null, pointsAwarded: 0, milestoneBonuses: [] as number[] };

  // Find the referral record for this user
  const referral = await db.referral.findUnique({ where: { referredId: referredUserId } });
  if (!referral) return result;

  // Skip rejected or already-qualified-with-clawback referrals
  if (referral.status === "REJECTED") return result;

  // If flagged, don't award until admin approves
  if (referral.status === "FLAGGED") {
    console.warn(`[REFERRAL] Skipping award for flagged referral: ${referral.id}`);
    return result;
  }

  // Check if referred user meets qualification requirements
  const eligibility = await checkQualificationEligibility(referredUserId);
  if (!eligibility.eligible) {
    console.warn(`[REFERRAL] Not eligible for qualification: ${eligibility.reason}`);
    return result;
  }

  result.referrerId = referral.referrerId;

  // Determine points based on activity type
  const points = activityType === "NFT_MINT"
    ? REFERRAL_POINTS.NFT_MINT
    : activityType === "WALLET_CONNECT"
      ? REFERRAL_POINTS.WALLET_CONNECT
      : REFERRAL_POINTS.FREE_SOCIAL_TASK;

  // Qualify referral if still pending
  if (referral.status === "PENDING") {
    await db.referral.update({
      where: { id: referral.id },
      data: { status: "QUALIFIED", activityType, earnedPoints: { increment: points }, qualifiedAt: new Date() },
    });
  } else {
    await db.referral.update({
      where: { id: referral.id },
      data: { activityType, earnedPoints: { increment: points } },
    });
  }

  // Award points to the referrer's offchain score
  const updatedReferrer = await db.user.update({
    where: { id: referral.referrerId },
    data: { offchainScore: { increment: points } },
  });

  // Recalculate referrer's rank
  const totalScore = calculateTotalScore(updatedReferrer.offchainScore, updatedReferrer.onchainScore, updatedReferrer.multiplier);
  const newRank = calculateRank(totalScore);
  await db.user.update({
    where: { id: referral.referrerId },
    data: { totalScore, rank: newRank },
  });

  result.pointsAwarded = points;

  // Check milestone bonuses
  const milestoneBonuses = await checkAndAwardMilestones(referral.referrerId);
  result.milestoneBonuses = milestoneBonuses;

  return result;
}

/**
 * Check if a referrer has reached any new milestone tiers and award bonuses.
 */
export async function checkAndAwardMilestones(referrerId: string): Promise<number[]> {
  const awardedTiers: number[] = [];

  // Count total qualified referrals
  const qualifiedCount = await db.referral.count({
    where: { referrerId, status: "QUALIFIED" },
  });

  // Get all active milestones
  const milestones = await db.referralMilestone.findMany({
    where: { isActive: true },
    orderBy: { tier: "asc" },
  });

  // Get already awarded milestones for this user
  const alreadyAwarded = await db.referralMilestoneAward.findMany({
    where: { userId: referrerId },
    select: { milestoneTier: true },
  });
  const awardedSet = new Set(alreadyAwarded.map((a) => a.milestoneTier));

  for (const milestone of milestones) {
    if (qualifiedCount >= milestone.tier && !awardedSet.has(milestone.tier)) {
      // Award the milestone bonus
      await db.referralMilestoneAward.create({
        data: {
          userId: referrerId,
          milestoneTier: milestone.tier,
          bonusPoints: milestone.bonusPoints,
        },
      });

      // Add bonus points to user
      const updatedUser = await db.user.update({
        where: { id: referrerId },
        data: { offchainScore: { increment: milestone.bonusPoints } },
      });

      // Recalculate rank
      const totalScore = calculateTotalScore(updatedUser.offchainScore, updatedUser.onchainScore, updatedUser.multiplier);
      const newRank = calculateRank(totalScore);
      await db.user.update({
        where: { id: referrerId },
        data: { totalScore, rank: newRank },
      });

      awardedTiers.push(milestone.tier);
    }
  }

  return awardedTiers;
}

/**
 * Get referral stats for a user (for admin or user dashboard)
 */
export async function getReferralStats(userId: string) {
  const [totalReferrals, qualifiedReferrals, milestoneAwards, referrals] = await Promise.all([
    db.referral.count({ where: { referrerId: userId } }),
    db.referral.count({ where: { referrerId: userId, status: "QUALIFIED" } }),
    db.referralMilestoneAward.findMany({ where: { userId }, orderBy: { milestoneTier: "asc" } }),
    db.referral.findMany({
      where: { referrerId: userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        referred: {
          select: { id: true, xUsername: true, rank: true, wallets: { where: { isPrimary: true }, take: 1 } },
        },
      },
    }),
  ]);

  const totalPointsFromReferrals = await db.referral.aggregate({
    where: { referrerId: userId },
    _sum: { earnedPoints: true },
  });

  const totalMilestonePoints = milestoneAwards.reduce((sum, a) => sum + a.bonusPoints, 0);

  return {
    totalReferrals,
    qualifiedReferrals,
    totalPointsFromReferrals: (totalPointsFromReferrals._sum.earnedPoints ?? 0) + totalMilestonePoints,
    milestoneAwards: milestoneAwards.map((a) => ({
      milestoneTier: a.milestoneTier,
      bonusPoints: a.bonusPoints,
      awardedAt: a.awardedAt.toISOString(),
    })),
    nextMilestone: getNextMilestone(qualifiedReferrals),
    referrals: referrals.map((r) => ({
      referredId: r.referredId,
      displayName: r.referred.xUsername || r.referred.wallets?.[0]?.address?.slice(0, 10) || r.referredId.slice(0, 8),
      status: r.status,
      activityType: r.activityType,
      earnedPoints: r.earnedPoints,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}

/**
 * Get the next milestone tier for a user based on their current qualified referral count
 */
function getNextMilestone(qualifiedCount: number): { tier: number; remaining: number } | null {
  for (const tier of REFERRAL_MILESTONE_TIERS) {
    if (qualifiedCount < tier) {
      return { tier, remaining: tier - qualifiedCount };
    }
  }
  return null; // All milestones achieved
}

/**
 * Seed default milestones into DB (idempotent)
 */
export async function seedReferralMilestones(): Promise<number> {
  let created = 0;
  for (const m of DEFAULT_MILESTONES) {
    const existing = await db.referralMilestone.findUnique({ where: { tier: m.tier } });
    if (!existing) {
      await db.referralMilestone.create({
        data: { tier: m.tier, name: m.name, bonusPoints: m.bonusPoints, badge: m.badge },
      });
      created++;
    }
  }
  return created;
}

/**
 * Get all referral milestones (for admin display)
 */
export async function getAllMilestones() {
  return db.referralMilestone.findMany({ orderBy: { tier: "asc" } });
}

/**
 * Update a referral milestone (admin)
 */
export async function updateMilestone(tier: number, data: { name?: string; bonusPoints?: number; badge?: string; isActive?: boolean }) {
  return db.referralMilestone.update({ where: { tier }, data });
}

/**
 * Validate an NFT mint on-chain for referral credit.
 * This is a hook that should be called after an NFT mint is confirmed.
 *
 * For now, it validates that a MissionCompletion with actionType=MINT_NFT
 * exists and is VERIFIED for the referred user.
 */
export async function validateNftMintForReferral(referredUserId: string): Promise<boolean> {
  // Check if user has any verified NFT mint completions
  const nftCompletion = await db.missionCompletion.findFirst({
    where: {
      userId: referredUserId,
      status: "VERIFIED",
      mission: { actionType: { in: ["MINT_NFT", "BUY_NFT"] } },
    },
  });

  if (!nftCompletion) return false;

  // Award referral points for NFT activity
  await awardReferralPoints(referredUserId, "NFT_MINT");
  return true;
}
