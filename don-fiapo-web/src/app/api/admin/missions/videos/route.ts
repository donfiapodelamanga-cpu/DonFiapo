import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { calculateMissionPoints, calculateTotalScore, calculateRank } from "@/lib/missions/score-engine";

function checkAdmin(req: NextRequest): boolean {
  return req.headers.get("x-admin-key") === process.env.ADMIN_API_KEY;
}

/**
 * GET /api/admin/missions/videos
 * List all pending video submissions with optional ?status=PENDING|VERIFIED|REJECTED
 * Includes video URL, platform, wallet, deadline info.
 */
export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "PENDING";

  try {
    const completions = await db.missionCompletion.findMany({
      where: {
        status: status as any,
        mission: { actionType: { in: ["VIDEO_TIKTOK", "VIDEO_YOUTUBE"] } },
      },
      orderBy: { completedAt: "asc" },
      include: {
        user: {
          select: {
            id: true,
            xUsername: true,
            rank: true,
            trustScore: true,
            wallets: { select: { address: true }, take: 1 },
          },
        },
        mission: {
          select: { id: true, name: true, actionType: true, basePoints: true, multiplier: true },
        },
      },
    });

    // Parse proofMetadata to extract video details
    const enriched = completions.map((c) => {
      let proof: Record<string, any> = {};
      try { proof = JSON.parse(c.proofMetadata ?? "{}"); } catch { /* ignore */ }

      const deadline = proof.reviewDeadline ? new Date(proof.reviewDeadline) : null;
      const daysLeft = deadline
        ? Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / 86_400_000))
        : null;
      const isExpired = deadline ? Date.now() > deadline.getTime() : false;

      return {
        id: c.id,
        status: c.status,
        earnedPoints: c.earnedPoints,
        submittedAt: c.completedAt,
        verifiedAt: c.verifiedAt,
        videoUrl: proof.videoUrl ?? null,
        platform: proof.platform ?? null,
        reviewDeadline: proof.reviewDeadline ?? null,
        daysLeft,
        isExpired,
        user: c.user,
        mission: c.mission,
      };
    });

    return NextResponse.json({ submissions: enriched, total: enriched.length });
  } catch (error) {
    console.error("[ADMIN_VIDEOS_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

/**
 * POST /api/admin/missions/videos
 * Approve or reject a video submission.
 * Body: { completionId, approved: boolean, reason?: string }
 *
 * On approval: earnedPoints are calculated and user scores updated.
 * On rejection: completion is marked REJECTED with reason stored.
 */
export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { completionId, approved, reason } = await req.json();

    if (!completionId || approved === undefined) {
      return NextResponse.json({ error: "completionId and approved are required" }, { status: 400 });
    }

    const completion = await db.missionCompletion.findUnique({
      where: { id: completionId },
      include: {
        mission: true,
        user: true,
      },
    });

    if (!completion) return NextResponse.json({ error: "Completion not found" }, { status: 404 });
    if (completion.status !== "PENDING") {
      return NextResponse.json({ error: "Completion is not pending" }, { status: 409 });
    }

    let proof: Record<string, any> = {};
    try { proof = JSON.parse(completion.proofMetadata ?? "{}"); } catch { /* ignore */ }

    if (!approved) {
      // ── Reject ──
      await db.missionCompletion.update({
        where: { id: completionId },
        data: {
          status: "REJECTED",
          proofMetadata: JSON.stringify({
            ...proof,
            rejectedAt: new Date().toISOString(),
            rejectionReason: reason ?? "Did not meet quality requirements",
          }),
          verifiedAt: new Date(),
        },
      });

      return NextResponse.json({ success: true, action: "REJECTED" });
    }

    // ── Approve ──
    const mission = completion.mission;
    const user = completion.user;

    const earnedPoints = calculateMissionPoints(
      mission.basePoints,
      mission.multiplier,
      "OFFCHAIN",
      (user.rank as any) ?? "PLEBEU"
    );

    await db.missionCompletion.update({
      where: { id: completionId },
      data: {
        status: "VERIFIED",
        earnedPoints,
        verifiedAt: new Date(),
        proofMetadata: JSON.stringify({
          ...proof,
          approvedAt: new Date().toISOString(),
          approvalNote: reason ?? "Approved by admin",
        }),
      },
    });

    // Update user offchain score
    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: { offchainScore: { increment: earnedPoints } },
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

    return NextResponse.json({
      success: true,
      action: "APPROVED",
      earnedPoints,
      newRank,
    });
  } catch (error) {
    console.error("[ADMIN_VIDEOS_POST]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
