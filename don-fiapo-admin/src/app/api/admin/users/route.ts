import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { USER_ROLES } from "@/lib/auth-roles";
import { requireAdminAuth } from "@/lib/server/admin-auth";
import { hashPassword } from "@/lib/server/password";

function sanitizeText(value: unknown, max = 120): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, max);
}

function normalizeEmail(value: unknown): string {
  return sanitizeText(value, 255).toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidRole(role: string): boolean {
  return USER_ROLES.some((r) => r.id === role);
}

export async function GET(req: NextRequest) {
    const auth = requireAdminAuth(req, "users");
    if (!auth.ok) return auth.response;

    try {
        const users = await prisma.adminUser.findMany({
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                status: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        return NextResponse.json(users);
    } catch (error) {
        console.error("Error fetching admin users:", error);
        return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const auth = requireAdminAuth(req, "users");
    if (!auth.ok) return auth.response;

    try {
        const body = await req.json();
        const email = normalizeEmail(body?.email);
        const name = sanitizeText(body?.name, 100);
        const role = sanitizeText(body?.role, 40);
        const password = typeof body?.password === "string" ? body.password : "";

        if (!email || !name || !role || !password) {
            return NextResponse.json({ error: "Nome, email, role e senha são obrigatórios" }, { status: 400 });
        }
        if (!isValidEmail(email)) {
            return NextResponse.json({ error: "Email inválido" }, { status: 400 });
        }
        if (!isValidRole(role)) {
            return NextResponse.json({ error: "Role inválida" }, { status: 400 });
        }
        if (password.length < 10) {
            return NextResponse.json({ error: "Senha deve ter no mínimo 10 caracteres" }, { status: 400 });
        }

        const existing = await prisma.adminUser.findUnique({ where: { email } });
        if (existing) {
            return NextResponse.json({ error: "Email já cadastrado" }, { status: 409 });
        }

        const user = await prisma.adminUser.create({
            data: {
                email,
                name,
                role,
                status: "active",
                passwordHash: hashPassword(password),
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                status: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        return NextResponse.json(user);
    } catch (error) {
        console.error("Error creating admin user:", error);
        return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
    }
}
