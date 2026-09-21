// Outlook → butler events bridge: mirrors events imported through the legacy
// Outlook sync / ICS forwarding routes into the butler-era `events` table so
// the butler (briefings, reminders, chat context) can see the family
// calendar. Dedupe is by (household_id, external_id) — the unique partial
// index events_household_external_id makes the insert race-safe.
import { createHash } from 'node:crypto';
import { and, eq, inArray } from 'drizzle-orm';
// Explicit `/index`: bare `../../shared/schema` resolves to the legacy shared/schema.ts file.
import { events, householdMembers } from '../../shared/schema/index';
import type { Database } from '../db';

export interface BridgedOutlookEvent {
  // Outlook event id or ICS UID; null → a stable hash of title+start is used.
  externalId?: string | null;
  title: string;
  startsAt: Date;
  endsAt: Date;
}

export function outlookExternalId(e: Pick<BridgedOutlookEvent, 'externalId' | 'title' | 'startsAt'>): string {
  if (e.externalId) return e.externalId;
  return createHash('sha1').update(`${e.title}|${e.startsAt.toISOString()}`).digest('hex').slice(0, 32);
}

// The household a (Supabase auth) user belongs to, or null when they have
// none — callers skip bridging silently in that case.
export async function householdIdForUser(db: Database, userId: string): Promise<string | null> {
  const [member] = await db
    .select({ householdId: householdMembers.householdId })
    .from(householdMembers)
    .where(eq(householdMembers.userId, userId));
  return member?.householdId ?? null;
}

// Inserts rows as source='outlook', category='household', skipping any whose
// external id already exists for the household. Returns the number inserted.
export async function bridgeOutlookEvents(
  db: Database,
  householdId: string,
  rows: BridgedOutlookEvent[],
): Promise<number> {
  if (rows.length === 0) return 0;

  const seen = new Set<string>();
  const candidates = rows
    .map((r) => ({ ...r, externalId: outlookExternalId(r) }))
    .filter((r) => !seen.has(r.externalId) && (seen.add(r.externalId), true));

  const existing = await db
    .select({ externalId: events.externalId })
    .from(events)
    .where(
      and(
        eq(events.householdId, householdId),
        inArray(events.externalId, candidates.map((r) => r.externalId)),
      ),
    );
  const existingSet = new Set(existing.map((e) => e.externalId));
  const fresh = candidates.filter((r) => !existingSet.has(r.externalId));
  if (fresh.length === 0) return 0;

  await db
    .insert(events)
    .values(
      fresh.map((r) => ({
        householdId,
        title: r.title,
        startsAt: r.startsAt,
        endsAt: r.endsAt,
        category: 'household' as const,
        source: 'outlook' as const,
        externalId: r.externalId,
      })),
    )
    .onConflictDoNothing();
  return fresh.length;
}
