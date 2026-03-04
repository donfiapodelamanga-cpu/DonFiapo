/**
 * POST /api/admin/collections/[id]/sync
 * 
 * Sincroniza uma coleção e seus itens com o contrato on-chain.
 * 
 * GET /api/admin/collections/[id]/sync
 * Retorna status de sincronização da coleção (sem conectar ao WebSocket)
 */

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET — Status de sincronização (leve, sem WebSocket)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const collection = await prisma.nFTCollection.findUnique({
      where: { id },
      include: {
        items: {
          select: {
            id: true,
            name: true,
            onChainTokenId: true,
            syncedAt: true,
          },
        },
      },
    });

    if (!collection) {
      return NextResponse.json({ error: "Coleção não encontrada" }, { status: 404 });
    }

    const contractAddress = process.env.NFT_COLLECTIONS_CONTRACT || "";
    const adminSeed = process.env.LUNES_ADMIN_SEED || "";
    const configured = !!contractAddress && !!adminSeed;

    const totalItems = collection.items.length;
    const syncedItems = collection.items.filter((i: { onChainTokenId: number | null }) => i.onChainTokenId != null).length;

    return NextResponse.json({
      collectionId: collection.id,
      contractAddress: collection.contractAddress || contractAddress || "(não configurado)",
      contractCollectionId: collection.contractCollectionId,
      deployedAt: collection.deployedAt ? collection.deployedAt.toISOString() : null,
      totalItems,
      syncedItems,
      pendingItems: totalItems - syncedItems,
      isFullySynced: !!collection.contractCollectionId && syncedItems === totalItems,
      contract: {
        configured,
        connected: false,
        error: configured ? undefined : "NFT_COLLECTIONS_CONTRACT ou LUNES_ADMIN_SEED não configurado",
      },
      items: collection.items.map((i: { id: string; name: string; onChainTokenId: number | null; syncedAt: Date | null }) => ({
        id: i.id,
        name: i.name,
        onChainTokenId: i.onChainTokenId,
        syncedAt: i.syncedAt ? i.syncedAt.toISOString() : null,
        synced: i.onChainTokenId != null,
      })),
    });
  } catch (error) {
    console.error("Error checking sync status:", error);
    return NextResponse.json({ error: "Failed to check sync status" }, { status: 500 });
  }
}

// POST — Executar sincronização (conecta ao WebSocket)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Importar dinamicamente para evitar problemas de SSR/Set
    const {
      createCollectionOnChain,
      addTokenOnChain,
      setCollectionStatusOnChain,
      checkContractHealth,
    } = await import("@/lib/blockchain/nft-collections");

    // Verificar saúde do contrato
    const health = await checkContractHealth();
    if (!health.configured) {
      return NextResponse.json(
        { error: "Contrato não configurado. Configure NFT_COLLECTIONS_CONTRACT e LUNES_ADMIN_SEED no .env" },
        { status: 503 }
      );
    }
    if (!health.connected) {
      return NextResponse.json(
        { error: `Não foi possível conectar à Lunes Network: ${health.error}` },
        { status: 503 }
      );
    }

    // Buscar coleção com itens
    const collection = await prisma.nFTCollection.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!collection) {
      return NextResponse.json({ error: "Coleção não encontrada" }, { status: 404 });
    }

    const results: {
      collectionSync: { success: boolean; contractCollectionId?: number; error?: string } | null;
      itemsSynced: Array<{ itemId: string; name: string; success: boolean; onChainTokenId?: number; error?: string }>;
      statusSync: { success: boolean; error?: string } | null;
    } = {
      collectionSync: null,
      itemsSynced: [],
      statusSync: null,
    };

    // 1. Criar coleção on-chain se não existe
    let contractCollectionId = collection.contractCollectionId;

    if (!contractCollectionId) {
      console.log(`[Sync] Creating collection on-chain: ${collection.name} (${collection.symbol})`);

      const colResult = await createCollectionOnChain(collection.name, collection.symbol);
      results.collectionSync = colResult;

      if (!colResult.success) {
        return NextResponse.json({
          error: `Falha ao criar coleção on-chain: ${colResult.error}`,
          results,
        }, { status: 500 });
      }

      contractCollectionId = colResult.contractCollectionId!;

      await prisma.nFTCollection.update({
        where: { id },
        data: {
          contractCollectionId,
          contractAddress: health.contractAddress,
          deployedAt: new Date(),
        },
      });

      console.log(`[Sync] Collection created on-chain with ID: ${contractCollectionId}`);
    } else {
      results.collectionSync = { success: true, contractCollectionId };
    }

    // 2. Adicionar tokens que ainda não estão on-chain
    const pendingItems = collection.items.filter((item: any) => !item.onChainTokenId);

    for (const item of pendingItems) {
      const metadataUri = (item as any).metadataIpfsHash
        ? `ipfs://${(item as any).metadataIpfsHash}`
        : (item as any).ipfsHash
          ? `ipfs://${(item as any).ipfsHash}`
          : (item as any).imageUrl || "";

      console.log(`[Sync] Adding token on-chain: ${item.name} (collection ${contractCollectionId})`);

      const tokenResult = await addTokenOnChain(
        contractCollectionId,
        item.name,
        metadataUri,
        (item as any).price,
        (item as any).currency,
        (item as any).supply,
        (item as any).rarity
      );

      results.itemsSynced.push({
        itemId: item.id,
        name: item.name,
        success: tokenResult.success,
        onChainTokenId: tokenResult.onChainTokenId,
        error: tokenResult.error,
      });

      if (tokenResult.success && tokenResult.onChainTokenId) {
        await prisma.nFTCollectionItem.update({
          where: { id: item.id },
          data: {
            onChainTokenId: tokenResult.onChainTokenId,
            syncedAt: new Date(),
          },
        });
        console.log(`[Sync] Token ${item.name} synced with on-chain ID: ${tokenResult.onChainTokenId}`);
      } else {
        console.error(`[Sync] Failed to sync token ${item.name}: ${tokenResult.error}`);
      }
    }

    // 3. Sincronizar status se a coleção está ativa on-chain
    if (collection.status === "active" || collection.status === "paused") {
      const statusResult = await setCollectionStatusOnChain(
        contractCollectionId,
        collection.status
      );
      results.statusSync = statusResult;
    }

    const totalSynced = results.itemsSynced.filter((r) => r.success).length;
    const totalFailed = results.itemsSynced.filter((r) => !r.success).length;
    const alreadySynced = collection.items.length - pendingItems.length;

    return NextResponse.json({
      success: true,
      message: `Sincronização concluída. ${totalSynced} novos tokens sincronizados, ${alreadySynced} já sincronizados, ${totalFailed} falhas.`,
      contractCollectionId,
      contractAddress: health.contractAddress,
      results,
    });
  } catch (error: any) {
    console.error("Error syncing collection:", error);
    return NextResponse.json(
      { error: `Erro na sincronização: ${error.message}` },
      { status: 500 }
    );
  }
}
