import { NextResponse, type NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/server/admin-auth";

export async function GET(req: NextRequest) {
    const auth = requireAdminAuth(req, "finance");
    if (!auth.ok) return auth.response;
    try {
        const { searchParams } = new URL(req.url);
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");
        const category = searchParams.get("category");

        const where: Prisma.ExpenseWhereInput = {};

        if (startDate || endDate) {
            const dueDate: Prisma.DateTimeFilter = {};
            if (startDate) dueDate.gte = new Date(startDate);
            if (endDate) dueDate.lte = new Date(endDate);
            where.dueDate = dueDate;
        }

        if (category && category !== "all") {
            where.category = category;
        }

        const expenses = await prisma.expense.findMany({
            where,
            orderBy: { dueDate: "desc" },
        });

        return NextResponse.json(expenses);
    } catch (error) {
        console.error("Error fetching expenses:", error);
        return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const auth = requireAdminAuth(req, "finance");
    if (!auth.ok) return auth.response;
    try {
        const body = await req.json();
        const { description, category, amount, currency, dueDate, status } = body;

        const expense = await prisma.expense.create({
            data: {
                description,
                category,
                amount: parseFloat(amount),
                currency: currency || "USD",
                dueDate: new Date(dueDate),
                status: status || "pending",
            },
        });

        return NextResponse.json(expense);
    } catch (error) {
        console.error("Error creating expense:", error);
        return NextResponse.json({ error: "Failed to create expense" }, { status: 500 });
    }
}
