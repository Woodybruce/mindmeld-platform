import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import { createTestDb, type TestDb } from './db';
import { householdRouter } from '../routes/household';
import { butlerRouter } from '../routes/butler';
import { channelsRouter } from '../routes/channels';

function app(db: TestDb, userId?: string): Express {
  const a = express();
  a.use(express.json());
  a.use((req, _res, next) => {
    if (userId !== undefined) req.userId = userId; // fake auth
    next();
  });
  a.use('/api', householdRouter(db));
  a.use('/api', butlerRouter(db));
  a.use('/api', channelsRouter(db));
  return a;
}

describe('butler memory + channels routes', () => {
  it('stores butler memory and posts butler message to household channel', async () => {
    const db = await createTestDb();
    const a = app(db, 'u1'); // same helper style as Task 3
    const h = await request(a).post('/api/household').send({ name: 'Bruce' });
    const mem = await request(a).post('/api/butler/memory').send({ key: 'tesco_day', value: 'Friday' });
    expect(mem.status).toBe(201);
    // household channel auto-created with household
    const channels = await request(a).get('/api/channels');
    const householdChannel = channels.body.find((c: { type: string }) => c.type === 'household');
    expect(householdChannel).toBeTruthy();
    const msg = await request(a).post(`/api/channels/${householdChannel.id}/messages`)
      .send({ senderUserId: null, body: 'Morning briefing: 2 tasks today.' });
    expect(msg.status).toBe(201);
    const msgs = await request(a).get(`/api/channels/${householdChannel.id}/messages`);
    expect(msgs.body[0].senderUserId).toBeNull();
    expect(h.status).toBe(201);
  });

  it('lists butler memory for the household and returns 409 on duplicate key', async () => {
    const db = await createTestDb();
    const a = app(db, 'u1');
    await request(a).post('/api/household').send({ name: 'Bruce' });
    const first = await request(a).post('/api/butler/memory').send({
      key: 'tesco_day', value: 'Friday', provenance: 'chat',
    });
    expect(first.status).toBe(201);
    expect(first.body.householdId).toBeTruthy();
    expect(first.body.provenance).toBe('chat');

    const dup = await request(a).post('/api/butler/memory').send({ key: 'tesco_day', value: 'Saturday' });
    expect(dup.status).toBe(409);
    expect(dup.body.error).toBe('duplicate_key');

    const list = await request(a).get('/api/butler/memory');
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].value).toBe('Friday');
  });

  it('deletes butler memory, 404 for unknown or foreign ids, 400 for non-uuid', async () => {
    const db = await createTestDb();
    const a1 = app(db, 'u1');
    await request(a1).post('/api/household').send({ name: 'Bruce' });
    const mem = await request(a1).post('/api/butler/memory').send({ key: 'k', value: 'v' });

    const a2 = app(db, 'u2');
    await request(a2).post('/api/household').send({ name: 'Other' });
    expect((await request(a2).delete(`/api/butler/memory/${mem.body.id}`)).status).toBe(404);
    expect((await request(a2).get('/api/butler/memory')).body).toHaveLength(0);

    expect((await request(a1).delete('/api/butler/memory/not-a-uuid')).status).toBe(400);
    const missing = '00000000-0000-0000-0000-000000000000';
    expect((await request(a1).delete(`/api/butler/memory/${missing}`)).status).toBe(404);
    expect((await request(a1).delete(`/api/butler/memory/${mem.body.id}`)).status).toBe(204);
    expect((await request(a1).get('/api/butler/memory')).body).toHaveLength(0);
  });

  it('rejects malformed memory and message bodies with 400', async () => {
    const db = await createTestDb();
    const a = app(db, 'u1');
    await request(a).post('/api/household').send({ name: 'Bruce' });
    expect((await request(a).post('/api/butler/memory').send({ value: 'v' })).status).toBe(400);
    expect((await request(a).post('/api/butler/memory').send({ key: '', value: 'v' })).status).toBe(400);
    expect((await request(a).post('/api/butler/memory').send({ key: 'k' })).status).toBe(400);

    const channels = await request(a).get('/api/channels');
    const channelId = channels.body[0].id;
    expect((await request(a).post(`/api/channels/${channelId}/messages`).send({})).status).toBe(400);
    expect((await request(a).post(`/api/channels/${channelId}/messages`).send({ body: '' })).status).toBe(400);
  });

  it('rejects a non-null senderUserId that does not match the caller with 403', async () => {
    const db = await createTestDb();
    const a = app(db, 'u1');
    await request(a).post('/api/household').send({ name: 'Bruce' });
    const channels = await request(a).get('/api/channels');
    const channelId = channels.body[0].id;

    const forged = await request(a).post(`/api/channels/${channelId}/messages`)
      .send({ senderUserId: 'u2', body: 'I am not u2' });
    expect(forged.status).toBe(403);

    const own = await request(a).post(`/api/channels/${channelId}/messages`)
      .send({ senderUserId: 'u1', body: 'Hello butler' });
    expect(own.status).toBe(201);
    expect(own.body.senderUserId).toBe('u1');

    const msgs = await request(a).get(`/api/channels/${channelId}/messages`);
    expect(msgs.body).toHaveLength(1);
  });

  it('returns 404 for messages on another household’s channel and 400 for non-uuid ids', async () => {
    const db = await createTestDb();
    const a1 = app(db, 'u1');
    await request(a1).post('/api/household').send({ name: 'Bruce' });
    const channels = await request(a1).get('/api/channels');
    const channelId = channels.body[0].id;

    const a2 = app(db, 'u2');
    await request(a2).post('/api/household').send({ name: 'Other' });
    expect((await request(a2).get(`/api/channels/${channelId}/messages`)).status).toBe(404);
    expect((await request(a2).post(`/api/channels/${channelId}/messages`)
      .send({ senderUserId: null, body: 'x' })).status).toBe(404);

    // The other household sees only its own channel.
    const own = await request(a2).get('/api/channels');
    expect(own.body).toHaveLength(1);
    expect(own.body[0].id).not.toBe(channelId);

    expect((await request(a1).get('/api/channels/not-a-uuid/messages')).status).toBe(400);
    expect((await request(a1).post('/api/channels/not-a-uuid/messages')
      .send({ senderUserId: null, body: 'x' })).status).toBe(400);
  });

  it('creates exactly one household channel when a household is created, none when joining', async () => {
    const db = await createTestDb();
    const a1 = app(db, 'u1');
    const h = await request(a1).post('/api/household').send({ name: 'Bruce' });
    expect(h.status).toBe(201);

    const a2 = app(db, 'u2');
    const joined = await request(a2).post('/api/household').send({ householdId: h.body.id });
    expect(joined.status).toBe(200);

    // Both members see the same single auto-created household channel.
    const c1 = await request(a1).get('/api/channels');
    const c2 = await request(a2).get('/api/channels');
    expect(c1.body).toHaveLength(1);
    expect(c1.body[0].type).toBe('household');
    expect(c2.body).toEqual(c1.body);
  });

  it('rejects unauthenticated requests with 401 and no-household with 403', async () => {
    const db = await createTestDb();
    const anon = app(db); // no userId
    expect((await request(anon).get('/api/butler/memory')).status).toBe(401);
    expect((await request(anon).post('/api/butler/memory').send({ key: 'k', value: 'v' })).status).toBe(401);
    expect((await request(anon).get('/api/channels')).status).toBe(401);

    const noHousehold = app(db, 'u1');
    expect((await request(noHousehold).get('/api/butler/memory')).status).toBe(403);
    expect((await request(noHousehold).get('/api/channels')).status).toBe(403);
  });
});
