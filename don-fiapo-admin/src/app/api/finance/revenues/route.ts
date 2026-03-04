import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");

        const where: any = {};
        if (startDate || endDate) {
            where.date = {};
            if (startDate) where.date.gte = new Date(startDate);
            if (endDate) where.date.lte = new Date(endDate + "T23:59:59");
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

export async function POST(req: Request) {
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
