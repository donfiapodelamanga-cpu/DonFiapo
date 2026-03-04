import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAllMilestones, updateMilestone, seedReferralMilestones } from "@/lib/missions/referral-service";

const ADMIN_KEY = process.env.ADMIN_API_KEY;
function checkAdmin(req: NextRequest): boolean {
  if (!ADMIN_KEY) return false;
  return req.headers.get("x-admin-key") === ADMIN_KEY;
}

/**
 * GET /api/admin/missions/milestones
 * List all referral milestones
 */
export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const milestones = await getAllMilestones();
    return NextResponse.json({ milestones });
  } catch (error) {
    console.error("[ADMIN_MILESTONES_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

/**
 * POST /api/admin/missions/milestones
 * Seed default milestones or create a custom one
 */
export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    // If action=seed, seed all default milestones
    if (body.action === "seed") {
      const created = await seedReferralMilestones();
      return NextResponse.json({ message: `Seeded ${created} milestones` }, { status: 201 });
    }

    // Otherwise create a custom milestone
    const { tier, name, bonusPoints, badge } = body;
    if (!tier || !name || bonusPoints == null) {
      return NextResponse.json({ error: "Missing required fields: tier, name, bonusPoints" }, { status: 400 });
    }

    const milestone = await db.referralMilestone.create({
      data: {
        tier: Number(tier),
        name,
        bonusPoints: Number(bonusPoints),
        badge: badge ?? null,
      },
    });

    return NextResponse.json({ milestone }, { status: 201 });
  } catch (error) {
    console.error("[ADMIN_MILESTONES_POST]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/missions/milestones
 * Update a milestone by tier
 */
export async function PATCH(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { tier, ...updates } = body;

    if (tier == null) {
      return NextResponse.json({ error: "Milestone tier is required" }, { status: 400 });
    }

    if (updates.bonusPoints != null) updates.bonusPoints = Number(updates.bonusPoints);

    const milestone = await updateMilestone(Number(tier), updates);
    return NextResponse.json({ milestone });
  } catch (error) {
    console.error("[ADMIN_MILESTONES_PATCH]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
