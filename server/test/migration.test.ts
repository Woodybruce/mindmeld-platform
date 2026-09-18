import { describe, it, expect } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { createTestDb, type TestDb } from './db';
// Legacy source tables: bare '../../shared/schema' is the legacy shared/schema.ts file.
import { profiles, weeklyTasks, sharedLists, calendarEvents } from '../../shared/schema';
// Explicit `/index`: the new household schema.
import {
  households,
  householdMembers,
  tasks,
  lists,
  listItems,
  events,
  channels,
} from '../../shared/schema/index';
import { migrateToHousehold } from '../migrations-data/001-to-household';

// PGlite only has the new tables (from migrations/), so the legacy source
// tables are created here with the columns the migration actually reads.
async function createLegacyTables(db: TestDb): Promise<void> {
  await db.execute(sql`
    CREATE TABLE profiles (
      id uuid PRIMARY KEY,
      username text,
      partner_id uuid,
      partner_code text UNIQUE,
      phone_number text,
      calendar_forward_token text UNIQUE,
      avatar_url text,
      anniversary_date date,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE TABLE weekly_tasks (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL,
      text text NOT NULL,
      done boolean NOT NULL DEFAULT false,
      scheduled_date date NOT NULL,
      sort_order integer NOT NULL DEFAULT 0,
      source text NOT NULL DEFAULT 'manual',
      source_id text,
      attachments jsonb DEFAULT '[]',
      created_at timestamptz NOT NULL DEFAULT now(),
      completed_at timestamptz
    )
  `);
  await db.execute(sql`
    CREATE TABLE shared_lists (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL,
      name text NOT NULL,
      icon text NOT NULL DEFAULT '📝',
      template text,
      max_items integer,
      items jsonb NOT NULL DEFAULT '[]',
      score_data jsonb,
      ai_suggestable boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE TABLE calendar_events (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL,
      subject text NOT NULL,
      start_time timestamptz NOT NULL,
      end_time timestamptz NOT NULL,
      is_all_day boolean NOT NULL DEFAULT false,
      location text,
      source text NOT NULL DEFAULT 'manual',
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

const ALICE = '11111111-1111-4111-8111-111111111111';
const BOB = '22222222-2222-4222-8222-222222222222';
const CAROL = '33333333-3333-4333-8333-333333333333';
const DAVE = '44444444-4444-4444-8444-444444444444';
const GONE = '99999999-9999-4999-8999-999999999999'; // dangling partner id

async function seedLegacy(db: TestDb) {
  await db.insert(profiles).values([
    { id: ALICE, username: 'Alice', partnerId: BOB },
    { id: BOB, username: 'Bob', partnerId: ALICE },
    { id: CAROL, username: 'Carol', partnerId: null },
    { id: DAVE, username: 'Dave', partnerId: GONE }, // partner row missing -> solo
  ]);

  const [wt1] = await db
    .insert(weeklyTasks)
    .values({
      userId: ALICE,
      text: 'Buy milk',
      done: false,
      scheduledDate: '2026-09-20',
      source: 'manual',
      attachments: [{ url: 'https://example.com/list.pdf' }],
    })
    .returning();
  const [wt2] = await db
    .insert(weeklyTasks)
    .values({ userId: ALICE, text: 'Book dentist', done: true, scheduledDate: '2026-09-18', source: 'import' })
    .returning();
  const [wt3] = await db
    .insert(weeklyTasks)
    .values({ userId: BOB, text: 'Bins out', done: false, scheduledDate: '2026-09-19', source: 'manual' })
    .returning();
  const [wt4] = await db
    .insert(weeklyTasks)
    .values({ userId: CAROL, text: 'Solo task', done: false, scheduledDate: '2026-09-21', source: 'manual' })
    .returning();

  const [sl1] = await db
    .insert(sharedLists)
    .values({
      userId: ALICE,
      name: 'Groceries',
      template: 'shopping',
      aiSuggestable: true,
      items: [{ text: 'Eggs', checked: true }, { text: 'Bread', done: false }, 'Milk'],
    })
    .returning();
  const [sl2] = await db
    .insert(sharedLists)
    .values({ userId: BOB, name: 'Packing', template: 'packing', items: [] })
    .returning();

  const [ce1] = await db
    .insert(calendarEvents)
    .values({
      userId: ALICE,
      subject: 'Anniversary dinner',
      startTime: new Date('2026-10-01T19:00:00Z'),
      endTime: new Date('2026-10-01T21:00:00Z'),
      source: 'manual',
    })
    .returning();
  const [ce2] = await db
    .insert(calendarEvents)
    .values({
      userId: BOB,
      subject: 'Synced meeting',
      startTime: new Date('2026-10-02T09:00:00Z'),
      endTime: new Date('2026-10-02T10:00:00Z'),
      source: 'outlook',
    })
    .returning();

  return { wt1, wt2, wt3, wt4, sl1, sl2, ce1, ce2 };
}

describe('migrateToHousehold', () => {
  it('migrates couples, solo users and their data into households', async () => {
    const db = await createTestDb();
    await createLegacyTables(db);
    const seeded = await seedLegacy(db);

    const summary = await migrateToHousehold(db);

    // 3 households: Alice&Bob (couple), Carol (solo), Dave (dangling partner -> solo)
    expect(summary.households).toBe(3);
    expect(summary.tasks).toBe(4);
    expect(summary.lists).toBe(2);
    expect(summary.listItems).toBe(3);
    expect(summary.events).toBe(2);

    const hh = await db.select().from(households);
    expect(hh).toHaveLength(3);
    const members = await db.select().from(householdMembers);
    expect(members).toHaveLength(4);
    expect(members.map((m) => m.userId).sort()).toEqual([ALICE, BOB, CAROL, DAVE].sort());

    // Alice and Bob share one household
    const aliceMember = members.find((m) => m.userId === ALICE)!;
    const bobMember = members.find((m) => m.userId === BOB)!;
    expect(aliceMember.householdId).toBe(bobMember.householdId);
    expect(aliceMember.displayName).toBe('Alice');
    const carolMember = members.find((m) => m.userId === CAROL)!;
    expect(carolMember.householdId).not.toBe(aliceMember.householdId);
    const daveMember = members.find((m) => m.userId === DAVE)!;
    expect(daveMember.householdId).not.toBe(aliceMember.householdId);
    expect(daveMember.householdId).not.toBe(carolMember.householdId);

    // every household gets its shared butler channel
    const chans = await db.select().from(channels);
    expect(chans).toHaveLength(3);
    expect(chans.every((c) => c.type === 'household')).toBe(true);
    expect(new Set(chans.map((c) => c.householdId)).size).toBe(3);

    // tasks: field mapping + assignee + marker
    const migratedTasks = await db.select().from(tasks);
    expect(migratedTasks).toHaveLength(4);
    const milk = migratedTasks.find((t) => t.title === 'Buy milk')!;
    expect(milk.status).toBe('todo');
    expect(milk.dueDate).toBe('2026-09-20');
    expect(milk.source).toBe('manual');
    expect(milk.assigneeUserId).toBe(ALICE);
    expect(milk.householdId).toBe(aliceMember.householdId);
    expect(milk.migratedFrom).toBe(`weekly_tasks:${seeded.wt1.id}`);
    expect(milk.attachments).toEqual([{ url: 'https://example.com/list.pdf' }]);
    const dentist = migratedTasks.find((t) => t.title === 'Book dentist')!;
    expect(dentist.status).toBe('done');
    expect(dentist.source).toBe('manual'); // 'import' -> manual
    const bins = migratedTasks.find((t) => t.title === 'Bins out')!;
    expect(bins.assigneeUserId).toBe(BOB);
    expect(bins.householdId).toBe(aliceMember.householdId);
    const solo = migratedTasks.find((t) => t.title === 'Solo task')!;
    expect(solo.householdId).toBe(carolMember.householdId);

    // lists: template -> type, items jsonb -> list_items rows
    const migratedLists = await db.select().from(lists);
    expect(migratedLists).toHaveLength(2);
    const groceries = migratedLists.find((l) => l.name === 'Groceries')!;
    expect(groceries.type).toBe('shopping');
    expect(groceries.aiSuggestable).toBe(true);
    expect(groceries.householdId).toBe(aliceMember.householdId);
    expect(groceries.migratedFrom).toBe(`shared_lists:${seeded.sl1.id}`);
    const packing = migratedLists.find((l) => l.name === 'Packing')!;
    expect(packing.type).toBe('packing');

    const items = await db.select().from(listItems).where(eq(listItems.listId, groceries.id));
    expect(items).toHaveLength(3);
    const byText = new Map(items.map((i) => [i.text, i]));
    expect(byText.get('Eggs')?.checked).toBe(true);
    expect(byText.get('Bread')?.checked).toBe(false);
    expect(byText.get('Milk')?.checked).toBe(false);
    expect(byText.get('Eggs')?.addedByUserId).toBe(ALICE);

    // events: source mapping + marker
    const migratedEvents = await db.select().from(events);
    expect(migratedEvents).toHaveLength(2);
    const dinner = migratedEvents.find((e) => e.title === 'Anniversary dinner')!;
    expect(dinner.source).toBe('manual');
    expect(dinner.householdId).toBe(aliceMember.householdId);
    expect(dinner.migratedFrom).toBe(`calendar_events:${seeded.ce1.id}`);
    expect(dinner.startsAt).toEqual(new Date('2026-10-01T19:00:00Z'));
    const meeting = migratedEvents.find((e) => e.title === 'Synced meeting')!;
    expect(meeting.source).toBe('outlook');
  });

  it('is idempotent: a second run inserts nothing new', async () => {
    const db = await createTestDb();
    await createLegacyTables(db);
    await seedLegacy(db);

    await migrateToHousehold(db);
    const second = await migrateToHousehold(db);
    expect(second).toEqual({ households: 0, tasks: 0, lists: 0, listItems: 0, events: 0 });

    expect(await db.select().from(households)).toHaveLength(3);
    expect(await db.select().from(householdMembers)).toHaveLength(4);
    expect(await db.select().from(channels)).toHaveLength(3);
    expect(await db.select().from(tasks)).toHaveLength(4);
    expect(await db.select().from(lists)).toHaveLength(2);
    expect(await db.select().from(listItems)).toHaveLength(3);
    expect(await db.select().from(events)).toHaveLength(2);
  });

  it('resumes partially-migrated data without duplicating it', async () => {
    const db = await createTestDb();
    await createLegacyTables(db);
    const seeded = await seedLegacy(db);

    await migrateToHousehold(db);
    // Simulate a crash mid-migration: remove one migrated task only.
    await db.delete(tasks).where(eq(tasks.migratedFrom, `weekly_tasks:${seeded.wt1.id}`));

    const summary = await migrateToHousehold(db);
    expect(summary).toEqual({ households: 0, tasks: 1, lists: 0, listItems: 0, events: 0 });
    const all = await db.select().from(tasks);
    expect(all).toHaveLength(4);
    expect(all.filter((t) => t.title === 'Buy milk')).toHaveLength(1);
  });
});
