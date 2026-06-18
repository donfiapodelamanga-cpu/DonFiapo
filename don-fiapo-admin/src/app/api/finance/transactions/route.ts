import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/server/admin-auth";

export async function GET(req: NextRequest) {
    const auth = requireAdminAuth(req, "finance");
    if (!auth.ok) return auth.response;
    try {
        const transactions = await prisma.transaction.findMany({
            include: {
                wallet: true,
            },
            orderBy: {
                createdAt: "desc",
            },
            take: 20,
        });
        return NextResponse.json(transactions);
    } catch (error) {
        console.error("Error fetching transactions:", error);
        return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const auth = requireAdminAuth(req, "finance");
    if (!auth.ok) return auth.response;
    try {
        const body = await req.json();
        const { type, amount, walletId, description } = body;

        const transaction = await prisma.transaction.create({
            data: {
                type,
                amount: parseFloat(amount),
                walletId,
                description,
                status: "completed", // Simulation: Auto-complete
            },
            include: {
                wallet: true,
            },
        });

        return NextResponse.json(transaction);
    } catch (error) {
        console.error("Error creating transaction:", error);
        return NextResponse.json({ error: "Failed to create transaction" }, { status: 500 });
    }
}
