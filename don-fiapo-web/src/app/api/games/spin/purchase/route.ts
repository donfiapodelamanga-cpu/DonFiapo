import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { Connection } from "@solana/web3.js";
import { db } from "@/lib/db";
import { findOrCreateUserByWallet } from "@/lib/missions/service";
import { decimalToAtomicUnits, verifySplTokenPayment } from "@/lib/solana/verify-token-transfer";
import { InvalidSpinPackageError, getSpinPackage, rejectClientPricedSpinPurchase } from "@/lib/games/spin-packages";

const SOLANA_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC || "https://api.mainnet-beta.solana.com";
const USDT_MINT_MAINNET = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";
const SPIN_USDT_MINT =
  process.env.SOLANA_USDT_MINT_ADDRESS ||
  process.env.USDT_MINT_ADDRESS ||
  process.env.NEXT_PUBLIC_SOLANA_USDT_MINT ||
  process.env.NEXT_PUBLIC_USDT_MINT_ADDRESS ||
  USDT_MINT_MAINNET;
const SPIN_PAYMENT_RECEIVER =
  process.env.SPIN_REVENUE_SOLANA_WALLET ||
  process.env.NEXT_PUBLIC_TREASURY_SOLANA ||
  process.env.NEXT_PUBLIC_SOLANA_RECEIVER ||
  "";

/**
 * POST /api/games/spin/purchase
 * Creates a pending spin purchase from a server-owned package table.
 * Body: { wallet: string; packageId: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    rejectClientPricedSpinPurchase(body);

    const { wallet, packageId } = body;
    if (!wallet || !packageId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const spinPackage = getSpinPackage(packageId);
    if (!SPIN_PAYMENT_RECEIVER) {
      return NextResponse.json({ error: "Spin payment receiver is not configured" }, { status: 500 });
    }

    const userId = await findOrCreateUserByWallet(wallet);
    const paymentId = `spin_${randomUUID()}`;

    const purchase = await db.spinPurchase.create({
      data: {
        userId,
        spins: spinPackage.spins,
        priceUsdt: spinPackage.priceUsdt,
        paymentId,
        status: "PENDING",
      },
    });

    return NextResponse.json({
      success: true,
      purchaseId: purchase.id,
      paymentId,
      packageId: spinPackage.id,
      spins: spinPackage.spins,
      priceUsdt: spinPackage.priceUsdt,
      payToAddress: SPIN_PAYMENT_RECEIVER,
      mintAddress: SPIN_USDT_MINT,
    });
  } catch (error) {
    if (error instanceof InvalidSpinPackageError || (error instanceof Error && error.message.includes("Client-priced"))) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

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

    if (!SPIN_PAYMENT_RECEIVER) {
      return NextResponse.json({ error: "Spin payment receiver is not configured" }, { status: 500 });
    }

    // Verify transaction on-chain
    try {
      const connection = new Connection(SOLANA_RPC, "confirmed");
      const txInfo = await connection.getParsedTransaction(solanaTxHash, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });

      if (!txInfo) {
        return NextResponse.json({ error: "Transaction not found on Solana" }, { status: 400 });
      }

      if (txInfo.meta?.err) {
        return NextResponse.json({ error: "Transaction failed on-chain" }, { status: 400 });
      }

      const verification = verifySplTokenPayment(txInfo, {
        receiverAddress: SPIN_PAYMENT_RECEIVER,
        mintAddress: SPIN_USDT_MINT,
        minAmountAtomic: decimalToAtomicUnits(purchase.priceUsdt, 6),
      });

      if (!verification.valid) {
        return NextResponse.json(
          { error: "Payment verification failed", reason: verification.error },
          { status: 400 },
        );
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
