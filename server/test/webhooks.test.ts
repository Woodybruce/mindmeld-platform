import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import crypto from 'node:crypto';
import request from 'supertest';
import express, { type Express } from 'express';
import { eq } from 'drizzle-orm';
import { createTestDb, type TestDb } from './db';
import { webhooksRouter, type WebhookDeps } from '../routes/webhooks';
import {
  butlerProposals,
  channelMessages,
  channels,
  households,
} from '../../shared/schema/index';
import type { ProposalPayload } from '../../shared/validation/proposals';

const SECRET_BYTES = Buffer.from('testsecret');
const SECRET = 'whsec_' + SECRET_BYTES.toString('base64');
const MSG_ID = 'msg_test';

function sign(id: string, timestamp: string, body: Buffer): string {
  const content = `${id}.${timestamp}.${body.toString('utf8')}`;
  return crypto.createHmac('sha256', SECRET_BYTES).update(content).digest('base64');
}

function signedHeaders(body: Buffer): Record<string, string> {
  const ts = Math.floor(Date.now() / 1000).toString();
  return {
    'svix-id': MSG_ID,
    'svix-timestamp': ts,
    'svix-signature': `v1,${sign(MSG_ID, ts, body)}`,
  };
}

const EMAIL = { from: 'school@stmarys.example', subject: 'Trip to the Science Museum', text: 'Please pay £20 by Friday.' };
const PAYLOAD: ProposalPayload = {
  summary: 'School trip payment due Friday',
  actions: [{ type: 'create_task', title: 'Pay £20 for Science Museum trip', dueDate: '2026-09-25' }],
};

function deps(overrides: Partial<WebhookDeps> = {}): WebhookDeps {
  return {
    fetchReceivedEmail: async () => EMAIL,
    extractActions: async () => PAYLOAD,
    ...overrides,
  };
}

function app(db: TestDb, d: WebhookDeps = deps()): Express {
  const a = express();
  a.use('/api/webhooks', express.raw({ type: 'application/json' }));
  a.use('/api/webhooks', webhooksRouter(db, d));
  return a;
}

function receivedEvent(emailId = 'em_123', to?: string[]): Buffer {
  const data: Record<string, unknown> = { email_id: emailId };
  if (to) data.to = to;
  return Buffer.from(JSON.stringify({ type: 'email.received', data }), 'utf8');
}

function post(a: Express, body: Buffer, headers: Record<string, string> = {}) {
  return request(a)
    .post('/api/webhooks/resend')
    .set('Content-Type', 'application/json')
    .set(headers)
    // Send as string: supertest JSON-serializes a Buffer body, which would
    // change the signed bytes.
    .send(body.toString('utf8'));
}

