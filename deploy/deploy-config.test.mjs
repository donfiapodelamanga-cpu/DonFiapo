import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("production deploy configuration", () => {
  it("runs web, admin, oracle and nginx in the same compose network", () => {
    const compose = read("./docker-compose.yml");

    assert.match(compose, /^\s+don-fiapo-web:\s*$/m);
    assert.match(compose, /^\s+don-fiapo-admin:\s*$/m);
    assert.match(compose, /container_name:\s+don-fiapo-admin/);
    assert.match(compose, /env_file:\n\s+- \.env\.admin/);
    assert.match(compose, /don_fiapo_admin_db:/);
  });

  it("routes public web/admin domains while keeping Oracle behind the web proxy", () => {
    const nginx = read("./nginx/conf.d/donfiapo.conf");

    assert.match(nginx, /server_name\s+donfiapo\.fun\s+www\.donfiapo\.fun;/);
    assert.match(nginx, /server_name\s+admin\.donfiapo\.fun;/);
    assert.match(nginx, /proxy_pass\s+http:\/\/don-fiapo-admin:3002;/);
    assert.doesNotMatch(nginx, /location\s+\/api\/oracle\/[\s\S]*?proxy_pass\s+http:\/\/don-fiapo-oracle:3001/);
  });

  it("redirects unknown hosts and direct IP access to the canonical web domain", () => {
    const nginx = read("./nginx/conf.d/donfiapo.conf");

    assert.match(nginx, /listen\s+80\s+default_server;/);
    assert.match(nginx, /listen\s+443\s+ssl\s+default_server;/);
    assert.match(nginx, /server_name\s+_;/);
    assert.match(nginx, /return\s+301\s+https:\/\/donfiapo\.fun\$request_uri;/);
  });

  it("generates matching production secrets and internal service URLs", () => {
    const deploy = read("./deploy.sh");

    assert.match(deploy, /API_KEY=\$\(openssl rand -hex 32\)/);
    assert.match(deploy, /ADMIN_API_KEY=\$\(openssl rand -hex 32\)/);
    assert.match(deploy, /NEXT_PUBLIC_APP_URL=https:\/\/donfiapo\.fun/);
    assert.match(deploy, /NEXT_PUBLIC_ADMIN_URL=https:\/\/admin\.donfiapo\.fun/);
    assert.match(deploy, /ORACLE_SERVICE_URL=http:\/\/don-fiapo-oracle:3001/);
    assert.match(deploy, /ORACLE_API_KEY=\$\{API_KEY\}/);
    assert.match(deploy, /ADMIN_API_KEY=\$\{ADMIN_API_KEY\}/);
    assert.match(deploy, /WEB_API_URL=http:\/\/don-fiapo-web:3000/);
    assert.match(deploy, /cat > \.env\.admin << EOF/);
    assert.match(deploy, /api\/admin\/wallets\/seed-templates/);
    assert.match(deploy, /x-admin-key/);
    assert.doesNotMatch(deploy, /NEXT_PUBLIC_ORACLE_URL=http:\/\/75\.119\.155\.116\/api\/oracle/);
    assert.doesNotMatch(deploy, /\|\|\s+echo.*failed/i, "deploy must fail hard when database setup fails");
  });

  it("does not hardcode third-party API keys in deploy manifests", () => {
    const files = [
      "./deploy.sh",
      "./setup.sh",
      "./docker-compose.yml",
      "./nginx/conf.d/donfiapo.conf",
      "./README.md",
    ];

    for (const file of files) {
      const content = read(file);
      assert.doesNotMatch(content, /api-key=/i, `${file} contains an inline API key`);
      assert.doesNotMatch(content, /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i, `${file} contains a UUID-like secret`);
    }
  });

  it("documents the live fun domains for certificate setup", () => {
    const setup = read("./setup.sh");
    const readme = read("./README.md");

    for (const content of [setup, readme]) {
      assert.match(content, /donfiapo\.fun/);
      assert.match(content, /admin\.donfiapo\.fun/);
      assert.doesNotMatch(content, /donfiapo\.com/);
    }
  });
});
