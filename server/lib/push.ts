// Reusable push delivery: sends a notification to every device a user has
// registered (web-push subscriptions + native FCM tokens from the legacy
// device_tokens table) and cleans up dead tokens. Extracted from the legacy
// POST /api/send-push-notification handler so the butler can push too.
//
// Everything here is fire-and-forget safe: sendPushToUser and
// sendPushToHousehold never throw — failures are logged and counted.
// Injectable deps (supabase client, web-push sender, fetch) keep tests off
// the network, same pattern as callModel in butler-chat.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import webpush from 'web-push';
import { eq } from 'drizzle-orm';
// Explicit `/index`: bare `../../shared/schema` resolves to the legacy shared/schema.ts file.
import { householdMembers } from '../../shared/schema/index';
import type { Database } from '../db';

export interface PushPayload {
  title: string;
  body: string;
  route?: string;
  data?: Record<string, string>;
}

export interface PushResult {
  sent: number;
  failed: number;
  cleaned: number;
  reason?: 'no_tokens' | 'not_configured';
}

export interface PushDeps {
  supabase?: SupabaseClient;
  sendWebNotification?: (subscription: any, payload: string) => Promise<unknown>;
  fetchFn?: typeof fetch;
}

let adminClient: SupabaseClient | null | undefined;

function getAdminClient(): SupabaseClient | null {
  if (adminClient !== undefined) return adminClient;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  adminClient = url && key ? createClient(url, key) : null;
  return adminClient;
}

interface ServiceAccount {
  client_email: string;
  private_key: string;
  token_uri: string;
  project_id: string;
}

// Mint an OAuth access token for FCM HTTP v1 from the service-account JSON.
export async function getFcmAccessToken(
  serviceAccount: ServiceAccount,
  fetchFn: typeof fetch = fetch,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: serviceAccount.token_uri,
    iat: now,
    exp: now + 3600,
  };

  const encode = (obj: unknown) =>
    btoa(JSON.stringify(obj))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

  const unsignedToken = `${encode(header)}.${encode(payload)}`;

  const pemBody = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  const binaryKey = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(unsignedToken),
  );

  const sig = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const jwt = `${unsignedToken}.${sig}`;

  const res = await fetchFn(serviceAccount.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  const data = await res.json();
  if (!data.access_token) {
    throw new Error(`Failed to get access token: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
  deps: PushDeps = {},
): Promise<PushResult> {
  const result: PushResult = { sent: 0, failed: 0, cleaned: 0 };
  try {
    const supabase = deps.supabase ?? getAdminClient();
    if (!supabase) {
      result.reason = 'not_configured';
      return result;
    }
    const sendWeb = deps.sendWebNotification ?? webpush.sendNotification.bind(webpush);
    const fetchFn = deps.fetchFn ?? fetch;

    const data: Record<string, string> = { ...(payload.data ?? {}) };
    if (payload.route) data.route = payload.route;

    const { data: tokens, error: tokenError } = await supabase
      .from('device_tokens')
      .select('token, platform')
      .eq('user_id', userId);

    if (tokenError) throw new Error(`Failed to fetch tokens: ${tokenError.message}`);
    if (!tokens || tokens.length === 0) {
      result.reason = 'no_tokens';
      return result;
    }

    const webTokens = tokens.filter((t: { platform: string }) => t.platform === 'web');
    const nativeTokens = tokens.filter((t: { platform: string }) => t.platform !== 'web');

    // Web push subscriptions
    if (webTokens.length > 0) {
      const vapidPublic = process.env.VAPID_PUBLIC_KEY;
      const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
      if (vapidPublic && vapidPrivate) {
        webpush.setVapidDetails('mailto:app@us-app.com', vapidPublic, vapidPrivate);

        await Promise.allSettled(
          webTokens.map(async ({ token }: { token: string }) => {
            try {
              const subscription = JSON.parse(token);
              await sendWeb(
                subscription,
                JSON.stringify({ title: payload.title, body: payload.body, data }),
              );
              result.sent++;
            } catch (err: any) {
              result.failed++;
              if (err.statusCode === 410 || err.statusCode === 404) {
                await supabase.from('device_tokens').delete().eq('token', token);
                result.cleaned++;
              }
            }
          }),
        );
      }
    }

    // Native FCM tokens
    if (nativeTokens.length > 0) {
      const serviceAccountJson = process.env.FCM_SERVICE_ACCOUNT;
      if (serviceAccountJson) {
        const serviceAccount = JSON.parse(serviceAccountJson) as ServiceAccount;
        const accessToken = await getFcmAccessToken(serviceAccount, fetchFn);
        const fcmUrl = `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`;

        await Promise.allSettled(
          nativeTokens.map(async ({ token }: { token: string }) => {
            try {
              const fcmRes = await fetchFn(fcmUrl, {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  message: {
                    token,
                    notification: { title: payload.title, body: payload.body },
                    data,
                    apns: { payload: { aps: { sound: 'default' } } },
                    android: { priority: 'HIGH', notification: { sound: 'default' } },
                  },
                }),
              });

              const fcmResult = await fcmRes.json();

              if (
                fcmResult.error?.details?.some(
                  (d: any) => d.errorCode === 'UNREGISTERED' || d.errorCode === 'NOT_FOUND',
                )
              ) {
                await supabase.from('device_tokens').delete().eq('token', token);
                result.cleaned++;
                result.failed++;
              } else if (fcmResult.error) {
                result.failed++;
              } else {
                result.sent++;
              }
            } catch {
              result.failed++;
            }
          }),
        );
      }
    }
  } catch (err) {
    console.error('sendPushToUser failed', err);
  }
  return result;
}

export type HouseholdPushFn = (
  db: Database,
  householdId: string,
  payload: PushPayload,
) => Promise<unknown>;

// Push to every member of a household. Per-member failures are logged, never
// propagated — safe to call fire-and-forget. `sendUser` is injectable for
// tests.
export const sendPushToHousehold: HouseholdPushFn = async (db, householdId, payload) => {
  return sendPushToHouseholdWith(db, householdId, payload, sendPushToUser);
};

export async function sendPushToHouseholdWith(
  db: Database,
  householdId: string,
  payload: PushPayload,
  sendUser: (userId: string, payload: PushPayload) => Promise<unknown>,
): Promise<void> {
  try {
    const members = await db
      .select({ userId: householdMembers.userId })
      .from(householdMembers)
      .where(eq(householdMembers.householdId, householdId));
    const results = await Promise.allSettled(members.map((m) => sendUser(m.userId, payload)));
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        console.error(`Push to household member ${members[i].userId} failed`, r.reason);
      }
    });
  } catch (err) {
    console.error('sendPushToHousehold failed', err);
  }
}
