import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { describe, it } from "node:test";

const repoRoot = new URL("..", import.meta.url);

const textExtensions = new Set([
  "",
  ".cjs",
  ".css",
  ".env",
  ".example",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".prisma",
  ".rs",
  ".sh",
  ".toml",
  ".ts",
  ".tsx",
  ".yml",
  ".yaml",
]);

const trackedFiles = () =>
  execFileSync("git", ["ls-files"], { cwd: repoRoot, encoding: "utf8" })
    .split("\n")
    .filter(Boolean)
    .filter((file) => existsSync(new URL(file, repoRoot)))
    .filter((file) => textExtensions.has(extname(file)) || basename(file).startsWith(".env"));

const readTrackedFile = (file) => readFileSync(new URL(file, repoRoot), "utf8");

const listZipEntries = (archivePath) =>
  execFileSync("unzip", ["-Z", "-1", archivePath], { cwd: repoRoot, encoding: "utf8" })
    .split("\n")
    .filter(Boolean);

const isForbiddenEnvArchiveEntry = (entry) => {
  const name = basename(entry);
  return [".env", ".env.local", ".env.web", ".env.admin", ".env.oracle"].includes(name);
};

describe("production security hygiene", () => {
  it("does not keep literal mnemonic seed phrases in tracked text files", () => {
    const literalMnemonicAssignment = /\b[A-Z0-9_]*(?:MNEMONIC|SEED)[A-Z0-9_]*\s*=\s*["']?[a-z]+(?:\s+[a-z]+){11,}["']?/i;
    const offenders = [];

    for (const file of trackedFiles()) {
      const content = readTrackedFile(file);
      if (literalMnemonicAssignment.test(content)) {
        offenders.push(file);
      }
    }

    assert.deepEqual(offenders, [], `tracked files contain literal mnemonic assignments: ${offenders.join(", ")}`);
  });

  it("does not keep deploy archives with environment files in the repository root", () => {
    const archivePath = join(repoRoot.pathname, "deploy-package.zip");

    if (!existsSync(archivePath)) {
      return;
    }

    const forbiddenEntries = listZipEntries(archivePath).filter(isForbiddenEnvArchiveEntry);
    assert.deepEqual(
      forbiddenEntries,
      [],
      `deploy-package.zip contains environment files: ${forbiddenEntries.join(", ")}`
    );
  });
});
