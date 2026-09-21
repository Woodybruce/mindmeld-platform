import { Router } from 'express';
import { and, asc, eq } from 'drizzle-orm';
// Explicit `/index`: bare `../../shared/schema` resolves to the legacy shared/schema.ts file.
import { householdMembers, renewals } from '../../shared/schema/index';
import { insertRenewalSchema, patchRenewalSchema } from '../../shared/validation/renewals';
import { uuidParam } from '../../shared/validation/household';
import { requireHousehold } from '../middleware/household';
import { dependentBelongsToHousehold } from '../lib/ownership';
import type { Database } from '../db';

async function memberBelongsToHousehold(
  db: Database,
  memberUserId: string,
  householdId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: householdMembers.id })
    .from(householdMembers)
    .where(and(eq(householdMembers.userId, memberUserId), eq(householdMembers.householdId, householdId)));
  return row !== undefined;
}

export function renewalsRouter(db: Database): Router {
  const router = Router();
  const guard = requireHousehold(db);

  router.get('/renewals', guard, async (req, res) => {
    const rows = await db
      .select()
      .from(renewals)
      .where(eq(renewals.householdId, req.householdId!))
      .orderBy(asc(renewals.renewalDate));
    return res.json(rows);
  });

  router.post('/renewals', guard, async (req, res) => {
    const parsed = insertRenewalSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'invalid_body', issues: parsed.error.issues });
    if (
      parsed.data.dependentId !== undefined &&
      !(await dependentBelongsToHousehold(db, parsed.data.dependentId, req.householdId!))
    ) {
      return res.status(400).json({ error: 'invalid_dependent' });
    }
    if (
      parsed.data.memberUserId !== undefined &&
      !(await memberBelongsToHousehold(db, parsed.data.memberUserId, req.householdId!))
    ) {
      return res.status(400).json({ error: 'invalid_member' });
    }
    const [created] = await db
      .insert(renewals)
      .values(Object.assign({}, parsed.data, { householdId: req.householdId! }))
      .returning();
    return res.status(201).json(created);
  });

  router.patch('/renewals/:id', guard, async (req, res) => {
    const id = uuidParam.safeParse(req.params.id);
    if (!id.success) return res.status(400).json({ error: 'invalid_id' });
    const parsed = patchRenewalSchema.safeParse(req.body);
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
    if (
      parsed.data.memberUserId !== undefined &&
      !(await memberBelongsToHousehold(db, parsed.data.memberUserId, req.householdId!))
    ) {
      return res.status(400).json({ error: 'invalid_member' });
    }
    const [updated] = await db
      .update(renewals)
      .set(parsed.data)
      .where(and(eq(renewals.id, id.data), eq(renewals.householdId, req.householdId!)))
      .returning();
    if (!updated) return res.status(404).json({ error: 'not_found' });
    return res.json(updated);
  });

  router.delete('/renewals/:id', guard, async (req, res) => {
    const id = uuidParam.safeParse(req.params.id);
    if (!id.success) return res.status(400).json({ error: 'invalid_id' });
    const [deleted] = await db
      .delete(renewals)
      .where(and(eq(renewals.id, id.data), eq(renewals.householdId, req.householdId!)))
      .returning();
    if (!deleted) return res.status(404).json({ error: 'not_found' });
    return res.status(204).send();
  });

  return router;
}
