/*
  Warnings:

  - You are about to drop the column `currency` on the `NFTCollection` table. All the data in the column will be lost.
  - You are about to drop the column `mintedCount` on the `NFTCollection` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `NFTCollection` table. All the data in the column will be lost.
  - You are about to drop the column `totalSupply` on the `NFTCollection` table. All the data in the column will be lost.
  - You are about to drop the column `tokenIndex` on the `NFTCollectionItem` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_NFTCollection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "description" TEXT,
    "coverImage" TEXT,
    "coverIpfsHash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "launchDate" DATETIME,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_NFTCollection" ("coverImage", "coverIpfsHash", "createdAt", "createdBy", "description", "id", "launchDate", "name", "status", "symbol", "updatedAt") SELECT "coverImage", "coverIpfsHash", "createdAt", "createdBy", "description", "id", "launchDate", "name", "status", "symbol", "updatedAt" FROM "NFTCollection";
DROP TABLE "NFTCollection";
ALTER TABLE "new_NFTCollection" RENAME TO "NFTCollection";
CREATE TABLE "new_NFTCollectionItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "collectionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "ipfsHash" TEXT,
    "metadata" TEXT,
    "metadataIpfsHash" TEXT,
    "price" REAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'LUNES',
    "supply" INTEGER NOT NULL DEFAULT 1,
    "mintedCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'available',
    "mintedTo" TEXT,
    "mintedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "NFTCollectionItem_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "NFTCollection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_NFTCollectionItem" ("collectionId", "createdAt", "id", "imageUrl", "ipfsHash", "metadata", "metadataIpfsHash", "mintedAt", "mintedTo", "name", "status", "updatedAt") SELECT "collectionId", "createdAt", "id", "imageUrl", "ipfsHash", "metadata", "metadataIpfsHash", "mintedAt", "mintedTo", "name", "status", "updatedAt" FROM "NFTCollectionItem";
DROP TABLE "NFTCollectionItem";
ALTER TABLE "new_NFTCollectionItem" RENAME TO "NFTCollectionItem";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
