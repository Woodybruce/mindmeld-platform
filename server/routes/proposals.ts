import { Router } from 'express';
import { and, desc, eq } from 'drizzle-orm';
// Explicit `/index`: bare `../../shared/schema` resolves to the legacy shared/schema.ts file.
import { butlerProposals } from '../../shared/schema/index';
import { proposalPayloadSchema, proposalStatusSchema } from '../../shared/validation/proposals';
import { uuidParam } from '../../shared/validation/household';
import { requireHousehold } from '../middleware/household';
import { applyActions } from '../lib/butler-apply';
import type { Database } from '../db';

export function proposalsRouter(db: Database): Router {
  const router = Router();
  const guard = requireHousehold(db);

  router.get('/butler/proposals', guard, async (req, res) => {
    const householdId = eq(butlerProposals.householdId, req.householdId!);
    if (req.query.status === undefined) {
      const rows = await db
        .select()
        .from(butlerProposals)
        .where(householdId)
        .orderBy(desc(butlerProposals.receivedAt));
      return res.json(rows);
    }
    const status = proposalStatusSchema.safeParse(req.query.status);
    if (!status.success) return res.status(400).json({ error: 'invalid_status' });
    const rows = await db
      .select()
      .from(butlerProposals)
      .where(and(householdId, eq(butlerProposals.status, status.data)))
      .orderBy(desc(butlerProposals.receivedAt));
    return res.json(rows);
  });

  router.post('/butler/proposals/:id/accept', guard, async (req, res) => {
    const id = uuidParam.safeParse(req.params.id);
    if (!id.success) return res.status(400).json({ error: 'invalid_id' });
    // Validate before mutating: the payload is immutable, so parsing it before
    // the claim is race-safe, and an unparseable payload never gets claimed.
    const [proposal] = await db
      .select()
      .from(butlerProposals)
      .where(and(eq(butlerProposals.id, id.data), eq(butlerProposals.householdId, req.householdId!)));
    if (!proposal) return res.status(404).json({ error: 'not_found' });
    if (proposal.status !== 'pending') return res.status(409).json({ error: 'already_resolved' });
    const parsed = proposalPayloadSchema.safeParse(proposal.payload);
    if (!parsed.success) return res.status(409).json({ error: 'invalid_payload' });
    // Claim + apply in one transaction: a mid-apply failure rolls back the
    // claim, leaving the proposal pending and retryable. The status='pending'
    // guard keeps concurrent accepts safe — exactly one wins the claim.
    const result = await db.transaction(async (tx) => {
      const [claimed] = await tx
        .update(butlerProposals)
        .set({ status: 'accepted', resolvedAt: new Date() })
        .where(
          and(
            eq(butlerProposals.id, id.data),
            eq(butlerProposals.householdId, req.householdId!),
            eq(butlerProposals.status, 'pending'),
          ),
        )
        .returning();
      if (!claimed) return null;
      const applied = await applyActions(tx, req.householdId!, parsed.data.actions);
      return { claimed, applied };
    });
    if (!result) {
      const [existing] = await db
        .select({ id: butlerProposals.id })
        .from(butlerProposals)
        .where(and(eq(butlerProposals.id, id.data), eq(butlerProposals.householdId, req.householdId!)));
      if (!existing) return res.status(404).json({ error: 'not_found' });
      return res.status(409).json({ error: 'already_resolved' });
    }
    return res.json({ proposal: result.claimed, applied: result.applied });
  });

  router.post('/butler/proposals/:id/dismiss', guard, async (req, res) => {
    const id = uuidParam.safeParse(req.params.id);
    if (!id.success) return res.status(400).json({ error: 'invalid_id' });
    const [proposal] = await db
      .select()
      .from(butlerProposals)
      .where(and(eq(butlerProposals.id, id.data), eq(butlerProposals.householdId, req.householdId!)));
    if (!proposal) return res.status(404).json({ error: 'not_found' });
    if (proposal.status !== 'pending') return res.status(409).json({ error: 'already_resolved' });
    const [updated] = await db
      .update(butlerProposals)
      .set({ status: 'dismissed', resolvedAt: new Date() })
      .where(eq(butlerProposals.id, proposal.id))
      .returning();
    return res.json(updated);
  });

  return router;
}
