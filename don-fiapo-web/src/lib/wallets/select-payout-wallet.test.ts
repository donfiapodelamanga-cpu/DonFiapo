import assert from "node:assert/strict";
import test from "node:test";

import { selectPayoutWallet } from "./select-payout-wallet";

const wallets = [
  { address: "lunes-secondary", network: "LUNES", isPrimary: false, createdAt: new Date("2026-01-01") },
  { address: "solana-secondary", network: "SOLANA", isPrimary: false, createdAt: new Date("2026-01-02") },
  { address: "solana-primary", network: "SOLANA", isPrimary: true, createdAt: new Date("2026-01-03") },
];

test("selects the primary wallet for the requested network", () => {
  assert.equal(selectPayoutWallet(wallets, "SOLANA"), "solana-primary");
});

test("falls back to the first matching wallet when no primary wallet exists", () => {
  assert.equal(selectPayoutWallet(wallets, "LUNES"), "lunes-secondary");
});

test("returns null when the user has no wallet for the requested network", () => {
  assert.equal(selectPayoutWallet(wallets, "ETHEREUM"), null);
});
