import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import { eq } from 'drizzle-orm';
import { createTestDb, type TestDb } from './db';
import { bridgeOutlookEvents, outlookExternalId } from '../lib/outlook-bridge';
import type { Database } from '../db';
import { events, householdMembers, households } from '../../shared/schema/index';

// server/db.ts (imported by the calendar routes) throws at import time
// without DATABASE_URL; point it at a refused port — the routes under test
// receive a PGlite db instead.
process.env.DATABASE_URL ||= 'postgres://localhost:1/outlook-bridge-test';
process.env.SUPABASE_URL ||= 'https://supabase.example';
process.env.SUPABASE_ANON_KEY ||= 'anon';
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'service';

const USER_ID = 'user-1';

interface ChainResult {
  data: unknown;
  error: null;
}

// Chainable fake for the supabase-js query builder, resolving per table.
interface FakeChain extends PromiseLike<ChainResult> {
  select(): FakeChain;
  eq(): FakeChain;
  update(): FakeChain;
  delete(): FakeChain;
  insert(row: unknown): Promise<{ error: null }>;
  maybeSingle(): Promise<ChainResult>;
  single(): Promise<ChainResult>;
}

interface FakeAdmin {
  from(table: string): FakeChain;
  auth: { admin: { listUsers(): Promise<{ data: { users: unknown[] } }> } };
}

let adminImpl: FakeAdmin;
const userClient = {
  auth: {
    getUser: async () => ({ data: { user: { id: USER_ID } }, error: null }),
  },
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn((_url: string, _key: string, options?: { global?: unknown }) =>
    options?.global ? userClient : adminImpl,
  ),
}));

function chain(resolveWith: ChainResult): FakeChain {
  const c: FakeChain = {
    select: () => c,
    eq: () => c,
    update: () => c,
    delete: () => c,
    insert: () => Promise.resolve({ error: null }),
    maybeSingle: () => Promise.resolve(resolveWith),
    single: () => Promise.resolve(resolveWith),
    then: (onF, onR) => Promise.resolve(resolveWith).then(onF, onR),
  };
  return c;
}

function makeAdmin(opts: {
  tokenRow?: unknown;
  profileRow?: unknown;
  existingCalendarEvents?: unknown[];
  onInsert?: (row: unknown) => void;
}): FakeAdmin {
  return {
    from(table: string): FakeChain {
      if (table === 'microsoft_tokens') return chain({ data: opts.tokenRow ?? null, error: null });
      if (table === 'profiles') return chain({ data: opts.profileRow ?? null, error: null });
      if (table === 'calendar_events') {
        const c = chain({ data: opts.existingCalendarEvents ?? [], error: null });
        c.insert = (row: unknown) => {
          opts.onInsert?.(row);
          return Promise.resolve({ error: null });
        };
        return c;
      }
      throw new Error(`unexpected table: ${table}`);
    },
    auth: { admin: { listUsers: async () => ({ data: { users: [] } }) } },
  };
}

const TOKEN_ROW = {
  access_token: 'ms-access',
  refresh_token: 'ms-refresh',
  expires_at: new Date(Date.now() + 3600_000).toISOString(),
};

async function seedHousehold(db: TestDb): Promise<string> {
  const [h] = await db.insert(households).values({ name: 'Bruce' }).returning();
  await db.insert(householdMembers).values({ householdId: h.id, userId: USER_ID, displayName: 'Alex' });
  return h.id;
}

async function outlookRows(db: TestDb, householdId: string) {
  return db.select().from(events).where(eq(events.householdId, householdId));
}

describe('bridgeOutlookEvents', () => {
  let db: TestDb;
  let householdId: string;

  beforeEach(async () => {
    db = await createTestDb();
    householdId = await seedHousehold(db);
  });

  it('inserts source=outlook household events keyed by external id', async () => {
    const inserted = await bridgeOutlookEvents(db, householdId, [
      {
        externalId: 'outlook-1',
        title: 'Football',
        startsAt: new Date('2026-09-22T15:00:00Z'),
        endsAt: new Date('2026-09-22T16:00:00Z'),
      },
    ]);
    expect(inserted).toBe(1);

    const rows = await outlookRows(db, householdId);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      title: 'Football',
      category: 'household',
      source: 'outlook',
      externalId: 'outlook-1',
      dependentId: null,
    });
  });

  it('falls back to a stable hash when no external id is given, and dedupes', async () => {
    const row = {
      externalId: null,
      title: 'Dentist',
      startsAt: new Date('2026-09-23T09:00:00Z'),
      endsAt: new Date('2026-09-23T09:30:00Z'),
    };
    expect(await bridgeOutlookEvents(db, householdId, [row])).toBe(1);
    // Re-import of the same row (and a batch-internal duplicate) inserts nothing.
    expect(await bridgeOutlookEvents(db, householdId, [row, row])).toBe(0);

    const rows = await outlookRows(db, householdId);
    expect(rows).toHaveLength(1);
    expect(rows[0].externalId).toBe(outlookExternalId(row));
  });
});

