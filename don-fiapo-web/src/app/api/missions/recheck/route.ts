import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyFollow, verifyLike, verifyRepost, refreshAccessToken } from "@/lib/missions/verifiers/twitter";
import { verifyTelegramMembership } from "@/lib/missions/verifiers/telegram";
import { applyTrustScoreDelta } from "@/lib/missions/fraud-engine";
import { calculateTotalScore, calculateRank } from "@/lib/missions/score-engine";

const RECHECK_SECRET = process.env.RECHECK_SECRET;

/**
 * POST /api/missions/recheck
 * Called by a cron job (e.g. Vercel Cron, external scheduler) to re-verify
 * social missions that were previously verified. If the user undid the action
 * (unfollowed, unliked, left group), their completion is REJECTED and points removed.
 *
 * Authorization: Bearer <RECHECK_SECRET>
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${RECHECK_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Find completions due for recheck
  const completions = await db.missionCompletion.findMany({
    where: {
      status: "VERIFIED",
      recheckAt: { lte: now },
    },
    include: {
      mission: true,
      user: true,
    },
    take: 50, // Process in batches
  });

  const results = { rechecked: 0, revoked: 0, errors: 0 };

  for (const completion of completions) {
    try {
      const { user, mission } = completion;
      const platform = mission.platform.toUpperCase();
      const actionType = (mission.actionType ?? "").toUpperCase();

      let stillValid = false;

      if (platform === "X") {
        if (!user.xId || !user.xAccessToken) {
          // Token gone — mark as requiring re-auth, skip for now
          await db.missionCompletion.update({
            where: { id: completion.id },
            data: { recheckAt: null },
          });
          continue;
        }

        // Refresh token if expired
        let accessToken = user.xAccessToken;
        if (user.xTokenExpiresAt && user.xTokenExpiresAt < now) {
          if (!user.xRefreshToken) {
            await db.missionCompletion.update({
              where: { id: completion.id },
              data: { recheckAt: null },
            });
            continue;
          }
          try {
            const refreshed = await refreshAccessToken(user.xRefreshToken);
            accessToken = refreshed.accessToken;
            await db.user.update({
              where: { id: user.id },
              data: {
                xAccessToken: refreshed.accessToken,
                xRefreshToken: refreshed.refreshToken ?? user.xRefreshToken,
                xTokenExpiresAt: new Date(Date.now() + refreshed.expiresIn * 1000),
              },
            });
          } catch {
            await db.missionCompletion.update({
              where: { id: completion.id },
              data: { recheckAt: null },
            });
            continue;
          }
        }

        const targetParts = (mission.targetUrl ?? "").split(":");
        const targetId = targetParts[1] ?? mission.targetUrl ?? "";

        if (actionType === "FOLLOW") {
          const res = await verifyFollow(user.xId, accessToken, targetId);
          stillValid = res.verified;
        } else if (actionType === "LIKE") {
          const res = await verifyLike(user.xId, accessToken, targetId);
          stillValid = res.verified;
        } else if (actionType === "REPOST") {
          const res = await verifyRepost(accessToken, targetId, user.xId);
          stillValid = res.verified;
        } else {
          // COMMENT — we don't revoke comments (they can't be easily undone)
          stillValid = true;
        }
      } else if (platform === "TELEGRAM") {
        if (!user.telegramId) {
          stillValid = false;
        } else {
          const res = await verifyTelegramMembership(user.telegramId);
          stillValid = res.verified;
        }
      } else {
        // Non-social platform — clear recheck and skip
        await db.missionCompletion.update({
          where: { id: completion.id },
          data: { recheckAt: null },
        });
        continue;
      }

      results.rechecked++;

      if (!stillValid) {
        results.revoked++;

        // Revoke completion
        await db.missionCompletion.update({
          where: { id: completion.id },
          data: { status: "REJECTED", recheckAt: null },
        });

        // Remove points from user
        const scoreField = mission.type === "ONCHAIN" ? "onchainScore" : "offchainScore";
        const updatedUser = await db.user.update({
          where: { id: user.id },
          data: {
            [scoreField]: { decrement: completion.earnedPoints },
          },
        });

        const totalScore = calculateTotalScore(
          updatedUser.offchainScore,
          updatedUser.onchainScore,
          updatedUser.multiplier
        );
        const newRank = calculateRank(totalScore);

        await db.user.update({
          where: { id: user.id },
          data: { totalScore, rank: newRank },
        });

        // Apply fraud penalty
        await applyTrustScoreDelta(user.id, -20, ["SOCIAL_ACTION_REVERSED"]);
      } else {
        // Clear the recheck timestamp (no further rechecks after first pass)
        await db.missionCompletion.update({
          where: { id: completion.id },
          data: { recheckAt: null },
        });
      }
    } catch (err) {
      console.error(`[RECHECK] Error processing completion ${completion.id}:`, err);
      results.errors++;
    }
  }

  return NextResponse.json({
    processed: completions.length,
    ...results,
  });
}
