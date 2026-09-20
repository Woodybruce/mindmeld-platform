import { and, eq } from 'drizzle-orm';
// Explicit `/index`: bare `../../shared/schema` resolves to the legacy shared/schema.ts file.
import { butlerMemory, events, tasks } from '../../shared/schema/index';
import type { ButlerAction } from '../../shared/validation/proposals';
import type { Database } from '../db';

export interface ApplyCounts {
  tasks: number;
  events: number;
  memories: number;
}

export async function applyActions(
  db: Database,
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
        const startsAt = new Date(action.startsAt);
        const endsAt = action.endsAt
          ? new Date(action.endsAt)
          : new Date(startsAt.getTime() + 3600_000);
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
      case 'remember': {
        const where = and(
          eq(butlerMemory.householdId, householdId),
          eq(butlerMemory.key, action.key),
        );
        const [existing] = await db.select({ id: butlerMemory.id }).from(butlerMemory).where(where);
        if (existing) {
          await db.update(butlerMemory).set({ value: action.value }).where(eq(butlerMemory.id, existing.id));
        } else {
          // butler_memory_household_key_unique is the race-safe backstop for a
          // concurrent insert of the same key.
          await db
            .insert(butlerMemory)
            .values({ householdId, key: action.key, value: action.value, provenance: 'email' })
            .catch(async (err: unknown) => {
              const cause = String((err as { cause?: unknown }).cause ?? err);
              if (!/butler_memory_household_key_unique|duplicate key/.test(cause)) throw err;
              await db.update(butlerMemory).set({ value: action.value }).where(where);
            });
        }
        counts.memories += 1;
        break;
      }
    }
  }
  return counts;
}
