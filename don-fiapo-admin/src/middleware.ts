import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "admin_session_token";
const PUBLIC_ADMIN_PATHS = new Set(["/api/admin/wallets/public"]);

function base64urlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64urlDecode(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "===".slice((normalized.length + 3) % 4);
  return atob(padded);
}

async function sign(payloadB64: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64));
  return base64urlEncode(new Uint8Array(signature));
}

async function hasValidAdminSession(req: NextRequest): Promise<boolean> {
  const secret = process.env.ADMIN_SESSION_SECRET?.trim();
  if (!secret) return false;

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return false;

  const [payloadB64, receivedSig] = token.split(".");
  if (!payloadB64 || !receivedSig) return false;

  const expectedSig = await sign(payloadB64, secret);
  if (expectedSig !== receivedSig) return false;

  try {
    const payload = JSON.parse(base64urlDecode(payloadB64)) as {
      email?: string;
      role?: string;
      exp?: number;
    };

    const now = Math.floor(Date.now() / 1000);
    return !!payload.email && !!payload.role && !!payload.exp && payload.exp >= now;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isAdminApiPath = pathname.startsWith("/api/admin/");
  const isFinanceApiPath = pathname.startsWith("/api/finance/");

  if (isAdminApiPath && PUBLIC_ADMIN_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  if (await hasValidAdminSession(req)) {
    return NextResponse.next();
  }

  if (isAdminApiPath || isFinanceApiPath) {
    return NextResponse.json({ error: "Session expired or invalid" }, { status: 401 });
  }

  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = {
  matcher: [
    "/api/admin/:path*",
    "/api/finance/:path*",
    "/((?!login|api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
