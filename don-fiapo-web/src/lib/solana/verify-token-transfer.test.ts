import assert from "node:assert/strict";
import test from "node:test";

import { verifySplTokenPayment } from "./verify-token-transfer";

const USDT_MINT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";
const TREASURY = "Treasury1111111111111111111111111111111111";
const OTHER_TREASURY = "OtherTreasury11111111111111111111111111111";

function txWithReceiverDelta(options: {
  mint?: string;
  owner?: string;
  preAmount?: string;
  postAmount?: string;
  err?: unknown;
}) {
  return {
    meta: {
      err: options.err ?? null,
      preTokenBalances: [
        {
          mint: options.mint ?? USDT_MINT,
          owner: options.owner ?? TREASURY,
          uiTokenAmount: { amount: options.preAmount ?? "1000000", decimals: 6 },
        },
      ],
      postTokenBalances: [
        {
          mint: options.mint ?? USDT_MINT,
          owner: options.owner ?? TREASURY,
          uiTokenAmount: { amount: options.postAmount ?? "3000000", decimals: 6 },
        },
      ],
    },
  };
}

test("accepts a successful SPL token transfer to the expected receiver, mint and amount", () => {
  const result = verifySplTokenPayment(txWithReceiverDelta({}), {
    receiverAddress: TREASURY,
    mintAddress: USDT_MINT,
    minAmountAtomic: BigInt(2_000_000),
  });

  assert.equal(result.valid, true);
  assert.equal(result.amountReceivedAtomic, BigInt(2_000_000));
});

test("rejects a transfer sent to a different receiver", () => {
  const result = verifySplTokenPayment(txWithReceiverDelta({ owner: OTHER_TREASURY }), {
    receiverAddress: TREASURY,
    mintAddress: USDT_MINT,
    minAmountAtomic: BigInt(2_000_000),
  });

  assert.equal(result.valid, false);
  assert.equal(result.error, "PAYMENT_RECEIVER_MISMATCH");
});

test("rejects a transfer made with a different mint", () => {
  const result = verifySplTokenPayment(txWithReceiverDelta({ mint: "WrongMint111111111111111111111111111111111" }), {
    receiverAddress: TREASURY,
    mintAddress: USDT_MINT,
    minAmountAtomic: BigInt(2_000_000),
  });

  assert.equal(result.valid, false);
  assert.equal(result.error, "PAYMENT_MINT_MISMATCH");
});

test("rejects an amount lower than the required purchase price", () => {
  const result = verifySplTokenPayment(txWithReceiverDelta({ postAmount: "1999999" }), {
    receiverAddress: TREASURY,
    mintAddress: USDT_MINT,
    minAmountAtomic: BigInt(2_000_000),
  });

  assert.equal(result.valid, false);
  assert.equal(result.error, "PAYMENT_AMOUNT_TOO_LOW");
  assert.equal(result.amountReceivedAtomic, BigInt(999_999));
});

test("rejects failed on-chain transactions", () => {
  const result = verifySplTokenPayment(txWithReceiverDelta({ err: { InstructionError: [0, "Custom"] } }), {
    receiverAddress: TREASURY,
    mintAddress: USDT_MINT,
    minAmountAtomic: BigInt(2_000_000),
  });

  assert.equal(result.valid, false);
  assert.equal(result.error, "TRANSACTION_FAILED");
});
