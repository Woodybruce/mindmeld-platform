import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import { createTestDb, type TestDb } from './db';
import { householdRouter } from '../routes/household';
import { tasksRouter } from '../routes/tasks';
import { holidaysRouter } from '../routes/holidays';

function app(db: TestDb, userId?: string): Express {
  const a = express();
  a.use(express.json());
  a.use((req, _res, next) => {
    if (userId !== undefined) req.userId = userId; // fake auth
    next();
  });
  a.use('/api', householdRouter(db));
  a.use('/api', tasksRouter(db));
  a.use('/api', holidaysRouter(db));
  return a;
}

describe('holidays routes', () => {
  it('generate-checklist creates holiday tasks, idempotently', async () => {
    const db = await createTestDb();
    const a = app(db, 'u1'); // same helper style as Task 3
    await request(a).post('/api/household').send({ name: 'Bruce' });
    const h = await request(a).post('/api/holidays').send({
      destination: 'Cornwall', startsAt: '2026-10-24', endsAt: '2026-10-31',
    });
    expect(h.status).toBe(201);
    const gen = await request(a).post(`/api/holidays/${h.body.id}/generate-checklist`);
    expect(gen.status).toBe(201);
    expect(gen.body.created).toBeGreaterThanOrEqual(5);
    const again = await request(a).post(`/api/holidays/${h.body.id}/generate-checklist`); // again
    expect(again.body.created).toBe(0);
    const tasks = await request(a).get('/api/tasks');
    const holidayTasks = tasks.body.filter((t: { source: string }) => t.source === 'holiday');
    expect(holidayTasks.length).toBe(gen.body.created); // no duplicates
  });

  it('generated tasks and items carry the default checklist, due on startsAt', async () => {
    const db = await createTestDb();
    const a = app(db, 'u1');
    await request(a).post('/api/household').send({ name: 'Bruce' });
    const h = await request(a).post('/api/holidays').send({
      destination: 'Cornwall', startsAt: '2026-10-24', endsAt: '2026-10-31',
    });
    await request(a).post(`/api/holidays/${h.body.id}/generate-checklist`);

    const tasks = await request(a).get('/api/tasks');
    const holidayTasks = tasks.body.filter((t: { source: string }) => t.source === 'holiday');
    expect(holidayTasks).toHaveLength(5);
    expect(holidayTasks.every((t: { dueDate: string }) => t.dueDate === '2026-10-24')).toBe(true);
    expect(holidayTasks.some((t: { title: string }) => t.title.includes('Book flights'))).toBe(true);
    expect(holidayTasks.some((t: { title: string }) => t.title.includes('Cornwall'))).toBe(true);

    const items = await request(a).get(`/api/holidays/${h.body.id}/items`);
    expect(items.body).toHaveLength(5);
    const byText = new Map<string, { kind: string; done: boolean }>(
      items.body.map((i: { text: string; kind: string; done: boolean }) => [i.text, i]),
    );
    expect(byText.get('Book flights')?.kind).toBe('booking');
    expect(byText.get('Travel insurance')?.kind).toBe('admin');
    expect(byText.get('Packing list')?.kind).toBe('packing');
    expect(byText.get('Check passports')?.done).toBe(false);
  });

  it('creates, lists, patches and deletes a holiday', async () => {
    const db = await createTestDb();
    const a = app(db, 'u1');
    await request(a).post('/api/household').send({ name: 'Bruce' });
    const created = await request(a).post('/api/holidays').send({
      destination: 'Cornwall', startsAt: '2026-10-24', endsAt: '2026-10-31', notes: 'Dog-friendly',
    });
    expect(created.status).toBe(201);

    const list = await request(a).get('/api/holidays');
    expect(list.body).toHaveLength(1);

    const patched = await request(a).patch(`/api/holidays/${created.body.id}`).send({ notes: 'Cottage booked' });
    expect(patched.status).toBe(200);
    expect(patched.body.notes).toBe('Cottage booked');

    expect((await request(a).patch(`/api/holidays/${created.body.id}`).send({})).status).toBe(400);
    expect((await request(a).delete(`/api/holidays/${created.body.id}`)).status).toBe(204);
    expect((await request(a).get('/api/holidays')).body).toHaveLength(0);
  });

  it('rejects malformed holiday bodies with 400', async () => {
    const db = await createTestDb();
    const a = app(db, 'u1');
    await request(a).post('/api/household').send({ name: 'Bruce' });
    const missing = await request(a).post('/api/holidays').send({ destination: 'x' });
    expect(missing.status).toBe(400);
    const badDate = await request(a).post('/api/holidays').send({
      destination: 'x', startsAt: 'not-a-date', endsAt: '2026-10-31',
    });
    expect(badDate.status).toBe(400);
  });

  it('creates and patches holiday items, rejecting invalid kind', async () => {
    const db = await createTestDb();
    const a = app(db, 'u1');
    await request(a).post('/api/household').send({ name: 'Bruce' });
    const h = await request(a).post('/api/holidays').send({
      destination: 'Cornwall', startsAt: '2026-10-24', endsAt: '2026-10-31',
    });
    const item = await request(a).post(`/api/holidays/${h.body.id}/items`).send({
      text: 'Hire car', kind: 'booking',
    });
    expect(item.status).toBe(201);
    expect(item.body.done).toBe(false);

    const bad = await request(a).post(`/api/holidays/${h.body.id}/items`).send({
      text: 'x', kind: 'fun',
    });
    expect(bad.status).toBe(400);

    const patched = await request(a).patch(`/api/holidays/${h.body.id}/items/${item.body.id}`).send({ done: true });
    expect(patched.status).toBe(200);
    expect(patched.body.done).toBe(true);

    const items = await request(a).get(`/api/holidays/${h.body.id}/items`);
    expect(items.body).toHaveLength(1);
  });

  it('returns 404 for another household’s holiday, its items and generate-checklist', async () => {
    const db = await createTestDb();
    const a1 = app(db, 'u1');
    await request(a1).post('/api/household').send({ name: 'Bruce' });
    const h = await request(a1).post('/api/holidays').send({
      destination: 'Cornwall', startsAt: '2026-10-24', endsAt: '2026-10-31',
    });

    const a2 = app(db, 'u2');
    await request(a2).post('/api/household').send({ name: 'Other' });
    expect((await request(a2).patch(`/api/holidays/${h.body.id}`).send({ notes: 'Nope' })).status).toBe(404);
    expect((await request(a2).delete(`/api/holidays/${h.body.id}`)).status).toBe(404);
    expect((await request(a2).get(`/api/holidays/${h.body.id}/items`)).status).toBe(404);
    expect((await request(a2).post(`/api/holidays/${h.body.id}/items`).send({ text: 'x' })).status).toBe(404);
    expect((await request(a2).post(`/api/holidays/${h.body.id}/generate-checklist`)).status).toBe(404);
    expect((await request(a2).get('/api/holidays')).body).toHaveLength(0);
  });

  it('rejects unauthenticated requests with 401 and no-household with 403', async () => {
    const db = await createTestDb();
    const anon = app(db); // no userId
    expect((await request(anon).get('/api/holidays')).status).toBe(401);

    const noHousehold = app(db, 'u1');
    expect((await request(noHousehold).get('/api/holidays')).status).toBe(403);
  });

  it('rejects non-uuid holiday ids with 400', async () => {
    const db = await createTestDb();
    const a = app(db, 'u1');
    await request(a).post('/api/household').send({ name: 'Bruce' });
    expect((await request(a).patch('/api/holidays/not-a-uuid').send({ notes: 'x' })).status).toBe(400);
    expect((await request(a).get('/api/holidays/not-a-uuid/items')).status).toBe(400);
    expect((await request(a).post('/api/holidays/not-a-uuid/generate-checklist')).status).toBe(400);
  });
});
