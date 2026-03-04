import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET /api/admin/collections - List all collections with aggregated stats
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where: any = {};
    if (status) where.status = status;

    const collections = await prisma.nFTCollection.findMany({
      where,
      include: {
        items: {
          select: { id: true, price: true, currency: true, supply: true, mintedCount: true, imageUrl: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Agregar stats de cada coleção a partir dos itens
    const result = collections.map((col) => {
      const totalItems = col.items.length;
      const totalSupply = col.items.reduce((acc, it) => acc + it.supply, 0);
      const totalMinted = col.items.reduce((acc, it) => acc + it.mintedCount, 0);
      const itemsWithArt = col.items.filter((it) => it.imageUrl).length;
      const minPrice = totalItems > 0 ? Math.min(...col.items.map((it) => it.price)) : 0;
      const maxPrice = totalItems > 0 ? Math.max(...col.items.map((it) => it.price)) : 0;
      const { items, ...collection } = col;
      return { ...collection, totalItems, totalSupply, totalMinted, itemsWithArt, minPrice, maxPrice };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching collections:", error);
    return NextResponse.json({ error: "Failed to fetch collections" }, { status: 500 });
  }
}

// POST /api/admin/collections - Create new collection (álbum)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, symbol, description, createdBy } = body;

    if (!name || !symbol || !createdBy) {
      return NextResponse.json(
        { error: "Campos obrigatórios: name, symbol, createdBy" },
        { status: 400 }
      );
    }

    const collection = await prisma.nFTCollection.create({
      data: {
        name,
        symbol: symbol.toUpperCase(),
        description: description || null,
        createdBy,
      },
    });

    return NextResponse.json(collection, { status: 201 });
  } catch (error) {
    console.error("Error creating collection:", error);
    return NextResponse.json({ error: "Failed to create collection" }, { status: 500 });
  }
}
