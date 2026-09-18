import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import { createTestDb, type TestDb } from './db';
import { householdRouter } from '../routes/household';
import { tasksRouter } from '../routes/tasks';

function createApp(db: TestDb, userId?: string): Express {
  const a = express();
  a.use(express.json());
  a.use((req, _res, next) => {
    if (userId !== undefined) req.userId = userId; // fake auth
    next();
  });
  a.use('/api', householdRouter(db));
  a.use('/api', tasksRouter(db));
  return a;
}

describe('tasks routes', () => {
  it('rejects unauthenticated requests with 401', async () => {
    const db = await createTestDb();
    const a = createApp(db); // no userId
    expect((await request(a).get('/api/tasks')).status).toBe(401);
    expect((await request(a).post('/api/tasks').send({ title: 'x' })).status).toBe(401);
  });

  it('returns 403 when the user has no household', async () => {
    const db = await createTestDb();
    const a = createApp(db, 'u1');
    expect((await request(a).get('/api/tasks')).status).toBe(403);
  });

  it('creates and completes a task', async () => {
    const db = await createTestDb();
    const a = createApp(db, 'u1');
    await request(a).post('/api/household').send({ name: 'Bruce' });
    const t = await request(a)
      .post('/api/tasks')
      .send({ title: 'Sign permission slip', dueDate: '2026-09-25' });
    expect(t.status).toBe(201);
    expect(t.body.title).toBe('Sign permission slip');
    expect(t.body.status).toBe('todo');
    const done = await request(a).post(`/api/tasks/${t.body.id}/complete`);
    expect(done.status).toBe(200);
    expect(done.body.status).toBe('done');
  });

  it('lists only the current household’s tasks', async () => {
    const db = await createTestDb();
    const a1 = createApp(db, 'u1');
    await request(a1).post('/api/household').send({ name: 'Bruce' });
    await request(a1).post('/api/tasks').send({ title: 'Mine' });

    const a2 = createApp(db, 'u2');
    await request(a2).post('/api/household').send({ name: 'Other' });
    await request(a2).post('/api/tasks').send({ title: 'Theirs' });

    const list = await request(a2).get('/api/tasks');
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].title).toBe('Theirs');
  });

  it('rejects invalid priority', async () => {
    const db = await createTestDb();
    const a = createApp(db, 'u1');
    await request(a).post('/api/household').send({ name: 'Bruce' });
    const bad = await request(a).post('/api/tasks').send({ title: 'x', priority: 'urgent-ish' });
    expect(bad.status).toBe(400);
  });

  it('requires dueDate when source is school', async () => {
    const db = await createTestDb();
    const a = createApp(db, 'u1');
    await request(a).post('/api/household').send({ name: 'Bruce' });
    const bad = await request(a).post('/api/tasks').send({ title: 'Trip', source: 'school' });
    expect(bad.status).toBe(400);
    const ok = await request(a)
      .post('/api/tasks')
      .send({ title: 'Trip', source: 'school', dueDate: '2026-10-02' });
    expect(ok.status).toBe(201);
  });

  it('round-trips PATCH and DELETE, 404 across households', async () => {
    const db = await createTestDb();
    const a1 = createApp(db, 'u1');
    await request(a1).post('/api/household').send({ name: 'Bruce' });
    const t = await request(a1).post('/api/tasks').send({ title: 'Mine', priority: 'low' });

    const patched = await request(a1).patch(`/api/tasks/${t.body.id}`).send({ priority: 'high' });
    expect(patched.status).toBe(200);
    expect(patched.body.priority).toBe('high');
    expect(patched.body.title).toBe('Mine');

    const a2 = createApp(db, 'u2');
    await request(a2).post('/api/household').send({ name: 'Other' });
    expect((await request(a2).patch(`/api/tasks/${t.body.id}`).send({ title: 'Nope' })).status).toBe(404);
    expect((await request(a2).post(`/api/tasks/${t.body.id}/complete`)).status).toBe(404);
    expect((await request(a2).delete(`/api/tasks/${t.body.id}`)).status).toBe(404);

    expect((await request(a1).delete(`/api/tasks/${t.body.id}`)).status).toBe(204);
    expect((await request(a1).get('/api/tasks')).body).toHaveLength(0);
  });
});
