import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/server/admin-auth";

const VALID_CHANNELS = ["Website", "Marketplace", "App", "Partner", "Influencer", "Noble"];
const VALID_CURRENCIES = ["BRL", "USDT", "FIAPO", "LUNES", "SOL"];

// Noble commission split constants
const NOBLE_COMMISSION_RATE = 7 / 12; // 58.3% to Noble
const COMMERCIAL_COMMISSION_RATE = 5 / 12; // 41.7% to Commercial

// GET /api/admin/sales — paginated list with optional filters
export async function GET(request: NextRequest) {
  const auth = requireAdminAuth(request, "sales");
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = request.nextUrl;
    const channel = searchParams.get("channel") ?? undefined;
    const status = searchParams.get("status") ?? undefined;
    const partnerId = searchParams.get("partnerId") ?? undefined;
    const nobleId = searchParams.get("nobleId") ?? undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, parseInt(searchParams.get("limit") || "50"));

    const where = {
      ...(channel ? { channel } : {}),
      ...(status ? { status } : {}),
      ...(partnerId ? { partnerId } : {}),
      ...(nobleId ? { nobleId } : {}),
    };

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        orderBy: { date: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          partner: { select: { id: true, name: true, type: true, trackingCode: true } },
          noble: { select: { id: true, name: true, tier: true, referralCode: true } },
        },
      }),
      prisma.sale.count({ where }),
    ]);

    return NextResponse.json({
      sales,
      pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (error) {
    console.error("[SALES_GET]", error);
    return NextResponse.json({ error: "Failed to fetch sales" }, { status: 500 });
  }
}

/**
 * POST /api/admin/sales — register a new sale with optional attribution.
 * If a trackingCode, partnerId, or nobleId is provided, the system:
 * 1. Links the sale to the partner/noble
 * 2. Auto-generates PartnerCommission records
 * 3. Updates cached revenue/sales on Partner and Noble
 */
export async function POST(request: NextRequest) {
  const auth = requireAdminAuth(request, "sales");
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const {
      product,
      customer,
      amount,
      channel,
      currency = "BRL",
      source = "manual",
      trackingCode,
      partnerId: rawPartnerId,
      nobleId: rawNobleId,
    } = body;

    if (!product?.trim() || !customer?.trim() || !amount || !channel) {
      return NextResponse.json({ error: "Missing required fields: product, customer, amount, channel" }, { status: 400 });
    }
    if (!VALID_CHANNELS.includes(channel)) {
      return NextResponse.json({ error: `Invalid channel. Must be one of: ${VALID_CHANNELS.join(", ")}` }, { status: 400 });
    }
    if (!VALID_CURRENCIES.includes(currency)) {
      return NextResponse.json({ error: `Invalid currency. Must be one of: ${VALID_CURRENCIES.join(", ")}` }, { status: 400 });
    }

    const saleAmount = parseFloat(amount);

    // Resolve attribution from trackingCode if provided
    let partnerId = rawPartnerId || null;
    let nobleId = rawNobleId || null;

    if (trackingCode && !partnerId) {
      const partner = await prisma.partner.findUnique({ where: { trackingCode } });
      if (partner) {
        partnerId = partner.id;
        // If partner is linked to a Noble, also attribute
        if (partner.nobleId && !nobleId) {
          nobleId = partner.nobleId;
        }
      }
    }

    // If nobleId provided but no partnerId, check if noble has a linked partner
    if (nobleId && !partnerId) {
      const partner = await prisma.partner.findUnique({ where: { nobleId } });
      if (partner) partnerId = partner.id;
    }

    // Create the sale
    const sale = await prisma.sale.create({
      data: {
        product: product.trim(),
        customer: customer.trim(),
        amount: saleAmount,
        channel,
        currency,
        source,
        partnerId,
        nobleId,
        trackingCode: trackingCode || null,
      },
    });

    // Generate commission records
    const commissions: { recipientType: string; partnerId?: string; nobleId?: string; rate: number }[] = [];

    if (partnerId && !nobleId) {
      // Standard partner commission
      const partner = await prisma.partner.findUnique({ where: { id: partnerId } });
      if (partner) {
        commissions.push({
          recipientType: "partner",
          partnerId,
          rate: partner.commissionPct,
        });
      }
    }

    if (nobleId) {
      // Noble affiliate split: noble gets 58.3%, commercial gets 41.7%
      const noble = await prisma.noble.findUnique({ where: { id: nobleId } });
      if (noble && noble.status === "Active") {
        // Use the partner commission rate as the base, or default 12%
        const partner = partnerId
          ? await prisma.partner.findUnique({ where: { id: partnerId } })
          : null;
        const baseRate = partner?.commissionPct ?? 12.0;

        commissions.push({
          recipientType: "noble",
          nobleId,
          partnerId: partnerId || undefined,
          rate: baseRate * NOBLE_COMMISSION_RATE,
        });
        commissions.push({
          recipientType: "commercial",
          partnerId: partnerId || undefined,
          rate: baseRate * COMMERCIAL_COMMISSION_RATE,
        });
      }
    }

    // Persist commission records
    for (const c of commissions) {
      const commissionAmount = saleAmount * (c.rate / 100);
      await prisma.partnerCommission.create({
        data: {
          saleId: sale.id,
          partnerId: c.partnerId || null,
          nobleId: c.nobleId || null,
          recipientType: c.recipientType,
          amount: commissionAmount,
          rate: c.rate,
          currency,
          status: "pending",
        },
      });
    }

    // Update cached stats on Partner
    if (partnerId) {
      await prisma.partner.update({
        where: { id: partnerId },
        data: {
          revenue: { increment: saleAmount },
          sales: { increment: 1 },
        },
      });
    }

    // Update cached stats on Noble
    if (nobleId) {
      const nobleCommTotal = commissions
        .filter((c) => c.recipientType === "noble")
        .reduce((sum, c) => sum + saleAmount * (c.rate / 100), 0);
      await prisma.noble.update({
        where: { id: nobleId },
        data: {
          totalSales: { increment: saleAmount },
          totalCommission: { increment: nobleCommTotal },
        },
      });
    }

    return NextResponse.json(
      { ...sale, commissionsGenerated: commissions.length },
      { status: 201 }
    );
  } catch (error) {
    console.error("[SALES_POST]", error);
    return NextResponse.json({ error: "Failed to create sale" }, { status: 500 });
  }
}
