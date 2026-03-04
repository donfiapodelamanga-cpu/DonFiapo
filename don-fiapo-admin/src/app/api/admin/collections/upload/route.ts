import { NextRequest, NextResponse } from "next/server";
import pinataSDK from "@pinata/sdk";
import { Readable } from "stream";

const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY;
const PINATA_GATEWAY = process.env.PINATA_GATEWAY || "https://gateway.pinata.cloud";

function getPinata() {
  if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
    throw new Error("PINATA_API_KEY e PINATA_SECRET_KEY são obrigatórios no .env");
  }
  return new pinataSDK(PINATA_API_KEY, PINATA_SECRET_KEY);
}

// POST /api/admin/collections/upload - Upload image to Pinata/IPFS
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const collectionId = formData.get("collectionId") as string | null;
    const itemName = formData.get("itemName") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Tipo de arquivo inválido. Use PNG, JPG, WebP, GIF ou SVG." },
        { status: 400 }
      );
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Arquivo muito grande. Máximo 10MB." },
        { status: 400 }
      );
    }

    const pinata = getPinata();

    // Convert File to Readable stream for Pinata SDK
    const buffer = Buffer.from(await file.arrayBuffer());
    const stream = Readable.from(buffer);

    // Pinata needs a path property on the stream
    const ext = file.name.split(".").pop() || "png";
    const pinataName = itemName
      ? `DonFiapo-Collection-${itemName}.${ext}`
      : `DonFiapo-Collection-${collectionId || "img"}-${Date.now()}.${ext}`;

    (stream as any).path = pinataName;

    const result = await pinata.pinFileToIPFS(stream, {
      pinataMetadata: { name: pinataName },
      pinataOptions: { cidVersion: 1 },
    });

    const ipfsHash = result.IpfsHash;
    const ipfsUrl = `ipfs://${ipfsHash}`;
    const gatewayUrl = `${PINATA_GATEWAY}/ipfs/${ipfsHash}`;

    return NextResponse.json({
      url: gatewayUrl,
      ipfsUrl,
      ipfsHash,
      filename: pinataName,
    });
  } catch (error: any) {
    console.error("Error uploading to IPFS:", error);
    const msg = error?.message?.includes("PINATA") || error?.message?.includes("obrigatórios")
      ? "PINATA_API_KEY e PINATA_SECRET_KEY não configurados no .env. Configure para habilitar upload IPFS."
      : `Falha no upload para IPFS: ${error?.message || "erro desconhecido"}`;
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/admin/collections/upload/metadata - Upload JSON metadata to IPFS
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { metadata, name } = body;

    if (!metadata) {
      return NextResponse.json({ error: "metadata is required" }, { status: 400 });
    }

    const pinata = getPinata();

    const result = await pinata.pinJSONToIPFS(metadata, {
      pinataMetadata: { name: name || `DonFiapo-Metadata-${Date.now()}` },
      pinataOptions: { cidVersion: 1 },
    });

    const ipfsHash = result.IpfsHash;

    return NextResponse.json({
      url: `${PINATA_GATEWAY}/ipfs/${ipfsHash}`,
      ipfsUrl: `ipfs://${ipfsHash}`,
      ipfsHash,
    });
  } catch (error: any) {
    console.error("Error uploading metadata to IPFS:", error);
    return NextResponse.json({ error: "Falha no upload de metadata para IPFS" }, { status: 500 });
  }
}
