import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPublicUrl,
  resolveAllowedCorsOrigins,
  resolveAdminOrigin,
  resolveCorsOrigin,
  resolvePublicOrigin,
} from "./public-origin";

test("production ignores localhost configured origin and uses forwarded public host", () => {
  const origin = resolvePublicOrigin({
    configuredOrigin: "http://localhost:3000",
    forwardedProto: "https",
    forwardedHost: "donfiapo.fun",
    requestUrl: "http://don-fiapo-web:3000/api/auth/twitter",
    nodeEnv: "production",
  });

  assert.equal(origin, "https://donfiapo.fun");
});

test("production falls back to canonical domain instead of internal docker host", () => {
  const origin = resolvePublicOrigin({
    requestUrl: "http://don-fiapo-web:3000/api/auth/twitter",
    nodeEnv: "production",
  });

  assert.equal(origin, "https://donfiapo.fun");
});

test("development keeps localhost for local redirects", () => {
  const origin = resolvePublicOrigin({
    configuredOrigin: "http://localhost:3000",
    nodeEnv: "development",
  });

  assert.equal(origin, "http://localhost:3000");
});

test("builds absolute public URLs with normalized paths", () => {
  const url = buildPublicUrl("en/airdrop?tab=missions", {
    configuredOrigin: "https://donfiapo.fun/",
    nodeEnv: "production",
  });

  assert.equal(url, "https://donfiapo.fun/en/airdrop?tab=missions");
});

test("production CORS allows the app and admin origins without comma-joined origins", () => {
  const origins = resolveAllowedCorsOrigins({
    appUrl: "https://donfiapo.fun",
    adminUrl: "https://admin.donfiapo.fun",
    nodeEnv: "production",
  });

  assert.deepEqual(origins, ["https://donfiapo.fun", "https://admin.donfiapo.fun"]);
  assert.equal(resolveCorsOrigin("https://admin.donfiapo.fun", { allowedOrigins: origins }), "https://admin.donfiapo.fun");
  assert.equal(resolveCorsOrigin("https://evil.example", { allowedOrigins: origins }), null);
});

test("production CORS rejects localhost origins", () => {
  const origins = resolveAllowedCorsOrigins({
    appUrl: "http://localhost:3000",
    adminUrl: "http://localhost:3002",
    nodeEnv: "production",
  });

  assert.deepEqual(origins, ["https://donfiapo.fun", "https://admin.donfiapo.fun"]);
  assert.equal(resolveCorsOrigin("http://localhost:3000", { allowedOrigins: origins }), null);
});

test("production admin origin ignores localhost and uses canonical admin domain", () => {
  assert.equal(
    resolveAdminOrigin({ configuredOrigin: "http://localhost:3001", nodeEnv: "production" }),
    "https://admin.donfiapo.fun",
  );
});

test("development admin origin uses the real local admin port", () => {
  assert.equal(resolveAdminOrigin({ nodeEnv: "development" }), "http://localhost:3002");
});
