import assert from "node:assert/strict";
import test from "node:test";

// Chave de teste estável para todo o arquivo. Definida antes de qualquer chamada
// (a chave é lida lazy dentro do módulo, então a ordem do import não importa).
process.env.X_TOKEN_ENCRYPTION_KEY =
  process.env.X_TOKEN_ENCRYPTION_KEY ?? "test-x-token-encryption-key-0123456789abcd";

import { encryptToken, decryptToken, isEncrypted } from "./token-cipher";

test("encryptToken produz ciphertext prefixado e diferente do plaintext", () => {
  const out = encryptToken("super-secret-access-token");
  assert.ok(out.startsWith("enc:v1:"));
  assert.ok(!out.includes("super-secret-access-token"));
  assert.ok(isEncrypted(out));
});

test("decryptToken recupera o plaintext original (round-trip)", () => {
  const plain = "AAAA-bbbb-1234-refresh-token";
  assert.equal(decryptToken(encryptToken(plain)), plain);
});

test("encryptToken usa IV aleatorio (dois cifrados diferem)", () => {
  const a = encryptToken("same");
  const b = encryptToken("same");
  assert.notEqual(a, b);
  assert.equal(decryptToken(a), "same");
  assert.equal(decryptToken(b), "same");
});

test("decryptToken trata valor legado em texto puro como passthrough", () => {
  // Tokens gravados antes da criptografia nao tem o prefixo enc:v1:
  assert.equal(decryptToken("legacy-plaintext-token"), "legacy-plaintext-token");
  assert.equal(isEncrypted("legacy-plaintext-token"), false);
});

test("decryptToken rejeita ciphertext adulterado (GCM auth tag)", () => {
  const out = encryptToken("tamper-me");
  // Corrompe o ultimo caractere do ciphertext.
  const tampered = out.slice(0, -1) + (out.endsWith("A") ? "B" : "A");
  assert.throws(() => decryptToken(tampered));
});
