import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/server/admin-auth";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pctChange(cur: number, prev: number): number {
  if (prev === 0) return cur > 0 ? 100 : 0;
  return Math.round(((cur - prev) / prev) * 1000) / 10;
}

function trendDir(cur: number, prev: number): "up" | "down" | "neutral" {
  if (cur > prev) return "up";
  if (cur < prev) return "down";
  return "neutral";
}

// Industry average CTR for crypto/web3 campaigns (benchmark)
const INDUSTRY_AVG_CTR = 2.5;

// ─── Route Handler ────────────────────────────────────────────────────────────

/**
 * GET /api/admin/marketing/overview
 *
 * Aggregates marketing performance from Campaign + CampaignDailyMetric tables.
 *
 * Returns:
 *   - stats: totalReach, totalClicks, totalConversions, conversionRate (with period comparison)
 *   - dailyChart: last 7 days of aggregated reach/clicks/conversions from CampaignDailyMetric
 *   - ctr: computed CTR, weighted CTR goal, industry average, goal status
 *   - campaigns: full campaign list (with dailyMetrics count)
 *
 * Query params:
 *   from  — ISO date (default: 30 days ago)
 *   to    — ISO date (default: now)
 */
export async function GET(req: NextRequest) {
  const auth = requireAdminAuth(req, "marketing");
  if (!auth.ok) return auth.response;

  const { searchParams } = req.nextUrl;
  const rawFrom = searchParams.get("from");
  const rawTo = searchParams.get("to");

  const now = new Date();
  const rangeEnd = rawTo ? new Date(rawTo + "T23:59:59.999Z") : now;
  const rangeStart = rawFrom
    ? new Date(rawFrom + "T00:00:00.000Z")
    : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const rangeMs = rangeEnd.getTime() - rangeStart.getTime();
  const prevStart = new Date(rangeStart.getTime() - rangeMs);
  const prevEnd = rangeStart;

  // ── Fetch campaigns + daily metrics in parallel ─────────────────────────────
  const [campaigns, dailyMetricsCur, dailyMetricsPrev] = await Promise.all([
    prisma.campaign.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { dailyMetrics: true } } },
    }),

    // Current period daily metrics (aggregated across all campaigns)
    prisma.campaignDailyMetric.findMany({
      where: { date: { gte: rangeStart, lte: rangeEnd } },
      orderBy: { date: "asc" },
    }),

    // Previous period daily metrics (for comparison)
    prisma.campaignDailyMetric.findMany({
      where: { date: { gte: prevStart, lte: prevEnd } },
      select: { reach: true, clicks: true, conversions: true, spent: true },
    }),
  ]);

  // ── Current period totals ──────────────────────────────────────────────────
  // If there are daily metrics, use those (they represent real tracked data).
  // Fall back to campaign-level totals if no daily metrics exist yet.
  const hasDailyData = dailyMetricsCur.length > 0;

  let curReach: number;
  let curClicks: number;
  let curConversions: number;
  let curSpent: number;

  if (hasDailyData) {
    curReach = dailyMetricsCur.reduce((s, m) => s + m.reach, 0);
    curClicks = dailyMetricsCur.reduce((s, m) => s + m.clicks, 0);
    curConversions = dailyMetricsCur.reduce((s, m) => s + m.conversions, 0);
    curSpent = dailyMetricsCur.reduce((s, m) => s + m.spent, 0);
  } else {
    // Fallback: aggregate from campaign-level totals
    curReach = campaigns.reduce((s, c) => s + c.reach, 0);
    curClicks = campaigns.reduce((s, c) => s + c.clicks, 0);
    curConversions = campaigns.reduce((s, c) => s + c.conversions, 0);
    curSpent = campaigns.reduce((s, c) => s + c.spent, 0);
  }

  const curCtr = curReach > 0 ? (curClicks / curReach) * 100 : 0;
  const curConvRate = curClicks > 0 ? (curConversions / curClicks) * 100 : 0;

  // ── Previous period totals ─────────────────────────────────────────────────
  const prevReach = dailyMetricsPrev.reduce((s, m) => s + m.reach, 0);
  const prevClicks = dailyMetricsPrev.reduce((s, m) => s + m.clicks, 0);
  const prevConversions = dailyMetricsPrev.reduce((s, m) => s + m.conversions, 0);
  const prevConvRate = prevClicks > 0 ? (prevConversions / prevClicks) * 100 : 0;

  // ── Daily chart — last 7 days ──────────────────────────────────────────────
  const dayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Filter daily metrics to last 7 days and aggregate by calendar day
  const last7 = dailyMetricsCur.filter((m) => m.date >= sevenDaysAgo);
  const dayMap = new Map<string, { reach: number; clicks: number; conversions: number }>();
  for (const m of last7) {
    const key = m.date.toISOString().slice(0, 10);
    const entry = dayMap.get(key) ?? { reach: 0, clicks: 0, conversions: 0 };
    entry.reach += m.reach;
    entry.clicks += m.clicks;
    entry.conversions += m.conversions;
    dayMap.set(key, entry);
  }

  // Build ordered array for the last 7 calendar days
  const dailyChart: { day: string; date: string; reach: number; clicks: number; conversions: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    const entry = dayMap.get(key);
    dailyChart.push({
      day: dayLabels[d.getDay()],
      date: key,
      reach: entry?.reach ?? 0,
      clicks: entry?.clicks ?? 0,
      conversions: entry?.conversions ?? 0,
    });
  }

  // If no daily metric data at all, distribute campaign totals for visual continuity
  const chartHasData = dailyChart.some((d) => d.reach > 0 || d.clicks > 0);
  if (!chartHasData && curReach > 0) {
    const weights = [1.0, 0.7, 0.85, 0.8, 1.0, 1.2, 1.3];
    const wSum = weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < 7; i++) {
      const w = weights[i] / wSum;
      dailyChart[i].reach = Math.round(curReach * w);
      dailyChart[i].clicks = Math.round(curClicks * w);
      dailyChart[i].conversions = Math.round(curConversions * w);
    }
  }

  // ── CTR goal ──────────────────────────────────────────────────────────────
  const activeCampaigns = campaigns.filter((c) => c.status === "active");
  const weightedGoal =
    activeCampaigns.length > 0
      ? activeCampaigns.reduce((s, c) => s + c.ctrGoal, 0) / activeCampaigns.length
      : 8.0;
  const goalStatus: "above" | "below" | "on_target" =
    curCtr >= weightedGoal ? "above" : curCtr >= weightedGoal * 0.9 ? "on_target" : "below";

  // ── Type breakdown (by campaign type) ──────────────────────────────────────
  const typeMap = new Map<string, { reach: number; clicks: number; conversions: number; spent: number; count: number }>();
  for (const c of campaigns) {
    const entry = typeMap.get(c.type) ?? { reach: 0, clicks: 0, conversions: 0, spent: 0, count: 0 };
    entry.reach += c.reach;
    entry.clicks += c.clicks;
    entry.conversions += c.conversions;
    entry.spent += c.spent;
    entry.count += 1;
    typeMap.set(c.type, entry);
  }
  const typeBreakdown = Array.from(typeMap.entries())
    .map(([type, data]) => ({
      type,
      ...data,
      ctr: data.reach > 0 ? Math.round((data.clicks / data.reach) * 10000) / 100 : 0,
    }))
    .sort((a, b) => b.reach - a.reach);

  return NextResponse.json({
    stats: {
      totalReach: {
        value: curReach,
        change: pctChange(curReach, prevReach),
        trend: trendDir(curReach, prevReach),
      },
      totalClicks: {
        value: curClicks,
        change: pctChange(curClicks, prevClicks),
        trend: trendDir(curClicks, prevClicks),
      },
      totalConversions: {
        value: curConversions,
        change: pctChange(curConversions, prevConversions),
        trend: trendDir(curConversions, prevConversions),
      },
      conversionRate: {
        value: Math.round(curConvRate * 100) / 100,
        change: pctChange(curConvRate, prevConvRate),
        trend: trendDir(curConvRate, prevConvRate),
      },
    },
    ctr: {
      value: Math.round(curCtr * 100) / 100,
      goal: weightedGoal,
      industryAvg: INDUSTRY_AVG_CTR,
      goalStatus,
    },
    dailyChart,
    typeBreakdown,
    campaigns: campaigns.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      status: c.status,
      reach: c.reach,
      clicks: c.clicks,
      conversions: c.conversions,
      budget: c.budget,
      spent: c.spent,
      ctrGoal: c.ctrGoal,
      startDate: c.startDate.toISOString(),
      endDate: c.endDate.toISOString(),
      hasDailyData: c._count.dailyMetrics > 0,
    })),
    meta: {
      rangeStart: rangeStart.toISOString(),
      rangeEnd: rangeEnd.toISOString(),
      totalCampaigns: campaigns.length,
      activeCampaigns: activeCampaigns.length,
      hasDailyMetrics: hasDailyData,
    },
  });
}
