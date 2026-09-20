# Phase 1: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate the "Us" app onto a single Express/Drizzle/Postgres backend with a household data model, a new 5-area app shell, and CI + Railway deployment — while the existing couples features keep working throughout.

**Architecture:** Rebuild in place in this repo. New Drizzle schema (household-scoped tables) alongside legacy tables; new modular route files under `server/routes/`; legacy `server/routes.ts` remounted under `/api/legacy/` and shrunk over later phases. Frontend keeps Vite/React/shadcn and gains a new `AppShell` with 5-tab navigation. Supabase remains for Auth + Realtime only. Deploy to Railway project `mellow-youthfulness`, domain `bruces.app` (DNS via Porkbun API).

**Tech Stack:** Vite 5, React 18, TypeScript, shadcn/ui, Tailwind, Express 5, Drizzle ORM, PostgreSQL, Supabase (auth/realtime), Vitest, PGlite (test DB), Railway, Porkbun DNS API.

**Spec:** `docs/superpowers/specs/2026-09-18-household-os-design.md`

## Global Constraints

- All new application data flows through Express/Drizzle. New code MUST NOT use Supabase tables or edge functions.
- TypeScript strict; no `any` (use `unknown` + narrowing).
- Every route module validates input with zod schemas defined in `shared/`.
- Auth on every `/api/` route via existing `extractUserId` middleware pattern (Supabase JWT); household scoping via `requireHousehold` (Task 3).
- Tests run with `npx vitest run`; test DB is PGlite (in-memory Postgres), never the dev database.
- Commit after every task. Conventional commits (`feat:`, `chore:`, `test:`).
- Secrets only in env vars / gitignored `.env` — never committed.
- Adults-only household: two members max in v1, dependents have no login.

---

### Task 1: Test infrastructure with PGlite

**Files:**
- Modify: `package.json` (add devDeps + script)
- Create: `server/test/db.ts`
- Create: `vitest.config.ts` (extend existing `src/test` setup if present)
- Test: `server/test/db.test.ts`

**Interfaces:**
- Produces: `createTestDb(): Promise<PgliteDatabase>` and `migrateTestDb(db)` used by all later route tests.

- [ ] **Step 1: Install deps**

```bash
npm i -D @electric-sql/pglite drizzle-orm@latest vitest supertest @types/supertest
```

- [ ] **Step 2: Write failing test**

`server/test/db.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createTestDb } from './db';
import { sql } from 'drizzle-orm';

describe('test db', () => {
  it('runs migrations and answers queries', async () => {
    const db = await createTestDb();
    const rows = await db.execute(sql`select 1 as one`);
    expect(rows.rows[0].one).toBe(1);
  });
});
```

- [ ] **Step 3: Run, verify fail** — `npx vitest run server/test/db.test.ts` → FAIL (module missing).

- [ ] **Step 4: Implement**

`server/test/db.ts`:

```ts
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import path from 'node:path';

export async function createTestDb() {
  const client = new PGlite();
  const db = drizzle(client);
  await migrate(db, { migrationsFolder: path.resolve(__dirname, '../../migrations') });
  return db;
}
```

Add to `package.json` scripts: `"test": "vitest run"`.

- [ ] **Step 5: Run, verify pass** (green once Task 2 creates its first migration; until then create an empty `migrations/` dir so the folder exists).

- [ ] **Step 6: Commit** — `chore: PGlite test infrastructure`

---

### Task 2: Household schema (households, members, dependents)

**Files:**
- Create: `shared/schema/household.ts`
- Create: `shared/schema/index.ts`
- Modify: `drizzle.config.ts` (point at `shared/schema/index.ts`)
- Test: `server/test/household-schema.test.ts`

**Interfaces:**
- Produces: tables `households`, `household_members`, `dependents`; zod schemas `insertHouseholdSchema`, `insertDependentSchema`; constant `MAX_HOUSEHOLD_MEMBERS = 2`.

- [ ] **Step 1: Write failing test** (`server/test/household-schema.test.ts`) asserting insert + select round-trip and the zod schema rejecting a dependent with empty name:

