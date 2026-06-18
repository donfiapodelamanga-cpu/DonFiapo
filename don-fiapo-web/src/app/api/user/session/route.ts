import { NextRequest, NextResponse } from "next/server";

import { getClientIP, rateLimit, validateWalletOrError } from "@/lib/security";
import { verifyLunesWalletSignature } from "@/lib/wallets/wallet-link-proof";
import { findOrCreateUserByWallet } from "@/lib/missions/service";
import { setUserSessionCookie } from "@/lib/server/user-session";

const LOGIN_TTL_MS = 5 * 60 * 1000;

/**
 * POST /api/user/session
 * Proof-of-ownership login (auditoria #5): o usuário assina, com a carteira Lunes,
 * uma mensagem canônica contendo um timestamp recente. Após verificar a assinatura,
 * emitimos um cookie de sessão httpOnly. As rotas sensíveis derivam o userId da
 * sessão — nunca de uma string `wallet` não autenticada do request.
 *
 * Body: { lunesAddress, timestamp, signature }
 * Mensagem assinada: `Don Fiapo Login\nAddress: <lunesAddress>\nTimestamp: <ts>`
 */
export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit(`user-login:${getClientIP(req)}`, 20, 60_000);
    if (limited) return limited;

    const body = await req.json();
    const { lunesAddress, timestamp, signature } = body;

    if (!lunesAddress || !timestamp || !signature) {
      return NextResponse.json(
        { error: "lunesAddress, timestamp e signature são obrigatórios" },
        { status: 400 }
      );
    }

    const walletError = validateWalletOrError(lunesAddress, "lunes");
    if (walletError) return walletError;

    const ts = Number(timestamp);
    if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > LOGIN_TTL_MS) {
      return NextResponse.json({ error: "Timestamp ausente ou expirado" }, { status: 401 });
    }

    const message = `Don Fiapo Login\nAddress: ${lunesAddress}\nTimestamp: ${ts}`;
    const valid = await verifyLunesWalletSignature({ message, signature, lunesAddress });
    if (!valid) {
      return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
    }

    const userId = await findOrCreateUserByWallet(lunesAddress);
    const res = NextResponse.json({ success: true, userId });
    setUserSessionCookie(res, userId);
    return res;
  } catch (error) {
    console.error("[USER_SESSION_LOGIN]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
