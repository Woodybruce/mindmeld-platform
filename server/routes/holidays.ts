import { Router } from 'express';
import { and, asc, eq } from 'drizzle-orm';
// Explicit `/index`: bare `../../shared/schema` resolves to the legacy shared/schema.ts file.
import { holidays, holidayItems, tasks } from '../../shared/schema/index';
import {
  insertHolidaySchema,
  patchHolidaySchema,
  insertHolidayItemSchema,
  patchHolidayItemSchema,
} from '../../shared/validation/holidays';
import { uuidParam } from '../../shared/validation/household';
import { requireHousehold } from '../middleware/household';
import { holidayBelongsToHousehold } from '../lib/ownership';
import type { Database } from '../db';

type HolidayItemKind = 'booking' | 'packing' | 'admin' | 'other';

const DEFAULT_CHECKLIST: Array<{ text: string; kind: HolidayItemKind }> = [
  { text: 'Book flights', kind: 'booking' },
  { text: 'Book accommodation', kind: 'booking' },
  { text: 'Travel insurance', kind: 'admin' },
  { text: 'Check passports', kind: 'admin' },
  { text: 'Packing list', kind: 'packing' },
];

export function holidaysRouter(db: Database): Router {
  const router = Router();
  const guard = requireHousehold(db);

  router.get('/holidays', guard, async (req, res) => {
    const rows = await db
      .select()
      .from(holidays)
      .where(eq(holidays.householdId, req.householdId!));
    return res.json(rows);
  });

  router.post('/holidays', guard, async (req, res) => {
    const parsed = insertHolidaySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'invalid_body', issues: parsed.error.issues });
    const [created] = await db
      .insert(holidays)
      .values(Object.assign({}, parsed.data, { householdId: req.householdId! }))
      .returning();
    return res.status(201).json(created);
  });

  router.patch('/holidays/:id', guard, async (req, res) => {
    const id = uuidParam.safeParse(req.params.id);
    if (!id.success) return res.status(400).json({ error: 'invalid_id' });
    const parsed = patchHolidaySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'invalid_body', issues: parsed.error.issues });
    if (Object.keys(parsed.data).length === 0) {
      return res.status(400).json({ error: 'empty_patch' });
    }
    const [updated] = await db
      .update(holidays)
      .set(parsed.data)
      .where(and(eq(holidays.id, id.data), eq(holidays.householdId, req.householdId!)))
      .returning();
    if (!updated) return res.status(404).json({ error: 'not_found' });
    return res.json(updated);
  });

  router.delete('/holidays/:id', guard, async (req, res) => {
    const id = uuidParam.safeParse(req.params.id);
    if (!id.success) return res.status(400).json({ error: 'invalid_id' });
    const [deleted] = await db
      .delete(holidays)
      .where(and(eq(holidays.id, id.data), eq(holidays.householdId, req.householdId!)))
      .returning();
    if (!deleted) return res.status(404).json({ error: 'not_found' });
    return res.status(204).send();
  });

  router.get('/holidays/:id/items', guard, async (req, res) => {
    const id = uuidParam.safeParse(req.params.id);
    if (!id.success) return res.status(400).json({ error: 'invalid_id' });
    if (!(await holidayBelongsToHousehold(db, id.data, req.householdId!))) {
      return res.status(404).json({ error: 'not_found' });
    }
    const rows = await db
      .select()
      .from(holidayItems)
      .where(eq(holidayItems.holidayId, id.data))
      .orderBy(asc(holidayItems.createdAt));
    return res.json(rows);
  });

  router.post('/holidays/:id/items', guard, async (req, res) => {
    const id = uuidParam.safeParse(req.params.id);
    if (!id.success) return res.status(400).json({ error: 'invalid_id' });
    const parsed = insertHolidayItemSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'invalid_body', issues: parsed.error.issues });
    if (!(await holidayBelongsToHousehold(db, id.data, req.householdId!))) {
      return res.status(404).json({ error: 'not_found' });
    }
    const [created] = await db
      .insert(holidayItems)
      .values(Object.assign({}, parsed.data, { holidayId: id.data }))
      .returning();
    return res.status(201).json(created);
  });

  router.patch('/holidays/:id/items/:itemId', guard, async (req, res) => {
    const id = uuidParam.safeParse(req.params.id);
    if (!id.success) return res.status(400).json({ error: 'invalid_id' });
    const itemId = uuidParam.safeParse(req.params.itemId);
    if (!itemId.success) return res.status(400).json({ error: 'invalid_id' });
    const parsed = patchHolidayItemSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'invalid_body', issues: parsed.error.issues });
    if (Object.keys(parsed.data).length === 0) {
      return res.status(400).json({ error: 'empty_patch' });
    }
    if (!(await holidayBelongsToHousehold(db, id.data, req.householdId!))) {
      return res.status(404).json({ error: 'not_found' });
    }
    const [updated] = await db
      .update(holidayItems)
      .set(parsed.data)
      .where(and(eq(holidayItems.id, itemId.data), eq(holidayItems.holidayId, id.data)))
      .returning();
    if (!updated) return res.status(404).json({ error: 'not_found' });
    return res.json(updated);
  });

  // generate-checklist: create the default checklist as holiday_items and
  // matching tasks (source 'holiday', dueDate = holiday startsAt) atomically.
  // Idempotent: items whose text already exists for this holiday are skipped.
  router.post('/holidays/:id/generate-checklist', guard, async (req, res) => {
    const id = uuidParam.safeParse(req.params.id);
    if (!id.success) return res.status(400).json({ error: 'invalid_id' });
    const [holiday] = await db
      .select()
      .from(holidays)
      .where(and(eq(holidays.id, id.data), eq(holidays.householdId, req.householdId!)));
    if (!holiday) return res.status(404).json({ error: 'not_found' });

    const created = await db.transaction(async (tx) => {
      const existing = await tx
        .select({ text: holidayItems.text })
        .from(holidayItems)
        .where(eq(holidayItems.holidayId, holiday.id));
      const existingTexts = new Set(existing.map((row) => row.text));
      const toCreate = DEFAULT_CHECKLIST.filter((item) => !existingTexts.has(item.text));
      for (const item of toCreate) {
        await tx.insert(holidayItems).values({
          holidayId: holiday.id,
          text: item.text,
          kind: item.kind,
        });
        await tx.insert(tasks).values({
          householdId: req.householdId!,
          title: `${item.text} (${holiday.destination})`,
          dueDate: holiday.startsAt,
          source: 'holiday',
        });
      }
      return toCreate.length;
    });
    return res.status(201).json({ created });
  });

  return router;
}
