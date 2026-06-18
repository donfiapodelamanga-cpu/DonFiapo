// Auditoria 2026-06-18 — alta #10: rate limiting anti brute-force no login admin.
// In-memory (mesma abordagem do oracle-service); para produção multi-instância,
// migrar para store compartilhado (Redis). Funções recebem `now` para testabilidade.

type Bucket = { count: number; resetAt: number; lockUntil: number };

const buckets = new Map<string, Bucket>();
const WINDOW_MS = 60_000; // janela de contagem
const MAX_ATTEMPTS = 5; // tentativas falhas antes do lock
const LOCK_MS = 5 * 60_000; // lockout após estourar

function bucketFor(key: string, now: number): Bucket {
  let b = buckets.get(key);
  if (!b || now > b.resetAt) {
    b = { count: 0, resetAt: now + WINDOW_MS, lockUntil: 0 };
    buckets.set(key, b);
  }
  return b;
}

export function checkLoginRateLimit(key: string, now: number): { allowed: boolean; retryAfterMs: number } {
  const b = bucketFor(key, now);
  if (b.lockUntil > now) return { allowed: false, retryAfterMs: b.lockUntil - now };
  if (b.count >= MAX_ATTEMPTS) {
    b.lockUntil = now + LOCK_MS;
    return { allowed: false, retryAfterMs: LOCK_MS };
  }
  return { allowed: true, retryAfterMs: 0 };
}

export function recordLoginFailure(key: string, now: number): void {
  const b = bucketFor(key, now);
  b.count += 1;
}

export function resetLoginRateLimit(key: string): void {
  buckets.delete(key);
}

// apenas para testes
export function __clearLoginRateLimit(): void {
  buckets.clear();
}
