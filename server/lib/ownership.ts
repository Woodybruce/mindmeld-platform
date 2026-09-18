import { and, eq } from 'drizzle-orm';
// Explicit `/index`: bare `../../shared/schema` resolves to the legacy shared/schema.ts file.
import { dependents, lists, schools, holidays } from '../../shared/schema/index';
import type { Database } from '../db';

// Ownership checks for FK fields that must stay within the caller's household.
// Routers use these before writes to stop cross-household references (e.g. a
// task in household A pointing at household B's dependent).
export async function dependentBelongsToHousehold(
  db: Database,
  dependentId: string,
  householdId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: dependents.id })
    .from(dependents)
    .where(and(eq(dependents.id, dependentId), eq(dependents.householdId, householdId)));
  return row !== undefined;
}

export async function listBelongsToHousehold(
  db: Database,
  listId: string,
  householdId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: lists.id })
    .from(lists)
    .where(and(eq(lists.id, listId), eq(lists.householdId, householdId)));
  return row !== undefined;
}

export async function schoolBelongsToHousehold(
  db: Database,
  schoolId: string,
  householdId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: schools.id })
    .from(schools)
    .where(and(eq(schools.id, schoolId), eq(schools.householdId, householdId)));
  return row !== undefined;
}

export async function holidayBelongsToHousehold(
  db: Database,
  holidayId: string,
  householdId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: holidays.id })
    .from(holidays)
    .where(and(eq(holidays.id, holidayId), eq(holidays.householdId, householdId)));
  return row !== undefined;
}
