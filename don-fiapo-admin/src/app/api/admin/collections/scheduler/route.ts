/**
 * GET /api/admin/collections/scheduler
 * 
 * Processa coleções agendadas (status=scheduled) cuja launchDate já passou.
 * Muda automaticamente o status para "active".
 * 
 * Pode ser chamado por:
 * - Cron job externo (Vercel Cron, crontab, etc.)
 * - Polling do frontend a cada minuto
 * - Manualmente via admin
 */

import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const now = new Date();

    // Buscar coleções agendadas cuja launchDate já passou
    const scheduledCollections = await prisma.nFTCollection.findMany({
      where: {
        status: "scheduled",
        launchDate: {
          lte: now,
          not: null,
        },
      },
      select: {
        id: true,
        name: true,
        launchDate: true,
      },
    });

    if (scheduledCollections.length === 0) {
      return NextResponse.json({
        processed: 0,
        message: "Nenhuma coleção agendada para ativar.",
      });
    }

    // Ativar cada coleção
    const results = [];
    for (const col of scheduledCollections) {
      try {
        await prisma.nFTCollection.update({
          where: { id: col.id },
          data: { status: "active" },
        });
        results.push({ id: col.id, name: col.name, activated: true });
        console.log(`[Scheduler] Coleção "${col.name}" ativada (agendada para ${col.launchDate?.toISOString()})`);
      } catch (err: any) {
        results.push({ id: col.id, name: col.name, activated: false, error: err.message });
        console.error(`[Scheduler] Erro ao ativar coleção "${col.name}":`, err);
      }
    }

    return NextResponse.json({
      processed: results.length,
      activated: results.filter((r) => r.activated).length,
      results,
    });
  } catch (error: any) {
    console.error("[Scheduler] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
