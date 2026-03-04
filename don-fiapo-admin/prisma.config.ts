import 'dotenv/config';
import path from 'node:path';
import { defineConfig } from 'prisma/config';

// Prisma 7: DB connection URL moved here from schema.prisma
export default defineConfig({
    earlyAccess: true,
    schema: path.join(import.meta.dirname, 'prisma/schema.prisma'),
    datasource: {
        url: process.env.DATABASE_URL ?? 'file:./prisma/dev.db',
    },
});
