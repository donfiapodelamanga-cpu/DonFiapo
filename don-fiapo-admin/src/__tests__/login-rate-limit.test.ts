import { POST } from "../app/api/auth/login/route";
import prisma from "../lib/prisma";
import { checkLoginRateLimit, recordLoginFailure, __clearLoginRateLimit } from "../lib/server/login-rate-limit";

// Auditoria 2026-06-18 — alta #10: rate limiting no login admin.
jest.mock("../lib/prisma", () => ({
  __esModule: true,
  default: { adminUser: { findUnique: jest.fn(), update: jest.fn() } },
}));

const mp = prisma as unknown as { adminUser: { findUnique: jest.Mock; update: jest.Mock } };
const req = (email: string, password: string) => ({
  json: async () => ({ email, password }),
  headers: { get: (h: string) => (h === "x-forwarded-for" ? "9.9.9.9" : null) },
} as any);

describe("login rate limit (#10)", () => {
  beforeEach(() => { jest.clearAllMocks(); __clearLoginRateLimit(); });

  it("helper: permite 5 tentativas e bloqueia a partir da 6ª", () => {
    const k = "ip:email"; const now = 1000;
    for (let i = 0; i < 5; i++) {
      expect(checkLoginRateLimit(k, now).allowed).toBe(true);
      recordLoginFailure(k, now);
    }
    const blocked = checkLoginRateLimit(k, now);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it("rota: 6ª tentativa inválida do mesmo IP/email retorna 429", async () => {
    mp.adminUser.findUnique.mockResolvedValue(null);
    for (let i = 0; i < 5; i++) {
      const r = await POST(req("attacker@x.com", "wrongpass123"));
      expect(r.status).toBe(401);
    }
    const blocked = await POST(req("attacker@x.com", "wrongpass123"));
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toBeTruthy();
  });
});
