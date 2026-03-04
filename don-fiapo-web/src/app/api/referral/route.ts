import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recordReferral } from "@/lib/missions/referral-service";
import { findOrCreateUserByWallet } from "@/lib/missions/service";
import { resolveReferrerCode } from "@/lib/missions/referral-resolver";

/**
 * POST /api/referral
 * Captures a referral when a new user arrives via a referral link.
 * Called from the frontend when a user connects their wallet after
 * arriving via /ref/<code> or ?ref=<code>.
 *
 * Body: { referrerCode: string, walletAddress: string, fingerprint?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { referrerCode, walletAddress, fingerprint } = body;

    if (!referrerCode || !walletAddress) {
      return NextResponse.json(
        { error: "referrerCode and walletAddress are required" },
        { status: 400 }
      );
    }

    // Resolve the referrer — code can be a userId, wallet address prefix, or xUsername
    const referrerId = await resolveReferrerCode(referrerCode);
    if (!referrerId) {
      return NextResponse.json(
        { error: "Invalid referral code" },
        { status: 404 }
      );
    }

    // Find or create the referred user by their wallet
    const referredId = await findOrCreateUserByWallet(walletAddress);

    // Prevent referring yourself
    if (referrerId === referredId) {
      return NextResponse.json(
        { error: "Cannot refer yourself" },
        { status: 400 }
      );
    }

    // Collect metadata for fraud detection
    const ipAddress = extractIp(req);
    const userAgent = req.headers.get("user-agent") ?? undefined;

    // Record the referral with fraud checks
    const result = await recordReferral(referrerId, referredId, {
      ipAddress,
      fingerprint,
      userAgent,
    });

    if (!result.success) {
      // 409 if already referred, otherwise 403 for fraud rejection
      const status = result.message === "User already has a referrer" ? 409 : 403;
      return NextResponse.json(
        { error: result.message, fraudScore: result.fraudScore },
        { status }
      );
    }

    // Update the referred user's IP and fingerprint for future fraud checks
    await db.user.update({
      where: { id: referredId },
      data: {
        lastIpAddress: ipAddress ?? undefined,
        deviceFingerprint: fingerprint ?? undefined,
      },
    });

    return NextResponse.json(
      { success: true, message: result.message },
      { status: 201 }
    );
  } catch (error) {
    console.error("[REFERRAL_POST]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/**
 * GET /api/referral?userId=<id>
 * Check if a user has a referrer (for frontend UI state).
 */
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const referral = await db.referral.findUnique({
      where: { referredId: userId },
      select: {
        referrerId: true,
        status: true,
        createdAt: true,
        referrer: {
          select: { xUsername: true },
        },
      },
    });

    if (!referral) {
      return NextResponse.json({ hasReferrer: false });
    }

    return NextResponse.json({
      hasReferrer: true,
      referrerUsername: referral.referrer?.xUsername ?? null,
      status: referral.status,
      referredAt: referral.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("[REFERRAL_GET]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// ── Helpers ──────────────────────────────────────────────────────

/**
 * Extract real IP from request headers (handles proxies/Vercel/Cloudflare).
 */
function extractIp(req: NextRequest): string | undefined {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    req.headers.get("cf-connecting-ip") ??
    undefined
  );
}
