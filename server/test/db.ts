import { PGlite } from "@electric-sql/pglite";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { fileURLToPath } from "node:url";

const migrationsFolder = fileURLToPath(new URL("../../migrations", import.meta.url));

export type TestDb = PgliteDatabase;

export async function migrateTestDb(db: TestDb): Promise<void> {
  await migrate(db, { migrationsFolder });
}

export async function createTestDb(): Promise<TestDb> {
  const client = new PGlite();
  const db = drizzle(client);
  await migrateTestDb(db);
  return db;
}
