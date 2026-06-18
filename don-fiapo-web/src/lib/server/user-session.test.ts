import { test } from "node:test";
import assert from "node:assert/strict";

process.env.USER_SESSION_SECRET = "x".repeat(40);

import {
  createUserSessionToken,
  verifyUserSessionToken,
} from "./user-session";

// Auditoria 2026-06-18 — #5/#6: token de sessão assinado por HMAC.
test("cria e verifica um token válido", () => {
  const t = createUserSessionToken("user-1", 1000);
  assert.deepEqual(verifyUserSessionToken(t, 2000), { userId: "user-1" });
});

test("assinatura adulterada -> null", () => {
  const t = createUserSessionToken("user-1", 1000);
  const tampered = t.slice(0, -2) + (t.endsWith("aa") ? "bb" : "aa");
  assert.equal(verifyUserSessionToken(tampered, 2000), null);
});

test("payload trocado reusando a assinatura antiga -> null", () => {
  const t = createUserSessionToken("user-1", 1000);
  const sig = t.split(".")[1];
  const forged = Buffer.from(JSON.stringify({ uid: "admin", exp: 9e15 })).toString("base64url") + "." + sig;
  assert.equal(verifyUserSessionToken(forged, 2000), null);
});

test("token expirado -> null", () => {
  const t = createUserSessionToken("user-1", 1000);
  assert.equal(verifyUserSessionToken(t, 1000 + 25 * 60 * 60 * 1000), null);
});

test("ausente ou malformado -> null", () => {
  assert.equal(verifyUserSessionToken(undefined, 2000), null);
  assert.equal(verifyUserSessionToken("garbage", 2000), null);
  assert.equal(verifyUserSessionToken("", 2000), null);
});
