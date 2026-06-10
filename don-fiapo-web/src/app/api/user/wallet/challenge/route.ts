import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getClientIP, rateLimit, validateWalletOrError } from "@/lib/security";
import { createWalletLinkChallengeData } from "@/lib/wallets/wallet-link-proof";

/**
 * POST /api/user/wallet/challenge
 * Creates a short-lived canonical message that must be signed by both wallets.
 *
 * Body: { lunesAddress: string, solanaWallet: string }
 */
export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit(`wallet-link-challenge:${getClientIP(req)}`, 20, 60_000);
    if (limited) return limited;

    const body = await req.json();
    const { lunesAddress, solanaWallet } = body;

    if (!lunesAddress || !solanaWallet) {
      return NextResponse.json(
        { error: "lunesAddress and solanaWallet are required" },
        { status: 400 }
      );
    }

    const lunesError = validateWalletOrError(lunesAddress, "lunes");
    if (lunesError) return lunesError;

    const solanaError = validateWalletOrError(solanaWallet, "solana");
    if (solanaError) return solanaError;

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

    const challenge = createWalletLinkChallengeData({ lunesAddress, solanaWallet });
    const record = await db.walletLinkChallenge.create({
      data: {
        lunesAddress,
        solanaWallet,
        nonce: challenge.nonce,
        message: challenge.message,
        expiresAt: challenge.expiresAt,
      },
    });

    return NextResponse.json({
      challengeId: record.id,
      message: record.message,
      expiresAt: record.expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("[USER_WALLET_CHALLENGE_POST]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
