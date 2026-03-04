import { NextRequest, NextResponse } from "next/server";
import { Connection } from "@solana/web3.js";
import { db } from "@/lib/db";
import { findOrCreateUserByWallet } from "@/lib/missions/service";

const SOLANA_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC || "https://api.mainnet-beta.solana.com";

/**
 * POST /api/games/spin/purchase
 * Creates a pending spin purchase and returns oracle payment details.
 * Body: { wallet: string; spins: number; priceUsdt: number; paymentId: string; payToAddress: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { wallet, spins, priceUsdt, paymentId, payToAddress } = body;

    if (!wallet || !spins || !priceUsdt || !paymentId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const userId = await findOrCreateUserByWallet(wallet);

    const purchase = await db.spinPurchase.create({
      data: {
        userId,
        spins,
        priceUsdt,
        paymentId,
        status: "PENDING",
      },
    });

    return NextResponse.json({ success: true, purchaseId: purchase.id });
  } catch (error) {
    console.error("[SPIN_PURCHASE]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/**
 * PATCH /api/games/spin/purchase
 * Confirms a spin purchase after on-chain payment verification.
 * Body: { paymentId: string; solanaTxHash: string }
 * Returns: { spinsGranted: number }
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { paymentId, solanaTxHash } = body;

    if (!paymentId || !solanaTxHash) {
      return NextResponse.json({ error: "paymentId and solanaTxHash are required" }, { status: 400 });
    }

    const purchase = await db.spinPurchase.findUnique({ where: { paymentId } });
    if (!purchase) {
      return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
    }
    if (purchase.status === "CONFIRMED") {
      return NextResponse.json({ success: true, spinsGranted: purchase.spins, alreadyConfirmed: true });
    }

    // Prevent reuse of the same txHash for different purchases
    const existingTx = await db.spinPurchase.findFirst({
      where: { solanaTxHash, status: "CONFIRMED" },
    });
    if (existingTx) {
      return NextResponse.json({ error: "Transaction already used for another purchase" }, { status: 409 });
    }

    // Verify transaction on-chain
    try {
      const connection = new Connection(SOLANA_RPC, "confirmed");
      const txInfo = await connection.getTransaction(solanaTxHash, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });

      if (!txInfo) {
        return NextResponse.json({ error: "Transaction not found on Solana" }, { status: 400 });
      }

      if (txInfo.meta?.err) {
        return NextResponse.json({ error: "Transaction failed on-chain" }, { status: 400 });
      }
    } catch (verifyError) {
      console.error("[SPIN_PURCHASE_VERIFY]", verifyError);
      // If RPC is unavailable, mark as PENDING_VERIFICATION instead of auto-confirming
      await db.spinPurchase.update({
        where: { paymentId },
        data: {
          status: "PENDING_VERIFICATION",
          solanaTxHash,
        },
      });
      return NextResponse.json({
        success: false,
        error: "Could not verify transaction. It has been queued for manual review.",
        status: "PENDING_VERIFICATION",
      }, { status: 202 });
    }

    // Transaction verified — confirm purchase
    await db.spinPurchase.update({
      where: { paymentId },
      data: {
        status: "CONFIRMED",
        solanaTxHash,
        confirmedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, spinsGranted: purchase.spins });
  } catch (error) {
    console.error("[SPIN_PURCHASE_CONFIRM]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
