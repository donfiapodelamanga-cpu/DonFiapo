import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { findOrCreateUserByWallet } from "@/lib/missions/service";
import { verifyFollow, verifyLike, verifyRepost, verifyComment, refreshAccessToken } from "@/lib/missions/verifiers/twitter";
import { verifyTelegramMembership } from "@/lib/missions/verifiers/telegram";
import { runPreSubmissionChecks, applyTrustScoreDelta, scheduleRecheck } from "@/lib/missions/fraud-engine";
import { calculateMissionPoints } from "@/lib/missions/score-engine";
import { rateLimit, validateWalletOrError } from "@/lib/security";

/**
 * POST /api/missions/verify-social
 * Verifies a social mission (X/Telegram) via real API calls.
 *
 * Body: {
 *   wallet: string,
 *   missionId: string,
 *   fingerprint?: string,       // device fingerprint from FingerprintJS
 *   telegramData?: object,      // raw data from Telegram Login Widget
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { wallet, missionId, fingerprint, telegramData } = body;

    if (!wallet || !missionId) {
      return NextResponse.json({ error: "wallet and missionId are required" }, { status: 400 });
    }

    // Validate wallet format
    const walletError = validateWalletOrError(wallet);
    if (walletError) return walletError;

    // Rate limit: 20 verifications per minute per wallet
    const rl = rateLimit(`verify-social:${wallet}`, 20, 60_000);
    if (rl) return rl;

    // Get client IP
    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      undefined;

    // Resolve user
    const userId = await findOrCreateUserByWallet(wallet);

    // ── Run pre-submission fraud checks ──
    const fraudCheck = await runPreSubmissionChecks(userId, missionId, ipAddress, fingerprint);
    if (!fraudCheck.allowed) {
      return NextResponse.json({ error: fraudCheck.reason }, { status: 429 });
    }

    // ── Load mission ──
    const mission = await db.mission.findUnique({ where: { id: missionId } });
    if (!mission || !mission.isActive) {
      return NextResponse.json({ error: "Mission not found or inactive" }, { status: 404 });
    }

    // Prevent re-verification of an already verified completion for this mission
    const alreadyVerified = await db.missionCompletion.findFirst({
      where: { userId, missionId, status: "VERIFIED" },
    });
    if (alreadyVerified) {
      return NextResponse.json(
        { error: "Mission already verified", code: "ALREADY_VERIFIED" },
        { status: 409 }
      );
    }

    // ── Load user with OAuth tokens ──
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let verificationResult: { verified: boolean; reason?: string } = { verified: false };

    // ── Platform-specific verification ──
    const platform = mission.platform.toUpperCase();
    const actionType = (mission.actionType ?? "").toUpperCase();

    if (platform === "X") {
      // Ensure X account is connected
      if (!user.xId || !user.xAccessToken) {
        return NextResponse.json(
          { error: "Please connect your X (Twitter) account first", code: "X_NOT_CONNECTED" },
          { status: 400 }
        );
      }

      // Refresh token if expired
      let accessToken = user.xAccessToken;
      if (user.xTokenExpiresAt && user.xTokenExpiresAt < new Date()) {
        if (!user.xRefreshToken) {
          return NextResponse.json(
            { error: "X session expired. Please reconnect your account.", code: "X_TOKEN_EXPIRED" },
            { status: 400 }
          );
        }
        const refreshed = await refreshAccessToken(user.xRefreshToken);
        accessToken = refreshed.accessToken;
        await db.user.update({
          where: { id: userId },
          data: {
            xAccessToken: refreshed.accessToken,
            xRefreshToken: refreshed.refreshToken ?? user.xRefreshToken,
            xTokenExpiresAt: new Date(Date.now() + refreshed.expiresIn * 1000),
          },
        });
      }

      // Extract target from mission's targetUrl field
      // Format: "follow:<target_x_id>" | "tweet:<tweet_id>" | "<url>"
      const targetParts = (mission.targetUrl ?? "").split(":");
      const targetId = targetParts[1] ?? mission.targetUrl ?? "";

      if (actionType === "FOLLOW") {
        verificationResult = await verifyFollow(user.xId, accessToken, targetId);
      } else if (actionType === "LIKE") {
        verificationResult = await verifyLike(user.xId, accessToken, targetId);
      } else if (actionType === "REPOST") {
        verificationResult = await verifyRepost(accessToken, targetId, user.xId);
      } else if (actionType === "COMMENT") {
        verificationResult = await verifyComment(
          user.xId,
          accessToken,
          targetId,
          mission.requiredKeyword ?? undefined
        );
      } else {
        return NextResponse.json({ error: `Unknown X action type: ${actionType}` }, { status: 400 });
      }
    } else if (platform === "TELEGRAM") {
      // Ensure Telegram account is connected
      if (!user.telegramId) {
        if (!telegramData) {
          return NextResponse.json(
            { error: "Please connect your Telegram account first", code: "TELEGRAM_NOT_CONNECTED" },
            { status: 400 }
          );
        }
        // Validate Telegram login widget data inline
        const { validateTelegramLogin } = await import("@/lib/missions/verifiers/telegram");
        const loginValidation = validateTelegramLogin(telegramData);
        if (!loginValidation.verified) {
          return NextResponse.json({ error: loginValidation.reason }, { status: 400 });
        }
        // Save Telegram identity
        await db.user.update({
          where: { id: userId },
          data: {
            telegramId: String(telegramData.id),
            telegramUsername: telegramData.username ?? null,
          },
        });
        user.telegramId = String(telegramData.id);
      }

      verificationResult = await verifyTelegramMembership(user.telegramId);
    } else {
      return NextResponse.json(
        { error: `Platform "${platform}" does not support automated verification` },
        { status: 400 }
      );
    }

    // ── Apply fraud check results ──
    if (fraudCheck.signals.length > 0) {
      await applyTrustScoreDelta(userId, fraudCheck.trustScoreDelta, fraudCheck.signals);
    }

    if (!verificationResult.verified) {
      // Slight trust score penalty for failed verification (may be gaming)
      if ((user.trustScore ?? 100) > 50) {
        await applyTrustScoreDelta(userId, -5, ["SOCIAL_VERIFICATION_FAILED"]);
      }
      return NextResponse.json(
        { success: false, error: verificationResult.reason ?? "Verification failed" },
        { status: 400 }
      );
    }

    // ── Create verified completion ──
    const earnedPoints = calculateMissionPoints(
      mission.basePoints,
      mission.multiplier,
      mission.type as "OFFCHAIN" | "ONCHAIN",
      (user.rank as any) ?? "PLEBEU"
    );

    const completion = await db.missionCompletion.create({
      data: {
        userId,
        missionId,
        status: "VERIFIED",
        earnedPoints,
        proofMetadata: JSON.stringify({
          platform,
          actionType,
          verifiedAt: new Date().toISOString(),
          xId: user.xId ?? null,
          telegramId: user.telegramId ?? null,
        }),
        verifiedAt: new Date(),
      },
    });

    // ── Schedule re-check (anti-unfollow) ──
    await scheduleRecheck(completion.id);

    // ── Update user scores ──
    const scoreField = mission.type === "ONCHAIN" ? "onchainScore" : "offchainScore";
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: { [scoreField]: { increment: earnedPoints } },
    });

    // Recalculate total score and rank
    const { calculateTotalScore, calculateRank } = await import("@/lib/missions/score-engine");
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

    return NextResponse.json({
      success: true,
      points: earnedPoints,
      rank: newRank,
      totalScore,
      recheckScheduled: true,
    });
  } catch (error) {
    console.error("[VERIFY_SOCIAL_ERROR]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
