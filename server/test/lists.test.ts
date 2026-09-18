import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import { createTestDb, type TestDb } from './db';
import { householdRouter } from '../routes/household';
import { listsRouter } from '../routes/lists';

function app(db: TestDb, userId?: string): Express {
  const a = express();
  a.use(express.json());
  a.use((req, _res, next) => {
    if (userId !== undefined) req.userId = userId; // fake auth
    next();
  });
  a.use('/api', householdRouter(db));
  a.use('/api', listsRouter(db));
  return a;
}

describe('lists routes', () => {
  it('creates a shopping list with items and toggles them', async () => {
    const db = await createTestDb();
    const a = app(db, 'u1'); // same helper style as Task 3
    await request(a).post('/api/household').send({ name: 'Bruce' });
    const list = await request(a).post('/api/lists').send({ name: 'Tesco', type: 'shopping' });
    expect(list.status).toBe(201);
    const item = await request(a).post(`/api/lists/${list.body.id}/items`).send({ text: 'Milk' });
    expect(item.status).toBe(201);
    const toggled = await request(a).patch(`/api/items/${item.body.id}`).send({ checked: true });
    expect(toggled.body.checked).toBe(true);
  });

  it('rejects unauthenticated requests with 401', async () => {
    const db = await createTestDb();
    const a = app(db); // no userId
    expect((await request(a).get('/api/lists')).status).toBe(401);
    expect((await request(a).post('/api/lists').send({ name: 'x' })).status).toBe(401);
  });

  it('returns 403 when the user has no household', async () => {
    const db = await createTestDb();
    const a = app(db, 'u1');
    expect((await request(a).get('/api/lists')).status).toBe(403);
  });

  it('defaults type to generic and aiSuggestable to true', async () => {
    const db = await createTestDb();
    const a = app(db, 'u1');
    await request(a).post('/api/household').send({ name: 'Bruce' });
    const list = await request(a).post('/api/lists').send({ name: 'Misc' });
    expect(list.status).toBe(201);
    expect(list.body.type).toBe('generic');
    expect(list.body.aiSuggestable).toBe(true);
  });

  it('rejects invalid list type', async () => {
    const db = await createTestDb();
    const a = app(db, 'u1');
    await request(a).post('/api/household').send({ name: 'Bruce' });
    const bad = await request(a).post('/api/lists').send({ name: 'x', type: 'weird' });
    expect(bad.status).toBe(400);
  });

  it('lists only the current household’s lists', async () => {
    const db = await createTestDb();
    const a1 = app(db, 'u1');
    await request(a1).post('/api/household').send({ name: 'Bruce' });
    await request(a1).post('/api/lists').send({ name: 'Mine', type: 'packing' });

    const a2 = app(db, 'u2');
    await request(a2).post('/api/household').send({ name: 'Other' });
    await request(a2).post('/api/lists').send({ name: 'Theirs' });

    const list = await request(a2).get('/api/lists');
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].name).toBe('Theirs');
  });

  it('returns 404 when adding an item to another household’s list', async () => {
    const db = await createTestDb();
    const a1 = app(db, 'u1');
    await request(a1).post('/api/household').send({ name: 'Bruce' });
    const list = await request(a1).post('/api/lists').send({ name: 'Mine' });

    const a2 = app(db, 'u2');
    await request(a2).post('/api/household').send({ name: 'Other' });
    const res = await request(a2).post(`/api/lists/${list.body.id}/items`).send({ text: 'Nope' });
    expect(res.status).toBe(404);
  });

  it('records addedByUserId and defaults checked to false on new items', async () => {
    const db = await createTestDb();
    const a = app(db, 'u1');
    await request(a).post('/api/household').send({ name: 'Bruce' });
    const list = await request(a).post('/api/lists').send({ name: 'Tesco' });
    const item = await request(a).post(`/api/lists/${list.body.id}/items`).send({ text: 'Eggs' });
    expect(item.status).toBe(201);
    expect(item.body.checked).toBe(false);
    expect(item.body.addedByUserId).toBe('u1');
    expect(item.body.listId).toBe(list.body.id);
  });

  it('returns 404 patching or deleting another household’s item', async () => {
    const db = await createTestDb();
    const a1 = app(db, 'u1');
    await request(a1).post('/api/household').send({ name: 'Bruce' });
    const list = await request(a1).post('/api/lists').send({ name: 'Mine' });
    const item = await request(a1).post(`/api/lists/${list.body.id}/items`).send({ text: 'Milk' });

    const a2 = app(db, 'u2');
    await request(a2).post('/api/household').send({ name: 'Other' });
    expect((await request(a2).patch(`/api/items/${item.body.id}`).send({ checked: true })).status).toBe(404);
    expect((await request(a2).delete(`/api/items/${item.body.id}`)).status).toBe(404);

    expect((await request(a1).delete(`/api/items/${item.body.id}`)).status).toBe(204);
  });

  it('returns 404 for unknown list and item ids', async () => {
    const db = await createTestDb();
    const a = app(db, 'u1');
    await request(a).post('/api/household').send({ name: 'Bruce' });
    const unknown = '00000000-0000-0000-0000-000000000000';
    expect((await request(a).post(`/api/lists/${unknown}/items`).send({ text: 'x' })).status).toBe(404);
    expect((await request(a).patch(`/api/items/${unknown}`).send({ checked: true })).status).toBe(404);
    expect((await request(a).delete(`/api/items/${unknown}`)).status).toBe(404);
  });

  it('rejects non-uuid params with 400', async () => {
    const db = await createTestDb();
    const a = app(db, 'u1');
    await request(a).post('/api/household').send({ name: 'Bruce' });
    expect((await request(a).post('/api/lists/not-a-uuid/items').send({ text: 'x' })).status).toBe(400);
    expect((await request(a).patch('/api/items/not-a-uuid').send({ checked: true })).status).toBe(400);
  });
});
