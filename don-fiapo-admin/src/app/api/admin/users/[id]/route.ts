import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { USER_ROLES } from "@/lib/auth-roles";
import { requireAdminAuth } from "@/lib/server/admin-auth";

function sanitizeText(value: unknown, max = 120): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, max);
}

function isValidRole(role: string): boolean {
  return USER_ROLES.some((r) => r.id === role);
}

function isValidStatus(status: string): boolean {
  return status === "active" || status === "suspended";
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = requireAdminAuth(req, "users");
    if (!auth.ok) return auth.response;

    try {
        const { id } = await params;
        const body = await req.json();
        const name = sanitizeText(body?.name, 100);
        const role = sanitizeText(body?.role, 40);
        const status = sanitizeText(body?.status, 20);

        if (!id) {
            return NextResponse.json({ error: "ID inválido" }, { status: 400 });
        }

        const data: Record<string, string> = {};
        if (name) data.name = name;
        if (role) {
            if (!isValidRole(role)) {
                return NextResponse.json({ error: "Role inválida" }, { status: 400 });
            }
            data.role = role;
        }
        if (status) {
            if (!isValidStatus(status)) {
                return NextResponse.json({ error: "Status inválido" }, { status: 400 });
            }
            data.status = status;
        }

        if (Object.keys(data).length === 0) {
            return NextResponse.json({ error: "Nenhum campo para atualizar" }, { status: 400 });
        }

        const user = await prisma.adminUser.update({
            where: { id },
            data,
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
        console.error("Error updating admin user:", error);
        return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = requireAdminAuth(req, "users");
    if (!auth.ok) return auth.response;

    try {
        const { id } = await params;
        if (!id) {
            return NextResponse.json({ error: "ID inválido" }, { status: 400 });
        }

        // Prevent deleting the currently authenticated user (best effort)
        if (auth.session?.id && auth.session.id === id) {
            return NextResponse.json({ error: "Não é permitido remover o usuário logado" }, { status: 400 });
        }

        await prisma.adminUser.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting admin user:", error);
        return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
    }
}
