import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
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
import type { Database } from '../db';

export interface MigrationSummary {
  households: number;
  tasks: number;
  lists: number;
  listItems: number;
  events: number;
}

type LegacyProfile = typeof profiles.$inferSelect;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

// Legacy shared_lists.items is a free-form jsonb array; normalise each entry.
function toListItemText(item: unknown): { text: string; checked: boolean } {
  if (typeof item === 'string') return { text: item, checked: false };
  if (item !== null && typeof item === 'object') {
    const record = item as Record<string, unknown>;
    const raw = record.text ?? record.name ?? record.title;
    const text = typeof raw === 'string' ? raw : JSON.stringify(item);
    const checked = record.checked ?? record.done;
    return { text, checked: checked === true };
  }
  return { text: String(item), checked: false };
}

function listTypeFromTemplate(template: string | null): 'shopping' | 'packing' | 'generic' {
  if (template === 'shopping' || template === 'packing') return template;
  return 'generic';
}

async function alreadyMigrated(tx: Transaction, prefix: string, table: 'tasks' | 'lists' | 'events'): Promise<Set<string>> {
  const source = { tasks, lists, events }[table];
  const rows = await tx.select({ migratedFrom: source.migratedFrom }).from(source);
  return new Set(
    rows
      .map((row) => row.migratedFrom)
      .filter((marker): marker is string => marker !== null && marker.startsWith(`${prefix}:`)),
  );
}

export async function migrateToHousehold(db: Database): Promise<MigrationSummary> {
  return db.transaction(async (tx) => {
    const summary: MigrationSummary = { households: 0, tasks: 0, lists: 0, listItems: 0, events: 0 };

    // Users already placed in a household make the whole migration resumable.
    const existingMembers = await tx.select().from(householdMembers);
    const householdByUserId = new Map(existingMembers.map((m) => [m.userId, m.householdId]));

    const allProfiles = await tx.select().from(profiles);
    const profileById = new Map(allProfiles.map((p) => [p.id, p]));

    // Group profiles into households: mutual or one-sided partner links share
    // one household; solo users (no partner, or dangling partner id) get their own.
    const seen = new Set<string>();
    const groups: LegacyProfile[][] = [];
    for (const profile of allProfiles) {
      if (seen.has(profile.id)) continue;
      const partner = profile.partnerId ? profileById.get(profile.partnerId) : undefined;
      if (partner && !seen.has(partner.id)) {
        seen.add(profile.id);
        seen.add(partner.id);
        groups.push([profile, partner]);
      } else {
        seen.add(profile.id);
        groups.push([profile]);
      }
    }

    for (const group of groups) {
      let householdId = householdByUserId.get(group[0].id);
      if (!householdId) {
        const names = group.map((p) => p.username ?? 'Member');
        const name = names.join(' & ');
        const [household] = await tx.insert(households).values({ name }).returning();
        householdId = household.id;
        await tx.insert(householdMembers).values(
          group.map((p) => ({
            householdId: household.id,
            userId: p.id,
            displayName: p.username ?? 'Member',
          })),
        );
        // Every household gets its shared butler channel at creation time.
        await tx.insert(channels).values({ householdId: household.id, type: 'household' });
        summary.households += 1;
      }
      for (const member of group) householdByUserId.set(member.id, householdId);
    }

    const migratedTasks = await alreadyMigrated(tx, 'weekly_tasks', 'tasks');
    const legacyTasks = await tx.select().from(weeklyTasks);
    for (const legacy of legacyTasks) {
      const marker = `weekly_tasks:${legacy.id}`;
      if (migratedTasks.has(marker)) continue;
      const householdId = householdByUserId.get(legacy.userId);
      if (!householdId) continue; // orphan: owner has no profile/household
      await tx.insert(tasks).values({
        householdId,
        title: legacy.text,
        status: legacy.done ? 'done' : 'todo',
        dueDate: legacy.scheduledDate,
        source: 'manual', // legacy weekly_tasks only ever held manual entries
        assigneeUserId: legacy.userId,
        attachments: Array.isArray(legacy.attachments) ? legacy.attachments : [],
        migratedFrom: marker,
      });
      summary.tasks += 1;
    }

    const migratedLists = await alreadyMigrated(tx, 'shared_lists', 'lists');
    const legacyLists = await tx.select().from(sharedLists);
    for (const legacy of legacyLists) {
      const marker = `shared_lists:${legacy.id}`;
      if (migratedLists.has(marker)) continue;
      const householdId = householdByUserId.get(legacy.userId);
      if (!householdId) continue;
      const [list] = await tx
        .insert(lists)
        .values({
          householdId,
          name: legacy.name,
          type: listTypeFromTemplate(legacy.template),
          aiSuggestable: legacy.aiSuggestable,
          migratedFrom: marker,
        })
        .returning();
      const rawItems = Array.isArray(legacy.items) ? legacy.items : [];
      for (const raw of rawItems) {
        const item = toListItemText(raw);
        await tx.insert(listItems).values({
          listId: list.id,
          text: item.text,
          checked: item.checked,
          addedByUserId: legacy.userId,
        });
        summary.listItems += 1;
      }
      summary.lists += 1;
    }

    const migratedEvents = await alreadyMigrated(tx, 'calendar_events', 'events');
    const legacyEvents = await tx.select().from(calendarEvents);
    for (const legacy of legacyEvents) {
      const marker = `calendar_events:${legacy.id}`;
      if (migratedEvents.has(marker)) continue;
      const householdId = householdByUserId.get(legacy.userId);
      if (!householdId) continue;
      await tx.insert(events).values({
        householdId,
        title: legacy.subject,
        startsAt: legacy.startTime,
        endsAt: legacy.endTime,
        category: 'us',
        source: legacy.source === 'outlook' ? 'outlook' : 'manual',
        migratedFrom: marker,
      });
      summary.events += 1;
    }

    return summary;
  });
}

// One-off runner: DATABASE_URL=... npx tsx server/migrations-data/001-to-household.ts
const invokedDirectly =
  process.argv[1] !== undefined && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (invokedDirectly) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL must be set');
    process.exit(1);
  }
  const pool = new pg.Pool({ connectionString: url });
  const db = drizzle(pool);
  try {
    const summary = await migrateToHousehold(db as unknown as Database);
    console.log('migration complete:', summary);
  } finally {
    await pool.end();
  }
}
