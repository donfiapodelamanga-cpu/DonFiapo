import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { findOrCreateUserByWallet } from "@/lib/missions/service";
import { rateLimit, validateWalletOrError } from "@/lib/security";

const CONTENT_ACTION_TYPES = ["VIDEO_TIKTOK", "VIDEO_YOUTUBE", "ARTICLE_MEDIUM", "ARTICLE_CMC"] as const;
const TIKTOK_RE = /tiktok\.com\/@[\w.]+\/video\/\d+|vm\.tiktok\.com\/\w+/i;
const YOUTUBE_RE = /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)[\w-]+/i;
const MEDIUM_RE = /medium\.com\/[\w@][\w.-]*\/[\w-]+/i;
const CMC_RE = /coinmarketcap\.com\/currencies\/[\w-]+|coinmarketcap\.com\/community\/post\/[\w-]+/i;

function validateContentUrl(actionType: string, url: string): boolean {
  if (actionType === "VIDEO_TIKTOK") return TIKTOK_RE.test(url);
  if (actionType === "VIDEO_YOUTUBE") return YOUTUBE_RE.test(url);
  if (actionType === "ARTICLE_MEDIUM") return MEDIUM_RE.test(url);
  if (actionType === "ARTICLE_CMC") return CMC_RE.test(url);
  return false;
}

function urlExample(actionType: string): string {
  if (actionType === "VIDEO_TIKTOK") return "https://www.tiktok.com/@user/video/123...";
  if (actionType === "VIDEO_YOUTUBE") return "https://www.youtube.com/watch?v=... or /shorts/...";
  if (actionType === "ARTICLE_MEDIUM") return "https://medium.com/@yourname/article-title-abc123";
  if (actionType === "ARTICLE_CMC") return "https://coinmarketcap.com/currencies/don-fiapo/ or /community/post/...";
  return "a valid URL";
}

function platformLabel(actionType: string): string {
  if (actionType === "VIDEO_TIKTOK") return "TikTok";
  if (actionType === "VIDEO_YOUTUBE") return "YouTube";
  if (actionType === "ARTICLE_MEDIUM") return "Medium";
  if (actionType === "ARTICLE_CMC") return "CoinMarketCap";
  return "Unknown";
}

/**
 * POST /api/missions/submit-video
 * Submit a TikTok/YouTube video URL or a Medium/CMC article link for a UGC mission.
 * The completion is saved as PENDING and reviewed by an admin within 7 days.
 *
 * Body: { wallet, missionId, videoUrl }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { wallet, missionId, videoUrl } = body;

    if (!wallet || !missionId || !videoUrl) {
      return NextResponse.json(
        { error: "wallet, missionId and videoUrl are required" },
        { status: 400 }
      );
    }

    // Validate wallet format
    const walletError = validateWalletOrError(wallet);
    if (walletError) return walletError;

    // Rate limit: 10 submissions per minute per wallet
    const rl = rateLimit(`submit-video:${wallet}`, 10, 60_000);
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

    const actionType = (mission.actionType ?? "").toUpperCase();
    if (!CONTENT_ACTION_TYPES.includes(actionType as any)) {
      return NextResponse.json(
        { error: "This mission does not accept content submissions" },
        { status: 400 }
      );
    }

    // ── Validate URL format ──
    if (!validateContentUrl(actionType, videoUrl)) {
      return NextResponse.json(
        { error: `Invalid URL. Expected format: ${urlExample(actionType)}` },
        { status: 400 }
      );
    }

    // ── Prevent duplicates ──
    const existing = await db.missionCompletion.findFirst({
      where: { userId, missionId, status: { in: ["PENDING", "VERIFIED"] } },
    });
    if (existing) {
      if (existing.status === "VERIFIED") {
        return NextResponse.json(
          { error: "Mission already verified", code: "ALREADY_VERIFIED" },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: "Video already submitted and awaiting review", code: "ALREADY_PENDING" },
        { status: 409 }
      );
    }

    // ── Prevent same URL submitted by anyone else (avoid farming) ──
    const urlTaken = await db.missionCompletion.findFirst({
      where: {
        missionId,
        proofMetadata: { contains: videoUrl },
        status: { in: ["PENDING", "VERIFIED"] },
      },
    });
    if (urlTaken) {
      return NextResponse.json(
        { error: "This video URL has already been submitted", code: "DUPLICATE_URL" },
        { status: 409 }
      );
    }

    // ── Create PENDING completion with 7-day deadline ──
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 7);

    const completion = await db.missionCompletion.create({
      data: {
        userId,
        missionId,
        status: "PENDING",
        earnedPoints: 0, // will be set on approval
        proofMetadata: JSON.stringify({
          actionType,
          wallet,
          videoUrl,
          submittedAt: new Date().toISOString(),
          reviewDeadline: deadline.toISOString(),
          platform: platformLabel(actionType),
        }),
      },
    });

    return NextResponse.json({
      success: true,
      completionId: completion.id,
      message: "Content submitted for review! You will receive your points within 7 days if approved.",
      reviewDeadline: deadline.toISOString(),
    });
  } catch (error) {
    console.error("[SUBMIT_VIDEO_ERROR]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
