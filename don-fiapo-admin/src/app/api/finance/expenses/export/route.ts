import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");

        const where: any = {};

        if (startDate || endDate) {
            where.dueDate = {};
            if (startDate) where.dueDate.gte = new Date(startDate);
            if (endDate) where.dueDate.lte = new Date(endDate);
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
