import { Router } from 'express';
import { eq, and, inArray } from 'drizzle-orm';
// Explicit `/index`: bare `../../shared/schema` resolves to the legacy shared/schema.ts file.
import { lists, listItems } from '../../shared/schema/index';
import { insertListSchema, insertListItemSchema, patchListItemSchema } from '../../shared/validation/lists';
import { uuidParam } from '../../shared/validation/household';
import { requireHousehold } from '../middleware/household';
import { listBelongsToHousehold } from '../lib/ownership';
import type { Database } from '../db';

export function listsRouter(db: Database): Router {
  const router = Router();
  const guard = requireHousehold(db);

  // Items carry no householdId of their own; scope them through their parent list.
  const itemInHousehold = (householdId: string) =>
    inArray(
      listItems.listId,
      db.select({ id: lists.id }).from(lists).where(eq(lists.householdId, householdId)),
    );

  router.get('/lists', guard, async (req, res) => {
    const rows = await db
      .select()
      .from(lists)
      .where(eq(lists.householdId, req.householdId!));
    return res.json(rows);
  });

  router.post('/lists', guard, async (req, res) => {
    const parsed = insertListSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'invalid_body', issues: parsed.error.issues });
    const [created] = await db
      .insert(lists)
      .values(Object.assign({}, parsed.data, { householdId: req.householdId! }))
      .returning();
    return res.status(201).json(created);
  });

  router.post('/lists/:id/items', guard, async (req, res) => {
    const id = uuidParam.safeParse(req.params.id);
    if (!id.success) return res.status(400).json({ error: 'invalid_id' });
    const parsed = insertListItemSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'invalid_body', issues: parsed.error.issues });
    if (!(await listBelongsToHousehold(db, id.data, req.householdId!))) {
      return res.status(404).json({ error: 'not_found' });
    }
    const [created] = await db
      .insert(listItems)
      .values({ listId: id.data, text: parsed.data.text, addedByUserId: req.userId })
      .returning();
    return res.status(201).json(created);
  });

  router.patch('/items/:id', guard, async (req, res) => {
    const id = uuidParam.safeParse(req.params.id);
    if (!id.success) return res.status(400).json({ error: 'invalid_id' });
    const parsed = patchListItemSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'invalid_body', issues: parsed.error.issues });
    if (Object.keys(parsed.data).length === 0) {
      return res.status(400).json({ error: 'empty_patch' });
    }
    const [updated] = await db
      .update(listItems)
      .set(parsed.data)
      .where(and(eq(listItems.id, id.data), itemInHousehold(req.householdId!)))
      .returning();
    if (!updated) return res.status(404).json({ error: 'not_found' });
    return res.json(updated);
  });

  router.delete('/items/:id', guard, async (req, res) => {
    const id = uuidParam.safeParse(req.params.id);
    if (!id.success) return res.status(400).json({ error: 'invalid_id' });
    const [deleted] = await db
      .delete(listItems)
      .where(and(eq(listItems.id, id.data), itemInHousehold(req.householdId!)))
      .returning();
    if (!deleted) return res.status(404).json({ error: 'not_found' });
    return res.status(204).send();
  });

  return router;
}
