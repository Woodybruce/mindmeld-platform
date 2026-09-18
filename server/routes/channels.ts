import { Router } from 'express';
import { asc, eq } from 'drizzle-orm';
// Explicit `/index`: bare `../../shared/schema` resolves to the legacy shared/schema.ts file.
import { channels, channelMessages } from '../../shared/schema/index';
import { insertChannelMessageSchema } from '../../shared/validation/butler';
import { uuidParam } from '../../shared/validation/household';
import { requireHousehold } from '../middleware/household';
import { channelBelongsToHousehold } from '../lib/ownership';
import type { Database } from '../db';

export function channelsRouter(db: Database): Router {
  const router = Router();
  const guard = requireHousehold(db);

  router.get('/channels', guard, async (req, res) => {
    const rows = await db
      .select()
      .from(channels)
      .where(eq(channels.householdId, req.householdId!));
    return res.json(rows);
  });

  router.get('/channels/:id/messages', guard, async (req, res) => {
    const id = uuidParam.safeParse(req.params.id);
    if (!id.success) return res.status(400).json({ error: 'invalid_id' });
    if (!(await channelBelongsToHousehold(db, id.data, req.householdId!))) {
      return res.status(404).json({ error: 'not_found' });
    }
    const rows = await db
      .select()
      .from(channelMessages)
      .where(eq(channelMessages.channelId, id.data))
      .orderBy(asc(channelMessages.createdAt));
    return res.json(rows);
  });

  router.post('/channels/:id/messages', guard, async (req, res) => {
    const id = uuidParam.safeParse(req.params.id);
    if (!id.success) return res.status(400).json({ error: 'invalid_id' });
    const parsed = insertChannelMessageSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'invalid_body', issues: parsed.error.issues });
    if (!(await channelBelongsToHousehold(db, id.data, req.householdId!))) {
      return res.status(404).json({ error: 'not_found' });
    }
    // senderUserId null = the butler; a non-null sender must be the caller.
    const senderUserId = parsed.data.senderUserId ?? null;
    if (senderUserId !== null && senderUserId !== req.userId) {
      return res.status(403).json({ error: 'forbidden_sender' });
    }
    const [created] = await db
      .insert(channelMessages)
      .values({ channelId: id.data, senderUserId, body: parsed.data.body })
      .returning();
    return res.status(201).json(created);
  });

  return router;
}
