import { describe, it, expect, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestDb, type TestDb } from './db';
import { runSchedulerTick } from '../lib/butler-scheduler';
import {
  butlerProposals,
  channelMessages,
  channels,
  events,
  householdMembers,
  households,
  tasks,
} from '../../shared/schema/index';

// 2026-09-20 is BST (UTC+1): 07:00:30 UTC = 08:00:30 London, inside the
// 08:00–08:02 briefing window.
const BRIEFING_NOW = new Date('2026-09-20T07:00:30.000Z');
const MIDDAY_NOW = new Date('2026-09-20T12:00:00.000Z'); // 13:00 London

async function seedHousehold(db: TestDb, name: string): Promise<string> {
  const [h] = await db.insert(households).values({ name }).returning();
  await db.insert(householdMembers).values({ householdId: h.id, userId: `u-${name}`, displayName: name });
  return h.id;
}

async function butlerBodies(db: TestDb, householdId: string): Promise<string[]> {
  const chans = await db.select().from(channels).where(eq(channels.householdId, householdId));
  if (chans.length === 0) return [];
  const rows = [];
  for (const c of chans) {
    rows.push(...(await db.select().from(channelMessages).where(eq(channelMessages.channelId, c.id))));
  }
  return rows.map((m) => m.body);
}

describe('runSchedulerTick', () => {
  let db: TestDb;

  beforeEach(async () => {
    db = await createTestDb();
  });

  it('posts the morning briefing once (deduped) with events, tasks and proposal nudge', async () => {
    const householdId = await seedHousehold(db, 'Bruce');
    await db.insert(events).values({
      householdId,
      title: 'Science Museum trip',
      startsAt: new Date('2026-09-20T10:00:00.000Z'), // 11:00 London
      endsAt: new Date('2026-09-20T12:00:00.000Z'),
      category: 'school',
    });
    await db.insert(tasks).values({ householdId, title: 'Pay £20 for trip', dueDate: '2026-09-20' });
    await db.insert(tasks).values({ householdId, title: 'Pack PE kit', dueDate: '2026-09-21' });
    await db.insert(tasks).values({ householdId, title: 'Done thing', dueDate: '2026-09-20', status: 'done' });
    await db.insert(butlerProposals).values({
      householdId, source: 'email', subject: 'Trip',
      payload: { summary: 's', actions: [] }, status: 'pending',
    });

    await runSchedulerTick(db, BRIEFING_NOW);

    const bodies = await butlerBodies(db, householdId);
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).toContain('Morning');
    expect(bodies[0]).toContain('Science Museum trip');
    expect(bodies[0]).toContain('Pay £20 for trip');
    expect(bodies[0]).toContain('Pack PE kit');
    expect(bodies[0]).not.toContain('Done thing');
    expect(bodies[0]).toContain('1'); // pending proposals nudge

    // Second tick in the same window does not re-post.
    await runSchedulerTick(db, new Date('2026-09-20T07:01:30.000Z'));
    expect(await butlerBodies(db, householdId)).toHaveLength(1);
  });

  it('posts a reminder once for events starting within 30 minutes', async () => {
    const householdId = await seedHousehold(db, 'Bruce');
    await db.insert(events).values({
      householdId,
      title: 'Parents evening',
      startsAt: new Date(MIDDAY_NOW.getTime() + 15 * 60_000),
      endsAt: new Date(MIDDAY_NOW.getTime() + 45 * 60_000),
      category: 'school',
    });
    // Too far out — no reminder.
    await db.insert(events).values({
      householdId,
      title: 'Later thing',
      startsAt: new Date(MIDDAY_NOW.getTime() + 90 * 60_000),
      endsAt: new Date(MIDDAY_NOW.getTime() + 120 * 60_000),
      category: 'household',
    });

    await runSchedulerTick(db, MIDDAY_NOW);

    const bodies = await butlerBodies(db, householdId);
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).toContain('⏰');
    expect(bodies[0]).toContain('Parents evening');
    expect(bodies[0]).not.toContain('Later thing');

    await runSchedulerTick(db, new Date(MIDDAY_NOW.getTime() + 60_000));
    expect(await butlerBodies(db, householdId)).toHaveLength(1);
  });

  it('posts nothing outside the briefing window and with no imminent events', async () => {
    const householdId = await seedHousehold(db, 'Bruce');
    await db.insert(events).values({
      householdId,
      title: 'Afternoon thing',
      startsAt: new Date('2026-09-20T14:00:00.000Z'),
      endsAt: new Date('2026-09-20T15:00:00.000Z'),
      category: 'household',
    });
    // 09:00 UTC = 10:00 London — outside 08:00–08:02; event is hours away.
    await runSchedulerTick(db, new Date('2026-09-20T09:00:00.000Z'));
    expect(await butlerBodies(db, householdId)).toHaveLength(0);
  });

  it('greets households with nothing on and handles multiple households independently', async () => {
    const a = await seedHousehold(db, 'Bruce');
    const b = await seedHousehold(db, 'Other');

    await runSchedulerTick(db, BRIEFING_NOW);

    const bodiesA = await butlerBodies(db, a);
    const bodiesB = await butlerBodies(db, b);
    expect(bodiesA).toHaveLength(1);
    expect(bodiesB).toHaveLength(1);
    expect(bodiesA[0]).toContain('Morning');
  });
});
