-- CreateTable
CREATE TABLE "SpinResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "prizeIndex" INTEGER NOT NULL,
    "prizeLabel" TEXT NOT NULL,
    "prizeSublabel" TEXT NOT NULL DEFAULT '',
    "tier" TEXT NOT NULL DEFAULT 'common',
    "playedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SpinResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
