import { and, eq } from 'drizzle-orm';
// Explicit `/index`: bare `../../shared/schema` resolves to the legacy shared/schema.ts file.
import { channelMessages, channels } from '../../shared/schema/index';
import { sendPushToHousehold, type HouseholdPushFn } from './push';
import type { Database } from '../db';

// Finds (or creates, mirroring household creation) the household's shared
// butler channel.
export async function householdChannelId(db: Database, householdId: string): Promise<string> {
  const [existing] = await db
    .select()
    .from(channels)
    .where(and(eq(channels.householdId, householdId), eq(channels.type, 'household')));
  if (existing) return existing.id;
  // Race-safe against concurrent callers: the partial unique index
  // channels_one_household_channel lets at most one of the inserts win.
  await db.insert(channels).values({ householdId, type: 'household' }).onConflictDoNothing();
  const [channel] = await db
    .select()
    .from(channels)
    .where(and(eq(channels.householdId, householdId), eq(channels.type, 'household')));
  return channel.id;
}

export async function postButlerMessage(
  db: Database,
  householdId: string,
  body: string,
  push: HouseholdPushFn = sendPushToHousehold,
): Promise<void> {
  const channelId = await householdChannelId(db, householdId);
  await db.insert(channelMessages).values({ channelId, senderUserId: null, body });
  // Push is fire-and-forget after the insert: a push failure must never
  // affect message delivery. Deferred so callers see zero added latency.
  setImmediate(() => {
    Promise.resolve(
      push(db, householdId, { title: 'Butler', body: body.slice(0, 120), route: '/chat' }),
    ).catch((err: unknown) => console.error('Butler push failed', err));
  });
}
