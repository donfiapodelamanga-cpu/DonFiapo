import assert from "node:assert/strict";
import test from "node:test";

import {
  buildOracleProxyUrl,
  isOracleProxyPathAllowed,
  resolveOracleProxyConfig,
} from "./oracle-proxy-config";

test("allows only expected Oracle proxy paths", () => {
  assert.equal(isOracleProxyPathAllowed("health"), true);
  assert.equal(isOracleProxyPathAllowed("api/payment/create"), true);
  assert.equal(isOracleProxyPathAllowed("api/payment/verify"), true);
  assert.equal(isOracleProxyPathAllowed("api/staking/create-payment"), false);
  assert.equal(isOracleProxyPathAllowed("../api/payment/create"), false);
});

test("development defaults to local Oracle without requiring an API key", () => {
  const config = resolveOracleProxyConfig({ nodeEnv: "development" });

  assert.equal(config.valid, true);
  assert.equal(config.url, "http://localhost:3001");
  assert.deepEqual(config.errors, []);
});

test("production rejects localhost Oracle URLs", () => {
  const config = resolveOracleProxyConfig({
    nodeEnv: "production",
    oracleUrl: "http://localhost:3001",
    oracleKey: "secret",
  });

  assert.equal(config.valid, false);
  assert.equal(config.errors.includes("ORACLE_SERVICE_URL must be a public or internal service URL in production"), true);
});

test("production requires an Oracle API key", () => {
  const config = resolveOracleProxyConfig({
    nodeEnv: "production",
    oracleUrl: "http://don-fiapo-oracle:3001",
  });

  assert.equal(config.valid, false);
  assert.equal(config.errors.includes("ORACLE_API_KEY is required in production"), true);
});

test("builds upstream Oracle URLs without double slashes", () => {
  assert.equal(
    buildOracleProxyUrl("http://don-fiapo-oracle:3001/", "api/payment/create"),
    "http://don-fiapo-oracle:3001/api/payment/create",
  );
});
