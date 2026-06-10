import assert from "node:assert/strict";
import test from "node:test";

import {
  saveVerifiedWalletLink,
  WalletLinkChallengeConsumedError,
  WalletLinkConflictError,
} from "./wallet-link-save";

test("saveVerifiedWalletLink rejects an already consumed challenge before wallet writes", async () => {
  const calls: string[] = [];
  const tx = {
    walletLinkChallenge: {
      updateMany: async () => {
        calls.push("consume-challenge");
        return { count: 0 };
      },
    },
    wallet: {
      findUnique: async () => {
        calls.push("find-conflict");
        return null;
      },
      findFirst: async () => null,
      update: async () => null,
      create: async () => null,
    },
  };
  const db = {
    $transaction: async <T>(fn: (client: typeof tx) => Promise<T>) => fn(tx),
  };

  await assert.rejects(
    () =>
      saveVerifiedWalletLink(db, {
        challengeId: "challenge-1",
        userId: "user-1",
        solanaWallet: "solana-1",
      }),
    WalletLinkChallengeConsumedError
  );
  assert.deepEqual(calls, ["consume-challenge"]);
});

test("saveVerifiedWalletLink rejects a Solana wallet linked to another user without changing wallets", async () => {
  const calls: string[] = [];
  const tx = {
    walletLinkChallenge: {
      updateMany: async () => {
        calls.push("consume-challenge");
        return { count: 1 };
      },
    },
    wallet: {
      findUnique: async () => {
        calls.push("find-conflict");
        return { id: "wallet-2", userId: "user-2" };
      },
      findFirst: async () => {
        calls.push("find-existing");
        return null;
      },
      update: async () => {
        calls.push("update-wallet");
        return null;
      },
      create: async () => {
        calls.push("create-wallet");
        return null;
      },
    },
  };
  const db = {
    $transaction: async <T>(fn: (client: typeof tx) => Promise<T>) => fn(tx),
  };

  await assert.rejects(
    () =>
      saveVerifiedWalletLink(db, {
        challengeId: "challenge-1",
        userId: "user-1",
        solanaWallet: "solana-1",
      }),
    WalletLinkConflictError
  );
  assert.deepEqual(calls, ["consume-challenge", "find-conflict"]);
});

test("saveVerifiedWalletLink updates an existing Solana wallet for the verified user", async () => {
  const calls: string[] = [];
  const tx = {
    walletLinkChallenge: {
      updateMany: async () => {
        calls.push("consume-challenge");
        return { count: 1 };
      },
    },
    wallet: {
      findUnique: async () => {
        calls.push("find-conflict");
        return null;
      },
      findFirst: async () => {
        calls.push("find-existing");
        return { id: "wallet-1", address: "old-solana" };
      },
      update: async (args: unknown) => {
        calls.push("update-wallet");
        return args;
      },
      create: async () => {
        calls.push("create-wallet");
        return null;
      },
    },
  };
  const db = {
    $transaction: async <T>(fn: (client: typeof tx) => Promise<T>) => fn(tx),
  };

  await saveVerifiedWalletLink(db, {
    challengeId: "challenge-1",
    userId: "user-1",
    solanaWallet: "new-solana",
  });
  assert.deepEqual(calls, ["consume-challenge", "find-conflict", "find-existing", "update-wallet"]);
});
