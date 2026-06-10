import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const projectRoot = process.cwd();
const walletRoutePath = path.join(projectRoot, "src/app/api/user/wallet/route.ts");
const challengeRoutePath = path.join(projectRoot, "src/app/api/user/wallet/challenge/route.ts");

test("POST /api/user/wallet requires a server challenge and both wallet signatures", () => {
  const source = readFileSync(walletRoutePath, "utf8");

  assert.match(source, /challengeId/);
  assert.match(source, /lunesSignature/);
  assert.match(source, /solanaSignature/);
  assert.match(source, /verifyWalletLinkProof/);
  assert.doesNotMatch(source, /const\s+\{\s*lunesAddress\s*,\s*solanaWallet\s*\}\s*=\s*body/);
});

test("POST /api/user/wallet/challenge creates the canonical message server-side", () => {
  assert.equal(existsSync(challengeRoutePath), true);

  const source = readFileSync(challengeRoutePath, "utf8");

  assert.match(source, /createWalletLinkChallengeData/);
  assert.match(source, /walletLinkChallenge\.create/);
  assert.doesNotMatch(source, /message\s*=\s*body\.message/);
});
