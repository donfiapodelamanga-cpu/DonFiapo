export interface PublicOriginInput {
  configuredOrigin?: string | null;
  requestUrl?: string | URL | null;
  forwardedProto?: string | null;
  forwardedHost?: string | null;
  host?: string | null;
  nodeEnv?: string | null;
}

export interface CorsOriginsInput {
  appUrl?: string | null;
  adminUrl?: string | null;
  nodeEnv?: string | null;
}

const PRODUCTION_APP_ORIGIN = "https://donfiapo.fun";
const PRODUCTION_ADMIN_ORIGIN = "https://admin.donfiapo.fun";
const DEVELOPMENT_APP_ORIGIN = "http://localhost:3000";
const DEVELOPMENT_ADMIN_ORIGIN = "http://localhost:3002";

function isProduction(nodeEnv?: string | null): boolean {
  return (nodeEnv ?? process.env.NODE_ENV) === "production";
}

function firstForwardedValue(value?: string | null): string | null {
  return value?.split(",")[0]?.trim() || null;
}

function parseOrigin(value?: string | URL | null): string | null {
  if (!value) return null;

  try {
    const url = value instanceof URL ? value : new URL(String(value).trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

function originFromHost(proto?: string | null, host?: string | null): string | null {
  const cleanHost = firstForwardedValue(host);
  if (!cleanHost) return null;

  const cleanProto = firstForwardedValue(proto) ?? "https";
  const protocol = cleanProto === "http" || cleanProto === "https" ? cleanProto : "https";
  return parseOrigin(`${protocol}://${cleanHost}`);
}

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return false;

  const [a, b] = parts;
  return a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254);
}

function isInternalHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return (
    normalized === "localhost" ||
    normalized === "0.0.0.0" ||
    normalized === "::1" ||
    normalized.endsWith(".local") ||
    isPrivateIpv4(normalized) ||
    !normalized.includes(".")
  );
}

function isAllowedPublicOrigin(origin: string | null, nodeEnv?: string | null): origin is string {
  if (!origin) return false;
  if (!isProduction(nodeEnv)) return true;

  try {
    const hostname = new URL(origin).hostname;
    return !isInternalHostname(hostname);
  } catch {
    return false;
  }
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

export function resolvePublicOrigin(input: PublicOriginInput = {}): string {
  const nodeEnv = input.nodeEnv;
  const candidates = [
    parseOrigin(input.configuredOrigin),
    originFromHost(input.forwardedProto, input.forwardedHost),
    originFromHost(input.forwardedProto, input.host),
    parseOrigin(input.requestUrl),
  ];

  const publicOrigin = candidates.find((origin) => isAllowedPublicOrigin(origin, nodeEnv));
  if (publicOrigin) return publicOrigin;

  return isProduction(nodeEnv) ? PRODUCTION_APP_ORIGIN : DEVELOPMENT_APP_ORIGIN;
}

export function buildPublicUrl(path: string, input: PublicOriginInput = {}): string {
  const origin = resolvePublicOrigin(input);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${origin}${normalizedPath}`;
}

export function resolveAllowedCorsOrigins(input: CorsOriginsInput = {}): string[] {
  const nodeEnv = input.nodeEnv;
  const fallbackAppOrigin = isProduction(nodeEnv) ? PRODUCTION_APP_ORIGIN : DEVELOPMENT_APP_ORIGIN;
  const fallbackAdminOrigin = isProduction(nodeEnv) ? PRODUCTION_ADMIN_ORIGIN : DEVELOPMENT_ADMIN_ORIGIN;

  const origins = [
    parseOrigin(input.appUrl),
    parseOrigin(input.adminUrl),
    fallbackAppOrigin,
    fallbackAdminOrigin,
  ].filter((origin): origin is string => isAllowedPublicOrigin(origin, nodeEnv));

  return unique(origins);
}

export function resolveAdminOrigin(input: { configuredOrigin?: string | null; nodeEnv?: string | null } = {}): string {
  const configuredOrigin = parseOrigin(input.configuredOrigin);
  if (isAllowedPublicOrigin(configuredOrigin, input.nodeEnv)) {
    return configuredOrigin;
  }

  return isProduction(input.nodeEnv) ? PRODUCTION_ADMIN_ORIGIN : DEVELOPMENT_ADMIN_ORIGIN;
}

export function resolveCorsOrigin(
  requestOrigin: string | null | undefined,
  options: { allowedOrigins: string[] },
): string | null {
  const origin = parseOrigin(requestOrigin);
  if (!origin) return null;

  return options.allowedOrigins.includes(origin) ? origin : null;
}

export function publicOriginInputFromHeaders(
  requestUrl: string | URL,
  headers: Pick<Headers, "get">,
  configuredOrigin = process.env.NEXT_PUBLIC_APP_URL,
): PublicOriginInput {
  return {
    configuredOrigin,
    requestUrl,
    forwardedProto: headers.get("x-forwarded-proto"),
    forwardedHost: headers.get("x-forwarded-host"),
    host: headers.get("host"),
    nodeEnv: process.env.NODE_ENV,
  };
}
