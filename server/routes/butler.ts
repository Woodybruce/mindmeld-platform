import { Router } from 'express';
import { and, eq } from 'drizzle-orm';
// Explicit `/index`: bare `../../shared/schema` resolves to the legacy shared/schema.ts file.
import { butlerMemory } from '../../shared/schema/index';
import { insertButlerMemorySchema } from '../../shared/validation/butler';
import { uuidParam } from '../../shared/validation/household';
import { requireHousehold } from '../middleware/household';
import type { Database } from '../db';

export function butlerRouter(db: Database): Router {
  const router = Router();
  const guard = requireHousehold(db);

  router.get('/butler/memory', guard, async (req, res) => {
    const rows = await db
      .select()
      .from(butlerMemory)
      .where(eq(butlerMemory.householdId, req.householdId!));
    return res.json(rows);
  });

  router.post('/butler/memory', guard, async (req, res) => {
    const parsed = insertButlerMemorySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'invalid_body', issues: parsed.error.issues });
    // Keys are unique per household (also enforced by
    // butler_memory_household_key_unique as the race-safe backstop).
    const [existing] = await db
      .select({ id: butlerMemory.id })
      .from(butlerMemory)
      .where(and(eq(butlerMemory.householdId, req.householdId!), eq(butlerMemory.key, parsed.data.key)));
    if (existing) return res.status(409).json({ error: 'duplicate_key' });
    const [created] = await db
      .insert(butlerMemory)
      .values(Object.assign({}, parsed.data, { householdId: req.householdId! }))
      .returning();
    return res.status(201).json(created);
  });

  router.delete('/butler/memory/:id', guard, async (req, res) => {
    const id = uuidParam.safeParse(req.params.id);
    if (!id.success) return res.status(400).json({ error: 'invalid_id' });
    const [deleted] = await db
      .delete(butlerMemory)
      .where(and(eq(butlerMemory.id, id.data), eq(butlerMemory.householdId, req.householdId!)))
      .returning();
    if (!deleted) return res.status(404).json({ error: 'not_found' });
    return res.status(204).send();
  });

  return router;
}
