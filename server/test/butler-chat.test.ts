import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import { desc, eq } from 'drizzle-orm';
import { createTestDb, type TestDb } from './db';
import { householdRouter } from '../routes/household';
import { channelsRouter } from '../routes/channels';
import { proposalsRouter } from '../routes/proposals';
import {
  generateButlerReply,
  isButlerAddressed,
  respondToButler,
  type ButlerReplyPrompt,
} from '../lib/butler-chat';
import {
  butlerMemory,
  butlerProposals,
  channelMessages,
  channels,
  events,
  householdMembers,
  households,
  tasks,
} from '../../shared/schema/index';
import type { ProposalPayload } from '../../shared/validation/proposals';

// setImmediate callbacks do async db work, so poll instead of a single flush.
async function waitFor(cond: () => Promise<boolean>, timeoutMs = 3000): Promise<void> {
  const start = Date.now();
  while (!(await cond())) {
    if (Date.now() - start > timeoutMs) throw new Error('waitFor timed out');
    await new Promise((r) => setTimeout(r, 10));
  }
}

function app(db: TestDb, userId?: string): Express {
  const a = express();
  a.use(express.json());
  a.use((req, _res, next) => {
    if (userId !== undefined) req.userId = userId; // fake auth
    next();
  });
  a.use('/api', householdRouter(db));
  a.use('/api', channelsRouter(db));
  a.use('/api', proposalsRouter(db));
  return a;
}

async function seedHousehold(db: TestDb, userId = 'u1'): Promise<string> {
  const [h] = await db.insert(households).values({ name: 'Bruce' }).returning();
  await db.insert(householdMembers).values({ householdId: h.id, userId, displayName: 'Alex' });
  return h.id;
}

async function butlerMessages(db: TestDb, householdId: string) {
  const [channel] = await db
    .select()
    .from(channels)
    .where(eq(channels.householdId, householdId));
  if (!channel) return [];
  const rows = await db
    .select()
    .from(channelMessages)
    .where(eq(channelMessages.channelId, channel.id))
    .orderBy(desc(channelMessages.createdAt));
  return rows.filter((m) => m.senderUserId === null);
}

describe('isButlerAddressed', () => {
  it('matches a leading butler/@butler mention, case- and punctuation-tolerant', () => {
    const yes = [
      'butler what is on today?',
      'Butler, please add milk',
      '  butler   hi',
      '@butler anything this weekend?',
      '@Butler: remind me',
      'BUTLER!',
    ];
    const no = [
      'hi butler',
      'the butler did it',
      'butlerworth is a surname',
      'see you at 7',
      '',
    ];
    for (const body of yes) expect(isButlerAddressed(body)).toBe(true);
    for (const body of no) expect(isButlerAddressed(body)).toBe(false);
  });
});

