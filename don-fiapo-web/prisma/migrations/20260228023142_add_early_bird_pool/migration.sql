-- CreateTable
CREATE TABLE "EarlyBirdClaim" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "slotNumber" INTEGER NOT NULL,
    "lunesAmount" REAL NOT NULL,
    "claimedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EarlyBirdClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EarlyBirdClaim_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "RewardPool" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RewardPool" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "totalAmount" REAL NOT NULL,
    "distributed" REAL NOT NULL DEFAULT 0.0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "maxSlots" INTEGER,
    "slotsClaimed" INTEGER NOT NULL DEFAULT 0,
    "linesPerSlot" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_RewardPool" ("createdAt", "distributed", "id", "isActive", "name", "totalAmount", "type") SELECT "createdAt", "distributed", "id", "isActive", "name", "totalAmount", "type" FROM "RewardPool";
DROP TABLE "RewardPool";
ALTER TABLE "new_RewardPool" RENAME TO "RewardPool";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "EarlyBirdClaim_userId_key" ON "EarlyBirdClaim"("userId");
