// drizzle-zod 0.8 emits zod/v4 schemas; all zod usage here must come from zod/v4.
import { z } from 'zod/v4';

// NOTE: this repo compiles with strictNullChecks off, under which drizzle-zod's
// BuildSchema conditional types collapse to Record<string, never> at the type
// level — so request bodies are validated with explicit zod v4 schemas that
// mirror insertHouseholdSchema / insertDependentSchema from shared/schema.

export const createHouseholdBody = z.object({
  name: z.string().min(1),
  displayName: z.string().min(1).optional(),
});

export const joinHouseholdBody = z.object({
  householdId: z.uuid(),
  displayName: z.string().min(1).optional(),
});

export const postHouseholdBody = z.union([joinHouseholdBody, createHouseholdBody]);

export const createDependentBody = z.object({
  name: z.string().min(1),
  dateOfBirth: z.iso.date().optional(),
  yearGroup: z.string().optional(),
  schoolId: z.uuid().optional(),
  notes: z.string().optional(),
});

export const patchDependentBody = createDependentBody.partial();

export const uuidParam = z.uuid();
