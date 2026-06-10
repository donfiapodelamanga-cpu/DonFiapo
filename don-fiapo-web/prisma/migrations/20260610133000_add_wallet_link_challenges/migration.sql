CREATE TABLE "WalletLinkChallenge" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "lunesAddress" TEXT NOT NULL,
  "solanaWallet" TEXT NOT NULL,
  "nonce" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "expiresAt" DATETIME NOT NULL,
  "consumedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "WalletLinkChallenge_nonce_key" ON "WalletLinkChallenge"("nonce");
CREATE INDEX "WalletLinkChallenge_lunesAddress_idx" ON "WalletLinkChallenge"("lunesAddress");
CREATE INDEX "WalletLinkChallenge_expiresAt_idx" ON "WalletLinkChallenge"("expiresAt");