describe('Outlook routes → events bridge', () => {
  let db: TestDb;
  let app: Express;
  let householdId: string;
  let registerCalendarRoutes: typeof import('../routes/legacy/calendar').registerCalendarRoutes;

  beforeAll(async () => {
    ({ registerCalendarRoutes } = await import('../routes/legacy/calendar'));
  });

  beforeEach(async () => {
    db = await createTestDb();
    app = express();
    app.use(express.json());
    registerCalendarRoutes(app, db as unknown as Database);
    householdId = await seedHousehold(db);
  });

  it('import mode writes legacy rows AND bridges into events with external_id dedupe', async () => {
    const legacyInserts: unknown[] = [];
    adminImpl = makeAdmin({ tokenRow: TOKEN_ROW, onInsert: (r) => legacyInserts.push(r) });

    const payload = {
      mode: 'import',
      events: [
        {
          id: 'outlook-evt-1',
          subject: 'Parents evening',
          start_time: '2026-09-24T18:00:00.000Z',
          end_time: '2026-09-24T18:30:00.000Z',
          is_all_day: false,
        },
        {
          // No id (older clients): falls back to the stable hash.
          subject: 'Bin day',
          start_time: '2026-09-25T07:00:00.000Z',
          end_time: '2026-09-25T07:05:00.000Z',
          is_all_day: false,
        },
      ],
    };

    const res = await request(app)
      .post('/api/sync-outlook-calendar')
      .set('Authorization', 'Bearer test-token')
      .send(payload);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, count: 2 });
    expect(legacyInserts).toHaveLength(2);

    const rows = await outlookRows(db, householdId);
    expect(rows).toHaveLength(2);
    const byTitle = new Map(rows.map((r) => [r.title, r]));
    expect(byTitle.get('Parents evening')).toMatchObject({
      source: 'outlook',
      category: 'household',
      externalId: 'outlook-evt-1',
    });
    expect(byTitle.get('Bin day')?.externalId).toBe(
      outlookExternalId({ title: 'Bin day', startsAt: new Date('2026-09-25T07:00:00.000Z') }),
    );

    // Re-import: legacy insert happens again (existing behaviour — the fake
    // returns no existing rows) but the bridge must not duplicate events.
    const res2 = await request(app)
      .post('/api/sync-outlook-calendar')
      .set('Authorization', 'Bearer test-token')
      .send(payload);
    expect(res2.status).toBe(200);
    expect(await outlookRows(db, householdId)).toHaveLength(2);
  });

  it('inbound ICS forwarding bridges into events keyed by UID', async () => {
    const legacyInserts: unknown[] = [];
    adminImpl = makeAdmin({ profileRow: { id: USER_ID }, onInsert: (r) => legacyInserts.push(r) });

    const ics = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'UID:ics-uid-123@example.com',
      'SUMMARY:School play',
      'DTSTART:20261001T180000Z',
      'DTEND:20261001T193000Z',
      'END:VEVENT',
      'BEGIN:VEVENT',
      'SUMMARY:No UID event',
      'DTSTART:20261002T090000Z',
      'DTEND:20261002T100000Z',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const res = await request(app)
      .post('/api/inbound-calendar?token=fwd-token')
      .set('Content-Type', 'text/calendar')
      .send(ics);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, count: 2 });
    expect(legacyInserts).toHaveLength(1); // legacy inserts rows as one batch

    const rows = await outlookRows(db, householdId);
    expect(rows).toHaveLength(2);
    const byTitle = new Map(rows.map((r) => [r.title, r]));
    expect(byTitle.get('School play')).toMatchObject({
      source: 'outlook',
      externalId: 'ics-uid-123@example.com',
    });
    expect(byTitle.get('No UID event')?.externalId).toBe(
      outlookExternalId({ title: 'No UID event', startsAt: new Date('2026-10-02T09:00:00.000Z') }),
    );

    // Re-forward the same ICS: no duplicate events rows.
    const res2 = await request(app)
      .post('/api/inbound-calendar?token=fwd-token')
      .set('Content-Type', 'text/calendar')
      .send(ics);
    expect(res2.status).toBe(200);
    expect(await outlookRows(db, householdId)).toHaveLength(2);
  });
});
