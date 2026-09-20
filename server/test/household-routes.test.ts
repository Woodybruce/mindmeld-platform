import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import { eq } from 'drizzle-orm';
import { createTestDb, type TestDb } from './db';
import { householdRouter } from '../routes/household';
import { newApiRouter } from '../routes/index';
// Explicit `/index`: bare `../../shared/schema` resolves to the legacy shared/schema.ts file.
import { channels } from '../../shared/schema/index';

function createApp(db: TestDb, userId?: string): Express {
  const a = express();
  a.use(express.json());
  a.use((req, _res, next) => {
    if (userId !== undefined) req.userId = userId; // fake auth
    next();
  });
  a.use('/api', householdRouter(db));
  return a;
}

describe('household routes', () => {
  it('rejects unauthenticated requests with 401', async () => {
    const db = await createTestDb();
    const a = createApp(db); // no userId
    expect((await request(a).post('/api/household').send({ name: 'Bruce' })).status).toBe(401);
    expect((await request(a).get('/api/household')).status).toBe(401);
    expect((await request(a).get('/api/dependents')).status).toBe(401);
  });

  it('returns 403 when the user has no household', async () => {
    const db = await createTestDb();
    const a = createApp(db, 'u1');
    const res = await request(a).get('/api/dependents');
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('no_household');
  });

  it('creates household and manages dependents', async () => {
    const db = await createTestDb();
    const a = createApp(db, 'u1');
    const created = await request(a).post('/api/household').send({ name: 'Bruce' });
    expect(created.status).toBe(201);
    expect(created.body.name).toBe('Bruce');

    const fetched = await request(a).get('/api/household');
    expect(fetched.status).toBe(200);
    expect(fetched.body.id).toBe(created.body.id);

    const dep = await request(a).post('/api/dependents').send({ name: 'Coco', yearGroup: 'Year 10' });
    expect(dep.status).toBe(201);
    expect(dep.body.householdId).toBe(created.body.id);
    const list = await request(a).get('/api/dependents');
    expect(list.body).toHaveLength(1);
  });

  it('creates a household-type channel when a household is created, but not when joining one', async () => {
    const db = await createTestDb();
    const a1 = createApp(db, 'u1');
    const created = await request(a1).post('/api/household').send({ name: 'Bruce' });
    expect(created.status).toBe(201);

    let rows = await db.select().from(channels).where(eq(channels.householdId, created.body.id));
    expect(rows).toHaveLength(1);
    expect(rows[0].type).toBe('household');

    const a2 = createApp(db, 'u2');
    const joined = await request(a2).post('/api/household').send({ householdId: created.body.id });
    expect(joined.status).toBe(200);

    // Joining does not create a second channel.
    rows = await db.select().from(channels).where(eq(channels.householdId, created.body.id));
    expect(rows).toHaveLength(1);
  });

  it('rejects empty dependent name', async () => {
    const db = await createTestDb();
    const a = createApp(db, 'u1');
    await request(a).post('/api/household').send({ name: 'Bruce' });
    const bad = await request(a).post('/api/dependents').send({ name: '' });
    expect(bad.status).toBe(400);
  });

  it('lets a second member join by household id and see shared dependents', async () => {
    const db = await createTestDb();
    const a1 = createApp(db, 'u1');
    const created = await request(a1).post('/api/household').send({ name: 'Bruce' });
    await request(a1).post('/api/dependents').send({ name: 'Coco' });

    const a2 = createApp(db, 'u2');
    const joined = await request(a2).post('/api/household').send({ householdId: created.body.id, displayName: 'Sam' });
    expect(joined.status).toBe(200);
    expect(joined.body.id).toBe(created.body.id);

    const list = await request(a2).get('/api/dependents');
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].name).toBe('Coco');
  });

  it('returns 409 when joining a household that already has MAX_HOUSEHOLD_MEMBERS', async () => {
    const db = await createTestDb();
    const a1 = createApp(db, 'u1');
    const created = await request(a1).post('/api/household').send({ name: 'Bruce' });
    const a2 = createApp(db, 'u2');
    expect((await request(a2).post('/api/household').send({ householdId: created.body.id })).status).toBe(200);

    const a3 = createApp(db, 'u3');
    const third = await request(a3).post('/api/household').send({ householdId: created.body.id });
    expect(third.status).toBe(409);
    expect(third.body.error).toBe('household_full');
  });

  it('returns 404 when joining a household that does not exist', async () => {
    const db = await createTestDb();
    const a = createApp(db, 'u1');
    const res = await request(a)
      .post('/api/household')
      .send({ householdId: '00000000-0000-0000-0000-000000000000' });
    expect(res.status).toBe(404);
  });

  it('round-trips dependent PATCH and DELETE, 404 for unknown ids', async () => {
    const db = await createTestDb();
    const a = createApp(db, 'u1');
    await request(a).post('/api/household').send({ name: 'Bruce' });
    const dep = await request(a).post('/api/dependents').send({ name: 'Coco', yearGroup: 'Year 10' });

    const patched = await request(a).patch(`/api/dependents/${dep.body.id}`).send({ yearGroup: 'Year 11' });
    expect(patched.status).toBe(200);
    expect(patched.body.yearGroup).toBe('Year 11');
    expect(patched.body.name).toBe('Coco');

    const missing = '00000000-0000-0000-0000-000000000000';
    expect((await request(a).patch(`/api/dependents/${missing}`).send({ name: 'Nope' })).status).toBe(404);
    expect((await request(a).delete(`/api/dependents/${missing}`)).status).toBe(404);
    expect((await request(a).patch('/api/dependents/not-a-uuid').send({ name: 'X' })).status).toBe(400);

    expect((await request(a).delete(`/api/dependents/${dep.body.id}`)).status).toBe(204);
    const list = await request(a).get('/api/dependents');
    expect(list.body).toHaveLength(0);
  });

  it('does not let one household see another household’s dependents', async () => {
    const db = await createTestDb();
    const a1 = createApp(db, 'u1');
    await request(a1).post('/api/household').send({ name: 'Bruce' });
    await request(a1).post('/api/dependents').send({ name: 'Coco' });

    const a2 = createApp(db, 'u2');
    await request(a2).post('/api/household').send({ name: 'Other' });
    const list = await request(a2).get('/api/dependents');
    expect(list.body).toHaveLength(0);
  });

  it('returns 409 when re-joining a household you already belong to', async () => {
    const db = await createTestDb();
    const a = createApp(db, 'u1');
    const created = await request(a).post('/api/household').send({ name: 'Bruce' });
    const again = await request(a).post('/api/household').send({ householdId: created.body.id });
    expect(again.status).toBe(409);
    expect(again.body.error).toBe('already_in_household');
  });

  it('returns 409 when joining a different household while already a member', async () => {
    const db = await createTestDb();
    const a1 = createApp(db, 'u1');
    await request(a1).post('/api/household').send({ name: 'Bruce' });
    const a2 = createApp(db, 'u2');
    const other = await request(a2).post('/api/household').send({ name: 'Other' });
    const join = await request(a2).post('/api/household').send({ householdId: other.body.id });
    expect(join.status).toBe(409);
    expect(join.body.error).toBe('already_in_household');
  });

  it('returns 409 when creating a household while already a member', async () => {
    const db = await createTestDb();
    const a = createApp(db, 'u1');
    await request(a).post('/api/household').send({ name: 'Bruce' });
    const second = await request(a).post('/api/household').send({ name: 'Second' });
    expect(second.status).toBe(409);
    expect(second.body.error).toBe('already_in_household');
  });
});

describe('newApiRouter', () => {
  it('applies real auth: unauthenticated request gets 401 without network access', async () => {
    const db = await createTestDb();
    const a = express();
    a.use(express.json());
    a.use('/api', newApiRouter(db));
    expect((await request(a).get('/api/dependents')).status).toBe(401);
    expect((await request(a).post('/api/household').send({ name: 'Bruce' })).status).toBe(401);
  });
});
