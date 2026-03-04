import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const SCRYPT_KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;

  const salt = parts[1];
  const expectedHash = parts[2];

  const derivedKey = scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex");

  const derivedBuffer = Buffer.from(derivedKey, "hex");
  const expectedBuffer = Buffer.from(expectedHash, "hex");

  if (derivedBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(derivedBuffer, expectedBuffer);
}
