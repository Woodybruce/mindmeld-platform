import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import { createTestDb, type TestDb } from './db';
import { householdRouter } from '../routes/household';
import { renewalsRouter } from '../routes/renewals';

function app(db: TestDb, userId?: string): Express {
  const a = express();
  a.use(express.json());
  a.use((req, _res, next) => {
    if (userId !== undefined) req.userId = userId; // fake auth
    next();
  });
  a.use('/api', householdRouter(db));
  a.use('/api', renewalsRouter(db));
  return a;
}

describe('renewals routes', () => {
  it('creates, lists (ordered by date), patches and deletes a renewal', async () => {
    const db = await createTestDb();
    const a = app(db, 'u1');
    await request(a).post('/api/household').send({ name: 'Bruce', displayName: 'Alex' });

    const later = await request(a).post('/api/renewals').send({
      label: 'Car insurance', category: 'insurance', renewalDate: '2027-01-10',
    });
    expect(later.status).toBe(201);
    expect(later.body.category).toBe('insurance');
    expect(later.body.remindBeforeDays).toBe(30); // default
    expect(later.body.source).toBe('manual'); // default

    const sooner = await request(a).post('/api/renewals').send({
      label: "Woody's passport", category: 'passport', renewalDate: '2026-11-05', remindBeforeDays: 60,
    });
    expect(sooner.status).toBe(201);

    const list = await request(a).get('/api/renewals');
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(2);
    expect(list.body[0].label).toBe("Woody's passport"); // ascending date order

    const patched = await request(a)
      .patch(`/api/renewals/${later.body.id}`)
      .send({ renewalDate: '2026-10-01', notes: 'Aviva renewal' });
    expect(patched.status).toBe(200);
    expect(patched.body.renewalDate).toBe('2026-10-01');
    expect(patched.body.notes).toBe('Aviva renewal');

    expect((await request(a).patch(`/api/renewals/${later.body.id}`).send({})).status).toBe(400);
    expect((await request(a).delete(`/api/renewals/${later.body.id}`)).status).toBe(204);
    expect((await request(a).get('/api/renewals')).body).toHaveLength(1);
    expect((await request(a).delete(`/api/renewals/${later.body.id}`)).status).toBe(404);
  });

  it('isolates households: another household cannot see, patch or delete renewals', async () => {
    const db = await createTestDb();
    const a1 = app(db, 'u1');
    const a2 = app(db, 'u2');
    await request(a1).post('/api/household').send({ name: 'Bruce', displayName: 'Alex' });
    await request(a2).post('/api/household').send({ name: 'Other', displayName: 'Sam' });

    const created = await request(a1).post('/api/renewals').send({
      label: 'MOT', category: 'mot', renewalDate: '2026-12-01',
    });
    expect(created.status).toBe(201);

    expect((await request(a2).get('/api/renewals')).body).toHaveLength(0);
    expect((await request(a2).patch(`/api/renewals/${created.body.id}`).send({ notes: 'x' })).status).toBe(404);
    expect((await request(a2).delete(`/api/renewals/${created.body.id}`)).status).toBe(404);
  });

  it('rejects a foreign dependentId with 400 invalid_dependent and accepts its own', async () => {
    const db = await createTestDb();
    const a1 = app(db, 'u1');
    const a2 = app(db, 'u2');
    await request(a1).post('/api/household').send({ name: 'Bruce', displayName: 'Alex' });
    await request(a2).post('/api/household').send({ name: 'Other', displayName: 'Sam' });

    const foreignDep = await request(a2).post('/api/dependents').send({ name: 'Rufus' });
    expect(foreignDep.status).toBe(201);

    const bad = await request(a1).post('/api/renewals').send({
      label: 'Child passport', renewalDate: '2027-03-01', dependentId: foreignDep.body.id,
    });
    expect(bad.status).toBe(400);
    expect(bad.body.error).toBe('invalid_dependent');

    const ownDep = await request(a1).post('/api/dependents').send({ name: 'Willa' });
    const good = await request(a1).post('/api/renewals').send({
      label: 'Child passport', renewalDate: '2027-03-01', dependentId: ownDep.body.id,
    });
    expect(good.status).toBe(201);

    const badPatch = await request(a1)
      .patch(`/api/renewals/${good.body.id}`)
      .send({ dependentId: foreignDep.body.id });
    expect(badPatch.status).toBe(400);
    expect(badPatch.body.error).toBe('invalid_dependent');
  });

  it('rejects a memberUserId outside the household and invalid categories', async () => {
    const db = await createTestDb();
    const a1 = app(db, 'u1');
    const a2 = app(db, 'u2');
    await request(a1).post('/api/household').send({ name: 'Bruce', displayName: 'Alex' });
    await request(a2).post('/api/household').send({ name: 'Other', displayName: 'Sam' });

    const badMember = await request(a1).post('/api/renewals').send({
      label: 'Gym', renewalDate: '2027-01-01', memberUserId: 'u2',
    });
    expect(badMember.status).toBe(400);
    expect(badMember.body.error).toBe('invalid_member');

    const goodMember = await request(a1).post('/api/renewals').send({
      label: 'Gym', renewalDate: '2027-01-01', memberUserId: 'u1',
    });
    expect(goodMember.status).toBe(201);

    const badCategory = await request(a1).post('/api/renewals').send({
      label: 'Gym', category: 'spaceship', renewalDate: '2027-01-01',
    });
    expect(badCategory.status).toBe(400);
    expect(badCategory.body.error).toBe('invalid_body');
  });
});
