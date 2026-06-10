export type PaymentVerificationError =
  | "TRANSACTION_NOT_FOUND"
  | "TRANSACTION_FAILED"
  | "PAYMENT_RECEIVER_MISMATCH"
  | "PAYMENT_MINT_MISMATCH"
  | "PAYMENT_AMOUNT_TOO_LOW"
  | "PAYMENT_SENDER_MISMATCH";

export interface TokenBalanceLike {
  owner?: string | null;
  mint?: string | null;
  uiTokenAmount?: {
    amount?: string | null;
    decimals?: number | null;
  } | null;
}

export interface ParsedSolanaTransactionLike {
  meta?: {
    err?: unknown;
    preTokenBalances?: TokenBalanceLike[] | null;
    postTokenBalances?: TokenBalanceLike[] | null;
  } | null;
}

export interface ExpectedSplTokenPayment {
  receiverAddress: string;
  mintAddress: string;
  minAmountAtomic: bigint;
  expectedSenderAddress?: string;
}

export type SplTokenPaymentVerification =
  | {
      valid: true;
      amountReceivedAtomic: bigint;
    }
  | {
      valid: false;
      error: PaymentVerificationError;
      amountReceivedAtomic?: bigint;
    };

function normalizeAddress(address: string | null | undefined): string {
  return (address ?? "").trim();
}

function tokenAmountToBigInt(balance: TokenBalanceLike): bigint {
  const amount = balance.uiTokenAmount?.amount;
  if (!amount || !/^\d+$/.test(amount)) return BigInt(0);
  return BigInt(amount);
}

function sumBalance(
  balances: TokenBalanceLike[] | null | undefined,
  predicate: (balance: TokenBalanceLike) => boolean,
): bigint {
  return (balances ?? []).reduce((total, balance) => {
    if (!predicate(balance)) return total;
    return total + tokenAmountToBigInt(balance);
  }, BigInt(0));
}

function deltaFor(
  tx: ParsedSolanaTransactionLike,
  predicate: (balance: TokenBalanceLike) => boolean,
): bigint {
  const pre = sumBalance(tx.meta?.preTokenBalances, predicate);
  const post = sumBalance(tx.meta?.postTokenBalances, predicate);
  return post - pre;
}

function maxPositiveDelta(
  tx: ParsedSolanaTransactionLike,
  predicate: (balance: TokenBalanceLike) => boolean,
): bigint {
  const keys = new Set<string>();
  for (const balance of [...(tx.meta?.preTokenBalances ?? []), ...(tx.meta?.postTokenBalances ?? [])]) {
    if (!predicate(balance)) continue;
    keys.add(`${normalizeAddress(balance.owner)}:${normalizeAddress(balance.mint)}`);
  }

  let max = BigInt(0);
  for (const key of keys) {
    const [owner, mint] = key.split(":");
    const delta = deltaFor(tx, (balance) => normalizeAddress(balance.owner) === owner && normalizeAddress(balance.mint) === mint);
    if (delta > max) max = delta;
  }

  return max;
}

export function decimalToAtomicUnits(value: number, decimals = 6): bigint {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Amount must be a positive finite number");
  }

  const [whole, fraction = ""] = value.toFixed(decimals).split(".");
  const paddedFraction = fraction.padEnd(decimals, "0").slice(0, decimals);
  return BigInt(whole) * BigInt(10) ** BigInt(decimals) + BigInt(paddedFraction || "0");
}

export function verifySplTokenPayment(
  tx: ParsedSolanaTransactionLike | null | undefined,
  expected: ExpectedSplTokenPayment,
): SplTokenPaymentVerification {
  if (!tx?.meta) {
    return { valid: false, error: "TRANSACTION_NOT_FOUND" };
  }

  if (tx.meta.err) {
    return { valid: false, error: "TRANSACTION_FAILED" };
  }

  const receiverAddress = normalizeAddress(expected.receiverAddress);
  const mintAddress = normalizeAddress(expected.mintAddress);
  const expectedSenderAddress = normalizeAddress(expected.expectedSenderAddress);

  const receiverMintDelta = deltaFor(
    tx,
    (balance) => normalizeAddress(balance.owner) === receiverAddress && normalizeAddress(balance.mint) === mintAddress,
  );

  if (receiverMintDelta >= expected.minAmountAtomic) {
    if (!expectedSenderAddress) {
      return { valid: true, amountReceivedAtomic: receiverMintDelta };
    }

    const senderDelta = deltaFor(
      tx,
      (balance) => normalizeAddress(balance.owner) === expectedSenderAddress && normalizeAddress(balance.mint) === mintAddress,
    );

    if (senderDelta <= -expected.minAmountAtomic) {
      return { valid: true, amountReceivedAtomic: receiverMintDelta };
    }

    return { valid: false, error: "PAYMENT_SENDER_MISMATCH", amountReceivedAtomic: receiverMintDelta };
  }

  const receiverOtherMintDelta = maxPositiveDelta(
    tx,
    (balance) => normalizeAddress(balance.owner) === receiverAddress && normalizeAddress(balance.mint) !== mintAddress,
  );

  if (receiverOtherMintDelta > BigInt(0)) {
    return { valid: false, error: "PAYMENT_MINT_MISMATCH", amountReceivedAtomic: receiverMintDelta };
  }

  const expectedMintOtherReceiverDelta = maxPositiveDelta(
    tx,
    (balance) => normalizeAddress(balance.owner) !== receiverAddress && normalizeAddress(balance.mint) === mintAddress,
  );

  if (expectedMintOtherReceiverDelta > BigInt(0)) {
    return { valid: false, error: "PAYMENT_RECEIVER_MISMATCH", amountReceivedAtomic: receiverMintDelta };
  }

  return { valid: false, error: "PAYMENT_AMOUNT_TOO_LOW", amountReceivedAtomic: receiverMintDelta };
}
