import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import { createTestDb, type TestDb } from './db';
import { householdRouter } from '../routes/household';
import { eventsRouter } from '../routes/events';

function app(db: TestDb, userId?: string): Express {
  const a = express();
  a.use(express.json());
  a.use((req, _res, next) => {
    if (userId !== undefined) req.userId = userId; // fake auth
    next();
  });
  a.use('/api', householdRouter(db));
  a.use('/api', eventsRouter(db));
  return a;
}

describe('events routes', () => {
  it('creates an event and range-queries it', async () => {
    const db = await createTestDb();
    const a = app(db, 'u1'); // same helper style as Task 3
    await request(a).post('/api/household').send({ name: 'Bruce' });
    const e = await request(a).post('/api/events').send({
      title: "Parents' evening", startsAt: '2026-10-12T18:00:00Z', endsAt: '2026-10-12T20:00:00Z', category: 'school',
    });
    expect(e.status).toBe(201);
    const res = await request(a).get('/api/events?from=2026-10-12T00:00:00Z&to=2026-10-13T00:00:00Z');
    expect(res.body).toHaveLength(1);
  });

  it('rejects endsAt before startsAt', async () => {
    const db = await createTestDb();
    const a = app(db, 'u1');
    await request(a).post('/api/household').send({ name: 'Bruce' });
    const bad = await request(a).post('/api/events').send({
      title: 'x', startsAt: '2026-10-12T20:00:00Z', endsAt: '2026-10-12T18:00:00Z', category: 'household',
    });
    expect(bad.status).toBe(400);
  });

  it('range query includes events overlapping the window, not just starting inside it', async () => {
    const db = await createTestDb();
    const a = app(db, 'u1');
    await request(a).post('/api/household').send({ name: 'Bruce' });
    // Starts before `from`, ends inside the window — must be returned.
    await request(a).post('/api/events').send({
      title: 'Half term', startsAt: '2026-10-10T09:00:00Z', endsAt: '2026-10-12T17:00:00Z', category: 'holiday',
    });
    // Fully outside the window — must not be returned.
    await request(a).post('/api/events').send({
      title: 'Later', startsAt: '2026-10-13T09:00:00Z', endsAt: '2026-10-13T10:00:00Z', category: 'us',
    });
    const res = await request(a).get('/api/events?from=2026-10-12T00:00:00Z&to=2026-10-13T00:00:00Z');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Half term');
  });

  it('rejects invalid category and malformed timestamps', async () => {
    const db = await createTestDb();
    const a = app(db, 'u1');
    await request(a).post('/api/household').send({ name: 'Bruce' });
    const badCategory = await request(a).post('/api/events').send({
      title: 'x', startsAt: '2026-10-12T18:00:00Z', endsAt: '2026-10-12T20:00:00Z', category: 'weird',
    });
    expect(badCategory.status).toBe(400);
    const badTime = await request(a).post('/api/events').send({
      title: 'x', startsAt: 'not-a-date', endsAt: '2026-10-12T20:00:00Z', category: 'us',
    });
    expect(badTime.status).toBe(400);
    const badRange = await request(a).get('/api/events?from=nope&to=2026-10-13T00:00:00Z');
    expect(badRange.status).toBe(400);
  });

  it('defaults source to manual and dependentId to null', async () => {
    const db = await createTestDb();
    const a = app(db, 'u1');
    await request(a).post('/api/household').send({ name: 'Bruce' });
    const e = await request(a).post('/api/events').send({
      title: 'Dinner', startsAt: '2026-10-12T19:00:00Z', endsAt: '2026-10-12T20:00:00Z', category: 'us',
    });
    expect(e.status).toBe(201);
    expect(e.body.source).toBe('manual');
    expect(e.body.dependentId).toBeNull();
  });

  it('accepts an own dependent and rejects a foreign one with 400 invalid_dependent', async () => {
    const db = await createTestDb();
    const a1 = app(db, 'u1');
    await request(a1).post('/api/household').send({ name: 'Bruce' });
    const a2 = app(db, 'u2');
    await request(a2).post('/api/household').send({ name: 'Other' });
    const foreign = await request(a2).post('/api/dependents').send({ name: 'Theirs' });

    const bad = await request(a1).post('/api/events').send({
      title: 'x', startsAt: '2026-10-12T18:00:00Z', endsAt: '2026-10-12T20:00:00Z',
      category: 'school', dependentId: foreign.body.id,
    });
    expect(bad.status).toBe(400);
    expect(bad.body.error).toBe('invalid_dependent');

    const own = await request(a1).post('/api/dependents').send({ name: 'Mine' });
    const ok = await request(a1).post('/api/events').send({
      title: 'Sports day', startsAt: '2026-10-12T18:00:00Z', endsAt: '2026-10-12T20:00:00Z',
      category: 'school', dependentId: own.body.id,
    });
    expect(ok.status).toBe(201);
    expect(ok.body.dependentId).toBe(own.body.id);

    // Patching to a foreign dependent is also rejected.
    const badPatch = await request(a1).patch(`/api/events/${ok.body.id}`).send({ dependentId: foreign.body.id });
    expect(badPatch.status).toBe(400);
    expect(badPatch.body.error).toBe('invalid_dependent');
  });

  it('patches and deletes an event, validating time order on patch', async () => {
    const db = await createTestDb();
    const a = app(db, 'u1');
    await request(a).post('/api/household').send({ name: 'Bruce' });
    const e = await request(a).post('/api/events').send({
      title: 'Dinner', startsAt: '2026-10-12T19:00:00Z', endsAt: '2026-10-12T20:00:00Z', category: 'us',
    });
    const renamed = await request(a).patch(`/api/events/${e.body.id}`).send({ title: 'Late dinner' });
    expect(renamed.status).toBe(200);
    expect(renamed.body.title).toBe('Late dinner');

    // Moving startsAt past the existing endsAt must be rejected.
    const badMove = await request(a).patch(`/api/events/${e.body.id}`).send({ startsAt: '2026-10-12T21:00:00Z' });
    expect(badMove.status).toBe(400);

    expect((await request(a).delete(`/api/events/${e.body.id}`)).status).toBe(204);
    const res = await request(a).get('/api/events?from=2026-10-12T00:00:00Z&to=2026-10-13T00:00:00Z');
    expect(res.body).toHaveLength(0);
  });

  it('returns 404 patching or deleting another household’s event', async () => {
    const db = await createTestDb();
    const a1 = app(db, 'u1');
    await request(a1).post('/api/household').send({ name: 'Bruce' });
    const e = await request(a1).post('/api/events').send({
      title: 'Mine', startsAt: '2026-10-12T18:00:00Z', endsAt: '2026-10-12T20:00:00Z', category: 'household',
    });

    const a2 = app(db, 'u2');
    await request(a2).post('/api/household').send({ name: 'Other' });
    expect((await request(a2).patch(`/api/events/${e.body.id}`).send({ title: 'Nope' })).status).toBe(404);
    expect((await request(a2).delete(`/api/events/${e.body.id}`)).status).toBe(404);
    const res = await request(a2).get('/api/events?from=2026-10-12T00:00:00Z&to=2026-10-13T00:00:00Z');
    expect(res.body).toHaveLength(0);
  });

  it('rejects unauthenticated requests with 401', async () => {
    const db = await createTestDb();
    const a = app(db); // no userId
    expect((await request(a).get('/api/events')).status).toBe(401);
    expect((await request(a).post('/api/events').send({
      title: 'x', startsAt: '2026-10-12T18:00:00Z', endsAt: '2026-10-12T20:00:00Z', category: 'us',
    })).status).toBe(401);
  });

  it('returns 403 when the user has no household', async () => {
    const db = await createTestDb();
    const a = app(db, 'u1');
    expect((await request(a).get('/api/events')).status).toBe(403);
  });

  it('rejects non-uuid params with 400', async () => {
    const db = await createTestDb();
    const a = app(db, 'u1');
    await request(a).post('/api/household').send({ name: 'Bruce' });
    expect((await request(a).patch('/api/events/not-a-uuid').send({ title: 'x' })).status).toBe(400);
    expect((await request(a).delete('/api/events/not-a-uuid')).status).toBe(400);
  });
});
