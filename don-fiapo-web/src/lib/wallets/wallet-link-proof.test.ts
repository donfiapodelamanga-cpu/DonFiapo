import assert from "node:assert/strict";
import { generateKeyPairSync, randomBytes, sign } from "node:crypto";
import test from "node:test";

import { PublicKey } from "@solana/web3.js";
import {
  cryptoWaitReady,
  encodeAddress,
  sr25519PairFromSeed,
  sr25519Sign,
} from "@polkadot/util-crypto";

import {
  buildWalletLinkChallengeMessage,
  verifyLunesWalletSignature,
  verifySolanaWalletSignature,
  verifyWalletLinkProof,
} from "./wallet-link-proof";

function toHex(bytes: Uint8Array): string {
  return `0x${Buffer.from(bytes).toString("hex")}`;
}

test("buildWalletLinkChallengeMessage binds both wallets, nonce and expiration", () => {
  const message = buildWalletLinkChallengeMessage({
    lunesAddress: "5FHneW46xGXgs5mUiveU4sbTyGBzmtoU7m4bRLaQbH5sqVyv",
    solanaWallet: "11111111111111111111111111111111",
    nonce: "nonce-123",
    issuedAt: new Date("2026-06-10T12:00:00.000Z"),
    expiresAt: new Date("2026-06-10T12:05:00.000Z"),
  });

  assert.match(message, /Don Fiapo Wallet Link/);
  assert.match(message, /Lunes: 5FHneW46xGXgs5mUiveU4sbTyGBzmtoU7m4bRLaQbH5sqVyv/);
  assert.match(message, /Solana: 11111111111111111111111111111111/);
  assert.match(message, /Nonce: nonce-123/);
  assert.match(message, /Expires At: 2026-06-10T12:05:00.000Z/);
});

test("verifySolanaWalletSignature accepts a real Ed25519 signature and rejects another wallet", () => {
  const message = "link-wallet-message";
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const signature = sign(null, Buffer.from(message, "utf8"), privateKey).toString("base64");
  const publicKeyDer = publicKey.export({ format: "der", type: "spki" }) as Buffer;
  const solanaWallet = new PublicKey(publicKeyDer.subarray(-32)).toBase58();

  assert.equal(verifySolanaWalletSignature({ message, solanaWallet, signature }), true);
  assert.equal(
    verifySolanaWalletSignature({
      message,
      solanaWallet: "11111111111111111111111111111111",
      signature,
    }),
    false
  );
});

test("verifyLunesWalletSignature accepts a real sr25519 signature and rejects another address", async () => {
  await cryptoWaitReady();

  const message = "link-wallet-message";
  const pair = sr25519PairFromSeed(randomBytes(32));
  const lunesAddress = encodeAddress(pair.publicKey, 42);
  const signature = toHex(sr25519Sign(message, pair));

  assert.equal(await verifyLunesWalletSignature({ message, lunesAddress, signature }), true);
  assert.equal(
    await verifyLunesWalletSignature({
      message,
      lunesAddress: "5FHneW46xGXgs5mUiveU4sbTyGBzmtoU7m4bRLaQbH5sqVyv",
      signature,
    }),
    false
  );
});

test("verifyWalletLinkProof rejects expired, consumed or mismatched challenges before accepting signatures", async () => {
  await cryptoWaitReady();

  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const publicKeyDer = publicKey.export({ format: "der", type: "spki" }) as Buffer;
  const solanaWallet = new PublicKey(publicKeyDer.subarray(-32)).toBase58();
  const lunesPair = sr25519PairFromSeed(randomBytes(32));
  const lunesAddress = encodeAddress(lunesPair.publicKey, 42);
  const message = buildWalletLinkChallengeMessage({
    lunesAddress,
    solanaWallet,
    nonce: "nonce-456",
    issuedAt: new Date("2026-06-10T12:00:00.000Z"),
    expiresAt: new Date("2026-06-10T12:05:00.000Z"),
  });
  const lunesSignature = toHex(sr25519Sign(message, lunesPair));
  const solanaSignature = sign(null, Buffer.from(message, "utf8"), privateKey).toString("base64");

  const baseChallenge = {
    lunesAddress,
    solanaWallet,
    message,
    expiresAt: new Date("2026-06-10T12:05:00.000Z"),
    consumedAt: null,
  };

  assert.deepEqual(
    await verifyWalletLinkProof({
      challenge: { ...baseChallenge, expiresAt: new Date("2026-06-10T11:59:59.000Z") },
      lunesAddress,
      solanaWallet,
      lunesSignature,
      solanaSignature,
      now: new Date("2026-06-10T12:00:00.000Z"),
    }),
    { ok: false, error: "challenge_expired" }
  );

  assert.deepEqual(
    await verifyWalletLinkProof({
      challenge: { ...baseChallenge, consumedAt: new Date("2026-06-10T12:01:00.000Z") },
      lunesAddress,
      solanaWallet,
      lunesSignature,
      solanaSignature,
      now: new Date("2026-06-10T12:00:00.000Z"),
    }),
    { ok: false, error: "challenge_consumed" }
  );

  assert.deepEqual(
    await verifyWalletLinkProof({
      challenge: baseChallenge,
      lunesAddress: "5FHneW46xGXgs5mUiveU4sbTyGBzmtoU7m4bRLaQbH5sqVyv",
      solanaWallet,
      lunesSignature,
      solanaSignature,
      now: new Date("2026-06-10T12:00:00.000Z"),
    }),
    { ok: false, error: "challenge_wallet_mismatch" }
  );

  assert.deepEqual(
    await verifyWalletLinkProof({
      challenge: baseChallenge,
      lunesAddress,
      solanaWallet,
      lunesSignature,
      solanaSignature,
      now: new Date("2026-06-10T12:00:00.000Z"),
    }),
    { ok: true }
  );
});
