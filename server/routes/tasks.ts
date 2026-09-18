import { Router } from 'express';
import { and, eq } from 'drizzle-orm';
// Explicit `/index`: bare `../../shared/schema` resolves to the legacy shared/schema.ts file.
import { tasks } from '../../shared/schema/index';
import { insertTaskSchema, patchTaskSchema } from '../../shared/validation/tasks';
import { uuidParam } from '../../shared/validation/household';
import { requireHousehold } from '../middleware/household';
import { dependentBelongsToHousehold } from '../lib/ownership';
import type { Database } from '../db';

export function tasksRouter(db: Database): Router {
  const router = Router();
  const guard = requireHousehold(db);

  router.get('/tasks', guard, async (req, res) => {
    const rows = await db
      .select()
      .from(tasks)
      .where(eq(tasks.householdId, req.householdId!));
    return res.json(rows);
  });

  router.post('/tasks', guard, async (req, res) => {
    const parsed = insertTaskSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'invalid_body', issues: parsed.error.issues });
    if (
      parsed.data.dependentId !== undefined &&
      !(await dependentBelongsToHousehold(db, parsed.data.dependentId, req.householdId!))
    ) {
      return res.status(400).json({ error: 'invalid_dependent' });
    }
    const [created] = await db
      .insert(tasks)
      .values(Object.assign({}, parsed.data, { householdId: req.householdId! }))
      .returning();
    return res.status(201).json(created);
  });

  router.patch('/tasks/:id', guard, async (req, res) => {
    const id = uuidParam.safeParse(req.params.id);
    if (!id.success) return res.status(400).json({ error: 'invalid_id' });
    const parsed = patchTaskSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'invalid_body', issues: parsed.error.issues });
    if (Object.keys(parsed.data).length === 0) {
      return res.status(400).json({ error: 'empty_patch' });
    }
    if (
      parsed.data.dependentId !== undefined &&
      !(await dependentBelongsToHousehold(db, parsed.data.dependentId, req.householdId!))
    ) {
      return res.status(400).json({ error: 'invalid_dependent' });
    }
    const [updated] = await db
      .update(tasks)
      .set(parsed.data)
      .where(and(eq(tasks.id, id.data), eq(tasks.householdId, req.householdId!)))
      .returning();
    if (!updated) return res.status(404).json({ error: 'not_found' });
    return res.json(updated);
  });

  router.delete('/tasks/:id', guard, async (req, res) => {
    const id = uuidParam.safeParse(req.params.id);
    if (!id.success) return res.status(400).json({ error: 'invalid_id' });
    const [deleted] = await db
      .delete(tasks)
      .where(and(eq(tasks.id, id.data), eq(tasks.householdId, req.householdId!)))
      .returning();
    if (!deleted) return res.status(404).json({ error: 'not_found' });
    return res.status(204).send();
  });

  router.post('/tasks/:id/complete', guard, async (req, res) => {
    const id = uuidParam.safeParse(req.params.id);
    if (!id.success) return res.status(400).json({ error: 'invalid_id' });
    const [updated] = await db
      .update(tasks)
      .set({ status: 'done' })
      .where(and(eq(tasks.id, id.data), eq(tasks.householdId, req.householdId!)))
      .returning();
    if (!updated) return res.status(404).json({ error: 'not_found' });
    return res.json(updated);
  });

  return router;
}
