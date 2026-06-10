import assert from "node:assert/strict";
import test from "node:test";

import {
  InvalidSpinPackageError,
  getSpinPackage,
  rejectClientPricedSpinPurchase,
} from "./spin-packages";

test("getSpinPackage resolves official package pricing by id", () => {
  assert.deepEqual(getSpinPackage("spin-50"), {
    id: "spin-50",
    spins: 50,
    priceUsdt: 40,
  });
});

test("getSpinPackage rejects unknown package ids", () => {
  assert.throws(() => getSpinPackage("spin-999"), InvalidSpinPackageError);
});

test("rejectClientPricedSpinPurchase rejects client supplied spins or price", () => {
  assert.throws(
    () => rejectClientPricedSpinPurchase({ packageId: "spin-10", spins: 999 }),
    /client-priced spin purchases/i,
  );
  assert.throws(
    () => rejectClientPricedSpinPurchase({ packageId: "spin-10", priceUsdt: 0.01 }),
    /client-priced spin purchases/i,
  );
});
