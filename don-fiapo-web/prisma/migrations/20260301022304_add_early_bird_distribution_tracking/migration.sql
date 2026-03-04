-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_EarlyBirdClaim" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "slotNumber" INTEGER NOT NULL,
    "lunesAmount" REAL NOT NULL,
    "claimedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "distributionStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "distributionTxHash" TEXT,
    "distributedAt" DATETIME,
    "distributedBy" TEXT,
    CONSTRAINT "EarlyBirdClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EarlyBirdClaim_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "RewardPool" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_EarlyBirdClaim" ("claimedAt", "id", "lunesAmount", "poolId", "slotNumber", "userId") SELECT "claimedAt", "id", "lunesAmount", "poolId", "slotNumber", "userId" FROM "EarlyBirdClaim";
DROP TABLE "EarlyBirdClaim";
ALTER TABLE "new_EarlyBirdClaim" RENAME TO "EarlyBirdClaim";
CREATE UNIQUE INDEX "EarlyBirdClaim_userId_key" ON "EarlyBirdClaim"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
