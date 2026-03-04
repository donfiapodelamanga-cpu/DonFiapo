import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// POST /api/admin/collections/activate-scheduled
// Ativa todas as coleções com status "scheduled" e launchDate <= agora
export async function POST(request: NextRequest) {
  try {
    const now = new Date();

    const scheduled = await prisma.nFTCollection.findMany({
      where: {
        status: "scheduled",
        launchDate: { lte: now },
      },
    });

    if (scheduled.length === 0) {
      return NextResponse.json({ activated: 0, collections: [] });
    }

    const ids = scheduled.map((c) => c.id);

    await prisma.nFTCollection.updateMany({
      where: { id: { in: ids } },
      data: { status: "active" },
    });

    return NextResponse.json({
      activated: ids.length,
      collections: scheduled.map((c) => ({ id: c.id, name: c.name, launchDate: c.launchDate })),
    });
  } catch (error) {
    console.error("Error activating scheduled collections:", error);
    return NextResponse.json(
      { error: "Failed to activate scheduled collections" },
      { status: 500 }
    );
  }
}

// GET - para verificação rápida sem alterar nada (mostra próximos agendamentos)
export async function GET() {
  try {
    const scheduled = await prisma.nFTCollection.findMany({
      where: { status: "scheduled" },
      select: { id: true, name: true, launchDate: true, symbol: true },
      orderBy: { launchDate: "asc" },
    });

    return NextResponse.json({ pending: scheduled.length, collections: scheduled });
  } catch (error) {
    console.error("Error checking scheduled:", error);
    return NextResponse.json({ error: "Failed to check" }, { status: 500 });
  }
}
