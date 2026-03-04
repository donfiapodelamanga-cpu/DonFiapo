import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { findOrCreateUserByWallet } from "@/lib/missions/service";
import { verifyNFTOwnership, verifyStakingPosition, verifySpinPlayed, verifyNFTListed, verifyNFTPurchased, verifyNFTTraded, verifyAuctionBid } from "@/lib/missions/verifiers/onchain";
import { calculateMissionPoints } from "@/lib/missions/score-engine";
import { calculateTotalScore, calculateRank } from "@/lib/missions/score-engine";
import { rateLimit, validateWalletOrError } from "@/lib/security";

/**
 * POST /api/missions/verify-onchain
 * Verifies on-chain missions (NFT mint, staking, spin) by querying the Lunes contracts directly.
 *
 * Body: {
 *   wallet: string,       // Lunes wallet address
 *   missionId: string,    // Mission ID from DB
 * }
 *
 * The mission's `actionType` drives which contract is queried:
 *   - MINT_NFT          → verifyNFTOwnership (nftType from mission metadata)
 *   - STAKE             → verifyStakingPosition (pool from mission metadata)
 *   - SPIN              → verifySpinPlayed
 */
/**
 * Parses minCount from targetUrl format "marketplace:<action>:<minCount>"
 * e.g. "marketplace:sell:3" → 3, "/marketplace" → 1
 */
function parseMarketplaceMinCount(targetUrl: string | null): number {
  if (!targetUrl) return 1;
  const parts = targetUrl.split(":");
  // format: "marketplace:sell:3"
  if (parts.length >= 3 && parts[0] === "marketplace") {
    const n = parseInt(parts[2], 10);
    if (!isNaN(n) && n > 0) return n;
  }
  return 1;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { wallet, missionId } = body;

    if (!wallet || !missionId) {
      return NextResponse.json({ error: "wallet and missionId are required" }, { status: 400 });
    }

    // Validate wallet format
    const walletError = validateWalletOrError(wallet);
    if (walletError) return walletError;

    // Rate limit: 20 verifications per minute per wallet
    const rl = rateLimit(`verify-onchain:${wallet}`, 20, 60_000);
    if (rl) return rl;

    // ── Resolve user ──
    const userId = await findOrCreateUserByWallet(wallet);

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (user.isBanned) return NextResponse.json({ error: "Account is suspended" }, { status: 403 });

    // ── Load mission ──
    const mission = await db.mission.findUnique({ where: { id: missionId } });
    if (!mission || !mission.isActive) {
      return NextResponse.json({ error: "Mission not found or inactive" }, { status: 404 });
    }

    // ── Check if already verified ──
    const alreadyVerified = await db.missionCompletion.findFirst({
      where: { userId, missionId, status: "VERIFIED" },
    });
    if (alreadyVerified) {
      return NextResponse.json(
        { error: "Mission already verified", code: "ALREADY_VERIFIED" },
        { status: 409 }
      );
    }

    // ── Prevent spam: block duplicate PENDING ──
    const pendingExists = await db.missionCompletion.findFirst({
      where: { userId, missionId, status: "PENDING" },
    });
    if (pendingExists) {
      return NextResponse.json(
        { error: "Verification already in progress", code: "ALREADY_PENDING" },
        { status: 409 }
      );
    }

    // ── Run on-chain verification ──
    const actionType = (mission.actionType ?? "").toUpperCase();

    let verificationResult: { verified: boolean; reason?: string; meta?: Record<string, any> } =
      { verified: false, reason: "Unknown action type" };

    if (actionType === "MINT_NFT") {
      // targetUrl encodes the nft type: "nft:<typeIndex>" or null = any NFT
      const targetParts = (mission.targetUrl ?? "").split(":");
      const nftType =
        targetParts[0] === "nft" && targetParts[1] !== undefined
          ? parseInt(targetParts[1], 10)
          : null;

      const result = await verifyNFTOwnership(wallet, nftType);
      verificationResult = {
        verified: result.verified,
        reason: result.reason,
        meta: { nftCount: result.nftCount },
      };
    } else if (actionType === "STAKE") {
      // targetUrl encodes the pool: "stake:don-burn" | "stake:don-lunes" | "stake:don-fiapo" | "stake:any"
      const targetParts = (mission.targetUrl ?? "").split(":");
      const poolId =
        targetParts[0] === "stake" && targetParts[1] && targetParts[1] !== "any"
          ? targetParts[1]
          : null;

      const result = await verifyStakingPosition(wallet, poolId);
      verificationResult = {
        verified: result.verified,
        reason: result.reason,
        meta: { stakedAmount: result.stakedAmount },
      };
    } else if (actionType === "SPIN") {
      const result = await verifySpinPlayed(wallet);
      verificationResult = {
        verified: result.verified,
        reason: result.reason,
        meta: { spinCount: result.spinCount },
      };
    } else if (actionType === "SELL_NFT") {
      // targetUrl: "marketplace:sell:<minCount>"  e.g. "marketplace:sell:3"
      const minCount = parseMarketplaceMinCount(mission.targetUrl);
      const result = await verifyNFTListed(wallet, minCount);
      verificationResult = {
        verified: result.verified,
        reason: result.reason,
        meta: { count: result.count, required: result.required },
      };
    } else if (actionType === "BUY_NFT") {
      // targetUrl: "marketplace:buy:<minCount>"
      const minCount = parseMarketplaceMinCount(mission.targetUrl);
      const result = await verifyNFTPurchased(wallet, minCount);
      verificationResult = {
        verified: result.verified,
        reason: result.reason,
        meta: { count: result.count, required: result.required },
      };
    } else if (actionType === "TRADE_NFT") {
      // targetUrl: "marketplace:trade:<minCount>"
      const minCount = parseMarketplaceMinCount(mission.targetUrl);
      const result = await verifyNFTTraded(wallet, minCount);
      verificationResult = {
        verified: result.verified,
        reason: result.reason,
        meta: { count: result.count, required: result.required },
      };
    } else if (actionType === "BID_NFT") {
      // targetUrl: "marketplace:bid:<minCount>"
      const minCount = parseMarketplaceMinCount(mission.targetUrl);
      const result = await verifyAuctionBid(wallet, minCount);
      verificationResult = {
        verified: result.verified,
        reason: result.reason,
        meta: { count: result.count, required: result.required },
      };
    } else {
      return NextResponse.json(
        { error: `Action type "${actionType}" is not supported by on-chain verification` },
        { status: 400 }
      );
    }

    if (!verificationResult.verified) {
      return NextResponse.json(
        {
          success: false,
          error: verificationResult.reason ?? "On-chain verification failed",
          code: "ONCHAIN_NOT_VERIFIED",
          meta: verificationResult.meta ?? {},
        },
        { status: 400 }
      );
    }

    // ── Create verified completion ──
    const earnedPoints = calculateMissionPoints(
      mission.basePoints,
      mission.multiplier,
      "ONCHAIN",
      (user.rank as any) ?? "PLEBEU"
    );

    await db.missionCompletion.create({
      data: {
        userId,
        missionId,
        status: "VERIFIED",
        earnedPoints,
        proofMetadata: JSON.stringify({
          actionType,
          wallet,
          verifiedAt: new Date().toISOString(),
          ...verificationResult.meta,
        }),
        verifiedAt: new Date(),
      },
    });

    // ── Update user scores ──
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: { onchainScore: { increment: earnedPoints } },
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

    return NextResponse.json({
      success: true,
      points: earnedPoints,
      rank: newRank,
      totalScore,
    });
  } catch (error) {
    console.error("[VERIFY_ONCHAIN_ERROR]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
