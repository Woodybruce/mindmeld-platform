import { Router } from 'express';
import { and, eq, gt, lt } from 'drizzle-orm';
// Explicit `/index`: bare `../../shared/schema` resolves to the legacy shared/schema.ts file.
import { events } from '../../shared/schema/index';
import { insertEventSchema, patchEventSchema, eventRangeQuery } from '../../shared/validation/events';
import { uuidParam } from '../../shared/validation/household';
import { requireHousehold } from '../middleware/household';
import { dependentBelongsToHousehold } from '../lib/ownership';
import type { Database } from '../db';

export function eventsRouter(db: Database): Router {
  const router = Router();
  const guard = requireHousehold(db);

  router.get('/events', guard, async (req, res) => {
    const query = eventRangeQuery.safeParse(req.query);
    if (!query.success) return res.status(400).json({ error: 'invalid_query', issues: query.error.issues });
    const { from, to } = query.data;
    // Overlap semantics: an event is in the window when it starts before `to`
    // and ends after `from` — so multi-day events starting before `from` match.
    const rows = await db
      .select()
      .from(events)
      .where(
        and(
          eq(events.householdId, req.householdId!),
          from !== undefined ? gt(events.endsAt, new Date(from)) : undefined,
          to !== undefined ? lt(events.startsAt, new Date(to)) : undefined,
        ),
      )
      .orderBy(events.startsAt);
    return res.json(rows);
  });

  router.post('/events', guard, async (req, res) => {
    const parsed = insertEventSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'invalid_body', issues: parsed.error.issues });
    if (
      parsed.data.dependentId !== undefined &&
      !(await dependentBelongsToHousehold(db, parsed.data.dependentId, req.householdId!))
    ) {
      return res.status(400).json({ error: 'invalid_dependent' });
    }
    const { startsAt, endsAt, ...rest } = parsed.data;
    const [created] = await db
      .insert(events)
      .values(
        Object.assign({}, rest, {
          householdId: req.householdId!,
          startsAt: new Date(startsAt),
          endsAt: new Date(endsAt),
        }),
      )
      .returning();
    return res.status(201).json(created);
  });

  router.patch('/events/:id', guard, async (req, res) => {
    const id = uuidParam.safeParse(req.params.id);
    if (!id.success) return res.status(400).json({ error: 'invalid_id' });
    const parsed = patchEventSchema.safeParse(req.body);
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
    // When only one of startsAt/endsAt is patched, check the merged times
    // against the existing row so a patch cannot create endsAt <= startsAt.
    const { startsAt, endsAt, ...rest } = parsed.data;
    const setValues: Partial<typeof events.$inferInsert> = Object.assign({}, rest);
    if (startsAt !== undefined) setValues.startsAt = new Date(startsAt);
    if (endsAt !== undefined) setValues.endsAt = new Date(endsAt);
    if (startsAt !== undefined || endsAt !== undefined) {
      const [existing] = await db
        .select()
        .from(events)
        .where(and(eq(events.id, id.data), eq(events.householdId, req.householdId!)));
      if (!existing) return res.status(404).json({ error: 'not_found' });
      const mergedStartsAt = startsAt !== undefined ? new Date(startsAt) : existing.startsAt;
      const mergedEndsAt = endsAt !== undefined ? new Date(endsAt) : existing.endsAt;
      if (mergedEndsAt <= mergedStartsAt) return res.status(400).json({ error: 'invalid_body', issues: [{ message: 'endsAt must be after startsAt', path: ['endsAt'] }] });
    }
    const [updated] = await db
      .update(events)
      .set(setValues)
      .where(and(eq(events.id, id.data), eq(events.householdId, req.householdId!)))
      .returning();
    if (!updated) return res.status(404).json({ error: 'not_found' });
    return res.json(updated);
  });

  router.delete('/events/:id', guard, async (req, res) => {
    const id = uuidParam.safeParse(req.params.id);
    if (!id.success) return res.status(400).json({ error: 'invalid_id' });
    const [deleted] = await db
      .delete(events)
      .where(and(eq(events.id, id.data), eq(events.householdId, req.householdId!)))
      .returning();
    if (!deleted) return res.status(404).json({ error: 'not_found' });
    return res.status(204).send();
  });

  return router;
}
