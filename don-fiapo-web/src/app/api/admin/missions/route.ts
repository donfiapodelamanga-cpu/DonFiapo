import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

function checkAdmin(req: NextRequest): boolean {
  const adminKey = req.headers.get("x-admin-key");
  return adminKey === process.env.ADMIN_API_KEY;
}

/**
 * GET /api/admin/missions
 * List all missions (including inactive) for admin panel
 */
export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const missions = await db.mission.findMany({
      orderBy: [{ priority: "desc" }, { type: "asc" }, { createdAt: "desc" }],
      include: {
        rewardPool: true,
        _count: { select: { completions: true } },
      },
    });

    return NextResponse.json({ missions });
  } catch (error) {
    console.error("[ADMIN_MISSIONS_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

/**
 * POST /api/admin/missions
 * Create a new mission
 */
export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      name, description, type, platform,
      basePoints, multiplier, maxCompletions,
      startDate, endDate, isActive,
      status, priority, category,
      targetUrl, requiredKeyword, actionType,
      rewardPoolId,
    } = body;

    if (!name || !description || !type || !platform || basePoints == null) {
      return NextResponse.json({ error: "Missing required fields: name, description, type, platform, basePoints" }, { status: 400 });
    }

    const mission = await db.mission.create({
      data: {
        name,
        description,
        type,
        platform,
        basePoints: Number(basePoints),
        multiplier: Number(multiplier ?? 1),
        maxCompletions: Number(maxCompletions ?? 1),
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        isActive: isActive ?? true,
        status: status ?? "ACTIVE",
        priority: Number(priority ?? 0),
        category: category ?? null,
        targetUrl: targetUrl ?? null,
        requiredKeyword: requiredKeyword ?? null,
        actionType: actionType ?? null,
        rewardPoolId: rewardPoolId ?? null,
      },
    });

    return NextResponse.json({ mission }, { status: 201 });
  } catch (error) {
    console.error("[ADMIN_MISSIONS_POST]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/missions
 * Update an existing mission
 * Body: { id: string, ...fieldsToUpdate }
 */
export async function PATCH(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Mission id is required" }, { status: 400 });
    }

    // Clean up date fields
    if (updates.startDate) updates.startDate = new Date(updates.startDate);
    if (updates.endDate) updates.endDate = new Date(updates.endDate);
    if (updates.basePoints != null) updates.basePoints = Number(updates.basePoints);
    if (updates.multiplier != null) updates.multiplier = Number(updates.multiplier);
    if (updates.maxCompletions != null) updates.maxCompletions = Number(updates.maxCompletions);
    if (updates.priority != null) updates.priority = Number(updates.priority);

    const mission = await db.mission.update({
      where: { id },
      data: updates,
    });

    return NextResponse.json({ mission });
  } catch (error) {
    console.error("[ADMIN_MISSIONS_PATCH]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/missions
 * Soft-delete (deactivate) a mission
 * Body: { id: string }
 */
export async function DELETE(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "Mission id is required" }, { status: 400 });
    }

    await db.mission.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ADMIN_MISSIONS_DELETE]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
