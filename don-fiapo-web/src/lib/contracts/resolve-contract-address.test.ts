import assert from "node:assert/strict";
import test from "node:test";

import { resolveSpinGameContractAddress } from "./resolve-contract-address";

test("resolves the canonical spin game contract env name", () => {
  assert.equal(
    resolveSpinGameContractAddress({
      NEXT_PUBLIC_SPIN_GAME_CONTRACT: "canonical-spin-contract",
    }),
    "canonical-spin-contract",
  );
});

test("falls back to the legacy spin game contract env name", () => {
  assert.equal(
    resolveSpinGameContractAddress({
      NEXT_PUBLIC_SPIN_GAME_CONTRACT_ADDRESS: "legacy-spin-contract",
    }),
    "legacy-spin-contract",
  );
});

test("prioritizes the canonical spin game contract env name", () => {
  assert.equal(
    resolveSpinGameContractAddress({
      NEXT_PUBLIC_SPIN_GAME_CONTRACT: "canonical-spin-contract",
      NEXT_PUBLIC_SPIN_GAME_CONTRACT_ADDRESS: "legacy-spin-contract",
    }),
    "canonical-spin-contract",
  );
});

test("trims blank spin game contract values", () => {
  assert.equal(
    resolveSpinGameContractAddress({
      NEXT_PUBLIC_SPIN_GAME_CONTRACT: "   ",
      NEXT_PUBLIC_SPIN_GAME_CONTRACT_ADDRESS: " legacy-spin-contract ",
    }),
    "legacy-spin-contract",
  );
});
