// Explicit `/index`: bare `../../shared/schema` resolves to the legacy shared/schema.ts file.
import { butlerMemory, events, tasks } from '../../shared/schema/index';
import type { ButlerAction } from '../../shared/validation/proposals';
import type { Database } from '../db';

// Drizzle transaction handle (same pattern as server/migrations-data/001-to-household.ts).
type Tx = Parameters<Parameters<Database['transaction']>[0]>[0];

export interface ApplyCounts {
  tasks: number;
  events: number;
  memories: number;
}

export type CreateEventAction = Extract<ButlerAction, { type: 'create_event' }>;

// Single source for event timing: a missing endsAt defaults to one hour.
// Used both when inserting the event row and when building the diary invite.
export function eventTiming(action: CreateEventAction): { startsAt: Date; endsAt: Date } {
  const startsAt = new Date(action.startsAt);
  const endsAt = action.endsAt ? new Date(action.endsAt) : new Date(startsAt.getTime() + 3600_000);
  return { startsAt, endsAt };
}

export async function applyActions(
  db: Database | Tx,
  householdId: string,
  actions: ButlerAction[],
): Promise<ApplyCounts> {
  const counts: ApplyCounts = { tasks: 0, events: 0, memories: 0 };
  for (const action of actions) {
    switch (action.type) {
      case 'create_task':
        await db.insert(tasks).values({
          householdId,
          title: action.title,
          notes: action.notes,
          dueDate: action.dueDate,
          source: 'butler',
        });
        counts.tasks += 1;
        break;
      case 'create_event': {
        const { startsAt, endsAt } = eventTiming(action);
        await db.insert(events).values({
          householdId,
          title: action.title,
          startsAt,
          endsAt,
          category: 'household',
          source: 'butler',
        });
        counts.events += 1;
        break;
      }
      case 'remember':
        // One row per (householdId, key), enforced by
        // butler_memory_household_key_unique; conflicts upsert in place.
        await db
          .insert(butlerMemory)
          .values({ householdId, key: action.key, value: action.value, provenance: 'email' })
          .onConflictDoUpdate({
            target: [butlerMemory.householdId, butlerMemory.key],
            set: { value: action.value },
          });
        counts.memories += 1;
        break;
    }
  }
  return counts;
}
