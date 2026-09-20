import { Router } from 'express';
import { and, asc, eq, gt, sql } from 'drizzle-orm';
// Explicit `/index`: bare `../../shared/schema` resolves to the legacy shared/schema.ts file.
import { channels, channelMessages, householdMembers } from '../../shared/schema/index';
import { insertChannelMessageSchema } from '../../shared/validation/butler';
import { uuidParam } from '../../shared/validation/household';
import { requireHousehold } from '../middleware/household';
import { channelBelongsToHousehold } from '../lib/ownership';
import { isButlerAddressed, respondToButler } from '../lib/butler-chat';
import type { Database } from '../db';

export function channelsRouter(db: Database): Router {
  const router = Router();
  const guard = requireHousehold(db);

  router.get('/channels', guard, async (req, res) => {
    const rows = await db
      .select()
      .from(channels)
      .where(eq(channels.householdId, req.householdId!));
    // Group bubbles need sender display names, so members ride along.
    const members = await db
      .select({ userId: householdMembers.userId, displayName: householdMembers.displayName })
      .from(householdMembers)
      .where(eq(householdMembers.householdId, req.householdId!));
    return res.json({ channels: rows, members });
  });

  router.get('/channels/:id/messages', guard, async (req, res) => {
    const id = uuidParam.safeParse(req.params.id);
    if (!id.success) return res.status(400).json({ error: 'invalid_id' });
    if (!(await channelBelongsToHousehold(db, id.data, req.householdId!))) {
      return res.status(404).json({ error: 'not_found' });
    }
    let where = eq(channelMessages.channelId, id.data);
    const after = typeof req.query.after === 'string' ? req.query.after : undefined;
    if (after !== undefined) {
      const afterDate = new Date(after);
      if (Number.isNaN(afterDate.getTime())) {
        return res.status(400).json({ error: 'invalid_after' });
      }
      where = and(where, gt(channelMessages.createdAt, afterDate))!;
    }
    const rows = await db
      .select()
      .from(channelMessages)
      .where(where)
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
    const messageType = parsed.data.messageType ?? 'text';
    if (messageType === 'image' && !parsed.data.imageUrl) {
      return res.status(400).json({ error: 'image_url_required' });
    }
    if (messageType === 'text' && parsed.data.imageUrl) {
      return res.status(400).json({ error: 'image_url_forbidden' });
    }
    if (parsed.data.replyToId !== undefined) {
      const [parent] = await db
        .select({ channelId: channelMessages.channelId })
        .from(channelMessages)
        .where(eq(channelMessages.id, parsed.data.replyToId));
      if (!parent || parent.channelId !== id.data) {
        return res.status(400).json({ error: 'invalid_reply_to' });
      }
    }
    const [created] = await db
      .insert(channelMessages)
      .values({
        channelId: id.data,
        senderUserId,
        body: parsed.data.body,
        replyToId: parsed.data.replyToId,
        messageType,
        imageUrl: parsed.data.imageUrl,
      })
      .returning();
    // Fire-and-forget: the reply (if the butler is addressed) appears on the
    // client's next poll; respondToButler never throws.
    if (senderUserId !== null && isButlerAddressed(parsed.data.body)) {
      const householdId = req.householdId!;
      const userText = parsed.data.body;
      setImmediate(() => {
        void respondToButler(db, householdId, userText);
      });
    }
    return res.status(201).json(created);
  });

  router.post('/channels/:id/read', guard, async (req, res) => {
    const id = uuidParam.safeParse(req.params.id);
    if (!id.success) return res.status(400).json({ error: 'invalid_id' });
    if (!(await channelBelongsToHousehold(db, id.data, req.householdId!))) {
      return res.status(404).json({ error: 'not_found' });
    }
    const userId = req.userId!;
    // Single UPDATE: jsonb-append the caller to every message that lacks them.
    const marked = await db
      .update(channelMessages)
      .set({
        readBy: sql`coalesce(${channelMessages.readBy}, '[]'::jsonb) || to_jsonb(${userId}::text)`,
      })
      .where(
        and(
          eq(channelMessages.channelId, id.data),
          sql`not (coalesce(${channelMessages.readBy}, '[]'::jsonb) ? ${userId})`,
        ),
      )
      .returning({ id: channelMessages.id });
    return res.json({ marked: marked.length });
  });

  return router;
}
