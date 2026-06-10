-- AlterTable
ALTER TABLE "NFTCollection" ADD COLUMN "coverIpfsHash" TEXT;

-- AlterTable
ALTER TABLE "NFTCollectionItem" ADD COLUMN "ipfsHash" TEXT;
ALTER TABLE "NFTCollectionItem" ADD COLUMN "metadataIpfsHash" TEXT;
