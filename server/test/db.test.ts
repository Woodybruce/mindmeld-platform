import { describe, it, expect } from "vitest";
import { sql } from "drizzle-orm";
import { createTestDb } from "./db";

describe("test db", () => {
  it("runs migrations and answers queries", async () => {
    const db = await createTestDb();
    const rows = await db.execute(sql`select 1 as one`);
    expect(rows.rows[0].one).toBe(1);
  });
});
