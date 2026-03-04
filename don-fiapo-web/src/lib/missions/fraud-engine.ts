import { db } from "@/lib/db";

export interface FraudCheckResult {
  allowed: boolean;
  reason?: string;
  trustScoreDelta: number;
  signals: string[];
}

// ==========================================
// Rate limiting (DB-based, no Redis required)
// ==========================================

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_SUBMISSIONS_PER_USER = 10;
const MAX_SUBMISSIONS_PER_IP = 15; // Higher than per-user since one IP can serve multiple users (NAT/VPN)

/**
 * Checks submission rate for an IP address and user within the last hour.
 */
export async function checkRateLimit(
  userId: string,
  ipAddress?: string
): Promise<{ allowed: boolean; reason?: string }> {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);

  // User-level rate limit
  const userSubmissions = await db.missionCompletion.count({
    where: {
      userId,
      completedAt: { gte: windowStart },
    },
  });

  if (userSubmissions >= MAX_SUBMISSIONS_PER_USER) {
    return {
      allowed: false,
      reason: `Too many submissions. Max ${MAX_SUBMISSIONS_PER_USER} per hour.`,
    };
  }

  // IP-level rate limit (if IP is available)
  if (ipAddress) {
    const ipSubmissions = await db.missionCompletion.count({
      where: {
        user: { lastIpAddress: ipAddress },
        completedAt: { gte: windowStart },
      },
    });

    if (ipSubmissions >= MAX_SUBMISSIONS_PER_IP * 3) {
      return {
        allowed: false,
        reason: "Too many submissions from this IP address.",
      };
    }
  }

  return { allowed: true };
}

// ==========================================
// Device fingerprint check
// ==========================================

/**
 * Checks if the device fingerprint is already linked to another user.
 */
export async function checkDeviceFingerprint(
  userId: string,
  fingerprint?: string
): Promise<{ allowed: boolean; reason?: string; signal?: string }> {
  if (!fingerprint) return { allowed: true };

  const existingUser = await db.user.findFirst({
    where: {
      deviceFingerprint: fingerprint,
      id: { not: userId },
    },
  });

  if (existingUser) {
    return {
      allowed: false,
      reason: "Device already associated with another account",
      signal: "DEVICE_FINGERPRINT_COLLISION",
    };
  }

  // Save fingerprint to user record
  await db.user.update({
    where: { id: userId },
    data: { deviceFingerprint: fingerprint },
  });

  return { allowed: true };
}

// ==========================================
// Cooldown between submissions of same mission
// ==========================================

const MISSION_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes minimum between resubmits

/**
 * Ensures user waits the minimum cooldown before resubmitting the same mission.
 */
export async function checkMissionCooldown(
  userId: string,
  missionId: string
): Promise<{ allowed: boolean; reason?: string }> {
  const lastSubmission = await db.missionCompletion.findFirst({
    where: { userId, missionId },
    orderBy: { completedAt: "desc" },
  });

  if (!lastSubmission) return { allowed: true };

  const elapsed = Date.now() - lastSubmission.completedAt.getTime();
  if (elapsed < MISSION_COOLDOWN_MS) {
    const remaining = Math.ceil((MISSION_COOLDOWN_MS - elapsed) / 1000);
    return {
      allowed: false,
      reason: `Please wait ${remaining}s before resubmitting this mission`,
    };
  }

  return { allowed: true };
}

// ==========================================
// Trust score management
// ==========================================

/**
 * Applies a trust score delta to a user and creates a FraudFlag if negative.
 */
export async function applyTrustScoreDelta(
  userId: string,
  delta: number,
  signals: string[]
): Promise<void> {
  if (delta === 0 && signals.length === 0) return;

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return;

  const newTrustScore = Math.max(0, Math.min(100, user.trustScore + delta));

  await db.user.update({
    where: { id: userId },
    data: { trustScore: newTrustScore },
  });

  // Create fraud flags for each signal
  for (const signal of signals) {
    const severity =
      delta <= -30 ? "HIGH" : delta <= -15 ? "MEDIUM" : "LOW";

    await db.fraudFlag.create({
      data: {
        userId,
        reason: signal,
        severity,
      },
    });
  }

  // Auto-ban if trust score hits 0
  if (newTrustScore === 0) {
    await db.user.update({
      where: { id: userId },
      data: { isBanned: true },
    });
  }
}

// ==========================================
// Full pre-submission fraud check
// ==========================================

/**
 * Runs all fraud checks before allowing a mission submission.
 */
export async function runPreSubmissionChecks(
  userId: string,
  missionId: string,
  ipAddress?: string,
  fingerprint?: string
): Promise<FraudCheckResult> {
  const signals: string[] = [];
  let trustScoreDelta = 0;

  // 1. Check if user is banned
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return { allowed: false, reason: "User not found", trustScoreDelta: 0, signals: [] };
  if (user.isBanned) return { allowed: false, reason: "Account is suspended", trustScoreDelta: 0, signals: [] };

  // 2. Low trust score warning (below 30 → require extra caution)
  if (user.trustScore < 30) {
    signals.push("LOW_TRUST_SCORE");
    trustScoreDelta -= 5;
  }

  // 3. Rate limiting
  const rateCheck = await checkRateLimit(userId, ipAddress);
  if (!rateCheck.allowed) {
    return { allowed: false, reason: rateCheck.reason, trustScoreDelta: 0, signals: [] };
  }

  // 4. Mission cooldown
  const cooldownCheck = await checkMissionCooldown(userId, missionId);
  if (!cooldownCheck.allowed) {
    return { allowed: false, reason: cooldownCheck.reason, trustScoreDelta: 0, signals: [] };
  }

  // 5. Device fingerprint
  const fpCheck = await checkDeviceFingerprint(userId, fingerprint);
  if (!fpCheck.allowed) {
    signals.push(fpCheck.signal ?? "DEVICE_COLLISION");
    trustScoreDelta -= 30;
    return { allowed: false, reason: fpCheck.reason, trustScoreDelta, signals };
  }

  // Update IP address
  if (ipAddress) {
    await db.user.update({
      where: { id: userId },
      data: { lastIpAddress: ipAddress },
    });
  }

  return { allowed: true, trustScoreDelta, signals };
}

// ==========================================
// Schedule re-check for social missions
// ==========================================

/**
 * Sets a recheck timestamp on a MissionCompletion 24–72h after verification.
 * The re-check job will use this to re-verify the action is still intact.
 */
export async function scheduleRecheck(completionId: string): Promise<void> {
  // Random delay between 24h and 72h to prevent predictable unfollowing
  const delayHours = 24 + Math.floor(Math.random() * 48);
  const recheckAt = new Date(Date.now() + delayHours * 60 * 60 * 1000);

  await db.missionCompletion.update({
    where: { id: completionId },
    data: { recheckAt },
  });
}
