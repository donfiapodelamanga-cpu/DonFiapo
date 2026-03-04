-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "rank" TEXT NOT NULL DEFAULT 'PLEBEU',
    "xId" TEXT,
    "xUsername" TEXT,
    "xAccessToken" TEXT,
    "xRefreshToken" TEXT,
    "xTokenExpiresAt" DATETIME,
    "xAccountCreatedAt" DATETIME,
    "xFollowersCount" INTEGER,
    "xFollowingCount" INTEGER,
    "telegramId" TEXT,
    "telegramUsername" TEXT,
    "offchainScore" REAL NOT NULL DEFAULT 0.0,
    "onchainScore" REAL NOT NULL DEFAULT 0.0,
    "multiplier" REAL NOT NULL DEFAULT 1.0,
    "totalScore" REAL NOT NULL DEFAULT 0.0,
    "isBanned" BOOLEAN NOT NULL DEFAULT false,
    "trustScore" INTEGER NOT NULL DEFAULT 100,
    "lastIpAddress" TEXT,
    "deviceFingerprint" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "address" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Mission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "basePoints" REAL NOT NULL,
    "multiplier" REAL NOT NULL DEFAULT 1.0,
    "maxCompletions" INTEGER NOT NULL DEFAULT 1,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "targetUrl" TEXT,
    "requiredKeyword" TEXT,
    "actionType" TEXT,
    "rewardPoolId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Mission_rewardPoolId_fkey" FOREIGN KEY ("rewardPoolId") REFERENCES "RewardPool" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MissionCompletion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "earnedPoints" REAL NOT NULL DEFAULT 0.0,
    "proofMetadata" TEXT,
    "completedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" DATETIME,
    "recheckAt" DATETIME,
    CONSTRAINT "MissionCompletion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MissionCompletion_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TokenMigration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "solanaTxHash" TEXT NOT NULL,
    "solanaSender" TEXT NOT NULL,
    "lunesRecipient" TEXT NOT NULL,
    "amountSolana" REAL NOT NULL,
    "amountLunes" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedAt" DATETIME,
    "rejectionReason" TEXT,
    "lunesTxHash" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TokenMigration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RewardPool" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "totalAmount" REAL NOT NULL,
    "distributed" REAL NOT NULL DEFAULT 0.0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "FraudFlag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'LOW',
    "flaggedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FraudFlag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "referrerId" TEXT NOT NULL,
    "referredId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Referral_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Referral_referredId_fkey" FOREIGN KEY ("referredId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Subscriber" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT
);

-- CreateTable
CREATE TABLE "Noble" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'Silver',
    "status" TEXT NOT NULL DEFAULT 'Probation',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referralCode" TEXT,
    "solanaWallet" TEXT,
    "totalSales" REAL NOT NULL DEFAULT 0.0,
    "totalReferrals" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "AdminWallet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "User_xId_key" ON "User"("xId");

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_address_key" ON "Wallet"("address");

-- CreateIndex
CREATE UNIQUE INDEX "MissionCompletion_userId_missionId_completedAt_key" ON "MissionCompletion"("userId", "missionId", "completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TokenMigration_solanaTxHash_key" ON "TokenMigration"("solanaTxHash");

-- CreateIndex
CREATE UNIQUE INDEX "Referral_referredId_key" ON "Referral"("referredId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscriber_email_key" ON "Subscriber"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Noble_email_key" ON "Noble"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Noble_walletAddress_key" ON "Noble"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "Noble_referralCode_key" ON "Noble"("referralCode");

-- CreateIndex
CREATE UNIQUE INDEX "AdminWallet_address_key" ON "AdminWallet"("address");
