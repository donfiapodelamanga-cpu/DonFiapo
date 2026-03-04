import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET - Public endpoint: returns active system wallets as a key→address map
// Used by don-fiapo-web to resolve wallet addresses at runtime
export async function GET(request: NextRequest) {
  try {
    const wallets = await prisma.systemWallet.findMany({
      where: { isActive: true },
      select: { key: true, address: true, network: true, symbol: true },
    });

    const map: Record<string, { address: string; network: string; symbol: string }> = {};
    for (const w of wallets) {
      map[w.key] = { address: w.address, network: w.network, symbol: w.symbol };
    }

    return NextResponse.json(map, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    console.error("[SystemWallets] Public GET error:", error);
    return NextResponse.json({}, { status: 200 });
  }
}
