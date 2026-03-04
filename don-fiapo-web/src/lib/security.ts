/**
 * Security utilities: rate limiting, wallet validation, admin auth.
 * Consolidates security concerns in one place.
 */

import { NextRequest, NextResponse } from "next/server";

// ══════════════════════════════════════════════════════════════
// RATE LIMITER (in-memory, per-instance)
// For production multi-instance, migrate to Redis (@upstash/ratelimit)
// ══════════════════════════════════════════════════════════════

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (entry.resetAt < now) rateLimitStore.delete(key);
  }
}, 5 * 60 * 1000);

/**
 * Simple in-memory rate limiter.
 * @returns null if allowed, or a NextResponse 429 if rate limited.
 */
export function rateLimit(
  identifier: string,
  limit: number,
  windowMs: number
): NextResponse | null {
  const now = Date.now();
  const key = identifier;
  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  entry.count++;
  if (entry.count > limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfter) },
      }
    );
  }

  return null;
}

/**
 * Extract a rate-limit key from a request (IP or wallet).
 */
export function getClientIP(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

// ══════════════════════════════════════════════════════════════
// WALLET VALIDATION
// ══════════════════════════════════════════════════════════════

// Lunes/Substrate SS58 address: starts with 5, 48 chars, base58
const SS58_REGEX = /^5[A-HJ-NP-Za-km-z1-9]{47}$/;

// Solana address: 32-44 chars, base58
const SOLANA_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/**
 * Validates a Lunes (SS58) wallet address format.
 */
export function isValidLunesAddress(address: string): boolean {
  return SS58_REGEX.test(address);
}

/**
 * Validates a Solana wallet address format.
 */
export function isValidSolanaAddress(address: string): boolean {
  return SOLANA_REGEX.test(address);
}

/**
 * Validates wallet address and returns error response if invalid.
 * @returns null if valid, or a NextResponse 400 if invalid.
 */
export function validateWalletOrError(
  wallet: string | undefined | null,
  network: "lunes" | "solana" = "lunes"
): NextResponse | null {
  if (!wallet || typeof wallet !== "string") {
    return NextResponse.json({ error: "wallet is required" }, { status: 400 });
  }

  const isValid = network === "solana"
    ? isValidSolanaAddress(wallet)
    : isValidLunesAddress(wallet);

  if (!isValid) {
    return NextResponse.json(
      { error: `Invalid ${network} wallet address format` },
      { status: 400 }
    );
  }

  return null;
}

// ══════════════════════════════════════════════════════════════
// ADMIN AUTH
// ══════════════════════════════════════════════════════════════

/**
 * Validates admin API key from x-admin-key header.
 */
export function checkAdminAuth(req: NextRequest): boolean {
  const key = process.env.ADMIN_API_KEY;
  if (!key) return false; // No key configured = deny all
  return req.headers.get("x-admin-key") === key;
}

/**
 * Returns 401 response if admin auth fails, null if OK.
 */
export function requireAdmin(req: NextRequest): NextResponse | null {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

// ══════════════════════════════════════════════════════════════
// EMAIL VALIDATION
// ══════════════════════════════════════════════════════════════

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Basic email format validation.
 */
export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email) && email.length <= 254;
}