describe('generateButlerReply', () => {
  let db: TestDb;
  let householdId: string;

  beforeEach(async () => {
    delete process.env.OPENAI_API_KEY;
    db = await createTestDb();
    householdId = await seedHousehold(db);
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  it('returns the model output and grounds the prompt in household context', async () => {
    const now = new Date();
    await db.insert(events).values({
      householdId,
      title: 'Science Museum trip',
      startsAt: new Date(now.getTime() + 3600_000),
      endsAt: new Date(now.getTime() + 2 * 3600_000),
      category: 'school',
    });
    await db.insert(tasks).values({ householdId, title: 'Pay £20 for trip', status: 'todo' });
    await db.insert(butlerMemory).values({ householdId, key: 'tesco_day', value: 'Friday' });
    await db.insert(butlerProposals).values({
      householdId, source: 'email', sender: 'school@stmarys.example', subject: 'Trip',
      payload: { summary: 's', actions: [] }, status: 'pending',
    });

    let captured: ButlerReplyPrompt | undefined;
    const reply = await generateButlerReply(db, householdId, 'butler what is on today?', async (prompt) => {
      captured = prompt;
      return 'One thing on today: the Science Museum trip.';
    });

    expect(reply).toBe('One thing on today: the Science Museum trip.');
    expect(captured).toBeDefined();
    expect(captured!.system).toMatch(/untrusted/i);
    expect(captured!.system).toMatch(/Europe\/London/);
    expect(captured!.user).toContain('Science Museum trip');
    expect(captured!.user).toContain('Pay £20 for trip');
    expect(captured!.user).toContain('tesco_day');
    expect(captured!.user).toContain('butler what is on today?');
    expect(captured!.user).toContain('1'); // pending proposals count
  });

  it('returns null when OPENAI_API_KEY is not configured', async () => {
    const reply = await generateButlerReply(db, householdId, 'butler hi');
    expect(reply).toBeNull();
  });
});

describe('respondToButler', () => {
  let db: TestDb;
  let householdId: string;

  beforeEach(async () => {
    delete process.env.OPENAI_API_KEY;
    db = await createTestDb();
    householdId = await seedHousehold(db);
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  it('posts the AI reply as a butler message (senderUserId null)', async () => {
    await respondToButler(db, householdId, 'butler hello', async () => 'Good morning! ☀️');
    const rows = await butlerMessages(db, householdId);
    expect(rows).toHaveLength(1);
    expect(rows[0].body).toBe('Good morning! ☀️');
  });

  it('posts a graceful fallback when no AI key is configured', async () => {
    await respondToButler(db, householdId, 'butler hello');
    const rows = await butlerMessages(db, householdId);
    expect(rows).toHaveLength(1);
    expect(rows[0].body).toMatch(/getting set up/i);
  });

  it('swallows model errors without throwing', async () => {
    await expect(
      respondToButler(db, householdId, 'butler hello', async () => {
        throw new Error('model exploded');
      }),
    ).resolves.toBeUndefined();
    expect(await butlerMessages(db, householdId)).toHaveLength(0);
  });
});

describe('POST /channels/:id/messages butler trigger', () => {
  let db: TestDb;
  let a: Express;
  let householdId: string;
  let channelId: string;

  beforeEach(async () => {
    delete process.env.OPENAI_API_KEY;
    db = await createTestDb();
    a = app(db, 'u1');
    const h = await request(a).post('/api/household').send({ name: 'Bruce', displayName: 'Alex' });
    householdId = h.body.id;
    const chans = await request(a).get('/api/channels');
    channelId = chans.body.channels[0].id;
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  it('replies asynchronously (fallback without a key) when addressed', async () => {
    const res = await request(a)
      .post(`/api/channels/${channelId}/messages`)
      .send({ senderUserId: 'u1', body: 'butler, what is on today?' });
    expect(res.status).toBe(201);

    await waitFor(async () => (await butlerMessages(db, householdId)).length === 1);
    const [reply] = await butlerMessages(db, householdId);
    expect(reply.body).toMatch(/getting set up/i);
  });

  it('stays silent when the message is not addressed to the butler', async () => {
    await request(a).post(`/api/channels/${channelId}/messages`).send({ senderUserId: 'u1', body: 'see you at 7' });
    await new Promise((r) => setTimeout(r, 300));
    expect(await butlerMessages(db, householdId)).toHaveLength(0);
  });

  it('does not trigger on the butler’s own messages', async () => {
    await request(a)
      .post(`/api/channels/${channelId}/messages`)
      .send({ senderUserId: null, body: 'butler noting this myself' });
    await new Promise((r) => setTimeout(r, 300));
    const rows = await butlerMessages(db, householdId);
    expect(rows).toHaveLength(1); // only the seeded butler message, no reply
  });
});

describe('proposal accept confirmation', () => {
  let db: TestDb;
  let a: Express;
  let householdId: string;

  const PAYLOAD: ProposalPayload = {
    summary: 'School trip payment due Friday',
    actions: [
      { type: 'create_task', title: 'Pay £20 for Science Museum trip', dueDate: '2026-09-25' },
      { type: 'create_event', title: 'Science Museum trip', startsAt: '2026-09-26T09:00:00Z' },
    ],
  };

  beforeEach(async () => {
    db = await createTestDb();
    a = app(db, 'u1');
    householdId = await seedHousehold(db);
  });

  it('posts a butler confirmation with the apply counts after accept', async () => {
    const [p] = await db
      .insert(butlerProposals)
      .values({ householdId, source: 'email', sender: 's@x.example', subject: 'Trip', payload: PAYLOAD })
      .returning();
    const res = await request(a).post(`/api/butler/proposals/${p.id}/accept`);
    expect(res.status).toBe(200);

    await waitFor(async () => (await butlerMessages(db, householdId)).length === 1);
    const [confirmation] = await butlerMessages(db, householdId);
    expect(confirmation.body).toContain('1 task');
    expect(confirmation.body).toContain('1 event');
  });

  it('posts no confirmation when the accept fails', async () => {
    const missing = '00000000-0000-0000-0000-000000000000';
    expect((await request(a).post(`/api/butler/proposals/${missing}/accept`)).status).toBe(404);
    await new Promise((r) => setTimeout(r, 300));
    expect(await butlerMessages(db, householdId)).toHaveLength(0);
  });
});
