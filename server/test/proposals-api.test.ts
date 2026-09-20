import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import { and, eq } from 'drizzle-orm';
import { createTestDb, type TestDb } from './db';
import { proposalsRouter } from '../routes/proposals';
import {
  butlerMemory,
  butlerProposals,
  events,
  householdMembers,
  households,
  tasks,
} from '../../shared/schema/index';
import type { ProposalPayload } from '../../shared/validation/proposals';

const PAYLOAD: ProposalPayload = {
  summary: 'School trip payment due Friday',
  actions: [
    { type: 'create_task', title: 'Pay £20 for Science Museum trip', dueDate: '2026-09-25', notes: 'Cash in envelope' },
    { type: 'create_event', title: 'Science Museum trip', startsAt: '2026-09-26T09:00:00Z' },
    { type: 'remember', key: 'science_museum_cost', value: '£20' },
  ],
};

function createApp(db: TestDb, userId?: string): Express {
  const a = express();
  a.use(express.json());
  a.use((req, _res, next) => {
    if (userId !== undefined) req.userId = userId; // fake auth
    next();
  });
  a.use('/api', proposalsRouter(db));
  return a;
}

async function seedHousehold(db: TestDb, name: string, userId: string): Promise<string> {
  const [h] = await db.insert(households).values({ name }).returning();
  await db.insert(householdMembers).values({ householdId: h.id, userId, displayName: name });
  return h.id;
}

async function seedProposal(
  db: TestDb,
  householdId: string,
  overrides: Partial<typeof butlerProposals.$inferInsert> = {},
): Promise<string> {
  const [p] = await db
    .insert(butlerProposals)
    .values({ householdId, source: 'email', sender: 'school@stmarys.example', subject: 'Trip', payload: PAYLOAD, ...overrides })
    .returning();
  return p.id;
}

