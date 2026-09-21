import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createTestDb, type TestDb } from './db';
import { sendPushToUser, sendPushToHouseholdWith, type PushPayload } from '../lib/push';
import { postButlerMessage } from '../lib/butler-message';
import type { Database } from '../db';
import { householdMembers, households } from '../../shared/schema/index';

// web-push is mocked: no VAPID key validation, no network.
vi.mock('web-push', () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn(),
  },
}));

function fakeSupabase(tokens: { token: string; platform: string }[]) {
  const deletedTokens: string[] = [];
  const client = {
    from: () => ({
      select: () => ({
        eq: () => Promise.resolve({ data: tokens, error: null }),
      }),
      delete: () => ({
        eq: (_col: string, token: string) => {
          deletedTokens.push(token);
          return Promise.resolve({ error: null });
        },
      }),
    }),
  };
  return { client: client as unknown as SupabaseClient, deletedTokens };
}

const ENV_KEYS = ['VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'FCM_SERVICE_ACCOUNT'];

async function makeServiceAccount(): Promise<string> {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['sign', 'verify'],
  );
  const pkcs8 = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
  const b64 = btoa(String.fromCharCode(...new Uint8Array(pkcs8)));
  const pem = `-----BEGIN PRIVATE KEY-----\n${b64}\n-----END PRIVATE KEY-----`;
  return JSON.stringify({
    client_email: 'push@demo.iam.gserviceaccount.com',
    private_key: pem,
    token_uri: 'https://oauth.example/token',
    project_id: 'demo-project',
  });
}

describe('sendPushToUser', () => {
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      savedEnv[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (savedEnv[key] === undefined) delete process.env[key];
      else process.env[key] = savedEnv[key];
    }
  });

  it('returns no_tokens when the user has no registered devices', async () => {
    const { client } = fakeSupabase([]);
    const res = await sendPushToUser('u1', { title: 'Butler', body: 'hi' }, { supabase: client });
    expect(res).toMatchObject({ sent: 0, failed: 0, reason: 'no_tokens' });
  });

  it('sends web pushes and cleans up 410/404 subscriptions', async () => {
    process.env.VAPID_PUBLIC_KEY = 'pub';
    process.env.VAPID_PRIVATE_KEY = 'priv';
    const tokens = [
      { token: JSON.stringify({ endpoint: 'https://push.example/live' }), platform: 'web' },
      { token: JSON.stringify({ endpoint: 'https://push.example/dead' }), platform: 'web' },
    ];
    const { client, deletedTokens } = fakeSupabase(tokens);
    const sendWeb = vi.fn(async (sub: { endpoint: string }, payload: string) => {
      if (JSON.parse(payload).data.route !== '/chat') throw new Error('missing route');
      if (sub.endpoint.includes('dead')) {
        const err = new Error('gone') as Error & { statusCode: number };
        err.statusCode = 410;
        throw err;
      }
    });

    const res = await sendPushToUser(
      'u1',
      { title: 'Butler', body: 'Morning briefing', route: '/chat' },
      { supabase: client, sendWebNotification: sendWeb },
    );

    expect(sendWeb).toHaveBeenCalledTimes(2);
    expect(res).toMatchObject({ sent: 1, failed: 1, cleaned: 1 });
    expect(deletedTokens).toEqual([tokens[1].token]);
  });

  it('sends native pushes via FCM and cleans up UNREGISTERED tokens', async () => {
    process.env.FCM_SERVICE_ACCOUNT = await makeServiceAccount();
    const tokens = [
      { token: 'fcm-live', platform: 'ios' },
      { token: 'fcm-dead', platform: 'android' },
    ];
    const { client, deletedTokens } = fakeSupabase(tokens);

    const fetchFn = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const u = String(url);
      if (u === 'https://oauth.example/token') {
        return { json: async () => ({ access_token: 'oauth-tok' }) } as unknown as Response;
      }
      expect(u).toBe('https://fcm.googleapis.com/v1/projects/demo-project/messages:send');
      expect((init!.headers as Record<string, string>).Authorization).toBe('Bearer oauth-tok');
      const body = JSON.parse(init!.body as string);
      expect(body.message.notification.title).toBe('Butler');
      if (body.message.token === 'fcm-dead') {
        return {
          json: async () => ({ error: { details: [{ errorCode: 'UNREGISTERED' }] } }),
        } as unknown as Response;
      }
      return { json: async () => ({ name: 'messages/1' }) } as unknown as Response;
    });

    const res = await sendPushToUser(
      'u1',
      { title: 'Butler', body: 'Reminder', route: '/chat' },
      { supabase: client, fetchFn: fetchFn as unknown as typeof fetch },
    );

    expect(res).toMatchObject({ sent: 1, failed: 1, cleaned: 1 });
    expect(deletedTokens).toEqual(['fcm-dead']);
  });
});

describe('sendPushToHouseholdWith', () => {
  let db: TestDb;

  beforeEach(async () => {
    db = await createTestDb();
  });

  it('pushes every household member and never throws on per-member failure', async () => {
    const [h] = await db.insert(households).values({ name: 'Bruce' }).returning();
    await db.insert(householdMembers).values([
      { householdId: h.id, userId: 'u1', displayName: 'Alex' },
      { householdId: h.id, userId: 'u2', displayName: 'Sam' },
    ]);

    const sendUser = vi.fn(async (userId: string) => {
      if (userId === 'u2') throw new Error('boom');
    });
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      sendPushToHouseholdWith(db, h.id, { title: 'Butler', body: 'hi', route: '/chat' }, sendUser),
    ).resolves.toBeUndefined();

    expect(sendUser).toHaveBeenCalledTimes(2);
    expect(sendUser).toHaveBeenCalledWith('u1', { title: 'Butler', body: 'hi', route: '/chat' });
    expect(sendUser).toHaveBeenCalledWith('u2', { title: 'Butler', body: 'hi', route: '/chat' });
    errSpy.mockRestore();
  });
});

describe('postButlerMessage push trigger', () => {
  let db: TestDb;

  beforeEach(async () => {
    db = await createTestDb();
  });

  it('inserts the message then pushes the household (fire-and-forget)', async () => {
    const [h] = await db.insert(households).values({ name: 'Bruce' }).returning();
    const push = vi.fn(async (_db: Database, _hh: string, _payload: PushPayload) => {});

    const longBody = 'x'.repeat(200);
    await postButlerMessage(db, h.id, longBody, push);
    // The push is deferred via setImmediate; flush it.
    await new Promise((resolve) => setImmediate(resolve));

    expect(push).toHaveBeenCalledTimes(1);
    const [pushDb, householdId, payload] = push.mock.calls[0];
    expect(pushDb).toBe(db);
    expect(householdId).toBe(h.id);
    expect(payload.title).toBe('Butler');
    expect(payload.route).toBe('/chat');
    expect(payload.body).toBe('x'.repeat(120));
  });

  it('still resolves when the push fn rejects', async () => {
    const [h] = await db.insert(households).values({ name: 'Bruce' }).returning();
    const push = vi.fn(async () => {
      throw new Error('push down');
    });
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(postButlerMessage(db, h.id, 'hello', push)).resolves.toBeUndefined();
    await new Promise((resolve) => setImmediate(resolve));
    expect(push).toHaveBeenCalledTimes(1);
    errSpy.mockRestore();
  });
});
