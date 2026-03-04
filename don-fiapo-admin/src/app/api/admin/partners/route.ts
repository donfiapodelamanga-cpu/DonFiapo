import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/server/admin-auth";
import { randomBytes } from "crypto";

function generateTrackingCode(name: string): string {
  const prefix = name
    .replace(/[^a-zA-Z0-9]/g, "")
    .substring(0, 6)
    .toUpperCase();
  const suffix = randomBytes(3).toString("hex").toUpperCase();
  return `P-${prefix}-${suffix}`;
}

// GET /api/admin/partners — list with real computed stats
export async function GET(request: NextRequest) {
  const auth = requireAdminAuth(request, "partnerships");
  if (!auth.ok) return auth.response;

  try {
    const partners = await prisma.partner.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        noble: { select: { id: true, name: true, tier: true, status: true, referralCode: true } },
        _count: { select: { salesRecords: true, commissions: true } },
      },
    });

    // Compute real revenue from attributed sales
    const enriched = await Promise.all(
      partners.map(async (p) => {
        const agg = await prisma.sale.aggregate({
          where: { partnerId: p.id, status: "completed" },
          _sum: { amount: true },
          _count: { id: true },
        });

        const commissionAgg = await prisma.partnerCommission.aggregate({
          where: { partnerId: p.id },
          _sum: { amount: true },
        });

        return {
          id: p.id,
          name: p.name,
          type: p.type,
          status: p.status,
          commission: p.commission,
          commissionPct: p.commissionPct,
          revenue: agg._sum.amount ?? p.revenue,
          sales: agg._count.id || p.sales,
          totalCommissionEarned: commissionAgg._sum.amount ?? 0,
          joinedAt: p.joinedAt.toISOString(),
          contact: p.contact,
          trackingCode: p.trackingCode,
          influencerMeta: p.influencerMeta ? JSON.parse(p.influencerMeta) : null,
          nobleId: p.nobleId,
          noble: p.noble,
          createdAt: p.createdAt.toISOString(),
        };
      })
    );

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("[PARTNERS_GET]", error);
    return NextResponse.json({ error: "Failed to fetch partners" }, { status: 500 });
  }
}

// POST /api/admin/partners — create new partner with tracking code
export async function POST(request: NextRequest) {
  const auth = requireAdminAuth(request, "partnerships");
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const {
      name,
      type,
      commission,
      commissionPct,
      contact,
      nobleId,
      influencerMeta,
    } = body;

    if (!name || !type || !commission || !contact) {
      return NextResponse.json({ error: "Missing required fields: name, type, commission, contact" }, { status: 400 });
    }

    // Validate influencer metadata when type is Influenciador
    if (type === "Influenciador" && !influencerMeta) {
      return NextResponse.json({ error: "influencerMeta required for Influenciador type" }, { status: 400 });
    }

    // Generate unique tracking code
    let trackingCode = generateTrackingCode(name);
    const existing = await prisma.partner.findUnique({ where: { trackingCode } });
    if (existing) {
      trackingCode = generateTrackingCode(name + randomBytes(2).toString("hex"));
    }

    // If linking to a Noble, verify it exists and isn't already linked
    if (nobleId) {
      const noble = await prisma.noble.findUnique({ where: { id: nobleId } });
      if (!noble) {
        return NextResponse.json({ error: "Noble not found" }, { status: 404 });
      }
      const existingLink = await prisma.partner.findUnique({ where: { nobleId } });
      if (existingLink) {
        return NextResponse.json({ error: "Noble already linked to another partner" }, { status: 409 });
      }
    }

    const partner = await prisma.partner.create({
      data: {
        name,
        type,
        commission,
        commissionPct: commissionPct ? parseFloat(commissionPct) : parseFloat(commission) || 5.0,
        contact,
        trackingCode,
        nobleId: nobleId || null,
        influencerMeta: influencerMeta ? JSON.stringify(influencerMeta) : null,
      },
    });

    return NextResponse.json(partner, { status: 201 });
  } catch (error) {
    console.error("[PARTNERS_POST]", error);
    return NextResponse.json({ error: "Failed to create partner" }, { status: 500 });
  }
}

// PATCH /api/admin/partners — update partner
export async function PATCH(request: NextRequest) {
  const auth = requireAdminAuth(request, "partnerships");
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Partner id required" }, { status: 400 });
    }

    // Handle influencerMeta serialization
    if (updates.influencerMeta && typeof updates.influencerMeta === "object") {
      updates.influencerMeta = JSON.stringify(updates.influencerMeta);
    }

    // Parse commissionPct from commission string if needed
    if (updates.commission && !updates.commissionPct) {
      const parsed = parseFloat(updates.commission);
      if (!isNaN(parsed)) updates.commissionPct = parsed;
    }

    const partner = await prisma.partner.update({
      where: { id },
      data: updates,
    });

    return NextResponse.json(partner);
  } catch (error) {
    console.error("[PARTNERS_PATCH]", error);
    return NextResponse.json({ error: "Failed to update partner" }, { status: 500 });
  }
}
