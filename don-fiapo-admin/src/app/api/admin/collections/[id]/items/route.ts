import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET /api/admin/collections/[id]/items - List items with pagination
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    const where: any = { collectionId: id };

    const [items, total] = await Promise.all([
      prisma.nFTCollectionItem.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.nFTCollectionItem.count({ where }),
    ]);

    return NextResponse.json({ items, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("Error fetching items:", error);
    return NextResponse.json({ error: "Failed to fetch items" }, { status: 500 });
  }
}

// POST /api/admin/collections/[id]/items - Add new NFT to collection
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, price, currency, supply, imageUrl, ipfsHash, metadata, rarity } = body;

    if (!name) {
      return NextResponse.json({ error: "name é obrigatório" }, { status: 400 });
    }

    // Verificar se a coleção existe
    const collection = await prisma.nFTCollection.findUnique({ where: { id } });
    if (!collection) {
      return NextResponse.json({ error: "Coleção não encontrada" }, { status: 404 });
    }

    const item = await prisma.nFTCollectionItem.create({
      data: {
        collectionId: id,
        name,
        description: description || null,
        price: price != null ? parseFloat(price) : 0,
        currency: currency || "LUNES",
        supply: supply ? parseInt(supply) : 1,
        imageUrl: imageUrl || null,
        ipfsHash: ipfsHash || null,
        metadata: metadata || null,
        rarity: rarity || null,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Error adding item:", error);
    return NextResponse.json({ error: "Failed to add item" }, { status: 500 });
  }
}

// PATCH /api/admin/collections/[id]/items - Update an item
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await params;
    const body = await request.json();
    const { itemId, name, description, price, currency, supply, imageUrl, ipfsHash, metadata, metadataIpfsHash, rarity } = body;

    if (!itemId) {
      return NextResponse.json({ error: "itemId is required" }, { status: 400 });
    }

    const data: any = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (price !== undefined) data.price = parseFloat(price);
    if (currency !== undefined) data.currency = currency;
    if (supply !== undefined) data.supply = parseInt(supply);
    if (imageUrl !== undefined) data.imageUrl = imageUrl;
    if (ipfsHash !== undefined) data.ipfsHash = ipfsHash;
    if (metadata !== undefined) data.metadata = metadata;
    if (metadataIpfsHash !== undefined) data.metadataIpfsHash = metadataIpfsHash;
    if (rarity !== undefined) data.rarity = rarity;

    const item = await prisma.nFTCollectionItem.update({
      where: { id: itemId },
      data,
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error("Error updating item:", error);
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
  }
}

// DELETE /api/admin/collections/[id]/items - Remove an item (only if not minted)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await params;
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get("itemId");

    if (!itemId) {
      return NextResponse.json({ error: "itemId is required" }, { status: 400 });
    }

    const item = await prisma.nFTCollectionItem.findUnique({ where: { id: itemId } });
    if (!item) {
      return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });
    }
    if (item.mintedCount > 0) {
      return NextResponse.json({ error: "Não é possível excluir item já mintado" }, { status: 400 });
    }

    await prisma.nFTCollectionItem.delete({ where: { id: itemId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting item:", error);
    return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
  }
}
