// Proactive butler: morning briefing (08:00–08:02 Europe/London) and 30-minute
// event reminders, posted to each household's channel. Dedupe keys live in
// butler_memory (claim-first via onConflictDoNothing, so concurrent ticks or
// processes post at most once). Nothing here throws across a tick — each
// household is isolated in its own try/catch.
import { and, asc, eq, gt, gte, inArray, lt, lte } from 'drizzle-orm';
// Explicit `/index`: bare `../../shared/schema` resolves to the legacy shared/schema.ts file.
import { butlerMemory, butlerProposals, events, households, tasks } from '../../shared/schema/index';
import { londonClock, londonTime, londonToday } from './butler-chat';
import { postButlerMessage } from './butler-message';
import type { Database } from '../db';

export interface SchedulerOptions {
  intervalMs?: number;
  now?: () => Date;
}

const BRIEFING_START_MIN = 480; // 08:00 London
const BRIEFING_END_MIN = 482; // through 08:02 London
const REMINDER_WINDOW_MS = 30 * 60_000;

// Returns true iff this call claimed the key (no row = another tick won).
async function claimKey(db: Database, householdId: string, key: string): Promise<boolean> {
  const rows = await db
    .insert(butlerMemory)
    .values({ householdId, key, value: 'posted', provenance: 'scheduler' })
    .onConflictDoNothing()
    .returning({ id: butlerMemory.id });
  return rows.length > 0;
}

function briefingBody(
  date: string,
  todaysEvents: { title: string; startsAt: Date }[],
  dueToday: string[],
  dueTomorrow: string[],
  pendingProposals: number,
): string {
  const lines = [`Morning ☀️`];
  if (todaysEvents.length > 0) {
    lines.push('Today:');
    for (const e of todaysEvents) lines.push(`${londonTime(e.startsAt)} ${e.title}`);
  }
  if (dueToday.length > 0) lines.push(`Due today: ${dueToday.join('; ')}`);
  if (dueTomorrow.length > 0) lines.push(`Due tomorrow: ${dueTomorrow.join('; ')}`);
  if (pendingProposals > 0) {
    lines.push(`${pendingProposals} proposal${pendingProposals === 1 ? '' : 's'} waiting in the Butler inbox.`);
  }
  if (lines.length === 1) lines.push(`Nothing on today (${date}) — enjoy the quiet one.`);
  return lines.join('\n');
}

async function briefHousehold(db: Database, householdId: string, now: Date): Promise<void> {
  const { date, minutesSinceMidnight } = londonClock(now);
  if (minutesSinceMidnight < BRIEFING_START_MIN || minutesSinceMidnight > BRIEFING_END_MIN) return;
  if (!(await claimKey(db, householdId, `scheduler:briefing:${date}`))) return;

  const { start, end } = londonToday(now);
  const tomorrow = new Date(Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10)) + 24 * 3600_000)
    .toISOString()
    .slice(0, 10);
  const [todaysEvents, dueRows, pending] = await Promise.all([
    db
      .select({ title: events.title, startsAt: events.startsAt })
      .from(events)
      .where(and(eq(events.householdId, householdId), gte(events.startsAt, start), lt(events.startsAt, end)))
      .orderBy(asc(events.startsAt)),
    db
      .select({ title: tasks.title, dueDate: tasks.dueDate })
      .from(tasks)
      .where(
        and(
          eq(tasks.householdId, householdId),
          eq(tasks.status, 'todo'),
          inArray(tasks.dueDate, [date, tomorrow]),
        ),
      )
      .orderBy(asc(tasks.dueDate)),
    db
      .select({ id: butlerProposals.id })
      .from(butlerProposals)
      .where(and(eq(butlerProposals.householdId, householdId), eq(butlerProposals.status, 'pending'))),
  ]);
  await postButlerMessage(
    db,
    householdId,
    briefingBody(
      date,
      todaysEvents,
      dueRows.filter((t) => t.dueDate === date).map((t) => t.title),
      dueRows.filter((t) => t.dueDate === tomorrow).map((t) => t.title),
      pending.length,
    ),
  );
}

async function remindHousehold(db: Database, householdId: string, now: Date): Promise<void> {
  const upcoming = await db
    .select({ id: events.id, title: events.title })
    .from(events)
    .where(
      and(
        eq(events.householdId, householdId),
        gt(events.startsAt, now),
        lte(events.startsAt, new Date(now.getTime() + REMINDER_WINDOW_MS)),
      ),
    )
    .orderBy(asc(events.startsAt));
  for (const e of upcoming) {
    if (await claimKey(db, householdId, `scheduler:reminder:${e.id}`)) {
      await postButlerMessage(db, householdId, `⏰ '${e.title}' in ~30 min`);
    }
  }
}

export async function runSchedulerTick(db: Database, now = new Date()): Promise<void> {
  const all = await db.select({ id: households.id }).from(households);
  for (const h of all) {
    try {
      await briefHousehold(db, h.id, now);
      await remindHousehold(db, h.id, now);
    } catch (err) {
      console.error(`butler scheduler tick failed for household ${h.id}`, err);
    }
  }
}

export function startButlerScheduler(db: Database, opts: SchedulerOptions = {}): () => void {
  const intervalMs = opts.intervalMs ?? 60_000;
  const now = opts.now ?? (() => new Date());
  const tick = () => {
    runSchedulerTick(db, now()).catch((err: unknown) =>
      console.error('butler scheduler tick failed', err),
    );
  };
  tick();
  const handle = setInterval(tick, intervalMs);
  return () => clearInterval(handle);
}
