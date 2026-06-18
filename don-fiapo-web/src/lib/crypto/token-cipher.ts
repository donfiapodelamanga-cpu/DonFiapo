import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

/**
 * Criptografia em repouso de tokens OAuth do X (access/refresh).
 *
 * Auditoria 2026-06-18 (media): tokens eram gravados em texto puro no banco.
 * Usamos AES-256-GCM (confidencialidade + integridade autenticada). O formato
 * armazenado e `enc:v1:<iv>:<tag>:<ciphertext>` em base64. Valores sem o prefixo
 * `enc:v1:` sao tratados como legado em texto puro (passthrough) para permitir
 * migracao gradual: o proximo refresh do token o re-grava ja criptografado.
 */

const PREFIX = "enc:v1:";
const ALGO = "aes-256-gcm";
const IV_BYTES = 12; // recomendado para GCM

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = process.env.X_TOKEN_ENCRYPTION_KEY;
  if (!raw || raw.length < 32) {
    throw new Error(
      "X_TOKEN_ENCRYPTION_KEY ausente ou fraca (minimo 32 caracteres) — necessaria para criptografar tokens X.",
    );
  }
  // Deriva uma chave de 32 bytes deterministica a partir do segredo do ambiente.
  cachedKey = scryptSync(raw, "donfiapo-x-token-cipher-v1", 32);
  return cachedKey;
}

export function isEncrypted(value: string): boolean {
  return value.startsWith(PREFIX);
}

export function encryptToken(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return (
    PREFIX +
    [iv, tag, ciphertext].map((b) => b.toString("base64")).join(":")
  );
}

export function decryptToken(stored: string): string {
  // Legado: valores gravados antes da criptografia nao tem prefixo.
  if (!isEncrypted(stored)) return stored;

  const parts = stored.split(":");
  // ["enc", "v1", <iv>, <tag>, <ciphertext>]
  if (parts.length !== 5) {
    throw new Error("Token criptografado em formato invalido.");
  }
  const iv = Buffer.from(parts[2], "base64");
  const tag = Buffer.from(parts[3], "base64");
  const ciphertext = Buffer.from(parts[4], "base64");

  const decipher = createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

/** Conveniencia para campos opcionais (null/undefined passam direto). */
export function encryptTokenNullable(value: string | null | undefined): string | null {
  return value == null ? null : encryptToken(value);
}

export function decryptTokenNullable(value: string | null | undefined): string | null {
  return value == null ? null : decryptToken(value);
}
