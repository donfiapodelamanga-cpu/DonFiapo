import { signRawMessage } from "@/lib/web3/lunes";

// Auditoria #5 — integração frontend: garante uma sessão de usuário (cookie httpOnly)
// provando posse da carteira Lunes antes das ações protegidas (spin, migração, etc.).
// Reusa o mesmo par signRawMessage <-> verifyLunesWalletSignature do wallet-link.

const SESSION_FLAG = "fiapo_session_addr";
let inFlight: Promise<void> | null = null;

export async function ensureUserSession(lunesAddress: string): Promise<void> {
  if (typeof window !== "undefined" && sessionStorage.getItem(SESSION_FLAG) === lunesAddress) {
    return; // sessão já estabelecida nesta aba para este endereço
  }
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const timestamp = Date.now();
    const message = `Don Fiapo Login\nAddress: ${lunesAddress}\nTimestamp: ${timestamp}`;
    const signature = await signRawMessage(lunesAddress, message);

    const res = await fetch("/api/user/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lunesAddress, timestamp, signature }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error || "Falha ao iniciar sessão");
    }
    if (typeof window !== "undefined") sessionStorage.setItem(SESSION_FLAG, lunesAddress);
  })().finally(() => {
    inFlight = null;
  });

  return inFlight;
}

export function clearUserSessionFlag(): void {
  if (typeof window !== "undefined") sessionStorage.removeItem(SESSION_FLAG);
}
