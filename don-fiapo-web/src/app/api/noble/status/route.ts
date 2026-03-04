import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/noble/status?walletAddress=<lunes_address>
 * 
 * Public endpoint: checks if a Lunes wallet is registered as a Noble/Parceiro
 * by the Don Fiapo commercial team. Returns noble info if found and active.
 * 
 * Business rule: Only wallets registered by the commercial team appear as Noble.
 * Status must be "Active" to access the Noble dashboard features.
 */
export async function GET(req: NextRequest) {
  try {
    const walletAddress = req.nextUrl.searchParams.get("walletAddress");

    if (!walletAddress) {
      return NextResponse.json(
        { error: "walletAddress query param required" },
        { status: 400 }
      );
    }

    const noble = await db.noble.findUnique({
      where: { walletAddress },
      select: {
        id: true,
        name: true,
        tier: true,
        status: true,
        referralCode: true,
        solanaWallet: true,
        totalSales: true,
        totalReferrals: true,
      },
    });

    if (!noble) {
      return NextResponse.json({ isNoble: false });
    }

    return NextResponse.json({
      isNoble: true,
      isActive: noble.status === "Active",
      noble: {
        id: noble.id,
        name: noble.name,
        tier: noble.tier,
        status: noble.status,
        referralCode: noble.referralCode,
        solanaWallet: noble.solanaWallet,
        totalSales: noble.totalSales,
        totalReferrals: noble.totalReferrals,
      },
    });
  } catch (error) {
    console.error("[NOBLE_STATUS_GET]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
