import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET /api/admin/collections/[id] - Get collection detail with items
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const collection = await prisma.nFTCollection.findUnique({
      where: { id },
      include: {
        _count: { select: { items: true } },
      },
    });

    if (!collection) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    return NextResponse.json(collection);
  } catch (error) {
    console.error("Error fetching collection:", error);
    return NextResponse.json({ error: "Failed to fetch collection" }, { status: 500 });
  }
}

// PATCH /api/admin/collections/[id] - Update collection
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { name, symbol, description, status, launchDate, coverImage, coverIpfsHash } = body;

    const data: any = {};
    if (name !== undefined) data.name = name;
    if (symbol !== undefined) data.symbol = symbol.toUpperCase();
    if (description !== undefined) data.description = description;
    if (status !== undefined) data.status = status;
    if (launchDate !== undefined) data.launchDate = launchDate ? new Date(launchDate) : null;
    if (coverImage !== undefined) data.coverImage = coverImage;
    if (coverIpfsHash !== undefined) data.coverIpfsHash = coverIpfsHash;

    const collection = await prisma.nFTCollection.update({
      where: { id },
      data,
    });

    return NextResponse.json(collection);
  } catch (error) {
    console.error("Error updating collection:", error);
    return NextResponse.json({ error: "Failed to update collection" }, { status: 500 });
  }
}

// DELETE /api/admin/collections/[id] - Delete collection (only if draft)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const collection = await prisma.nFTCollection.findUnique({ where: { id } });
    if (!collection) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }
    if (collection.status !== "draft") {
      return NextResponse.json(
        { error: "Apenas coleções em rascunho podem ser excluídas" },
        { status: 400 }
      );
    }

    await prisma.nFTCollection.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting collection:", error);
    return NextResponse.json({ error: "Failed to delete collection" }, { status: 500 });
  }
}
