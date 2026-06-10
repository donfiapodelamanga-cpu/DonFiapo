import assert from "node:assert/strict";
import test from "node:test";

import { NoSpinBalanceError } from "./spin-balance";
import { consumeSpinForPrize } from "./spin-consumption";

const prize = {
  index: 11,
  label: "MISS",
  sublabel: "Try again",
  tier: "miss",
};

test("consumeSpinForPrize creates the result inside a transaction after checking balance", async () => {
  const calls: string[] = [];
  const tx = {
    spinResult: {
      count: async () => {
        calls.push("count-results");
        return 2;
      },
      create: async (args: unknown) => {
        calls.push("create-result");
        return args;
      },
    },
    spinPurchase: {
      aggregate: async () => {
        calls.push("sum-purchases");
        return { _sum: { spins: 1 } };
      },
    },
  };
  const db = {
    $transaction: async <T>(fn: (client: typeof tx) => Promise<T>) => {
      calls.push("begin");
      const result = await fn(tx);
      calls.push("commit");
      return result;
    },
  };

  const result = await consumeSpinForPrize(db, "user-1", prize);

  assert.deepEqual(calls, ["begin", "count-results", "sum-purchases", "create-result", "commit"]);
  assert.equal(result.spinBalanceBefore, 2);
  assert.equal(result.spinBalanceAfter, 1);
  assert.deepEqual(result.spinResult, {
    data: {
      userId: "user-1",
      prizeIndex: 11,
      prizeLabel: "MISS",
      prizeSublabel: "Try again",
      tier: "miss",
    },
  });
});

test("consumeSpinForPrize rejects without creating a result when balance is zero", async () => {
  let createCalled = false;
  const tx = {
    spinResult: {
      count: async () => 3,
      create: async () => {
        createCalled = true;
        return {};
      },
    },
    spinPurchase: {
      aggregate: async () => ({ _sum: { spins: 0 } }),
    },
  };
  const db = {
    $transaction: async <T>(fn: (client: typeof tx) => Promise<T>) => fn(tx),
  };

  await assert.rejects(() => consumeSpinForPrize(db, "user-1", prize), NoSpinBalanceError);
  assert.equal(createCalled, false);
});
