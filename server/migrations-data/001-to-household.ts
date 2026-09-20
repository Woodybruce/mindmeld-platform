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

export interface SkippedRows {
  count: number;
  ids: string[];
}

export interface MigrationSummary {
  households: number;
  tasks: number;
  lists: number;
  listItems: number;
  events: number;
  skipped: {
    weeklyTasks: SkippedRows;
    sharedLists: SkippedRows;
    calendarEvents: SkippedRows;
  };
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
    const summary: MigrationSummary = {
      households: 0,
      tasks: 0,
      lists: 0,
      listItems: 0,
      events: 0,
      skipped: {
        weeklyTasks: { count: 0, ids: [] },
        sharedLists: { count: 0, ids: [] },
        calendarEvents: { count: 0, ids: [] },
      },
    };

    // Users already placed in a household make the whole migration resumable.
    const existingMembers = await tx.select().from(householdMembers);
    const householdByUserId = new Map(existingMembers.map((m) => [m.userId, m.householdId]));

    const allProfiles = await tx.select().from(profiles);
    const profileById = new Map(allProfiles.map((p) => [p.id, p]));

    // Group profiles into households by connected components (union-find) over
    // partner links treated as undirected edges: a one-sided link A->B must keep
    // A and B together regardless of scan order. Solo users (no partner, or a
    // dangling partner id) stay single-member components.
    const parent = new Map<string, string>(allProfiles.map((p) => [p.id, p.id]));
    const find = (id: string): string => {
      let root = id;
      while (parent.get(root) !== root) root = parent.get(root)!;
      // path compression
      let cur = id;
      while (parent.get(cur) !== cur) {
        const next = parent.get(cur)!;
        parent.set(cur, root);
        cur = next;
      }
      return root;
    };
    for (const profile of allProfiles) {
      if (profile.partnerId && profileById.has(profile.partnerId)) {
        parent.set(find(profile.id), find(profile.partnerId));
      }
    }
    const groupByRoot = new Map<string, LegacyProfile[]>();
    for (const profile of allProfiles) {
      const root = find(profile.id);
      const group = groupByRoot.get(root);
      if (group) group.push(profile);
      else groupByRoot.set(root, [profile]);
    }
    const groups = [...groupByRoot.values()];

    for (const group of groups) {
      // Any group member may already be placed in a household (e.g. signed up
      // via the API before the migration ran). Reuse that household instead of
      // creating a new one; if placed members map to different households,
      // prefer the one already containing more group members (ties: first found).
      let householdId: string | undefined;
      const placedCounts = new Map<string, number>();
      for (const member of group) {
        const existing = householdByUserId.get(member.id);
        if (existing) placedCounts.set(existing, (placedCounts.get(existing) ?? 0) + 1);
      }
      let bestCount = 0;
      for (const [candidate, count] of placedCounts) {
        if (count > bestCount) {
          bestCount = count;
          householdId = candidate;
        }
      }
      if (!householdId) {
        const names = group.map((p) => p.username ?? 'Member');
        const name = names.join(' & ');
        const [household] = await tx.insert(households).values({ name }).returning();
        householdId = household.id;
        // Every new household gets its shared butler channel at creation time.
        await tx.insert(channels).values({ householdId: household.id, type: 'household' });
        summary.households += 1;
      }
      const unplaced = group.filter((p) => !householdByUserId.has(p.id));
      if (unplaced.length > 0) {
        await tx.insert(householdMembers).values(
          unplaced.map((p) => ({
            householdId: householdId!,
            userId: p.id,
            displayName: p.username ?? 'Member',
          })),
        );
      }
      for (const member of group) householdByUserId.set(member.id, householdId);
    }

    const migratedTasks = await alreadyMigrated(tx, 'weekly_tasks', 'tasks');
    const legacyTasks = await tx.select().from(weeklyTasks);
    for (const legacy of legacyTasks) {
      const marker = `weekly_tasks:${legacy.id}`;
      if (migratedTasks.has(marker)) continue;
      const householdId = householdByUserId.get(legacy.userId);
      if (!householdId) {
        // orphan: owner has no profile/household
        summary.skipped.weeklyTasks.count += 1;
        summary.skipped.weeklyTasks.ids.push(legacy.id);
        continue;
      }
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
      if (!householdId) {
        summary.skipped.sharedLists.count += 1;
        summary.skipped.sharedLists.ids.push(legacy.id);
        continue;
      }
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
      if (!householdId) {
        summary.skipped.calendarEvents.count += 1;
        summary.skipped.calendarEvents.ids.push(legacy.id);
        continue;
      }
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
    for (const [table, skipped] of Object.entries(summary.skipped)) {
      if (skipped.count > 0) {
        console.warn(`skipped ${skipped.count} orphan ${table} row(s): ${skipped.ids.join(', ')}`);
      }
    }
  } finally {
    await pool.end();
  }
}
