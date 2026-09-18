import { Router } from 'express';
import { and, eq } from 'drizzle-orm';
// drizzle-zod 0.8 emits zod/v4 schemas; all zod usage here must come from zod/v4.
import { z } from 'zod/v4';
// Explicit `/index`: bare `../../shared/schema` resolves to the legacy shared/schema.ts file.
import {
  dependents,
  households,
  householdMembers,
  MAX_HOUSEHOLD_MEMBERS,
} from '../../shared/schema/index';
import { requireHousehold } from '../middleware/household';
import type { Database } from '../db';

// NOTE: this repo compiles with strictNullChecks off, under which drizzle-zod's
// BuildSchema conditional types collapse to Record<string, never> at the type
// level — so request bodies are validated with explicit zod v4 schemas that
// mirror insertDependentSchema / insertHouseholdSchema from shared/schema.
const createHouseholdBody = z.object({
  name: z.string().min(1),
  displayName: z.string().min(1).optional(),
});
const joinHouseholdBody = z.object({
  householdId: z.uuid(),
  displayName: z.string().min(1).optional(),
});
const postHouseholdBody = z.union([joinHouseholdBody, createHouseholdBody]);

const createDependentBody = z.object({
  name: z.string().min(1),
  dateOfBirth: z.iso.date().optional(),
  yearGroup: z.string().optional(),
  schoolId: z.uuid().optional(),
  notes: z.string().optional(),
});
const patchDependentBody = createDependentBody.partial();

const uuidParam = z.uuid();

export function householdRouter(db: Database): Router {
  const router = Router();
  const guard = requireHousehold(db);

  router.post('/household', async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'unauthenticated' });

    const parsed = postHouseholdBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'invalid_body', issues: parsed.error.issues });

    if ('householdId' in parsed.data) {
      const { householdId, displayName } = parsed.data;
      const [household] = await db.select().from(households).where(eq(households.id, householdId));
      if (!household) return res.status(404).json({ error: 'not_found' });
      const members = await db
        .select()
        .from(householdMembers)
        .where(eq(householdMembers.householdId, householdId));
      if (members.length >= MAX_HOUSEHOLD_MEMBERS) {
        return res.status(409).json({ error: 'household_full' });
      }
      await db
        .insert(householdMembers)
        .values({ householdId, userId, displayName: displayName ?? 'Member' });
      return res.status(200).json(household);
    }

    const { name, displayName } = parsed.data;
    const [household] = await db.insert(households).values({ name }).returning();
    await db
      .insert(householdMembers)
      .values({ householdId: household.id, userId, displayName: displayName ?? name });
    return res.status(201).json(household);
  });

  router.get('/household', guard, async (req, res) => {
    const [household] = await db
      .select()
      .from(households)
      .where(eq(households.id, req.householdId!));
    if (!household) return res.status(404).json({ error: 'not_found' });
    return res.json(household);
  });

  router.get('/dependents', guard, async (req, res) => {
    const rows = await db
      .select()
      .from(dependents)
      .where(eq(dependents.householdId, req.householdId!));
    return res.json(rows);
  });

  router.post('/dependents', guard, async (req, res) => {
    const parsed = createDependentBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'invalid_body', issues: parsed.error.issues });
    const [created] = await db
      .insert(dependents)
      .values(Object.assign({}, parsed.data, { householdId: req.householdId! }))
      .returning();
    return res.status(201).json(created);
  });

  router.patch('/dependents/:id', guard, async (req, res) => {
    const id = uuidParam.safeParse(req.params.id);
    if (!id.success) return res.status(400).json({ error: 'invalid_id' });
    const parsed = patchDependentBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'invalid_body', issues: parsed.error.issues });
    if (Object.keys(parsed.data).length === 0) {
      return res.status(400).json({ error: 'empty_patch' });
    }
    const [updated] = await db
      .update(dependents)
      .set(parsed.data)
      .where(and(eq(dependents.id, id.data), eq(dependents.householdId, req.householdId!)))
      .returning();
    if (!updated) return res.status(404).json({ error: 'not_found' });
    return res.json(updated);
  });

  router.delete('/dependents/:id', guard, async (req, res) => {
    const id = uuidParam.safeParse(req.params.id);
    if (!id.success) return res.status(400).json({ error: 'invalid_id' });
    const [deleted] = await db
      .delete(dependents)
      .where(and(eq(dependents.id, id.data), eq(dependents.householdId, req.householdId!)))
      .returning();
    if (!deleted) return res.status(404).json({ error: 'not_found' });
    return res.status(204).send();
  });

  return router;
}
