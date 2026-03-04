import { db } from "@/lib/db";

const EARLY_BIRD_POOL_ID = "pool-early-bird";

/**
 * tryClaimEarlyBirdSlot
 *
 * Called after a user's first mission is verified.
 * Atomically increments slotsClaimed and creates an EarlyBirdClaim record.
 * Returns the claim data if successful, or null if pool is full / already claimed.
 */
export async function tryClaimEarlyBirdSlot(userId: string): Promise<{
  slotNumber: number;
  lunesAmount: number;
} | null> {
  // Check if user already has a claim
  const existing = await db.earlyBirdClaim.findUnique({ where: { userId } });
  if (existing) return null;

  // Load pool
  const pool = await db.rewardPool.findUnique({ where: { id: EARLY_BIRD_POOL_ID } });
  if (!pool || !pool.isActive || !pool.maxSlots) return null;
  if (pool.slotsClaimed >= pool.maxSlots) return null;

  // Atomically claim next slot using a transaction
  try {
    const result = await db.$transaction(async (tx) => {
      // Re-fetch inside transaction to avoid race condition
      const freshPool = await tx.rewardPool.findUnique({
        where: { id: EARLY_BIRD_POOL_ID },
      });
      if (!freshPool || freshPool.slotsClaimed >= (freshPool.maxSlots ?? 0)) {
        return null;
      }

      const slotNumber = freshPool.slotsClaimed + 1;
      const lunesAmount = freshPool.linesPerSlot ?? (freshPool.totalAmount / (freshPool.maxSlots ?? 1));

      // Reserve slot
      await tx.rewardPool.update({
        where: { id: EARLY_BIRD_POOL_ID },
        data: {
          slotsClaimed: { increment: 1 },
          distributed: { increment: lunesAmount },
        },
      });

      // Create claim record
      const claim = await tx.earlyBirdClaim.create({
        data: {
          userId,
          poolId: EARLY_BIRD_POOL_ID,
          slotNumber,
          lunesAmount,
        },
      });

      return { slotNumber: claim.slotNumber, lunesAmount: claim.lunesAmount };
    });

    return result;
  } catch {
    return null;
  }
}

/**
 * getEarlyBirdStatus
 *
 * Returns the public status of the Early Bird pool and the user's claim if any.
 */
export async function getEarlyBirdStatus(userId?: string) {
  const pool = await db.rewardPool.findUnique({ where: { id: EARLY_BIRD_POOL_ID } });
  if (!pool) return null;

  const slotsClaimed = pool.slotsClaimed;
  const maxSlots = pool.maxSlots ?? 30_000;
  const slotsRemaining = Math.max(0, maxSlots - slotsClaimed);
  const percentFilled = Math.min(100, (slotsClaimed / maxSlots) * 100);
  const isFull = slotsClaimed >= maxSlots;

  let userClaim: { slotNumber: number; lunesAmount: number; claimedAt: Date } | null = null;
  if (userId) {
    const claim = await db.earlyBirdClaim.findUnique({ where: { userId } });
    if (claim) {
      userClaim = {
        slotNumber: claim.slotNumber,
        lunesAmount: claim.lunesAmount,
        claimedAt: claim.claimedAt,
      };
    }
  }

  return {
    totalAmount: pool.totalAmount,
    maxSlots,
    slotsClaimed,
    slotsRemaining,
    percentFilled: Math.round(percentFilled * 10) / 10,
    lunesPerSlot: pool.linesPerSlot ?? pool.totalAmount / maxSlots,
    isFull,
    isActive: pool.isActive,
    userClaim,
  };
}
