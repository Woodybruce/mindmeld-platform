import { Router } from 'express';
import { and, asc, eq } from 'drizzle-orm';
// Explicit `/index`: bare `../../shared/schema` resolves to the legacy shared/schema.ts file.
import { schools, schoolEvents, tasks } from '../../shared/schema/index';
import { insertSchoolSchema, patchSchoolSchema, insertSchoolEventSchema } from '../../shared/validation/schools';
import { uuidParam } from '../../shared/validation/household';
import { requireHousehold } from '../middleware/household';
import { dependentBelongsToHousehold } from '../lib/ownership';
import type { Database } from '../db';

export function schoolsRouter(db: Database): Router {
  const router = Router();
  const guard = requireHousehold(db);

  router.get('/schools', guard, async (req, res) => {
    const rows = await db
      .select()
      .from(schools)
      .where(eq(schools.householdId, req.householdId!));
    return res.json(rows);
  });

  router.post('/schools', guard, async (req, res) => {
    const parsed = insertSchoolSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'invalid_body', issues: parsed.error.issues });
    const [created] = await db
      .insert(schools)
      .values(Object.assign({}, parsed.data, { householdId: req.householdId! }))
      .returning();
    return res.status(201).json(created);
  });

  router.patch('/schools/:id', guard, async (req, res) => {
    const id = uuidParam.safeParse(req.params.id);
    if (!id.success) return res.status(400).json({ error: 'invalid_id' });
    const parsed = patchSchoolSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'invalid_body', issues: parsed.error.issues });
    if (Object.keys(parsed.data).length === 0) {
      return res.status(400).json({ error: 'empty_patch' });
    }
    const [updated] = await db
      .update(schools)
      .set(parsed.data)
      .where(and(eq(schools.id, id.data), eq(schools.householdId, req.householdId!)))
      .returning();
    if (!updated) return res.status(404).json({ error: 'not_found' });
    return res.json(updated);
  });

  router.delete('/schools/:id', guard, async (req, res) => {
    const id = uuidParam.safeParse(req.params.id);
    if (!id.success) return res.status(400).json({ error: 'invalid_id' });
    const [deleted] = await db
      .delete(schools)
      .where(and(eq(schools.id, id.data), eq(schools.householdId, req.householdId!)))
      .returning();
    if (!deleted) return res.status(404).json({ error: 'not_found' });
    return res.status(204).send();
  });

  router.get('/schools/:id/events', guard, async (req, res) => {
    const id = uuidParam.safeParse(req.params.id);
    if (!id.success) return res.status(400).json({ error: 'invalid_id' });
    const [school] = await db
      .select({ id: schools.id })
      .from(schools)
      .where(and(eq(schools.id, id.data), eq(schools.householdId, req.householdId!)));
    if (!school) return res.status(404).json({ error: 'not_found' });
    const rows = await db
      .select()
      .from(schoolEvents)
      .where(eq(schoolEvents.schoolId, id.data))
      .orderBy(asc(schoolEvents.date));
    return res.json(rows);
  });

  router.post('/schools/:id/events', guard, async (req, res) => {
    const id = uuidParam.safeParse(req.params.id);
    if (!id.success) return res.status(400).json({ error: 'invalid_id' });
    const parsed = insertSchoolEventSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'invalid_body', issues: parsed.error.issues });
    const [school] = await db
      .select()
      .from(schools)
      .where(and(eq(schools.id, id.data), eq(schools.householdId, req.householdId!)));
    if (!school) return res.status(404).json({ error: 'not_found' });
    if (
      parsed.data.dependentId !== undefined &&
      !(await dependentBelongsToHousehold(db, parsed.data.dependentId, req.householdId!))
    ) {
      return res.status(400).json({ error: 'invalid_dependent' });
    }
    // autoTask: create the school_event and its task atomically. The generated
    // task sets source 'school' with dueDate = the event date, satisfying the
    // create-time rule "dueDate required when source is school".
    const created = await db.transaction(async (tx) => {
      const [ev] = await tx
        .insert(schoolEvents)
        .values(Object.assign({}, parsed.data, { schoolId: school.id }))
        .returning();
      if (parsed.data.autoTask) {
        await tx.insert(tasks).values({
          householdId: req.householdId!,
          title: `${ev.title} (${school.name})`,
          dueDate: ev.date,
          source: 'school',
          dependentId: ev.dependentId ?? undefined,
        });
      }
      return ev;
    });
    return res.status(201).json(created);
  });

  return router;
}
