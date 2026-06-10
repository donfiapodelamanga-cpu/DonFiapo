export class WalletLinkConflictError extends Error {}

export class WalletLinkChallengeConsumedError extends Error {}

export interface SaveVerifiedWalletLinkInput {
  challengeId: string;
  userId: string;
  solanaWallet: string;
}

export interface WalletLinkPersistence {
  $transaction<T>(fn: (tx: WalletLinkTransaction) => Promise<T>): Promise<T>;
}

export interface WalletLinkTransaction {
  walletLinkChallenge: {
    updateMany(args: unknown): Promise<{ count: number }>;
  };
  wallet: {
    findUnique(args: unknown): Promise<{ id: string; userId: string } | null>;
    findFirst(args: unknown): Promise<{ id: string; address: string } | null>;
    update(args: unknown): Promise<unknown>;
    create(args: unknown): Promise<unknown>;
  };
}

export async function saveVerifiedWalletLink(
  db: WalletLinkPersistence,
  input: SaveVerifiedWalletLinkInput
): Promise<void> {
  await db.$transaction(async (tx) => {
    const consumed = await tx.walletLinkChallenge.updateMany({
      where: { id: input.challengeId, consumedAt: null },
      data: { consumedAt: new Date() },
    });

    if (consumed.count !== 1) {
      throw new WalletLinkChallengeConsumedError("Wallet link challenge already consumed");
    }

    const addressConflict = await tx.wallet.findUnique({
      where: { address: input.solanaWallet },
      select: { id: true, userId: true },
    });

    if (addressConflict && addressConflict.userId !== input.userId) {
      throw new WalletLinkConflictError("Solana wallet already linked to another user");
    }

    const existing = await tx.wallet.findFirst({
      where: { userId: input.userId, network: "SOLANA" },
    });

    if (existing) {
      if (existing.address !== input.solanaWallet) {
        await tx.wallet.update({
          where: { id: existing.id },
          data: { address: input.solanaWallet },
        });
      }
      return;
    }

    if (!addressConflict) {
      await tx.wallet.create({
        data: {
          address: input.solanaWallet,
          network: "SOLANA",
          userId: input.userId,
          isPrimary: false,
        },
      });
    }
  });
}
