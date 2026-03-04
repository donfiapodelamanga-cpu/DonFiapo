import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "path";

function getDbUrl(): string {
    const rawUrl = process.env.DATABASE_URL;

    if (!rawUrl || rawUrl.startsWith("file:./")) {
        // Resolve relative path — use process.cwd() (reliable in Next.js, avoids Turbopack __dirname issues)
        const absolutePath = path.join(process.cwd(), "prisma", "dev.db");
        return `file:///${absolutePath.replace(/\\/g, "/")}`;
    }

    // Normalise file:/ → file:/// for libsql compatibility
    if (rawUrl.startsWith("file:/") && !rawUrl.startsWith("file:///")) {
        return rawUrl.replace(/^file:\/+/, "file:///");
    }

    return rawUrl;
}

function prismaClientSingleton() {
    const url = getDbUrl();
    // Prisma 7: PrismaLibSql accepts { url } config object directly (NOT a createClient() instance)
    const adapter = new PrismaLibSql({ url });
    return new PrismaClient({ adapter });
}

declare global {
    var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;
