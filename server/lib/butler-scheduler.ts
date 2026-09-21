// Proactive butler: morning briefing (08:00–08:02 Europe/London) and 30-minute
// event reminders, posted to each household's channel. Dedupe keys live in
// butler_memory (claim-first via onConflictDoNothing, so concurrent ticks or
// processes post at most once). Nothing here throws across a tick — each
// household is isolated in its own try/catch.
import { and, asc, eq, gt, gte, inArray, lt, lte } from 'drizzle-orm';
// Explicit `/index`: bare `../../shared/schema` resolves to the legacy shared/schema.ts file.
import {
  butlerMemory,
  butlerProposals,
  events,
  households,
  renewals,
  schoolEvents,
  schools,
  tasks,
} from '../../shared/schema/index';
import { londonClock, londonTime, londonToday } from './butler-chat';
import { postButlerMessage } from './butler-message';
import { butlerNotifyEmails, sendButlerEmail } from './outbound-email';
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
  schoolEventsWeek: { title: string; date: string; schoolName: string }[],
  pendingProposals: number,
): string {
  const lines = [`Morning ☀️`];
  if (todaysEvents.length > 0) {
    lines.push('Today:');
    for (const e of todaysEvents) lines.push(`${londonTime(e.startsAt)} ${e.title}`);
  }
  if (dueToday.length > 0) lines.push(`Due today: ${dueToday.join('; ')}`);
  if (dueTomorrow.length > 0) lines.push(`Due tomorrow: ${dueTomorrow.join('; ')}`);
  if (schoolEventsWeek.length > 0) {
    lines.push(
      `School events this week: ${schoolEventsWeek
        .map((e) => `${e.date} ${e.title} (${e.schoolName})`)
        .join('; ')}`,
    );
  }
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
  const dayMs = 24 * 3600_000;
  const dateUtc = Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10));
  const tomorrow = new Date(dateUtc + dayMs).toISOString().slice(0, 10);
  const in7Days = new Date(dateUtc + 7 * dayMs).toISOString().slice(0, 10);
  const [todaysEvents, dueRows, schoolEventsWeek, pending] = await Promise.all([
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
      .select({ title: schoolEvents.title, date: schoolEvents.date, schoolName: schools.name })
      .from(schoolEvents)
      .innerJoin(schools, eq(schoolEvents.schoolId, schools.id))
      .where(
        and(
          eq(schools.householdId, householdId),
          gte(schoolEvents.date, date),
          lte(schoolEvents.date, in7Days),
        ),
      )
      .orderBy(asc(schoolEvents.date))
      .limit(10),
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
      schoolEventsWeek,
      pending.length,
    ),
  );
}

async function remindHousehold(db: Database, householdId: string, now: Date): Promise<void> {
  const upcoming = await db
    .select({ id: events.id, title: events.title, startsAt: events.startsAt })
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
    // Claim-first covers both notifications: only the winning tick sends the
    // chat message and the email.
    if (await claimKey(db, householdId, `scheduler:reminder:${e.id}`)) {
      await postButlerMessage(db, householdId, `⏰ '${e.title}' in ~30 min`);
      const recipients = butlerNotifyEmails();
      if (recipients.length > 0) {
        const time = londonTime(e.startsAt);
        sendButlerEmail({
          to: recipients,
          subject: `⏰ Starting soon: ${e.title} (${time})`,
          text: `Heads up — '${e.title}' starts at ${time} (in about 30 minutes).\n\n— Butler`,
        }).catch((err: unknown) => console.error('butler reminder email failed', err));
      }
    }
  }
}

// Milestones (in days before the renewal date) that always nudge, alongside
// each renewal's own remindBeforeDays threshold.
const RENEWAL_MILESTONE_DAYS = [7, 1];

function formatRenewalDate(isoDate: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${isoDate}T00:00:00Z`));
}

// Admin autopilot: one butler message (and at the remindBeforeDays crossing,
// one task) per renewal per milestone. Gated to the morning-briefing window
// so push notifications land at a civilised hour; dedupe keys make each
// crossing fire exactly once even across missed windows.
async function nudgeRenewals(db: Database, householdId: string, now: Date): Promise<void> {
  const { date, minutesSinceMidnight } = londonClock(now);
  if (minutesSinceMidnight < BRIEFING_START_MIN || minutesSinceMidnight > BRIEFING_END_MIN) return;

  const rows = await db.select().from(renewals).where(eq(renewals.householdId, householdId));
  const todayUtc = Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10));
  for (const r of rows) {
    const daysLeft = Math.round((Date.parse(`${r.renewalDate}T00:00:00Z`) - todayUtc) / 86_400_000);
    if (daysLeft < 0) continue;
    const milestones = Array.from(new Set([r.remindBeforeDays, ...RENEWAL_MILESTONE_DAYS]))
      .filter((t) => t > 0)
      .sort((a, b) => a - b);
    // Current stage: the most urgent milestone already reached.
    const stage = milestones.find((t) => daysLeft <= t);
    if (stage === undefined) continue;
    if (!(await claimKey(db, householdId, `renewal-nudge:${r.id}:${stage}`))) continue;

    // Milestones further out than the stage are already in the past: claim
    // them silently so they never fire their own message. If the
    // remindBeforeDays crossing is among them (renewal added late), it still
    // gets its one task.
    let taskCreated = false;
    for (const t of milestones.filter((m) => m > stage)) {
      if (await claimKey(db, householdId, `renewal-nudge:${r.id}:${t}`) && t === r.remindBeforeDays) {
        await createRenewalTask(db, householdId, r);
        taskCreated = true;
      }
    }
    if (stage === r.remindBeforeDays) {
      await createRenewalTask(db, householdId, r);
      taskCreated = true;
    }

    const when =
      daysLeft === 0 ? 'today' : daysLeft === 1 ? 'tomorrow' : `in ${daysLeft} days`;
    const suffix = taskCreated ? " I've added a task to renew it." : '';
    await postButlerMessage(
      db,
      householdId,
      `📋 Heads up: ${r.label} expires ${when} (${formatRenewalDate(r.renewalDate)}).${suffix}`,
    );
  }
}

async function createRenewalTask(
  db: Database,
  householdId: string,
  r: typeof renewals.$inferSelect,
): Promise<void> {
  await db.insert(tasks).values({
    householdId,
    title: `Renew ${r.label}`,
    dueDate: r.renewalDate,
    source: 'butler',
    dependentId: r.dependentId ?? undefined,
    assigneeUserId: r.memberUserId ?? undefined,
  });
}

export async function runSchedulerTick(db: Database, now = new Date()): Promise<void> {
  const all = await db.select({ id: households.id }).from(households);
  for (const h of all) {
    try {
      await briefHousehold(db, h.id, now);
      await remindHousehold(db, h.id, now);
      await nudgeRenewals(db, h.id, now);
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
