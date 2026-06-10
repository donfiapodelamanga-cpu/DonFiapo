export class WebApiConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebApiConfigError";
  }
}

export interface WebApiConfigInput {
  webApiUrl?: string | null;
  adminApiKey?: string | null;
  nodeEnv?: string | null;
}

export interface WebApiHeadersInput extends WebApiConfigInput {
  headers?: HeadersInit;
}

const PRODUCTION_WEB_API = "https://donfiapo.fun";
const DEVELOPMENT_WEB_API = "http://localhost:3000";

function isProduction(nodeEnv?: string | null): boolean {
  return (nodeEnv ?? process.env.NODE_ENV) === "production";
}

function normalizeBaseUrl(rawUrl: string): string {
  const url = new URL(rawUrl.trim());
  return url.pathname === "/" ? url.origin : `${url.origin}${url.pathname.replace(/\/$/, "")}`;
}

export function resolveWebApiBaseUrl(input: WebApiConfigInput = {}): string {
  const configuredUrl = input.webApiUrl ?? process.env.WEB_API_URL;
  if (configuredUrl?.trim()) {
    return normalizeBaseUrl(configuredUrl);
  }

  return isProduction(input.nodeEnv) ? PRODUCTION_WEB_API : DEVELOPMENT_WEB_API;
}

export function buildWebApiUrl(path: string, input: WebApiConfigInput = {}): string {
  const baseUrl = resolveWebApiBaseUrl(input);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

export function createWebApiHeaders(input: WebApiHeadersInput = {}): Headers {
  const headers = new Headers(input.headers);
  const adminApiKey = input.adminApiKey ?? process.env.ADMIN_API_KEY;

  if (!adminApiKey?.trim()) {
    if (isProduction(input.nodeEnv)) {
      throw new WebApiConfigError("ADMIN_API_KEY is required for protected web API proxy calls in production");
    }
    return headers;
  }

  headers.set("x-admin-key", adminApiKey.trim());
  return headers;
}

export async function fetchWebApi(
  path: string,
  init: RequestInit = {},
  options: WebApiConfigInput & { protected?: boolean } = {},
): Promise<Response> {
  const protectedRoute = options.protected ?? true;
  const headers = protectedRoute
    ? createWebApiHeaders({ ...options, headers: init.headers })
    : new Headers(init.headers);

  return fetch(buildWebApiUrl(path, options), {
    ...init,
    headers,
  });
}

export function webApiProxyErrorStatus(error: unknown): number {
  return error instanceof WebApiConfigError ? 500 : 502;
}

export function webApiProxyErrorMessage(error: unknown, fallback = "Failed to connect to web API"): string {
  return error instanceof WebApiConfigError ? error.message : fallback;
}