```ts
import { describe, it, expect } from 'vitest';
import { createTestDb } from './db';
import { households, householdMembers, dependents, insertDependentSchema } from '../../shared/schema';

describe('household schema', () => {
  it('creates household with members and dependents', async () => {
    const db = await createTestDb();
    const [h] = await db.insert(households).values({ name: 'Bruce' }).returning();
    await db.insert(householdMembers).values([
      { householdId: h.id, userId: 'u1', displayName: 'Alex' },
      { householdId: h.id, userId: 'u2', displayName: 'Sam' },
    ]);
    const [kid] = await db.insert(dependents)
      .values({ householdId: h.id, name: 'Coco', yearGroup: 'Year 10' }).returning();
    expect(kid.name).toBe('Coco');
  });

  it('rejects dependent with empty name', () => {
    expect(insertDependentSchema.safeParse({ householdId: 'x', name: '' }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run, verify fail.**

- [ ] **Step 3: Implement** `shared/schema/household.ts`:

```ts
import { pgTable, uuid, text, date, timestamp } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';

export const MAX_HOUSEHOLD_MEMBERS = 2;

export const households = pgTable('households', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const householdMembers = pgTable('household_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  householdId: uuid('household_id').references(() => households.id).notNull(),
  userId: text('user_id').notNull(),        // Supabase auth user id
  displayName: text('display_name').notNull(),
  role: text('role').default('adult').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const dependents = pgTable('dependents', {
  id: uuid('id').defaultRandom().primaryKey(),
  householdId: uuid('household_id').references(() => households.id).notNull(),
  name: text('name').notNull(),
  dateOfBirth: date('date_of_birth'),
  yearGroup: text('year_group'),
  schoolId: uuid('school_id'),             // FK wired in Task 7
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const insertHouseholdSchema = createInsertSchema(households);
export const insertDependentSchema = createInsertSchema(dependents, {
  name: (s) => s.min(1),
});
```

`shared/schema/index.ts` re-exports everything. Install `drizzle-zod` if missing. Generate migration: `npx drizzle-kit generate`.

- [ ] **Step 4: Run tests, verify pass.**

- [ ] **Step 5: Commit** — `feat: household schema (households, members, dependents)`

---

### Task 3: Household middleware + household/dependent API routes

**Files:**
- Create: `server/middleware/household.ts`
- Create: `server/routes/household.ts`
- Create: `server/test/household-routes.test.ts`
- Modify: `server/routes.ts` (mount new router)

**Interfaces:**
- Consumes: existing `extractUserId` (from `server/routes.ts` — export it if not exported).
- Produces: `requireHousehold` middleware setting `req.householdId`; routes `GET/POST /api/household`, `GET/POST/PATCH/DELETE /api/dependents[/:id]`.

- [ ] **Step 1: Write failing tests** — unauthenticated request → 401; user with no household → `POST /api/household` creates one and adds caller as member; second member can join by household id; dependent CRUD round-trip. Use supertest against an Express app factory `createApp(db)`:

```ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createTestDb } from './db';
import { householdRouter } from '../routes/household';

function app(db: any, userId = 'u1') {
  const a = express();
  a.use(express.json());
  a.use((req, _res, next) => { (req as any).userId = userId; next(); }); // fake auth
  a.use('/api', householdRouter(db));
  return a;
}

describe('household routes', () => {
  it('creates household and manages dependents', async () => {
    const db = await createTestDb();
    const a = app(db);
    const created = await request(a).post('/api/household').send({ name: 'Bruce' });
    expect(created.status).toBe(201);
    const dep = await request(a).post('/api/dependents').send({ name: 'Coco', yearGroup: 'Year 10' });
    expect(dep.status).toBe(201);
    const list = await request(a).get('/api/dependents');
    expect(list.body).toHaveLength(1);
  });

  it('rejects empty dependent name', async () => {
    const db = await createTestDb();
    const a = app(db);
    await request(a).post('/api/household').send({ name: 'Bruce' });
    const bad = await request(a).post('/api/dependents').send({ name: '' });
    expect(bad.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run, verify fail.**

- [ ] **Step 3: Implement** `server/middleware/household.ts`:

```ts
import { eq } from 'drizzle-orm';
import type { Request, Response, NextFunction } from 'express';
import { householdMembers } from '../../shared/schema';
import type { Database } from '../db';

export function requireHousehold(db: Database) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).userId;
    if (!userId) return res.status(401).json({ error: 'unauthenticated' });
    const [m] = await db.select().from(householdMembers).where(eq(householdMembers.userId, userId));
    if (!m) return res.status(403).json({ error: 'no_household' });
    (req as any).householdId = m.householdId;
    next();
  };
}
```

`server/routes/household.ts` exports `householdRouter(db)` with the routes above, all behind `requireHousehold`, zod-validated bodies, 201/400/404 statuses. Mount in `server/routes.ts`: `app.use('/api', householdRouter(db))`.

- [ ] **Step 4: Run, verify pass.**

- [ ] **Step 5: Commit** — `feat: household + dependents API`

---

### Task 4: Tasks schema + API

**Files:**
- Create: `shared/schema/tasks.ts`
- Create: `server/routes/tasks.ts`
- Test: `server/test/tasks.test.ts`

**Interfaces:**
- Produces: table `tasks` (id, householdId, title, notes, assigneeUserId, dependentId, dueDate, recurrence, priority `low|medium|high`, source `manual|butler|school|holiday`, status `todo|done`, attachments jsonb, createdAt); routes `GET/POST /api/tasks`, `PATCH/DELETE /api/tasks/:id`, `POST /api/tasks/:id/complete`; zod `insertTaskSchema`.

- [ ] **Step 1: Failing tests** — create task (201), list only own household's tasks, complete sets status `done`, reject invalid `priority` value (400), dueDate required when source=`school` (400).

```ts
it('creates and completes a task', async () => {
  const a = app(db); // same helper style as Task 3
  await request(a).post('/api/household').send({ name: 'Bruce' });
  const t = await request(a).post('/api/tasks').send({ title: 'Sign permission slip', dueDate: '2026-09-25' });
  expect(t.status).toBe(201);
  const done = await request(a).post(`/api/tasks/${t.body.id}/complete`);
  expect(done.body.status).toBe('done');
});

it('rejects invalid priority', async () => {
  const a = app(db);
  await request(a).post('/api/household').send({ name: 'Bruce' });
  const bad = await request(a).post('/api/tasks').send({ title: 'x', priority: 'urgent-ish' });
  expect(bad.status).toBe(400);
});
```

- [ ] **Step 2: Run, verify fail.**
- [ ] **Step 3: Implement schema (drizzle-zod enums for priority/source/status), router with `requireHousehold`, generate migration.**
- [ ] **Step 4: Run, verify pass.**
- [ ] **Step 5: Commit** — `feat: tasks schema + API`

---

### Task 5: Lists schema + API

**Files:**
- Create: `shared/schema/lists.ts`
- Create: `server/routes/lists.ts`
- Test: `server/test/lists.test.ts`

**Interfaces:**
- Produces: tables `lists` (id, householdId, name, type `shopping|packing|generic`, aiSuggestable bool) and `list_items` (id, listId, text, checked, addedByUserId, createdAt); routes `GET/POST /api/lists`, `POST /api/lists/:id/items`, `PATCH /api/items/:id` (toggle checked), `DELETE /api/items/:id`.

- [ ] **Step 1: Failing tests**

```ts
it('creates a shopping list with items and toggles them', async () => {
  const a = app(db); // same helper style as Task 3
  await request(a).post('/api/household').send({ name: 'Bruce' });
  const list = await request(a).post('/api/lists').send({ name: 'Tesco', type: 'shopping' });
  expect(list.status).toBe(201);
  const item = await request(a).post(`/api/lists/${list.body.id}/items`).send({ text: 'Milk' });
  expect(item.status).toBe(201);
  const toggled = await request(a).patch(`/api/items/${item.body.id}`).send({ checked: true });
  expect(toggled.body.checked).toBe(true);
});
```
- [ ] **Step 2: Run, verify fail.**
- [ ] **Step 3: Implement schema + router + migration.**
- [ ] **Step 4: Run, verify pass.**
- [ ] **Step 5: Commit** — `feat: lists schema + API`

---

### Task 6: Household events schema + API (diary)

**Files:**
- Create: `shared/schema/events.ts`
- Create: `server/routes/events.ts`
- Test: `server/test/events.test.ts`

**Interfaces:**
- Produces: table `events` (id, householdId, title, startsAt, endsAt, category `school|holiday|household|us`, dependentId nullable, source `manual|butler|outlook`, externalId nullable for Outlook dedupe, createdAt); routes `GET /api/events?from=&to=`, `POST /api/events`, `PATCH/DELETE /api/events/:id`. NOTE: new table named `events` — legacy `calendar_events` stays untouched until Phase 2 migration.

- [ ] **Step 1: Failing tests**

```ts
it('creates an event and range-queries it', async () => {
  const a = app(db); // same helper style as Task 3
  await request(a).post('/api/household').send({ name: 'Bruce' });
  const e = await request(a).post('/api/events').send({
    title: "Parents' evening", startsAt: '2026-10-12T18:00:00Z', endsAt: '2026-10-12T20:00:00Z', category: 'school',
  });
  expect(e.status).toBe(201);
  const res = await request(a).get('/api/events?from=2026-10-12T00:00:00Z&to=2026-10-13T00:00:00Z');
  expect(res.body).toHaveLength(1);
});

it('rejects endsAt before startsAt', async () => {
  const a = app(db);
  await request(a).post('/api/household').send({ name: 'Bruce' });
  const bad = await request(a).post('/api/events').send({
    title: 'x', startsAt: '2026-10-12T20:00:00Z', endsAt: '2026-10-12T18:00:00Z', category: 'household',
  });
  expect(bad.status).toBe(400);
});
```
- [ ] **Step 2: Run, verify fail.**
- [ ] **Step 3: Implement + migration.**
- [ ] **Step 4: Run, verify pass.**
- [ ] **Step 5: Commit** — `feat: household events (diary) schema + API`

---

### Task 7: Schools schema + API

**Files:**
- Create: `shared/schema/schools.ts`
- Create: `server/routes/schools.ts`
- Test: `server/test/schools.test.ts`

**Interfaces:**
- Produces: tables `schools` (id, householdId, name, address, website, status `researching|shortlisted|applied|offered|accepted|rejected`, notes) and `school_events` (id, schoolId, dependentId nullable, title, date, kind `open_day|application_deadline|term_date|parents_evening|permission_slip|other`, autoTask bool); routes `GET/POST /api/schools`, `PATCH/DELETE /api/schools/:id`, `GET/POST /api/schools/:id/events`. Wire `dependents.school_id` FK to `schools.id` now (alter table in same migration).

- [ ] **Step 1: Failing tests**

```ts
it('autoTask school_event also creates a task', async () => {
  const a = app(db); // same helper style as Task 3
  await request(a).post('/api/household').send({ name: 'Bruce' });
  const school = await request(a).post('/api/schools').send({ name: "St Mary's", status: 'shortlisted' });
  const ev = await request(a).post(`/api/schools/${school.body.id}/events`).send({
    title: 'Application deadline', date: '2026-10-31', kind: 'application_deadline', autoTask: true,
  });
  expect(ev.status).toBe(201);
  const tasks = await request(a).get('/api/tasks');
  expect(tasks.body.some((t: any) => t.source === 'school' && t.dueDate === '2026-10-31')).toBe(true);
});

it('rejects invalid school status', async () => {
  const a = app(db);
  await request(a).post('/api/household').send({ name: 'Bruce' });
  const bad = await request(a).post('/api/schools').send({ name: 'x', status: 'maybe' });
  expect(bad.status).toBe(400);
});
```
- [ ] **Step 2: Run, verify fail.**
- [ ] **Step 3: Implement** — school_events insert with autoTask performs both inserts in a transaction.
- [ ] **Step 4: Run, verify pass.**
- [ ] **Step 5: Commit** — `feat: schools schema + API`

---

### Task 8: Holidays schema + API

**Files:**
- Create: `shared/schema/holidays.ts`
- Create: `server/routes/holidays.ts`
- Test: `server/test/holidays.test.ts`

**Interfaces:**
- Produces: tables `holidays` (id, householdId, destination, startsAt, endsAt, notes) and `holiday_items` (id, holidayId, text, done, kind `booking|packing|admin|other`); route `POST /api/holidays/:id/generate-checklist` creates default items: `['Book flights','Book accommodation','Travel insurance','Check passports','Packing list']` as tasks with `source: 'holiday'`.

- [ ] **Step 1: Failing tests**

```ts
it('generate-checklist creates holiday tasks, idempotently', async () => {
  const a = app(db); // same helper style as Task 3
  await request(a).post('/api/household').send({ name: 'Bruce' });
  const h = await request(a).post('/api/holidays').send({
    destination: 'Cornwall', startsAt: '2026-10-24', endsAt: '2026-10-31',
  });
  const gen = await request(a).post(`/api/holidays/${h.body.id}/generate-checklist`);
  expect(gen.body.created).toBeGreaterThanOrEqual(5);
  await request(a).post(`/api/holidays/${h.body.id}/generate-checklist`); // again
  const tasks = await request(a).get('/api/tasks');
  const holidayTasks = tasks.body.filter((t: any) => t.source === 'holiday');
  expect(holidayTasks.length).toBe(gen.body.created); // no duplicates
});
```
- [ ] **Step 2: Run, verify fail.**
- [ ] **Step 3: Implement + migration.**
- [ ] **Step 4: Run, verify pass.**
- [ ] **Step 5: Commit** — `feat: holidays schema + checklist API`

---

### Task 9: Butler memory + channels schema

**Files:**
- Create: `shared/schema/butler.ts`, `shared/schema/channels.ts`
- Create: `server/routes/butler.ts` (memory CRUD only — no LLM yet)
- Test: `server/test/butler.test.ts`

**Interfaces:**
- Produces: tables `butler_memory` (id, householdId, key, value, provenance, createdAt), `channels` (id, householdId, type `dm|household`, createdAt), `channel_messages` (id, channelId, senderUserId nullable — null = butler, body, createdAt); routes `GET/POST /api/butler/memory`, `DELETE /api/butler/memory/:id`, `GET /api/channels`, `GET/POST /api/channels/:id/messages`. Creating a household (Task 3 route) also auto-creates its `household` channel.

- [ ] **Step 1: Failing tests**

```ts
it('stores butler memory and posts butler message to household channel', async () => {
  const a = app(db); // same helper style as Task 3
  const h = await request(a).post('/api/household').send({ name: 'Bruce' });
  const mem = await request(a).post('/api/butler/memory').send({ key: 'tesco_day', value: 'Friday' });
  expect(mem.status).toBe(201);
  // household channel auto-created with household
  const channels = await request(a).get('/api/channels');
  const householdChannel = channels.body.find((c: any) => c.type === 'household');
  expect(householdChannel).toBeTruthy();
  const msg = await request(a).post(`/api/channels/${householdChannel.id}/messages`)
    .send({ senderUserId: null, body: 'Morning briefing: 2 tasks today.' });
  expect(msg.status).toBe(201);
  const msgs = await request(a).get(`/api/channels/${householdChannel.id}/messages`);
  expect(msgs.body[0].senderUserId).toBeNull();
});
```
- [ ] **Step 2: Run, verify fail.**
- [ ] **Step 3: Implement + migration.**
- [ ] **Step 4: Run, verify pass.**
- [ ] **Step 5: Commit** — `feat: butler memory + channels schema`

---

### Task 10: Route modularization

**Files:**
- Modify: `server/routes.ts` (split)
- Create: `server/routes/legacy/*.ts`, `server/routes/index.ts`

**Interfaces:**
- Produces: `mountRoutes(app, db)` in `server/routes/index.ts` mounting new modules at `/api/*` and legacy handlers at `/api/legacy/*`. No behavior change to legacy endpoints (frontend compat preserved by leaving legacy mounted at original paths too, marked deprecated).

- [ ] **Step 1: Write characterization test** — smoke-test 3 representative legacy endpoints before the split (e.g. `GET /api/weekly-tasks` shape) to lock current behavior.
- [ ] **Step 2: Run, verify pass** (characterization of existing behavior).
- [ ] **Step 3: Split `server/routes.ts` into `routes/legacy/` modules by domain (ai, shop, calendar, chat, misc), each exporting a router; `routes/index.ts` mounts everything.**
- [ ] **Step 4: Run full test suite + `npm run build`; verify pass.**
- [ ] **Step 5: Commit** — `refactor: split routes monolith into modules`

---

### Task 11: Data migration script (legacy → household)

**Files:**
- Create: `server/migrations-data/001-to-household.ts`
- Test: `server/test/migration.test.ts`

**Interfaces:**
- Consumes: legacy tables `weekly_tasks`, `shared_lists`, `calendar_events`, `profiles`.
- Produces: `migrateToHousehold(db)` — creates a household per couple (from `profiles.partner_id` pairs), copies `weekly_tasks`→`tasks`, `shared_lists`→`lists`+`list_items`, `calendar_events`→`events`. Idempotent via `migrated_from` marker column.

- [ ] **Step 1: Failing test** — seed legacy tables in PGlite (create legacy tables minimal in test), run migration, assert rows exist in new tables and re-run is a no-op.
- [ ] **Step 2: Run, verify fail.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run, verify pass.**
- [ ] **Step 5: Commit** — `feat: legacy-to-household data migration`

---

### Task 12: New app shell + 5-tab navigation

**Files:**
- Create: `src/components/layout/AppShell.tsx`, `src/pages/HomePage.tsx`, `src/pages/TasksPage.tsx`, `src/pages/DiaryPage.tsx`
- Modify: `src/App.tsx` (routes), `src/components/BottomNav.tsx`

**Interfaces:**
- Produces: 5 tabs — Home `/`, Chat `/chat`, Tasks `/tasks`, Diary `/diary`, Us `/us`. Tasks/Diary/Home pages are real-but-simple: Home shows today's events + open tasks from new APIs; Tasks page = list + add/complete; Diary = week list of events. Existing pages stay reachable.

- [ ] **Step 1: Failing test** (component test with Testing Library): BottomNav renders 5 tabs with correct labels/links.
- [ ] **Step 2: Run, verify fail.**
- [ ] **Step 3: Implement AppShell + pages (React Query against new `/api` endpoints).**
- [ ] **Step 4: Run tests + `npm run build`, verify pass.**
- [ ] **Step 5: Manual smoke: `npm run dev`, click through all 5 tabs.**
- [ ] **Step 6: Commit** — `feat: 5-area app shell with home/tasks/diary pages`

---

### Task 13: Railway deployment + bruces.app DNS

**Files:**
- Create: `railway.json` (build/start config), `Dockerfile` if needed
- Modify: `server/index.ts` (listen on `process.env.PORT`)
- Modify: `package.json` (`start` script)

**Steps:**
- [ ] **Step 1:** Ensure `server/index.ts` uses `process.env.PORT ?? 5000` and serves the built Vite `dist/` in production.
- [ ] **Step 2:** Create Railway Postgres + app service in project `mellow-youthfulness` (Railway CLI with project token `RAILWAY_TOKEN`): `railway add --database postgres`, `railway up` or connect GitHub repo for auto-deploy.
- [ ] **Step 3:** Set env vars: `DATABASE_URL` (Railway reference), `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NODE_ENV=production`.
- [ ] **Step 4:** Run Drizzle migrations on deploy (`railway run npx drizzle-kit migrate` or release command).
- [ ] **Step 5:** Add custom domain in Railway; create CNAME `bruces.app` → Railway target via Porkbun API (`dns/create/bruces.app`), plus `www` CNAME. NOTE: `bruces.app` MX records for Resend must remain untouched.
- [ ] **Step 6:** Verify `https://bruces.app` serves the app (`.app` requires HTTPS — Railway provides certs).
- [ ] **Step 7: Commit** — `chore: railway deployment config`

---

### Task 14: CI + preview discipline

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Write workflow** — on push/PR: install, `npx tsc --noEmit`, `npx vitest run`, `npm run build`.
- [ ] **Step 2: Push and verify green on GitHub.**
- [ ] **Step 3: Commit** — `ci: typecheck + test + build workflow`

---

## Self-Review Notes

- Spec coverage (Phase 1 items): consolidated backend (Task 10), household data model (Tasks 2–9), migration (11), app shell (12), auth carried over (3, via existing extractUserId), CI (14), Railway deploy (13). Butler LLM, WhatsApp, email webhook, Outlook port: explicitly Phase 2/3 — out of scope here.
- `pa@bruces.app` MX record coexists with Railway CNAME — MX is untouched in Task 13.
