-- CreateTable
CREATE TABLE "WalletTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "walletKey" TEXT NOT NULL,
    "walletAddress" TEXT,
    "network" TEXT,
    "externalId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "symbol" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "description" TEXT NOT NULL,
    "fromAddress" TEXT,
    "toAddress" TEXT,
    "txHash" TEXT,
    "metadata" TEXT,
    "onChainAt" DATETIME NOT NULL,
    "indexedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "WalletTransaction_externalId_key" ON "WalletTransaction"("externalId");
