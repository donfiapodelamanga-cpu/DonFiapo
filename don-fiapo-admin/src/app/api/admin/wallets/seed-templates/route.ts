import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { seedSystemWalletTemplates } from "@/lib/server/seed-system-wallets";

function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.ADMIN_API_KEY?.trim();
  if (!expected) return false;

  return request.headers.get("x-admin-key") === expected;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await seedSystemWalletTemplates(prisma, process.env);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("[SystemWallets] seed templates error:", error);
    return NextResponse.json({ error: "Failed to seed system wallet templates" }, { status: 500 });
  }
}
