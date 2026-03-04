import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getRolePermissions, hasRolePermission } from "@/lib/auth-roles";

const SESSION_COOKIE = "admin_session_token";
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8h

export interface AdminSessionPayload {
  id?: string;
  email: string;
  role: string;
  permissions: string[];
  iat: number;
  exp: number;
}

function base64urlEncode(value: string): string {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64urlDecode(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "===".slice((normalized.length + 3) % 4);
  return Buffer.from(padded, "base64").toString("utf8");
}

function sign(payloadB64: string): string {
  const secret = process.env.ADMIN_SESSION_SECRET || "dev-admin-session-secret-change-me";
  return createHmac("sha256", secret).update(payloadB64).digest("base64url");
}

export function createAdminSessionToken(data: {
  id?: string;
  email: string;
  role: string;
}): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: AdminSessionPayload = {
    id: data.id,
    email: data.email,
    role: data.role,
    permissions: getRolePermissions(data.role),
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  };

  const payloadB64 = base64urlEncode(JSON.stringify(payload));
  const signature = sign(payloadB64);
  return `${payloadB64}.${signature}`;
}

export function verifyAdminSessionToken(token?: string | null): AdminSessionPayload | null {
  if (!token) return null;

  const [payloadB64, receivedSig] = token.split(".");
  if (!payloadB64 || !receivedSig) return null;

  const expectedSig = sign(payloadB64);
  const receivedBuffer = Buffer.from(receivedSig);
  const expectedBuffer = Buffer.from(expectedSig);

  if (receivedBuffer.length !== expectedBuffer.length) return null;
  if (!timingSafeEqual(receivedBuffer, expectedBuffer)) return null;

  try {
    const payload = JSON.parse(base64urlDecode(payloadB64)) as AdminSessionPayload;
    const now = Math.floor(Date.now() / 1000);
    if (!payload.exp || payload.exp < now) return null;
    if (!payload.email || !payload.role) return null;
    return payload;
  } catch {
    return null;
  }
}

export function setAdminSessionCookie(res: NextResponse, token: string) {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearAdminSessionCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function getAuthErrorResponse(message: string, status = 401) {
  return NextResponse.json({ error: message }, { status });
}

export function requireAdminAuth(req: NextRequest, requiredPermission?: string) {
  const adminKey = req.headers.get("x-admin-key") || "";
  const expectedKey = process.env.ADMIN_API_KEY;
  if (!expectedKey || !adminKey || adminKey !== expectedKey) {
    return { ok: false as const, response: getAuthErrorResponse("Unauthorized", 401) };
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = verifyAdminSessionToken(token);
  if (!session) {
    return { ok: false as const, response: getAuthErrorResponse("Session expired or invalid", 401) };
  }

  if (requiredPermission && !hasRolePermission(session.permissions, requiredPermission)) {
    return { ok: false as const, response: getAuthErrorResponse("Forbidden", 403) };
  }

  return { ok: true as const, session };
}
