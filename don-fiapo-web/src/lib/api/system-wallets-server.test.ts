import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const webRoot = process.cwd();

test("server-side web code does not query a local SystemWallet Prisma model", () => {
  const files = [
    "src/lib/prizes/payout.ts",
    "src/app/api/migration/route.ts",
  ];

  for (const file of files) {
    const content = readFileSync(join(webRoot, file), "utf8");
    assert.doesNotMatch(content, /db\s+as\s+any\)\.systemWallet|\.systemWallet\.find/i, file);
  }
});
