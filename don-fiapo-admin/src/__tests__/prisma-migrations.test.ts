import { existsSync, readdirSync, readFileSync } from "fs";
import path from "path";

const prismaDir = path.join(process.cwd(), "prisma");

function readAllMigrationSql() {
  const migrationsDir = path.join(prismaDir, "migrations");
  if (!existsSync(migrationsDir)) return "";

  return readdirSync(migrationsDir)
    .map((dir) => path.join(migrationsDir, dir, "migration.sql"))
    .filter((file) => existsSync(file))
    .map((file) => readFileSync(file, "utf8"))
    .join("\n");
}

describe("Prisma migrations", () => {
  it("creates WalletTransaction when the schema declares it", () => {
    const schema = readFileSync(path.join(prismaDir, "schema.prisma"), "utf8");
    const migrations = readAllMigrationSql();

    expect(schema).toMatch(/model\s+WalletTransaction\s+\{/);
    expect(migrations).toMatch(/CREATE TABLE\s+"WalletTransaction"/);
    expect(migrations).toMatch(/CREATE UNIQUE INDEX\s+"WalletTransaction_externalId_key"/);
  });
});
