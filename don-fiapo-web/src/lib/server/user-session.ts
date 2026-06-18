// Auditoria 2026-06-18 — altas #5/#6: sessão de usuário com proof-of-ownership.
// Cookie httpOnly assinado por HMAC (sem dependência nova). Emitido somente após
// o usuário provar posse da carteira Lunes (assinatura de challenge). As rotas
// sensíveis derivam o userId DAQUI, nunca de uma string `wallet`/`userId` do client.
import { createHmac, timingSafeEqual } from "crypto";
import type { NextRequest, NextResponse } from "next/server";

export const USER_SESSION_COOKIE = "fiapo_user_session";
const TTL_MS = 24 * 60 * 60 * 1000;

function secret(): string {
  const s = process.env.USER_SESSION_SECRET || "";
  if (s.length < 32) {
    throw new Error("USER_SESSION_SECRET ausente ou < 32 caracteres");
  }
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createUserSessionToken(userId: string, now: number = Date.now()): string {
  const body = JSON.stringify({ uid: userId, exp: now + TTL_MS });
  const b64 = Buffer.from(body).toString("base64url");
  return `${b64}.${sign(b64)}`;
}

export function verifyUserSessionToken(
  token: string | undefined | null,
  now: number = Date.now()
): { userId: string } | null {
  if (!token || !token.includes(".")) return null;
  const [b64, sig] = token.split(".");
  if (!b64 || !sig) return null;
  const expected = sign(b64);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(b64, "base64url").toString());
    if (typeof parsed.uid !== "string" || typeof parsed.exp !== "number") return null;
    if (now > parsed.exp) return null;
    return { userId: parsed.uid };
  } catch {
    return null;
  }
}

export function requireUserSession(req: NextRequest): { userId: string } | null {
  return verifyUserSessionToken(req.cookies.get(USER_SESSION_COOKIE)?.value);
}

export function setUserSessionCookie(res: NextResponse, userId: string): void {
  res.cookies.set(USER_SESSION_COOKIE, createUserSessionToken(userId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TTL_MS / 1000,
  });
}
