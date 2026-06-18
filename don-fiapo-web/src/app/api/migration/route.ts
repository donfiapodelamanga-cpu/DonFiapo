import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Connection, PublicKey } from "@solana/web3.js";
import { findOrCreateUserByWallet } from "@/lib/missions/service";
import { rateLimit, getClientIP } from "@/lib/security";
import { getSystemWalletAddress } from "@/lib/api/system-wallets";
import { requireUserSession } from "@/lib/server/user-session";

export async function POST(req: NextRequest) {
  try {
    // Rate limit: 5 migration attempts per hour per IP
    const ip = getClientIP(req);
    const rl = rateLimit(`migration:${ip}`, 5, 3600_000);
    if (rl) return rl;

    const body = await req.json();
    const { solanaTxHash, solanaSender, lunesRecipient, amountSolana } = body;

    if (!solanaTxHash || !solanaSender || !lunesRecipient || !amountSolana) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Derive userId from the Lunes wallet — never trust userId from client
    const userId = await findOrCreateUserByWallet(lunesRecipient);

    // Check if txHash already exists (Anti-Fraud Uniqueness)
    const existingTx = await db.tokenMigration.findUnique({
      where: { solanaTxHash },
    });

    if (existingTx) {
      return NextResponse.json({ error: "Transaction already processed" }, { status: 400 });
    }

    // Verify Solana transaction on-chain
    let txVerified = false;
    try {
      const SOLANA_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC || "https://api.mainnet-beta.solana.com";
      const connection = new Connection(SOLANA_RPC, "confirmed");
      const txInfo = await connection.getTransaction(solanaTxHash, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });

      if (!txInfo) {
        return NextResponse.json({ error: "Transaction not found on Solana. Please wait for confirmation and try again." }, { status: 400 });
      }

      if (txInfo.meta?.err) {
        return NextResponse.json({ error: "Transaction failed on-chain" }, { status: 400 });
      }

      // Verify FIAPO token transfer using pre/post balances
      const mintAddress = process.env.NEXT_PUBLIC_FIAPO_SOLANA_MINT || "WS3qT5Yp5knnKF6Ad6gnaDrTXFHb8ZVLMQcR8LPZgem";

      const treasurySolana = await getSystemWalletAddress("migration_treasury");

      if (!treasurySolana) {
        return NextResponse.json({ error: "Migration treasury is not configured" }, { status: 503 });
      }

      const preBalances = txInfo.meta?.preTokenBalances || [];
      const postBalances = txInfo.meta?.postTokenBalances || [];

      let preAmount = 0;
      let postAmount = 0;

      const preTarget = preBalances.find(b => b.mint === mintAddress && b.owner === treasurySolana);
      if (preTarget) preAmount = preTarget.uiTokenAmount.uiAmount || 0;

      const postTarget = postBalances.find(b => b.mint === mintAddress && b.owner === treasurySolana);
      if (postTarget) postAmount = postTarget.uiTokenAmount.uiAmount || 0;

      const amountReceived = postAmount - preAmount;

      if (amountReceived < amountSolana * 0.99) {
        return NextResponse.json({ error: `Amount received in treasury (${amountReceived}) does not match claimed amount (${amountSolana})` }, { status: 400 });
      }

      txVerified = true;
    } catch (verifyErr) {
      console.error("[MIGRATION_VERIFY]", verifyErr);
      // RPC unavailable — accept but flag for manual review
    }

    // Calculate Lunes Amount with 2% bonus
    const amountLunes = amountSolana * 1.02;

    // Create Migration Record
    const migration = await db.tokenMigration.create({
      data: {
        userId,
        solanaTxHash,
        solanaSender,
        lunesRecipient,
        amountSolana,
        amountLunes,
        status: txVerified ? "PENDING" : "UNVERIFIED",
      },
    });

    return NextResponse.json({ success: true, migration, txVerified }, { status: 201 });
  } catch (error) {
    console.error("[MIGRATION_POST]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    // Auditoria #6 (IDOR): userId vem da sessão, nunca da query string.
    const session = requireUserSession(req);
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    const userId = session.userId;

    const migrations = await db.tokenMigration.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ migrations });
  } catch (error) {
    console.error("[MIGRATION_GET]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
