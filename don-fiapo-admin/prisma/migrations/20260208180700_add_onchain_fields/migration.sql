-- AlterTable
ALTER TABLE "NFTCollection" ADD COLUMN "contractAddress" TEXT;
ALTER TABLE "NFTCollection" ADD COLUMN "contractCollectionId" INTEGER;
ALTER TABLE "NFTCollection" ADD COLUMN "deployedAt" DATETIME;

-- AlterTable
ALTER TABLE "NFTCollectionItem" ADD COLUMN "onChainTokenId" INTEGER;
ALTER TABLE "NFTCollectionItem" ADD COLUMN "syncedAt" DATETIME;
