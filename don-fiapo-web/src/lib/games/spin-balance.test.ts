import assert from "node:assert/strict";
import test from "node:test";

import {
  FREE_SPINS,
  NoSpinBalanceError,
  calculateSpinBalance,
  ensureSpinBalanceForUser,
  getSpinBalanceForUser,
} from "./spin-balance";

test("calculateSpinBalance includes free and confirmed purchased spins minus used spins", () => {
  assert.equal(calculateSpinBalance({ purchasedSpins: 4, usedSpins: 2 }), FREE_SPINS + 4 - 2);
});

test("calculateSpinBalance never returns a negative balance", () => {
  assert.equal(calculateSpinBalance({ purchasedSpins: 0, usedSpins: 99 }), 0);
});

test("getSpinBalanceForUser counts only confirmed purchases", async () => {
  const db = {
    spinResult: {
      count: async (args: unknown) => {
        assert.deepEqual(args, { where: { userId: "user-1" } });
        return 5;
      },
    },
    spinPurchase: {
      aggregate: async (args: unknown) => {
        assert.deepEqual(args, {
          where: { userId: "user-1", status: "CONFIRMED" },
          _sum: { spins: true },
        });
        return { _sum: { spins: 2 } };
      },
    },
  };

  const balance = await getSpinBalanceForUser(db, "user-1");

  assert.deepEqual(balance, {
    freeSpins: FREE_SPINS,
    purchasedSpins: 2,
    totalSpins: 5,
    spinBalance: 0,
  });
});

test("ensureSpinBalanceForUser rejects users without available spins", async () => {
  const db = {
    spinResult: { count: async () => FREE_SPINS },
    spinPurchase: { aggregate: async () => ({ _sum: { spins: 0 } }) },
  };

  await assert.rejects(() => ensureSpinBalanceForUser(db, "user-1"), NoSpinBalanceError);
});