describe('butler proposals API', () => {
  let db: TestDb;
  let householdId: string;

  beforeEach(async () => {
    db = await createTestDb();
    householdId = await seedHousehold(db, 'Bruce', 'u1');
  });

  it('rejects unauthenticated requests with 401', async () => {
    const a = createApp(db);
    expect((await request(a).get('/api/butler/proposals')).status).toBe(401);
    const id = await seedProposal(db, householdId);
    expect((await request(a).post(`/api/butler/proposals/${id}/accept`)).status).toBe(401);
    expect((await request(a).post(`/api/butler/proposals/${id}/dismiss`)).status).toBe(401);
  });

  it('returns 403 when the user has no household', async () => {
    const a = createApp(db, 'ghost');
    expect((await request(a).get('/api/butler/proposals')).status).toBe(403);
  });

  it('lists proposals filtered by status for the current household', async () => {
    const a = createApp(db, 'u1');
    const pendingId = await seedProposal(db, householdId);
    await seedProposal(db, householdId, { status: 'dismissed', resolvedAt: new Date() });
    const otherHousehold = await seedHousehold(db, 'Other', 'u2');
    await seedProposal(db, otherHousehold);

    const all = await request(a).get('/api/butler/proposals');
    expect(all.status).toBe(200);
    expect(all.body).toHaveLength(2);

    const pending = await request(a).get('/api/butler/proposals?status=pending');
    expect(pending.status).toBe(200);
    expect(pending.body).toHaveLength(1);
    expect(pending.body[0].id).toBe(pendingId);
    expect(pending.body[0].status).toBe('pending');

    const bad = await request(a).get('/api/butler/proposals?status=bogus');
    expect(bad.status).toBe(400);
  });

  it('accept applies task/event/remember actions and marks the proposal accepted', async () => {
    const a = createApp(db, 'u1');
    const id = await seedProposal(db, householdId);

    const res = await request(a).post(`/api/butler/proposals/${id}/accept`);
    expect(res.status).toBe(200);
    expect(res.body.applied).toEqual({ tasks: 1, events: 1, memories: 1 });
    expect(res.body.proposal.status).toBe('accepted');
    expect(res.body.proposal.resolvedAt).toBeTruthy();

    const taskRows = await db.select().from(tasks).where(eq(tasks.householdId, householdId));
    expect(taskRows).toHaveLength(1);
    expect(taskRows[0].title).toBe('Pay £20 for Science Museum trip');
    expect(taskRows[0].notes).toBe('Cash in envelope');
    expect(taskRows[0].dueDate).toBe('2026-09-25');
    expect(taskRows[0].source).toBe('butler');

    const eventRows = await db.select().from(events).where(eq(events.householdId, householdId));
    expect(eventRows).toHaveLength(1);
    expect(eventRows[0].title).toBe('Science Museum trip');
    expect(eventRows[0].startsAt).toEqual(new Date('2026-09-26T09:00:00Z'));
    // No endsAt in the action: defaults to startsAt + 1 hour.
    expect(eventRows[0].endsAt).toEqual(new Date('2026-09-26T10:00:00Z'));
    expect(eventRows[0].category).toBe('household');
    expect(eventRows[0].source).toBe('butler');

    const memRows = await db.select().from(butlerMemory).where(eq(butlerMemory.householdId, householdId));
    expect(memRows).toHaveLength(1);
    expect(memRows[0].key).toBe('science_museum_cost');
    expect(memRows[0].value).toBe('£20');
    expect(memRows[0].provenance).toBe('email');

    const [proposal] = await db.select().from(butlerProposals).where(eq(butlerProposals.id, id));
    expect(proposal.status).toBe('accepted');
    expect(proposal.resolvedAt).toBeTruthy();
  });

  it('remember upserts by (householdId, key) instead of duplicating', async () => {
    const a = createApp(db, 'u1');
    const firstId = await seedProposal(db, householdId, {
      payload: { summary: 'first', actions: [{ type: 'remember', key: 'wifi', value: 'old' }] },
    });
    const secondId = await seedProposal(db, householdId, {
      payload: { summary: 'second', actions: [{ type: 'remember', key: 'wifi', value: 'new' }] },
    });
    expect((await request(a).post(`/api/butler/proposals/${firstId}/accept`)).status).toBe(200);
    expect((await request(a).post(`/api/butler/proposals/${secondId}/accept`)).status).toBe(200);

    const memRows = await db
      .select()
      .from(butlerMemory)
      .where(and(eq(butlerMemory.householdId, householdId), eq(butlerMemory.key, 'wifi')));
    expect(memRows).toHaveLength(1);
    expect(memRows[0].value).toBe('new');
  });

  it('rejects a second accept with 409 and applies nothing twice', async () => {
    const a = createApp(db, 'u1');
    const id = await seedProposal(db, householdId);
    expect((await request(a).post(`/api/butler/proposals/${id}/accept`)).status).toBe(200);
    const again = await request(a).post(`/api/butler/proposals/${id}/accept`);
    expect(again.status).toBe(409);
    expect(again.body.error).toBe('already_resolved');
    // Applied row counts are unchanged after the second accept.
    expect(await db.select().from(tasks)).toHaveLength(1);
    expect(await db.select().from(events)).toHaveLength(1);
    expect(await db.select().from(butlerMemory)).toHaveLength(1);
  });

  it('serializes concurrent accepts: exactly one applies, the other gets 409', async () => {
    const a = createApp(db, 'u1');
    const id = await seedProposal(db, householdId);
    const [r1, r2] = await Promise.all([
      request(a).post(`/api/butler/proposals/${id}/accept`),
      request(a).post(`/api/butler/proposals/${id}/accept`),
    ]);
    expect([r1.status, r2.status].sort()).toEqual([200, 409]);
    // Claim-first: the loser never applies, so no rows are double-inserted.
    expect(await db.select().from(tasks)).toHaveLength(1);
    expect(await db.select().from(events)).toHaveLength(1);
    expect(await db.select().from(butlerMemory)).toHaveLength(1);
    const [proposal] = await db.select().from(butlerProposals).where(eq(butlerProposals.id, id));
    expect(proposal.status).toBe('accepted');
  });

  it('dismiss marks the proposal dismissed and blocks later accept/dismiss', async () => {
    const a = createApp(db, 'u1');
    const id = await seedProposal(db, householdId);

    const res = await request(a).post(`/api/butler/proposals/${id}/dismiss`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('dismissed');
    expect(res.body.resolvedAt).toBeTruthy();

    expect(await db.select().from(tasks)).toHaveLength(0);
    expect((await request(a).post(`/api/butler/proposals/${id}/accept`)).status).toBe(409);
    expect((await request(a).post(`/api/butler/proposals/${id}/dismiss`)).status).toBe(409);
  });

  it('returns 404 for another household’s proposal on accept and dismiss', async () => {
    const id = await seedProposal(db, householdId);
    const otherHousehold = await seedHousehold(db, 'Other', 'u2');
    expect(otherHousehold).not.toBe(householdId);

    const a2 = createApp(db, 'u2');
    expect((await request(a2).post(`/api/butler/proposals/${id}/accept`)).status).toBe(404);
    expect((await request(a2).post(`/api/butler/proposals/${id}/dismiss`)).status).toBe(404);

    const [proposal] = await db.select().from(butlerProposals).where(eq(butlerProposals.id, id));
    expect(proposal.status).toBe('pending');
  });

  it('returns 400 for a non-uuid proposal id', async () => {
    const a = createApp(db, 'u1');
    expect((await request(a).post('/api/butler/proposals/not-a-uuid/accept')).status).toBe(400);
    expect((await request(a).post('/api/butler/proposals/not-a-uuid/dismiss')).status).toBe(400);
  });
});
