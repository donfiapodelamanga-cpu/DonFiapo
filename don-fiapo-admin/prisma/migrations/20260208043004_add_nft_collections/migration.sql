-- CreateTable
CREATE TABLE "NFTCollection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "description" TEXT,
    "coverImage" TEXT,
    "totalSupply" INTEGER NOT NULL,
    "mintedCount" INTEGER NOT NULL DEFAULT 0,
    "price" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'LUNES',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "launchDate" DATETIME,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "NFTCollectionItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "collectionId" TEXT NOT NULL,
    "tokenIndex" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT,
    "metadata" TEXT,
    "status" TEXT NOT NULL DEFAULT 'available',
    "mintedTo" TEXT,
    "mintedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "NFTCollectionItem_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "NFTCollection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "NFTCollectionItem_collectionId_tokenIndex_key" ON "NFTCollectionItem"("collectionId", "tokenIndex");
