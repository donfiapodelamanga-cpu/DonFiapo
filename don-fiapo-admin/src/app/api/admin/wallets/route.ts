import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/server/admin-auth";
import {
  isKnownSystemWalletKey,
  validateSystemWalletInput,
} from "@/lib/system-wallets";

// GET - List all system wallets
export async function GET(request: NextRequest) {
  const auth = requireAdminAuth(request, "finance");
  if (!auth.ok) return auth.response;

  try {
    const wallets = await prisma.systemWallet.findMany({
      orderBy: { key: "asc" },
    });
    return NextResponse.json(wallets);
  } catch (error) {
    console.error("[SystemWallets] GET error:", error);
    return NextResponse.json({ error: "Failed to fetch wallets" }, { status: 500 });
  }
}

// POST - Create or update a system wallet (upsert by key)
export async function POST(request: NextRequest) {
  const auth = requireAdminAuth(request, "finance");
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const result = validateSystemWalletInput(body);

    if (!result.valid) {
      return NextResponse.json(
        { error: "Invalid system wallet", details: result.errors },
        { status: 400 }
      );
    }

    const { key, label, address, network, symbol, purpose, isActive } = result.wallet;

    const wallet = await prisma.systemWallet.upsert({
      where: { key },
      update: {
        label,
        address,
        network,
        symbol,
        purpose: purpose || null,
        isActive: isActive !== undefined ? isActive : true,
        updatedBy: auth.session.email,
      },
      create: {
        key,
        label,
        address,
        network,
        symbol,
        purpose: purpose || null,
        isActive: isActive !== undefined ? isActive : true,
        updatedBy: auth.session.email,
      },
    });

    return NextResponse.json(wallet);
  } catch (error) {
    console.error("[SystemWallets] POST error:", error);
    return NextResponse.json({ error: "Failed to save wallet" }, { status: 500 });
  }
}

// DELETE - Remove a system wallet by key
export async function DELETE(request: NextRequest) {
  const auth = requireAdminAuth(request, "finance");
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json({ error: "Missing key parameter" }, { status: 400 });
    }

    if (isKnownSystemWalletKey(key)) {
      await prisma.systemWallet.update({
        where: { key },
        data: { isActive: false },
      });
      return NextResponse.json({ success: true, deactivated: true });
    }

    await prisma.systemWallet.delete({ where: { key } });
    return NextResponse.json({ success: true, deleted: true });
  } catch (error) {
    console.error("[SystemWallets] DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete wallet" }, { status: 500 });
  }
}
