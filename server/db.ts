import { drizzle } from "drizzle-orm/node-postgres";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import pg from "pg";
import * as schema from "@shared/schema";

// Driver-agnostic drizzle database type: satisfied by both the production
// node-postgres db below and the PGlite db used in tests.
export type Database = PgDatabase<PgQueryResultHKT, Record<string, unknown>>;

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });
