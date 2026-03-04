import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getReferralFraudSummary,
  rejectReferral,
  approveReferral,
  auditPendingReferrals,
} from "@/lib/missions/referral-fraud";

const ADMIN_KEY = process.env.ADMIN_API_KEY;
function checkAdmin(req: NextRequest): boolean {
  if (!ADMIN_KEY) return false;
  return req.headers.get("x-admin-key") === ADMIN_KEY;
}

/**
 * GET /api/admin/referrals/fraud
 * Returns fraud summary + flagged referrals for admin review.
 */
export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await getReferralFraudSummary();

    // Get flagged referrals for review
    const flagged = await db.referral.findMany({
      where: { status: { in: ["FLAGGED", "REJECTED"] } },
      orderBy: [{ fraudScore: "desc" }, { createdAt: "desc" }],
      take: 50,
      include: {
        referrer: {
          select: { id: true, xUsername: true, trustScore: true, lastIpAddress: true, deviceFingerprint: true },
        },
        referred: {
          select: { id: true, xUsername: true, trustScore: true, lastIpAddress: true, deviceFingerprint: true, createdAt: true },
        },
      },
    });

    // Get top referrers with their stats
    const topReferrers = await db.referral.groupBy({
      by: ["referrerId"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 20,
    });

    const topReferrerDetails = await Promise.all(
      topReferrers.map(async (r) => {
        const user = await db.user.findUnique({
          where: { id: r.referrerId },
          select: { id: true, xUsername: true, trustScore: true, lastIpAddress: true },
        });
        const qualified = await db.referral.count({
          where: { referrerId: r.referrerId, status: "QUALIFIED" },
        });
        const flaggedCount = await db.referral.count({
          where: { referrerId: r.referrerId, status: { in: ["FLAGGED", "REJECTED"] } },
        });
        return {
          ...user,
          totalReferrals: r._count.id,
          qualifiedReferrals: qualified,
          flaggedReferrals: flaggedCount,
          qualificationRate: r._count.id > 0 ? Math.round((qualified / r._count.id) * 100) : 0,
        };
      })
    );

    return NextResponse.json({
      summary,
      flagged: flagged.map((f) => ({
        id: f.id,
        referrerId: f.referrerId,
        referredId: f.referredId,
        referrerUsername: f.referrer?.xUsername,
        referredUsername: f.referred?.xUsername,
        referrerTrust: f.referrer?.trustScore,
        referredTrust: f.referred?.trustScore,
        referrerIp: f.referrer?.lastIpAddress,
        referredIp: f.referred?.lastIpAddress,
        referredCreatedAt: f.referred?.createdAt?.toISOString(),
        status: f.status,
        fraudScore: f.fraudScore,
        flagReason: f.flagReason,
        ipAddress: f.ipAddress,
        fingerprint: f.fingerprint,
        createdAt: f.createdAt.toISOString(),
      })),
      topReferrers: topReferrerDetails,
    });
  } catch (error) {
    console.error("[ADMIN_REFERRAL_FRAUD_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

/**
 * POST /api/admin/referrals/fraud
 * Admin actions: approve, reject, or audit referrals.
 */
export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action, referralId, reason } = body;

    switch (action) {
      case "approve": {
        if (!referralId) {
          return NextResponse.json({ error: "referralId required" }, { status: 400 });
        }
        await approveReferral(referralId);
        return NextResponse.json({ success: true, message: "Referral approved" });
      }

      case "reject": {
        if (!referralId || !reason) {
          return NextResponse.json({ error: "referralId and reason required" }, { status: 400 });
        }
        await rejectReferral(referralId, reason);
        return NextResponse.json({ success: true, message: "Referral rejected" });
      }

      case "audit": {
        const result = await auditPendingReferrals();
        return NextResponse.json({
          success: true,
          message: `Audit complete: ${result.flagged} flagged, ${result.rejected} rejected`,
          ...result,
        });
      }

      default:
        return NextResponse.json({ error: "Unknown action. Use: approve, reject, audit" }, { status: 400 });
    }
  } catch (error) {
    console.error("[ADMIN_REFERRAL_FRAUD_POST]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
