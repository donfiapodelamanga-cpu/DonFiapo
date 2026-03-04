import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/server/admin-auth";

const VALID_TYPES = ["Social Media", "Influencer", "PPC", "Email", "Video"];
const VALID_STATUSES = ["active", "paused", "ended"];

// GET /api/admin/campaigns — list all campaigns with optional status filter
export async function GET(req: NextRequest) {
  const auth = requireAdminAuth(req, "marketing");
  if (!auth.ok) return auth.response;

  try {
    const status = req.nextUrl.searchParams.get("status") ?? undefined;
    const where = status && status !== "all" ? { status } : {};

    const campaigns = await prisma.campaign.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { dailyMetrics: true } } },
    });

    return NextResponse.json(campaigns);
  } catch (error) {
    console.error("[CAMPAIGNS_GET]", error);
    return NextResponse.json({ error: "Failed to fetch campaigns" }, { status: 500 });
  }
}

// POST /api/admin/campaigns — create new campaign
export async function POST(req: NextRequest) {
  const auth = requireAdminAuth(req, "marketing");
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const { name, type, budget, startDate, endDate, ctrGoal } = body;

    if (!name?.trim() || !type || !budget || !startDate || !endDate) {
      return NextResponse.json({ error: "Missing required fields: name, type, budget, startDate, endDate" }, { status: 400 });
    }
    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: `Invalid type. Must be one of: ${VALID_TYPES.join(", ")}` }, { status: 400 });
    }

    const campaign = await prisma.campaign.create({
      data: {
        name: name.trim(),
        type,
        budget: parseFloat(budget),
        ctrGoal: ctrGoal ? parseFloat(ctrGoal) : 8.0,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
    });

    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    console.error("[CAMPAIGNS_POST]", error);
    return NextResponse.json({ error: "Failed to create campaign" }, { status: 500 });
  }
}

// PATCH /api/admin/campaigns — update campaign status, metrics, or daily data
export async function PATCH(req: NextRequest) {
  const auth = requireAdminAuth(req, "marketing");
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const { id, status, reach, clicks, conversions, spent, dailyMetric } = body;

    if (!id) {
      return NextResponse.json({ error: "Campaign id is required" }, { status: 400 });
    }
    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` }, { status: 400 });
    }

    // Update campaign-level fields
    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (reach !== undefined) updateData.reach = parseInt(reach);
    if (clicks !== undefined) updateData.clicks = parseInt(clicks);
    if (conversions !== undefined) updateData.conversions = parseInt(conversions);
    if (spent !== undefined) updateData.spent = parseFloat(spent);

    const campaign = await prisma.campaign.update({
      where: { id },
      data: updateData,
    });

    // Optionally upsert a daily metric row
    if (dailyMetric?.date) {
      const metricDate = new Date(dailyMetric.date + "T00:00:00.000Z");
      await prisma.campaignDailyMetric.upsert({
        where: { campaignId_date: { campaignId: id, date: metricDate } },
        update: {
          reach: dailyMetric.reach ?? 0,
          clicks: dailyMetric.clicks ?? 0,
          conversions: dailyMetric.conversions ?? 0,
          spent: dailyMetric.spent ?? 0,
          impressions: dailyMetric.impressions ?? 0,
        },
        create: {
          campaignId: id,
          date: metricDate,
          reach: dailyMetric.reach ?? 0,
          clicks: dailyMetric.clicks ?? 0,
          conversions: dailyMetric.conversions ?? 0,
          spent: dailyMetric.spent ?? 0,
          impressions: dailyMetric.impressions ?? 0,
        },
      });
    }

    return NextResponse.json(campaign);
  } catch (error) {
    console.error("[CAMPAIGNS_PATCH]", error);
    return NextResponse.json({ error: "Failed to update campaign" }, { status: 500 });
  }
}
