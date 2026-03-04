import { db } from "@/lib/db";

/**
 * Resolve a referral code to a userId.
 * Supports: userId (UUID), wallet address (full or prefix via REF-XXXXXXXX), xUsername, Noble referralCode.
 */
export async function resolveReferrerCode(code: string): Promise<string | null> {
  const cleaned = code.replace(/^REF-/i, "").trim();
  if (!cleaned) return null;

  // 1. Try as userId directly (UUID format)
  if (cleaned.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    const user = await db.user.findUnique({ where: { id: cleaned } });
    if (user) return user.id;
  }

  // 2. Try as wallet address (full or prefix)
  const wallet = await db.wallet.findFirst({
    where: { address: { startsWith: cleaned } },
  });
  if (wallet) return wallet.userId;

  // 3. Try as X username
  const byUsername = await db.user.findFirst({
    where: { xUsername: cleaned },
  });
  if (byUsername) return byUsername.id;

  // Try lowercase variant
  const byUsernameLower = await db.user.findFirst({
    where: { xUsername: cleaned.toLowerCase() },
  });
  if (byUsernameLower) return byUsernameLower.id;

  // 4. Try as Noble referralCode
  const noble = await db.noble.findFirst({
    where: { referralCode: code },
  });
  if (noble) {
    const nobleWallet = await db.wallet.findFirst({
      where: { address: noble.walletAddress },
    });
    if (nobleWallet) return nobleWallet.userId;
  }

  return null;
}
