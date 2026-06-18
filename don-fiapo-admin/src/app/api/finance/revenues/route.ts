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

        const where: Prisma.RevenueWhereInput = {};
        if (startDate || endDate) {
            const date: Prisma.DateTimeFilter = {};
            if (startDate) date.gte = new Date(startDate);
            if (endDate) date.lte = new Date(endDate + "T23:59:59");
            where.date = date;
        }

        const revenues = await prisma.revenue.findMany({
            where,
            orderBy: { date: "desc" },
        });

        return NextResponse.json(revenues);
    } catch (error) {
        console.error("Error fetching revenues:", error);
        return NextResponse.json({ error: "Failed to fetch revenues" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const auth = requireAdminAuth(req, "finance");
    if (!auth.ok) return auth.response;
    try {
        const body = await req.json();
        const { description, category, source, amount, currency, status, date } = body;

        const revenue = await prisma.revenue.create({
            data: {
                description,
                category: category || "Outros",
                source: source || null,
                amount: parseFloat(amount),
                currency: currency || "USDT",
                status: status || "confirmed",
                date: date ? new Date(date) : new Date(),
            },
        });

        return NextResponse.json(revenue);
    } catch (error) {
        console.error("Error creating revenue:", error);
        return NextResponse.json({ error: "Failed to create revenue" }, { status: 500 });
    }
}
