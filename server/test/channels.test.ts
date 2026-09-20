import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import { eq } from 'drizzle-orm';
import { createTestDb, type TestDb } from './db';
import { householdRouter } from '../routes/household';
import { channelsRouter } from '../routes/channels';
import { channelMessages, channels } from '../../shared/schema/index';

function app(db: TestDb, userId?: string): Express {
  const a = express();
  a.use(express.json());
  a.use((req, _res, next) => {
    if (userId !== undefined) req.userId = userId; // fake auth
    next();
  });
  a.use('/api', householdRouter(db));
  a.use('/api', channelsRouter(db));
  return a;
}

async function householdChannelId(a: Express): Promise<string> {
  const res = await request(a).get('/api/channels');
  return res.body.channels.find((c: { type: string }) => c.type === 'household').id;
}

describe('channels routes: members, reply-to, images, read receipts', () => {
  let db: TestDb;
  let a1: Express;
  let a2: Express;
  let channelId: string;

  beforeEach(async () => {
    db = await createTestDb();
    a1 = app(db, 'u1');
    a2 = app(db, 'u2');
    const h = await request(a1).post('/api/household').send({ name: 'Bruce', displayName: 'Alex' });
    await request(a2).post('/api/household').send({ householdId: h.body.id, displayName: 'Sam' });
    channelId = await householdChannelId(a1);
  });

  it('GET /channels returns channels plus household members (userId + displayName)', async () => {
    const res = await request(a1).get('/api/channels');
    expect(res.status).toBe(200);
    expect(res.body.channels).toHaveLength(1);
    expect(res.body.channels[0].id).toBe(channelId);
    expect(res.body.members).toEqual(
      expect.arrayContaining([
        { userId: 'u1', displayName: 'Alex' },
        { userId: 'u2', displayName: 'Sam' },
      ]),
    );
    // The other member sees the same channels and members.
    const res2 = await request(a2).get('/api/channels');
    expect(res2.body.channels[0].id).toBe(channelId);
    expect(res2.body.members).toEqual(res.body.members);
  });

  it('persists replyToId / messageType / imageUrl and defaults messageType/readBy', async () => {
    const first = await request(a1)
      .post(`/api/channels/${channelId}/messages`)
      .send({ body: 'Dinner at 7?' });
    expect(first.status).toBe(201);
    expect(first.body.messageType).toBe('text');
    expect(first.body.imageUrl).toBeNull();
    expect(first.body.replyToId).toBeNull();
    expect(first.body.readBy).toEqual([]);

    const reply = await request(a2)
      .post(`/api/channels/${channelId}/messages`)
      .send({ body: 'Yes!', replyToId: first.body.id });
    expect(reply.status).toBe(201);
    expect(reply.body.replyToId).toBe(first.body.id);

    const msgs = await request(a1).get(`/api/channels/${channelId}/messages`);
    expect(msgs.body).toHaveLength(2);
    expect(msgs.body[1].replyToId).toBe(first.body.id);
    expect(msgs.body[1].messageType).toBe('text');
  });

  it('accepts image messages with imageUrl and rejects invalid combinations', async () => {
    const ok = await request(a1)
      .post(`/api/channels/${channelId}/messages`)
      .send({ body: 'Look at this', messageType: 'image', imageUrl: 'https://example.com/pic.jpg' });
    expect(ok.status).toBe(201);
    expect(ok.body.messageType).toBe('image');
    expect(ok.body.imageUrl).toBe('https://example.com/pic.jpg');

    // image without imageUrl → 400
    const noUrl = await request(a1)
      .post(`/api/channels/${channelId}/messages`)
      .send({ body: 'Missing url', messageType: 'image' });
    expect(noUrl.status).toBe(400);

    // text with imageUrl → 400
    const textWithUrl = await request(a1)
      .post(`/api/channels/${channelId}/messages`)
      .send({ body: 'Sneaky', imageUrl: 'https://example.com/pic.jpg' });
    expect(textWithUrl.status).toBe(400);

    // unknown messageType → 400 (zod enum)
    const badType = await request(a1)
      .post(`/api/channels/${channelId}/messages`)
      .send({ body: 'Nope', messageType: 'video' });
    expect(badType.status).toBe(400);
  });

  it('rejects replyToId pointing at another channel or a missing message with 400', async () => {
    const [other] = await db
      .insert(channels)
      .values({ householdId: (await db.select().from(channels))[0].householdId, type: 'dm' })
      .returning();
    const foreignMsg = await request(a1)
      .post(`/api/channels/${other.id}/messages`)
      .send({ body: 'dm message' });
    expect(foreignMsg.status).toBe(201);

    const wrongChannel = await request(a1)
      .post(`/api/channels/${channelId}/messages`)
      .send({ body: 'reply', replyToId: foreignMsg.body.id });
    expect(wrongChannel.status).toBe(400);

    const missing = await request(a1)
      .post(`/api/channels/${channelId}/messages`)
      .send({ body: 'reply', replyToId: '00000000-0000-0000-0000-000000000000' });
    expect(missing.status).toBe(400);

    const notUuid = await request(a1)
      .post(`/api/channels/${channelId}/messages`)
      .send({ body: 'reply', replyToId: 'not-a-uuid' });
    expect(notUuid.status).toBe(400);
  });

  it('filters messages with ?after=<iso> for polling', async () => {
    const base = new Date('2026-09-20T08:00:00Z');
    for (let i = 0; i < 3; i++) {
      await db.insert(channelMessages).values({
        channelId,
        senderUserId: 'u1',
        body: `m${i}`,
        createdAt: new Date(base.getTime() + i * 60_000),
      });
    }

    const all = await request(a1).get(`/api/channels/${channelId}/messages`);
    expect(all.body).toHaveLength(3);

    const after = await request(a1).get(
      `/api/channels/${channelId}/messages?after=${encodeURIComponent('2026-09-20T08:00:30Z')}`,
    );
    expect(after.body).toHaveLength(2);
    expect(after.body.map((m: { body: string }) => m.body)).toEqual(['m1', 'm2']);

    const invalid = await request(a1).get(`/api/channels/${channelId}/messages?after=not-a-date`);
    expect(invalid.status).toBe(400);
  });

  it('POST /channels/:id/read marks unread messages and returns the count', async () => {
    await request(a1).post(`/api/channels/${channelId}/messages`).send({ body: 'hi from u1' });
    await request(a2).post(`/api/channels/${channelId}/messages`).send({ body: 'hi from u2' });
    // Already read by u1 — must not be double-appended.
    await db.insert(channelMessages).values({
      channelId, senderUserId: 'u2', body: 'already read', readBy: ['u1'],
    });

    const res = await request(a1).post(`/api/channels/${channelId}/read`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ marked: 2 });

    const msgs = await db
      .select()
      .from(channelMessages)
      .where(eq(channelMessages.channelId, channelId));
    expect(msgs.every((m) => m.readBy.includes('u1'))).toBe(true);
    expect(msgs.find((m) => m.body === 'already read')!.readBy).toEqual(['u1']);

    // Idempotent: second call marks nothing.
    const again = await request(a1).post(`/api/channels/${channelId}/read`);
    expect(again.status).toBe(200);
    expect(again.body).toEqual({ marked: 0 });

    // u2 reads independently.
    const res2 = await request(a2).post(`/api/channels/${channelId}/read`);
    expect(res2.body.marked).toBe(3);
  });

  it('POST /channels/:id/read enforces ownership and id validity', async () => {
    const anon = app(db);
    expect((await request(anon).post(`/api/channels/${channelId}/read`)).status).toBe(401);

    const a3 = app(db, 'u3');
    const h3 = await request(a3).post('/api/household').send({ name: 'Other' });
    expect(h3.status).toBe(201);
    expect((await request(a3).post(`/api/channels/${channelId}/read`)).status).toBe(404);
    expect((await request(a1).post('/api/channels/not-a-uuid/read')).status).toBe(400);
  });
});
