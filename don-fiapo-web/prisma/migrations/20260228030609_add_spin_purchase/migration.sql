-- CreateTable
CREATE TABLE "SpinPurchase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "spins" INTEGER NOT NULL,
    "priceUsdt" REAL NOT NULL,
    "paymentId" TEXT,
    "solanaTxHash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" DATETIME,
    CONSTRAINT "SpinPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "SpinPurchase_paymentId_key" ON "SpinPurchase"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "SpinPurchase_solanaTxHash_key" ON "SpinPurchase"("solanaTxHash");
