import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * POST /api/user/wallet
 * Save or update the Solana wallet address for a user identified by their Lunes address.
 *
 * Body: { lunesAddress: string, solanaWallet: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { lunesAddress, solanaWallet } = body;

    if (!lunesAddress || !solanaWallet) {
      return NextResponse.json(
        { error: "lunesAddress and solanaWallet are required" },
        { status: 400 }
      );
    }

    // Find the user by their Lunes wallet
    const lunesWallet = await db.wallet.findUnique({
      where: { address: lunesAddress },
      select: { userId: true },
    });

    if (!lunesWallet) {
      return NextResponse.json(
        { error: "Lunes wallet not found. Connect your Lunes wallet first." },
        { status: 404 }
      );
    }

    const userId = lunesWallet.userId;

    // Upsert the Solana wallet for this user
    const existing = await db.wallet.findFirst({
      where: { userId, network: "SOLANA" },
    });

    if (existing) {
      await db.wallet.update({
        where: { id: existing.id },
        data: { address: solanaWallet },
      });
    } else {
      await db.wallet.create({
        data: {
          address: solanaWallet,
          network: "SOLANA",
          userId,
          isPrimary: false,
        },
      });
    }

    return NextResponse.json({ success: true, message: "Solana wallet saved" });
  } catch (error) {
    console.error("[USER_WALLET_POST]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/**
 * GET /api/user/wallet?lunesAddress=<address>
 * Retrieve the Solana wallet for a user by their Lunes address.
 */
export async function GET(req: NextRequest) {
  try {
    const lunesAddress = req.nextUrl.searchParams.get("lunesAddress");

    if (!lunesAddress) {
      return NextResponse.json(
        { error: "lunesAddress query param required" },
        { status: 400 }
      );
    }

    const lunesWallet = await db.wallet.findUnique({
      where: { address: lunesAddress },
      select: { userId: true },
    });

    if (!lunesWallet) {
      return NextResponse.json({ solanaWallet: null });
    }

    const solanaWallet = await db.wallet.findFirst({
      where: { userId: lunesWallet.userId, network: "SOLANA" },
      select: { address: true },
    });

    return NextResponse.json({
      solanaWallet: solanaWallet?.address ?? null,
    });
  } catch (error) {
    console.error("[USER_WALLET_GET]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
