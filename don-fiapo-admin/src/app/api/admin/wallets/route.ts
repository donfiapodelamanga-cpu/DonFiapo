import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET - List all system wallets
export async function GET() {
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
  try {
    const body = await request.json();
    const { key, label, address, network, symbol, purpose, isActive, updatedBy } = body;

    if (!key || !label || !address || !network || !symbol) {
      return NextResponse.json(
        { error: "Missing required fields: key, label, address, network, symbol" },
        { status: 400 }
      );
    }

    const wallet = await prisma.systemWallet.upsert({
      where: { key },
      update: {
        label,
        address,
        network,
        symbol,
        purpose: purpose || null,
        isActive: isActive !== undefined ? isActive : true,
        updatedBy: updatedBy || null,
      },
      create: {
        key,
        label,
        address,
        network,
        symbol,
        purpose: purpose || null,
        isActive: isActive !== undefined ? isActive : true,
        updatedBy: updatedBy || null,
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
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json({ error: "Missing key parameter" }, { status: 400 });
    }

    await prisma.systemWallet.delete({ where: { key } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[SystemWallets] DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete wallet" }, { status: 500 });
  }
}
