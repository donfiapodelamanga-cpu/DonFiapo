import { db } from "@/lib/db";
import { calculateTotalScore, calculateRank, calculateMissionPoints } from "./score-engine";
import { tryClaimEarlyBirdSlot } from "./early-bird";
import type { MissionDTO, UserScoreDTO, LeaderboardEntry, LeaderboardResponse, CompletionStatus } from "./types";

// ==========================================
// MISSIONS SERVICE
// ==========================================

/**
 * Get all active missions, optionally enriched with user completion status
 */
export async function getMissions(userId?: string): Promise<MissionDTO[]> {
  const now = new Date();
  const missions = await db.mission.findMany({
    where: {
      isActive: true,
      status: "ACTIVE",
      AND: [
        { OR: [{ startDate: null }, { startDate: { lte: now } }] },
        { OR: [{ endDate: null }, { endDate: { gte: now } }] },
      ],
    },
    orderBy: [{ priority: "desc" }, { type: "asc" }, { basePoints: "desc" }],
  });

  if (!userId) {
    return missions.map(mapMissionToDTO);
  }

  const completions = await db.missionCompletion.findMany({
    where: { userId },
  });

  return missions.map((m) => {
    const userCompletions = completions.filter((c) => c.missionId === m.id);
    const latestCompletion = userCompletions.sort(
      (a, b) => b.completedAt.getTime() - a.completedAt.getTime()
    )[0];

    return {
      ...mapMissionToDTO(m),
      userStatus: (latestCompletion?.status as CompletionStatus) ?? null,
      completedCount: userCompletions.filter((c) => c.status === "VERIFIED").length,
    };
  });
}

/**
 * Submit a mission completion for verification
 */
export async function submitMissionCompletion(
  userId: string,
  missionId: string,
  proofMetadata?: string
): Promise<{ success: boolean; message: string; points?: number }> {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return { success: false, message: "User not found" };
  if (user.isBanned) return { success: false, message: "Account is suspended" };

  const mission = await db.mission.findUnique({ where: { id: missionId } });
  if (!mission || !mission.isActive) return { success: false, message: "Mission not available" };

  // Check max completions
  const existingCompletions = await db.missionCompletion.count({
    where: { userId, missionId, status: "VERIFIED" },
  });
  if (existingCompletions >= mission.maxCompletions) {
    return { success: false, message: "Mission already completed maximum times" };
  }

  // Check date range
  const now = new Date();
  if (mission.startDate && now < mission.startDate) return { success: false, message: "Mission has not started yet" };
  if (mission.endDate && now > mission.endDate) return { success: false, message: "Mission has expired" };

  // Check for pending completion (avoid spam)
  const pendingExists = await db.missionCompletion.findFirst({
    where: { userId, missionId, status: "PENDING" },
  });
  if (pendingExists) return { success: false, message: "Verification already in progress" };

  // Calculate points
  const earnedPoints = calculateMissionPoints(
    mission.basePoints,
    mission.multiplier,
    mission.type as "OFFCHAIN" | "ONCHAIN",
    user.rank as any
  );

  // Create completion as PENDING (will be verified async)
  await db.missionCompletion.create({
    data: {
      userId,
      missionId,
      status: "PENDING",
      earnedPoints,
      proofMetadata: proofMetadata ?? null,
    },
  });

  return { success: true, message: "Mission submitted for verification", points: earnedPoints };
}

/**
 * Verify a pending mission completion (called by background job or admin)
 */
export async function verifyCompletion(
  completionId: string,
  approved: boolean,
  reason?: string
): Promise<void> {
  const completion = await db.missionCompletion.findUnique({
    where: { id: completionId },
    include: { mission: true, user: true },
  });
  if (!completion || completion.status !== "PENDING") return;

  const newStatus = approved ? "VERIFIED" : "REJECTED";

  await db.missionCompletion.update({
    where: { id: completionId },
    data: { status: newStatus, verifiedAt: new Date() },
  });

  if (approved) {
    // Update user scores
    const scoreField = completion.mission.type === "ONCHAIN" ? "onchainScore" : "offchainScore";
    const updatedUser = await db.user.update({
      where: { id: completion.userId },
      data: { [scoreField]: { increment: completion.earnedPoints } },
    });

    // Recalculate total score and rank
    const totalScore = calculateTotalScore(updatedUser.offchainScore, updatedUser.onchainScore, updatedUser.multiplier);
    const newRank = calculateRank(totalScore);

    await db.user.update({
      where: { id: completion.userId },
      data: { totalScore, rank: newRank },
    });

    // ── Early Bird: try to reserve a slot on first verified mission ──
    await tryClaimEarlyBirdSlot(completion.userId);
  } else if (reason) {
    // Flag fraud if rejected with reason
    await db.fraudFlag.create({
      data: {
        userId: completion.userId,
        reason,
        severity: "LOW",
      },
    });
  }
}

