import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import { createTestDb, type TestDb } from './db';
import { householdRouter } from '../routes/household';
import { tasksRouter } from '../routes/tasks';
import { schoolsRouter } from '../routes/schools';

function app(db: TestDb, userId?: string): Express {
  const a = express();
  a.use(express.json());
  a.use((req, _res, next) => {
    if (userId !== undefined) req.userId = userId; // fake auth
    next();
  });
  a.use('/api', householdRouter(db));
  a.use('/api', tasksRouter(db));
  a.use('/api', schoolsRouter(db));
  return a;
}

describe('schools routes', () => {
  it('autoTask school_event also creates a task', async () => {
    const db = await createTestDb();
    const a = app(db, 'u1'); // same helper style as Task 3
    await request(a).post('/api/household').send({ name: 'Bruce' });
    const school = await request(a).post('/api/schools').send({ name: "St Mary's", status: 'shortlisted' });
    const ev = await request(a).post(`/api/schools/${school.body.id}/events`).send({
      title: 'Application deadline', date: '2026-10-31', kind: 'application_deadline', autoTask: true,
    });
    expect(ev.status).toBe(201);
    const tasks = await request(a).get('/api/tasks');
    expect(tasks.body.some((t: { source: string; dueDate: string }) => t.source === 'school' && t.dueDate === '2026-10-31')).toBe(true);
  });

  it('rejects invalid school status', async () => {
    const db = await createTestDb();
    const a = app(db, 'u1');
    await request(a).post('/api/household').send({ name: 'Bruce' });
    const bad = await request(a).post('/api/schools').send({ name: 'x', status: 'maybe' });
    expect(bad.status).toBe(400);
  });

  it('creates, lists, patches and deletes a school', async () => {
    const db = await createTestDb();
    const a = app(db, 'u1');
    await request(a).post('/api/household').send({ name: 'Bruce' });
    const created = await request(a).post('/api/schools').send({ name: "St Mary's" });
    expect(created.status).toBe(201);
    expect(created.body.status).toBe('researching'); // default

    const list = await request(a).get('/api/schools');
    expect(list.body).toHaveLength(1);

    const patched = await request(a).patch(`/api/schools/${created.body.id}`).send({ status: 'offered', notes: 'Waiting list #3' });
    expect(patched.status).toBe(200);
    expect(patched.body.status).toBe('offered');

    expect((await request(a).patch(`/api/schools/${created.body.id}`).send({})).status).toBe(400);
    expect((await request(a).delete(`/api/schools/${created.body.id}`)).status).toBe(204);
    expect((await request(a).get('/api/schools')).body).toHaveLength(0);
  });

  it('creates a school event without autoTask and lists events for the school', async () => {
    const db = await createTestDb();
    const a = app(db, 'u1');
    await request(a).post('/api/household').send({ name: 'Bruce' });
    const school = await request(a).post('/api/schools').send({ name: "St Mary's" });
    const ev = await request(a).post(`/api/schools/${school.body.id}/events`).send({
      title: 'Open day', date: '2026-10-04', kind: 'open_day',
    });
    expect(ev.status).toBe(201);
    expect(ev.body.autoTask).toBe(false);

    const events = await request(a).get(`/api/schools/${school.body.id}/events`);
    expect(events.body).toHaveLength(1);
    expect(events.body[0].title).toBe('Open day');

    // No task should have been created.
    const tasks = await request(a).get('/api/tasks');
    expect(tasks.body).toHaveLength(0);
  });

  it('rejects invalid school_event kind and malformed date', async () => {
    const db = await createTestDb();
    const a = app(db, 'u1');
    await request(a).post('/api/household').send({ name: 'Bruce' });
    const school = await request(a).post('/api/schools').send({ name: "St Mary's" });
    const badKind = await request(a).post(`/api/schools/${school.body.id}/events`).send({
      title: 'x', date: '2026-10-04', kind: 'sports_day',
    });
    expect(badKind.status).toBe(400);
    const badDate = await request(a).post(`/api/schools/${school.body.id}/events`).send({
      title: 'x', date: 'not-a-date', kind: 'open_day',
    });
    expect(badDate.status).toBe(400);
  });

  it('autoTask task references the event title and school name', async () => {
    const db = await createTestDb();
    const a = app(db, 'u1');
    await request(a).post('/api/household').send({ name: 'Bruce' });
    const school = await request(a).post('/api/schools').send({ name: "St Mary's" });
    await request(a).post(`/api/schools/${school.body.id}/events`).send({
      title: 'Application deadline', date: '2026-10-31', kind: 'application_deadline', autoTask: true,
    });
    const tasks = await request(a).get('/api/tasks');
    expect(tasks.body).toHaveLength(1);
    expect(tasks.body[0].title).toContain('Application deadline');
    expect(tasks.body[0].title).toContain("St Mary's");
    expect(tasks.body[0].source).toBe('school');
    expect(tasks.body[0].dueDate).toBe('2026-10-31');
  });

  it('accepts an own dependent on a school event, rejects a foreign one with 400 invalid_dependent', async () => {
    const db = await createTestDb();
    const a1 = app(db, 'u1');
    await request(a1).post('/api/household').send({ name: 'Bruce' });
    const school = await request(a1).post('/api/schools').send({ name: "St Mary's" });

    const a2 = app(db, 'u2');
    await request(a2).post('/api/household').send({ name: 'Other' });
    const foreign = await request(a2).post('/api/dependents').send({ name: 'Theirs' });

    const bad = await request(a1).post(`/api/schools/${school.body.id}/events`).send({
      title: 'x', date: '2026-10-04', kind: 'open_day', dependentId: foreign.body.id,
    });
    expect(bad.status).toBe(400);
    expect(bad.body.error).toBe('invalid_dependent');

    const own = await request(a1).post('/api/dependents').send({ name: 'Mine' });
    const ok = await request(a1).post(`/api/schools/${school.body.id}/events`).send({
      title: 'Parents evening', date: '2026-11-04', kind: 'parents_evening', dependentId: own.body.id,
    });
    expect(ok.status).toBe(201);
    expect(ok.body.dependentId).toBe(own.body.id);
  });

  it('returns 404 for another household’s school and its events', async () => {
    const db = await createTestDb();
    const a1 = app(db, 'u1');
    await request(a1).post('/api/household').send({ name: 'Bruce' });
    const school = await request(a1).post('/api/schools').send({ name: "St Mary's" });

    const a2 = app(db, 'u2');
    await request(a2).post('/api/household').send({ name: 'Other' });
    expect((await request(a2).patch(`/api/schools/${school.body.id}`).send({ name: 'Nope' })).status).toBe(404);
    expect((await request(a2).delete(`/api/schools/${school.body.id}`)).status).toBe(404);
    expect((await request(a2).get(`/api/schools/${school.body.id}/events`)).status).toBe(404);
    expect((await request(a2).post(`/api/schools/${school.body.id}/events`).send({
      title: 'x', date: '2026-10-04', kind: 'open_day',
    })).status).toBe(404);
    expect((await request(a2).get('/api/schools')).body).toHaveLength(0);
  });

  it('rejects unauthenticated requests with 401 and no-household with 403', async () => {
    const db = await createTestDb();
    const anon = app(db); // no userId
    expect((await request(anon).get('/api/schools')).status).toBe(401);

    const noHousehold = app(db, 'u1');
    expect((await request(noHousehold).get('/api/schools')).status).toBe(403);
  });

  it('rejects non-uuid school ids with 400', async () => {
    const db = await createTestDb();
    const a = app(db, 'u1');
    await request(a).post('/api/household').send({ name: 'Bruce' });
    expect((await request(a).patch('/api/schools/not-a-uuid').send({ name: 'x' })).status).toBe(400);
    expect((await request(a).get('/api/schools/not-a-uuid/events')).status).toBe(400);
  });
});