describe('POST /api/webhooks/resend', () => {
  let db: TestDb;
  let householdId: string;

  beforeEach(async () => {
    process.env.RESEND_WEBHOOK_SECRET = SECRET;
    db = await createTestDb();
    const [h] = await db.insert(households).values({ name: 'Bruce' }).returning();
    householdId = h.id;
    process.env.BUTLER_HOUSEHOLD_ID = householdId;
  });

  afterEach(() => {
    delete process.env.RESEND_WEBHOOK_SECRET;
    delete process.env.BUTLER_HOUSEHOLD_ID;
    delete process.env.INBOUND_EMAIL_DOMAIN;
  });

  it('rejects unsigned and badly-signed requests with 401', async () => {
    const a = app(db);
    const body = receivedEvent();
    expect((await post(a, body)).status).toBe(401);

    const ts = Math.floor(Date.now() / 1000).toString();
    const bad = await post(a, body, {
      'svix-id': MSG_ID,
      'svix-timestamp': ts,
      'svix-signature': `v1,${sign(MSG_ID, ts, Buffer.from('{"a":2}'))}`,
    });
    expect(bad.status).toBe(401);

    const rows = await db.select().from(butlerProposals);
    expect(rows).toHaveLength(0);
  });

  it('processes a signed email.received: pending proposal + butler channel message', async () => {
    const a = app(db);
    const body = receivedEvent();
    const res = await post(a, body, signedHeaders(body));
    expect(res.status).toBe(200);

    const proposals = await db
      .select()
      .from(butlerProposals)
      .where(eq(butlerProposals.householdId, householdId));
    expect(proposals).toHaveLength(1);
    expect(proposals[0].status).toBe('pending');
    expect(proposals[0].source).toBe('email');
    expect(proposals[0].sender).toBe(EMAIL.from);
    expect(proposals[0].subject).toBe(EMAIL.subject);
    expect(proposals[0].payload).toEqual(PAYLOAD);

    // The household channel is created on demand, then gets the butler message.
    const chans = await db.select().from(channels).where(eq(channels.householdId, householdId));
    expect(chans).toHaveLength(1);
    expect(chans[0].type).toBe('household');

    const messages = await db
      .select()
      .from(channelMessages)
      .where(eq(channelMessages.channelId, chans[0].id));
    expect(messages).toHaveLength(1);
    expect(messages[0].senderUserId).toBeNull();
    expect(messages[0].body).toBe(
      `📧 ${EMAIL.subject}\nFrom: ${EMAIL.from}\n${PAYLOAD.summary}\nProposed: 1 action(s) — review in the Butler inbox on Home.`,
    );
  });

  it('still returns 200 and records an error proposal when extraction fails', async () => {
    const a = app(db, deps({
      extractActions: async () => {
        throw new Error('model exploded');
      },
    }));
    const body = receivedEvent();
    const res = await post(a, body, signedHeaders(body));
    expect(res.status).toBe(200);

    const proposals = await db
      .select()
      .from(butlerProposals)
      .where(eq(butlerProposals.householdId, householdId));
    expect(proposals).toHaveLength(1);
    expect(proposals[0].status).toBe('error');
    expect(proposals[0].payload).toBeNull();
    expect(proposals[0].error).toBe('model exploded');

    const messages = await db.select().from(channelMessages);
    expect(messages).toHaveLength(1);
    expect(messages[0].senderUserId).toBeNull();
    expect(messages[0].body).toBe(
      `I received an email from ${EMAIL.from} (${EMAIL.subject}) but couldn't parse it`,
    );
  });

  it('returns 200 with ignored:true for non-email.received events', async () => {
    const a = app(db);
    const body = Buffer.from(JSON.stringify({ type: 'email.delivered', data: { email_id: 'em_9' } }));
    const res = await post(a, body, signedHeaders(body));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ignored: true });
    expect(await db.select().from(butlerProposals)).toHaveLength(0);
  });

  it('ignores email.received addressed only to a foreign domain (shared Resend account)', async () => {
    let fetched = false;
    const a = app(db, deps({
      fetchReceivedEmail: async () => {
        fetched = true;
        return EMAIL;
      },
    }));
    const body = receivedEvent('em_foreign', ['someone@chatbgp.app']);
    const res = await post(a, body, signedHeaders(body));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ignored: true });

    // Nothing fetched, no proposal, no channel/message created.
    expect(fetched).toBe(false);
    expect(await db.select().from(butlerProposals)).toHaveLength(0);
    expect(await db.select().from(channelMessages)).toHaveLength(0);
    expect(await db.select().from(channels)).toHaveLength(0);
  });

  it('processes email.received addressed to the inbound domain (case-insensitive, mixed recipients)', async () => {
    process.env.INBOUND_EMAIL_DOMAIN = 'Bruces.App';
    const a = app(db);
    const body = receivedEvent('em_ours', ['someone@chatbgp.app', 'PA@BRUCES.APP']);
    const res = await post(a, body, signedHeaders(body));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });

    const proposals = await db
      .select()
      .from(butlerProposals)
      .where(eq(butlerProposals.householdId, householdId));
    expect(proposals).toHaveLength(1);
    expect(proposals[0].status).toBe('pending');

    const messages = await db.select().from(channelMessages);
    expect(messages).toHaveLength(1);
  });

  it('returns 503 butler_not_configured when BUTLER_HOUSEHOLD_ID is unset', async () => {
    delete process.env.BUTLER_HOUSEHOLD_ID;
    const a = app(db);
    const body = receivedEvent();
    const res = await post(a, body, signedHeaders(body));
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ error: 'butler_not_configured' });
    expect(await db.select().from(butlerProposals)).toHaveLength(0);
  });

  it('creates exactly one household channel under concurrent deliveries', async () => {
    const a = app(db);
    const [r1, r2] = await Promise.all(
      ['em_a', 'em_b'].map((id) => {
        const body = receivedEvent(id);
        return post(a, body, signedHeaders(body));
      }),
    );
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);

    const chans = await db
      .select()
      .from(channels)
      .where(eq(channels.householdId, householdId));
    const householdChannels = chans.filter((c) => c.type === 'household');
    expect(householdChannels).toHaveLength(1);

    // Both butler messages land in that single channel.
    const messages = await db
      .select()
      .from(channelMessages)
      .where(eq(channelMessages.channelId, householdChannels[0].id));
    expect(messages).toHaveLength(2);
    expect(messages.every((m) => m.senderUserId === null)).toBe(true);
  });

  it('enforces one household channel per household at the database level', async () => {
    // The partial unique index is the backstop for the webhook's
    // select-then-insert under concurrent Resend retries.
    await db.insert(channels).values({ householdId, type: 'household' });
    const dup = await db
      .insert(channels)
      .values({ householdId, type: 'household' })
      .then(() => null)
      .catch((err: unknown) => err);
    // drizzle wraps the driver error; the unique violation is on the cause.
    expect(dup).toBeTruthy();
    expect(String((dup as { cause?: unknown }).cause)).toMatch(
      /channels_one_household_channel|duplicate key/,
    );

    // 'dm' channels are intentionally unconstrained.
    await db.insert(channels).values({ householdId, type: 'dm' });
    await db.insert(channels).values({ householdId, type: 'dm' });
    const all = await db.select().from(channels).where(eq(channels.householdId, householdId));
    expect(all).toHaveLength(3);
  });
});
