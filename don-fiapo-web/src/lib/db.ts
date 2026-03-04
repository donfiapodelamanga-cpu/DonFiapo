import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "path";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

function getDbUrl(): string {
    const rawUrl = process.env.DATABASE_URL;

    if (!rawUrl || rawUrl.startsWith("file:./")) {
        // Resolve relative path from project root (process.cwd is reliable in Next.js server)
        const absolutePath = path.join(process.cwd(), "prisma", "dev.db");
        return `file:///${absolutePath.replace(/\\/g, "/")}`;
    }

    // Normalise file:/ to file:/// for libsql
    if (rawUrl.startsWith("file:/") && !rawUrl.startsWith("file:///")) {
        return rawUrl.replace(/^file:\/+/, "file:///");
    }

    return rawUrl;
}

function createPrismaClient() {
    const url = getDbUrl();
    // In Prisma 7, PrismaLibSql accepts a { url } config object directly
    const adapter = new PrismaLibSql({ url });
    return new PrismaClient({ adapter, log: process.env.NODE_ENV === "development" ? ["error", "warn"] : [] });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
