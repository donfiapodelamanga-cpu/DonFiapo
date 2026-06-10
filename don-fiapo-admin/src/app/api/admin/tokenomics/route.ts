import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * GET /api/admin/tokenomics
 * Returns token distribution tracking (planned vs distributed)
 */
export async function GET() {
  try {
    const distributions = await prisma.tokenDistribution.findMany({
      orderBy: { percentage: "desc" },
    });

    const totalPlanned = distributions.reduce((sum, d) => sum + d.planned, 0);
    const totalDistributed = distributions.reduce((sum, d) => sum + d.distributed, 0);

    return NextResponse.json({
      totalSupply: 600,
      totalPlanned,
      totalDistributed,
      progressPercent: totalPlanned > 0 ? (totalDistributed / totalPlanned) * 100 : 0,
      distributions,
    });
  } catch (error) {
    console.error("[API Tokenomics] Error:", error);
    return NextResponse.json({ error: "Failed to fetch tokenomics" }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/tokenomics
 * Update a distribution's distributed amount or status
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { category, distributed, status, notes } = body;

    if (!category) {
      return NextResponse.json({ error: "category is required" }, { status: 400 });
    }

    const updated = await prisma.tokenDistribution.update({
      where: { category },
      data: {
        ...(distributed !== undefined && { distributed }),
        ...(status && { status }),
        ...(notes !== undefined && { notes }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[API Tokenomics] Update error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
