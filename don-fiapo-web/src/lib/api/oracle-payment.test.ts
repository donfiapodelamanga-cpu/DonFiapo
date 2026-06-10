import assert from "node:assert/strict";
import test from "node:test";

import {
  buildOracleNftMintPaymentCreatePayload,
  buildOracleStakingPaymentCreatePayload,
  oraclePaymentCreatePath,
  oraclePaymentStatusPath,
  oraclePaymentVerifyPath,
  oracleUsdToAtomic,
  toStakingPaymentStatus,
} from "./oracle-payment";

test("builds Oracle payment paths through the local proxy", () => {
  assert.equal(oraclePaymentCreatePath(), "/api/oracle/api/payment/create");
  assert.equal(oraclePaymentVerifyPath(), "/api/oracle/api/payment/verify");
  assert.equal(oraclePaymentStatusPath("PAY_123"), "/api/oracle/api/payment/PAY_123");
});

test("builds staking payment create payload without client-priced amounts", () => {
  const payload = buildOracleStakingPaymentCreatePayload({
    lunesAccount: "lunes-wallet",
    stakingType: "don-fiapo",
    paymentMethod: "usdt",
    fiapoAmount: 1234,
    expectedSender: "solana-wallet",
  });

  assert.deepEqual(payload, {
    lunesAccount: "lunes-wallet",
    paymentType: "staking",
    stakingType: "don-fiapo",
    paymentMethod: "usdt",
    fiapoAmount: 1234,
    expectedSender: "solana-wallet",
  });
});

test("builds NFT mint payment create payload without client-priced amounts", () => {
  const payload = buildOracleNftMintPaymentCreatePayload({
    lunesAccount: "lunes-wallet",
    tierId: 2,
    quantity: 3,
    expectedSender: "solana-wallet",
  });

  assert.deepEqual(payload, {
    lunesAccount: "lunes-wallet",
    paymentType: "nft_mint",
    tierId: 2,
    quantity: 3,
    expectedSender: "solana-wallet",
  });
});

test("converts USD/USDT display amounts to atomic units with 6 decimals", () => {
  assert.equal(oracleUsdToAtomic(1.25), 1250000);
  assert.equal(oracleUsdToAtomic(0.000001), 1);
});

test("maps Oracle payment statuses to staking payment statuses", () => {
  assert.equal(toStakingPaymentStatus({ status: "pending" }), "pending");
  assert.equal(toStakingPaymentStatus({ status: "completed" }), "confirmed");
  assert.equal(toStakingPaymentStatus({ status: "expired" }), "failed");
  assert.equal(toStakingPaymentStatus({ status: "pending", isExpired: true }), "failed");
});
