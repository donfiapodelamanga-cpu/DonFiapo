export interface OracleProxyConfigInput {
  oracleUrl?: string | null;
  oracleKey?: string | null;
  nodeEnv?: string | null;
}

export interface OracleProxyConfig {
  valid: boolean;
  url: string;
  apiKey: string;
  errors: string[];
}

const DEVELOPMENT_ORACLE_URL = "http://localhost:3001";
const ALLOWED_PATH_PREFIXES = [
  "health",
  "api/payment",
  "api/prices",
  "api/status",
  "api/spin",
];

function isProduction(nodeEnv?: string | null): boolean {
  return (nodeEnv ?? process.env.NODE_ENV) === "production";
}

function normalizeOracleUrl(value?: string | null): string {
  const rawUrl = value?.trim() || DEVELOPMENT_ORACLE_URL;
  return rawUrl.replace(/\/+$/, "");
}

function isLocalhostUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
}

function hasValidHttpProtocol(url: string): boolean {
  try {
    const protocol = new URL(url).protocol;
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

export function isOracleProxyPathAllowed(path: string): boolean {
  if (path.includes("..")) return false;
  return ALLOWED_PATH_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export function resolveOracleProxyConfig(input: OracleProxyConfigInput = {}): OracleProxyConfig {
  const url = normalizeOracleUrl(input.oracleUrl ?? process.env.ORACLE_SERVICE_URL);
  const apiKey = (input.oracleKey ?? process.env.ORACLE_API_KEY ?? "").trim();
  const errors: string[] = [];

  if (!hasValidHttpProtocol(url)) {
    errors.push("ORACLE_SERVICE_URL must be a valid http(s) URL");
  }

  if (isProduction(input.nodeEnv)) {
    if (isLocalhostUrl(url)) {
      errors.push("ORACLE_SERVICE_URL must be a public or internal service URL in production");
    }

    if (!apiKey) {
      errors.push("ORACLE_API_KEY is required in production");
    }
  }

  return {
    valid: errors.length === 0,
    url,
    apiKey,
    errors,
  };
}

export function buildOracleProxyUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}
