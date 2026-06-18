import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getRoleById } from "@/lib/auth-roles";
import { createAdminSessionToken, setAdminSessionCookie } from "@/lib/server/admin-auth";
import { verifyPassword } from "@/lib/server/password";
import { checkLoginRateLimit, recordLoginFailure, resetLoginRateLimit } from "@/lib/server/login-rate-limit";

function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const email = typeof body?.email === "string" ? normalizeEmail(body.email) : "";
        const password = typeof body?.password === "string" ? body.password : "";

        // Validate input
        if (!email || !password) {
            return NextResponse.json(
                { error: "Email e senha são obrigatórios" },
                { status: 400 }
            );
        }
        if (!isValidEmail(email)) {
            return NextResponse.json({ error: "Email inválido" }, { status: 400 });
        }
        if (password.length < 8) {
            return NextResponse.json({ error: "Senha inválida" }, { status: 400 });
        }

        // Rate limiting anti brute-force (auditoria #10), por IP + email.
        const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
        const rlKey = `${ip}:${email}`;
        const now = Date.now();
        const rl = checkLoginRateLimit(rlKey, now);
        if (!rl.allowed) {
            return NextResponse.json(
                { error: "Muitas tentativas. Tente novamente mais tarde." },
                { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
            );
        }

        // 1) DB-backed admin login (preferred)
        const dbUser = await prisma.adminUser.findUnique({ where: { email } });
        if (dbUser) {
            if (dbUser.status !== "active") {
                return NextResponse.json({ error: "Usuário suspenso" }, { status: 403 });
            }
            if (!dbUser.passwordHash || !verifyPassword(password, dbUser.passwordHash)) {
                recordLoginFailure(rlKey, now);
                return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
            }
            resetLoginRateLimit(rlKey);

            const roleDef = getRoleById(dbUser.role);
            const token = createAdminSessionToken({ id: dbUser.id, email: dbUser.email, role: dbUser.role });

            await prisma.adminUser.update({
                where: { id: dbUser.id },
                data: { lastLoginAt: new Date() },
            });

            const response = NextResponse.json({
                success: true,
                user: {
                    id: dbUser.id,
                    email: dbUser.email,
                    role: dbUser.role,
                    roleName: roleDef?.name || dbUser.role,
                    permissions: roleDef?.permissions || [],
                    loginAt: new Date().toISOString(),
                },
            });
            setAdminSessionCookie(response, token);
            return response;
        }

        // 2) Environment bootstrap admin fallback
        const validEmail = process.env.ADMIN_EMAIL;
        const validPassword = process.env.ADMIN_PASSWORD;

        if (email === validEmail && password === validPassword) {
            resetLoginRateLimit(rlKey);
            const token = createAdminSessionToken({
                id: "env-admin",
                email: validEmail,
                role: "admin_geral",
            });

            const response = NextResponse.json({
                success: true,
                user: {
                    id: "env-admin",
                    email: validEmail,
                    role: "admin_geral",
                    roleName: "Administrador Geral",
                    permissions: ["all"],
                    loginAt: new Date().toISOString(),
                },
            });
            setAdminSessionCookie(response, token);
            return response;
        }

        recordLoginFailure(rlKey, now);
        return NextResponse.json(
            { error: "Credenciais inválidas" },
            { status: 401 }
        );
    } catch {
        return NextResponse.json(
            { error: "Erro interno do servidor" },
            { status: 500 }
        );
    }
}