// ==========================================
// USER SCORE SERVICE
// ==========================================

export async function getUserScore(userId: string): Promise<UserScoreDTO | null> {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  const totalMissions = await db.mission.count({ where: { isActive: true } });
  const completedMissions = await db.missionCompletion.count({
    where: { userId, status: "VERIFIED" },
  });

  return {
    offchainScore: user.offchainScore,
    onchainScore: user.onchainScore,
    multiplier: user.multiplier,
    totalScore: user.totalScore,
    rank: user.rank as any,
    completedMissions,
    totalMissions,
  };
}

// ==========================================
// LEADERBOARD SERVICE
// ==========================================

export async function getLeaderboard(currentUserId?: string, limit: number = 100): Promise<LeaderboardResponse> {
  const topUsers = await db.user.findMany({
    where: { isBanned: false, totalScore: { gt: 0 } },
    orderBy: { totalScore: "desc" },
    take: limit,
    include: { wallets: { where: { isPrimary: true }, take: 1 } },
  });

  const totalParticipants = await db.user.count({
    where: { isBanned: false, totalScore: { gt: 0 } },
  });

  const top: LeaderboardEntry[] = topUsers.map((u, i) => ({
    rank: i + 1,
    userId: u.id,
    displayName: u.xUsername || `User_${u.id.slice(0, 6)}`,
    address: u.wallets[0]?.address
      ? `${u.wallets[0].address.slice(0, 4)}...${u.wallets[0].address.slice(-3)}`
      : "---",
    level: u.rank as any,
    totalScore: u.totalScore,
    isCurrentUser: u.id === currentUserId,
  }));

  // Find current user if not in top
  let currentUser: LeaderboardEntry | null = null;
  if (currentUserId && !top.some((t) => t.isCurrentUser)) {
    const user = await db.user.findUnique({
      where: { id: currentUserId },
      include: { wallets: { where: { isPrimary: true }, take: 1 } },
    });
    if (user && user.totalScore > 0) {
      const userRank = await db.user.count({
        where: { isBanned: false, totalScore: { gt: user.totalScore } },
      });
      currentUser = {
        rank: userRank + 1,
        userId: user.id,
        displayName: user.xUsername || `User_${user.id.slice(0, 6)}`,
        address: user.wallets[0]?.address
          ? `${user.wallets[0].address.slice(0, 4)}...${user.wallets[0].address.slice(-3)}`
          : "---",
        level: user.rank as any,
        totalScore: user.totalScore,
        isCurrentUser: true,
      };
    }
  }

  return { top, currentUser, totalParticipants };
}

// ==========================================
// USER MANAGEMENT
// ==========================================

/**
 * Find user by wallet address (read-only, no side-effects).
 * Returns userId or null if not found.
 */
export async function findUserByWallet(walletAddress: string): Promise<string | null> {
  const existingWallet = await db.wallet.findUnique({
    where: { address: walletAddress },
  });
  return existingWallet?.userId ?? null;
}

/**
 * Find or create user by wallet address
 */
export async function findOrCreateUserByWallet(walletAddress: string, network: string = "LUNES"): Promise<string> {
  const existingWallet = await db.wallet.findUnique({
    where: { address: walletAddress },
  });

  if (existingWallet) return existingWallet.userId;

  const user = await db.user.create({
    data: {
      wallets: {
        create: { address: walletAddress, network, isPrimary: true },
      },
    },
  });

  return user.id;
}

// ==========================================
// HELPERS
// ==========================================

function mapMissionToDTO(m: any): MissionDTO {
  return {
    id: m.id,
    name: m.name,
    description: m.description,
    type: m.type,
    platform: m.platform,
    basePoints: m.basePoints,
    multiplier: m.multiplier,
    maxCompletions: m.maxCompletions,
    startDate: m.startDate?.toISOString() ?? null,
    endDate: m.endDate?.toISOString() ?? null,
    isActive: m.isActive,
    status: m.status ?? "ACTIVE",
    priority: m.priority ?? 0,
    category: m.category ?? null,
    targetUrl: m.targetUrl ?? null,
    actionType: m.actionType ?? null,
  };
}
