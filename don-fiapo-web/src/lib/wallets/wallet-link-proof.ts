import { createPublicKey, randomBytes, verify as verifyEd25519 } from "node:crypto";

import { PublicKey } from "@solana/web3.js";

const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

export const WALLET_LINK_CHALLENGE_TTL_MS = 5 * 60 * 1000;

export interface BuildWalletLinkChallengeMessageInput {
  lunesAddress: string;
  solanaWallet: string;
  nonce: string;
  issuedAt: Date;
  expiresAt: Date;
}

export interface WalletLinkChallengeData {
  nonce: string;
  issuedAt: Date;
  expiresAt: Date;
  message: string;
}

export interface WalletLinkChallengeRecord {
  lunesAddress: string;
  solanaWallet: string;
  message: string;
  expiresAt: Date | string;
  consumedAt?: Date | string | null;
}

export interface WalletSignatureInput {
  message: string;
  lunesAddress: string;
  solanaWallet: string;
  lunesSignature: string;
  solanaSignature: string;
}

export type WalletLinkProofError =
  | "challenge_consumed"
  | "challenge_expired"
  | "challenge_wallet_mismatch"
  | "invalid_lunes_signature"
  | "invalid_solana_signature";

export type WalletLinkProofResult = { ok: true } | { ok: false; error: WalletLinkProofError };

export function buildWalletLinkChallengeMessage(input: BuildWalletLinkChallengeMessageInput): string {
  return [
    "Don Fiapo Wallet Link",
    "",
    "Sign this message to link your Lunes wallet to your Solana payout wallet.",
    "This does not authorize a transaction or token transfer.",
    "",
    `Lunes: ${input.lunesAddress}`,
    `Solana: ${input.solanaWallet}`,
    `Nonce: ${input.nonce}`,
    `Issued At: ${input.issuedAt.toISOString()}`,
    `Expires At: ${input.expiresAt.toISOString()}`,
  ].join("\n");
}

export function createWalletLinkChallengeData(input: {
  lunesAddress: string;
  solanaWallet: string;
  now?: Date;
  ttlMs?: number;
}): WalletLinkChallengeData {
  const issuedAt = input.now ?? new Date();
  const expiresAt = new Date(issuedAt.getTime() + (input.ttlMs ?? WALLET_LINK_CHALLENGE_TTL_MS));
  const nonce = randomBytes(24).toString("base64url");
  const message = buildWalletLinkChallengeMessage({
    lunesAddress: input.lunesAddress,
    solanaWallet: input.solanaWallet,
    nonce,
    issuedAt,
    expiresAt,
  });

  return { nonce, issuedAt, expiresAt, message };
}

export function verifySolanaWalletSignature(input: {
  message: string;
  solanaWallet: string;
  signature: string;
}): boolean {
  try {
    const publicKeyBytes = new PublicKey(input.solanaWallet).toBytes();
    const signatureBytes = Buffer.from(input.signature, "base64");

    if (signatureBytes.length !== 64) return false;

    const publicKey = createPublicKey({
      key: Buffer.concat([ED25519_SPKI_PREFIX, Buffer.from(publicKeyBytes)]),
      format: "der",
      type: "spki",
    });

    return verifyEd25519(null, Buffer.from(input.message, "utf8"), publicKey, signatureBytes);
  } catch {
    return false;
  }
}

export async function verifyLunesWalletSignature(input: {
  message: string;
  lunesAddress: string;
  signature: string;
}): Promise<boolean> {
  try {
    const { cryptoWaitReady, signatureVerify } = await import("@polkadot/util-crypto");
    await cryptoWaitReady();
    return signatureVerify(input.message, input.signature, input.lunesAddress).isValid;
  } catch {
    return false;
  }
}

export async function verifyWalletLinkProof(input: {
  challenge: WalletLinkChallengeRecord;
  lunesAddress: string;
  solanaWallet: string;
  lunesSignature: string;
  solanaSignature: string;
  now?: Date;
}): Promise<WalletLinkProofResult> {
  const now = input.now ?? new Date();

  if (input.challenge.consumedAt) {
    return { ok: false, error: "challenge_consumed" };
  }

  const expiresAt = new Date(input.challenge.expiresAt);
  if (!Number.isFinite(expiresAt.getTime()) || expiresAt.getTime() <= now.getTime()) {
    return { ok: false, error: "challenge_expired" };
  }

  if (
    input.challenge.lunesAddress !== input.lunesAddress ||
    input.challenge.solanaWallet !== input.solanaWallet
  ) {
    return { ok: false, error: "challenge_wallet_mismatch" };
  }

  const [lunesSignatureValid, solanaSignatureValid] = await Promise.all([
    verifyLunesWalletSignature({
      message: input.challenge.message,
      lunesAddress: input.lunesAddress,
      signature: input.lunesSignature,
    }),
    Promise.resolve(
      verifySolanaWalletSignature({
        message: input.challenge.message,
        solanaWallet: input.solanaWallet,
        signature: input.solanaSignature,
      })
    ),
  ]);

  if (!lunesSignatureValid) {
    return { ok: false, error: "invalid_lunes_signature" };
  }

  if (!solanaSignatureValid) {
    return { ok: false, error: "invalid_solana_signature" };
  }

  return { ok: true };
}
