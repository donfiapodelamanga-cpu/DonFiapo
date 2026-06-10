import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

const WEB_ORIGIN = process.env.PROD_WEB_ORIGIN ?? "https://donfiapo.fun";
const ADMIN_ORIGIN = process.env.PROD_ADMIN_ORIGIN ?? "https://admin.donfiapo.fun";
const TEST_SOLANA_WALLET =
  process.env.PROD_TEST_SOLANA_WALLET ?? "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";

const checks = [];

function check(name, fn) {
  checks.push({ name, fn });
}

function curl(args) {
  const result = spawnSync("curl", ["-sS", "--connect-timeout", "12", ...args], {
    encoding: "utf8",
  });

  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || `curl exited ${result.status}`).trim());
  }

  return result.stdout;
}

function request(url, { method = "GET", headers = {} } = {}) {
  const args = ["-i", "-X", method, url];

  for (const [key, value] of Object.entries(headers)) {
    args.push("-H", `${key}: ${value}`);
  }

  const output = curl(args);
  const normalized = output.replace(/\r\n/g, "\n");
  const splitAt = normalized.search(/\n\n/);

  if (splitAt === -1) {
    throw new Error(`Could not parse HTTP response: ${normalized.slice(0, 160)}`);
  }

  const headerText = normalized.slice(0, splitAt);
  const body = normalized.slice(splitAt + 2);
  const lines = headerText.split("\n");
  const status = Number(lines[0]?.match(/^HTTP\/\S+\s+(\d+)/)?.[1]);
  const parsedHeaders = new Map();

  for (const line of lines.slice(1)) {
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    const name = line.slice(0, separator).toLowerCase();
    const value = line.slice(separator + 1).trim();
    const previous = parsedHeaders.get(name);
    parsedHeaders.set(name, previous ? `${previous}, ${value}` : value);
  }

  return {
    status,
    body,
    headers: {
      get(name) {
        return parsedHeaders.get(name.toLowerCase()) ?? null;
      },
    },
  };
}

function readJson(res) {
  try {
    return JSON.parse(res.body);
  } catch {
    throw new Error(`Expected JSON response, got: ${res.body.slice(0, 160)}`);
  }
}

function assertNoInternalHost(value, label) {
  assert.doesNotMatch(value, /localhost|don-fiapo-web|don-fiapo-admin|75\.119\.155\.116/i, label);
}

check("web page headers do not leak internal hosts", () => {
  const res = request(`${WEB_ORIGIN}/en`);
  assert.equal(res.status, 200);
  assertNoInternalHost(res.headers.get("link") ?? "", "Link header leaked an internal host");
});

check("CORS allows admin origin exactly on web API", () => {
  const res = request(`${WEB_ORIGIN}/api/games/spin`, {
    method: "OPTIONS",
    headers: {
      Origin: ADMIN_ORIGIN,
      "Access-Control-Request-Method": "GET",
    },
  });

  assert.equal(res.status, 204);
  assert.equal(res.headers.get("access-control-allow-origin"), ADMIN_ORIGIN);
});

check("Twitter OAuth is configured and never redirects to localhost", () => {
  const res = request(`${WEB_ORIGIN}/api/auth/twitter?wallet=${TEST_SOLANA_WALLET}`);
  const location = res.headers.get("location") ?? "";

  assertNoInternalHost(location, "Twitter OAuth redirect leaked an internal host");
  assert.doesNotMatch(location, /x_error=not_configured/, "Twitter credentials are not configured");
});

check("Oracle health is reachable through the web proxy", () => {
  const res = request(`${WEB_ORIGIN}/api/oracle/health`);
  const data = readJson(res);

  assert.equal(res.status, 200);
  assert.equal(data.status, "ok");
});

check("admin public wallets endpoint exposes configured wallets", () => {
  const res = request(`${ADMIN_ORIGIN}/api/admin/wallets/public`, {
    headers: { Origin: WEB_ORIGIN },
  });
  const data = readJson(res);

  assert.equal(res.status, 200);
  assert.notEqual(Object.keys(data).length, 0, "No active system wallets are configured");
});

check("www hostname resolves for the public site", () => {
  const res = request("https://www.donfiapo.fun/en");
  assert.ok([200, 301, 302, 307, 308].includes(res.status), `Unexpected status ${res.status}`);
});

let failures = 0;

for (const { name, fn } of checks) {
  try {
    await fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`not ok - ${name}`);
    console.error(`  ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failures > 0) {
  console.error(`\n${failures} production smoke check(s) failed.`);
  process.exitCode = 1;
} else {
  console.log("\nAll production smoke checks passed.");
}
