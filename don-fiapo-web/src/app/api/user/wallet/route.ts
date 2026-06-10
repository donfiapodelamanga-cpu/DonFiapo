import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getClientIP, rateLimit, validateWalletOrError } from "@/lib/security";
import {
  saveVerifiedWalletLink,
  WalletLinkChallengeConsumedError,
  WalletLinkConflictError,
} from "@/lib/wallets/wallet-link-save";
import { verifyWalletLinkProof } from "@/lib/wallets/wallet-link-proof";

function statusForProofError(error: string): number {
  if (error === "challenge_expired") return 410;
  if (error === "challenge_consumed") return 409;
  if (error === "invalid_lunes_signature" || error === "invalid_solana_signature") return 401;
  return 400;
}

/**
 * POST /api/user/wallet
 * Save or update the Solana wallet address after both wallets sign a server challenge.
 *
 * Body: { challengeId, lunesAddress, solanaWallet, lunesSignature, solanaSignature }
 */
export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit(`wallet-link-save:${getClientIP(req)}`, 20, 60_000);
    if (limited) return limited;

    const body = await req.json();
    const { challengeId, lunesAddress, solanaWallet, lunesSignature, solanaSignature } = body;

    if (!challengeId || !lunesAddress || !solanaWallet || !lunesSignature || !solanaSignature) {
      return NextResponse.json(
        { error: "challengeId, lunesAddress, solanaWallet, lunesSignature and solanaSignature are required" },
        { status: 400 }
      );
    }

    const lunesError = validateWalletOrError(lunesAddress, "lunes");
    if (lunesError) return lunesError;

    const solanaError = validateWalletOrError(solanaWallet, "solana");
    if (solanaError) return solanaError;

    const challenge = await db.walletLinkChallenge.findUnique({
      where: { id: challengeId },
      select: {
        id: true,
        lunesAddress: true,
        solanaWallet: true,
        message: true,
        expiresAt: true,
        consumedAt: true,
      },
    });

    if (!challenge) {
      return NextResponse.json({ error: "Wallet link challenge not found" }, { status: 404 });
    }

    const proof = await verifyWalletLinkProof({
      challenge,
      lunesAddress,
      solanaWallet,
      lunesSignature,
      solanaSignature,
    });

    if (!proof.ok) {
      return NextResponse.json({ error: proof.error }, { status: statusForProofError(proof.error) });
    }

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

    await saveVerifiedWalletLink(db, {
      challengeId,
      userId,
      solanaWallet,
    });

    return NextResponse.json({ success: true, message: "Solana wallet saved" });
  } catch (error) {
    if (error instanceof WalletLinkChallengeConsumedError) {
      return NextResponse.json({ error: "challenge_consumed" }, { status: 409 });
    }

    if (error instanceof WalletLinkConflictError) {
      return NextResponse.json(
        { error: "Solana wallet already linked to another user" },
        { status: 409 }
      );
    }

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
