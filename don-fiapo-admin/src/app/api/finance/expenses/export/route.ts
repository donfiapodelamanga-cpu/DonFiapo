import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");

        const where: Prisma.ExpenseWhereInput = {};

        if (startDate || endDate) {
            const dueDate: Prisma.DateTimeFilter = {};
            if (startDate) dueDate.gte = new Date(startDate);
            if (endDate) dueDate.lte = new Date(endDate);
            where.dueDate = dueDate;
        }

        const expenses = await prisma.expense.findMany({
            where,
            orderBy: { dueDate: "desc" },
        });

        // Simple CSV conversion
        const headers = ["ID", "Descrição", "Categoria", "Valor", "Moeda", "Vencimento", "Status"];
        const rows = expenses.map(e => [
            e.id,
            e.description,
            e.category,
            e.amount,
            e.currency,
            e.dueDate.toISOString().split("T")[0],
            e.status
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map(row => row.join(","))
        ].join("\n");

        return new NextResponse(csvContent, {
            headers: {
                "Content-Type": "text/csv",
                "Content-Disposition": `attachment; filename="despesas_${new Date().toISOString().split("T")[0]}.csv"`
            }
        });
    } catch (error) {
        console.error("Error exporting expenses:", error);
        return NextResponse.json({ error: "Failed to export data" }, { status: 500 });
    }
}
