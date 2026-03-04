import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");
        const category = searchParams.get("category");

        const where: any = {};

        if (startDate || endDate) {
            where.dueDate = {};
            if (startDate) where.dueDate.gte = new Date(startDate);
            if (endDate) where.dueDate.lte = new Date(endDate);
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

export async function POST(req: Request) {
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
