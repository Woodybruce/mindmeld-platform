# Household OS ("Us" 2.0) — Design Spec

Date: 2026-09-18
Status: Approved direction, pending spec review

## 1. Concept

Evolve the "Us" couples app into an **adults-only household operating system** for a couple. The household has two adult members (the partners). Children exist as managed *dependents* (records, not logins) — there is no child access, so adult/couples content (games, intimacy) remains in scope and can grow.

The AI "butler" is a first-class participant in the couple's chat, not a separate assistant screen.

Quality bar: **super grade**. The chat in particular must feel as polished as WhatsApp/iMessage. Where a paid API or service materially improves quality, we adopt it (see §9).

## 2. Information architecture

Five top-level areas:

| Area | Contents |
|---|---|
| **Home** | Today dashboard: tasks due, diary, butler morning briefing |
| **Chat** | Existing 1:1 partner DM + new **Household channel** (both partners + butler) |
| **Tasks & Lists** | Household tasks, shopping, shared lists |
| **Diary** | Calendar with Outlook sync, school term dates, deadlines |
| **Us** | Couples territory: games, intimacy, photos, gratitude journal, shop |

Schools and holidays are modules that feed Tasks & Diary, not separate tabs.

## 3. Architecture

Rebuild the shell and backend; port the proven parts. Not a from-scratch rewrite — chat/WebRTC, Outlook sync, and push notifications are mature and expensive to recreate.

### Decisions

- **Single backend**: Express 5 + Drizzle ORM + PostgreSQL. The 18 Supabase edge functions and the ~3,400-line `server/routes.ts` monolith are retired. Routes split into modules: `routes/tasks.ts`, `routes/lists.ts`, `routes/calendar.ts`, `routes/schools.ts`, `routes/holidays.ts`, `routes/chat.ts`, `routes/butler.ts`, etc.
- **Supabase keeps two jobs only**: Auth (email + Google/Apple OAuth, already working) and Realtime (chat presence/typing). **All** application data flows through Express/Drizzle. No dual source of truth.
- **Single AI layer**: one server-side `butler/` module (OpenAI, tool-calling) replacing the scattered `callAI()` endpoints and Lovable-gateway edge functions.
- **Frontend**: same Vite + React 18 + TypeScript + shadcn/ui + Tailwind stack, reorganised around the new IA. Existing chat, calendar, and games components are ported, not rewritten.
- **Mobile**: Capacitor shell retained; PWA retained.
- **Types**: shared `shared/` package — Drizzle schema is the single source; zod validators shared between client and server.

## 4. Data model

Core change: from `user + partner_id` to a household membership model. All existing couple data is migrated into the household scope.

- `households` — id, name
- `household_members` — household_id, user_id, role (adult)
- `dependents` — household_id, name, date_of_birth, school_id, year_group, notes (e.g. allergies). No auth, no login.
- `tasks` — household_id, title, notes, assignee (member), related dependent, due date, recurrence rule, priority, source (`manual` | `butler` | `school` | `holiday`), status, attachments. Absorbs `weekly_tasks`.
- `lists` + `list_items` — typed lists (shopping, packing, generic), AI-suggestable. Absorbs `shared_lists`.
- `calendar_events` — gains household_id and category (`school` | `holiday` | `household` | `us`), keeps Outlook sync fields.
- `schools` — tracked schools: name, location, website, notes, status (`researching` | `shortlisted` | `applied` | `offered` | `accepted` | `rejected`)
- `school_events` — open days, application deadlines, term dates, parents' evenings, permission-slip due dates; each auto-generates tasks and diary entries.
- `holidays` — trip record (destination, dates, travellers); generates a checklist (book flights, insurance, packing…) into tasks.
- `channels` + `messages` — channel types: `dm` (existing couple chat) and `household` (both partners + butler participant).
- `butler_memory` — household facts/preferences the butler learns ("Tesco delivery Fridays", "Blake nut allergy"), with provenance and the ability to view/edit in UI.

Existing couples tables (messages, photos, games, bucket lists, mood check-ins, shop) migrate unchanged into household scope.

## 5. The butler

### In chat

- Participant in the Household channel; either partner can address it, and it can address both.
- Natural requests: "what do we need to do today?", "add parents' evening Thursday 6pm", "put milk on the shopping list".
- It asks clarifying questions in-channel when it needs information ("The permission slip is due Friday — signed?").
- Replies are visible to both partners, so nothing is siloed in one person's private assistant.

### Tool-calling

The butler has tools to create/update: tasks, list items, calendar events, school records, school events, holiday checklists, and butler_memory entries. Structured tool calls are validated server-side (zod) before any write. The pattern proven in Study-Buddy-AI (LLM emits structured payload → server validates → DB write) is the reference, upgraded to native tool-calling.

### Proactive engine

A server-side scheduler (cron) continuously scans tasks, school events, and holiday checklists, then acts:

- **Morning briefing**: push + household-channel message ("Today: 3 tasks, Coco football 4pm, Tesco order due")
- **Deadline escalation**: school application windows, booking deadlines — increasing urgency as they approach
- **Nudges**: incomplete tasks surface in-channel with a question, not just a badge
- **Evening check-in** (optional, configurable): "Anything left today?"

Quiet hours and per-member notification preferences are configurable; reminders never fire during quiet hours except explicit user-set alarms.

### Email intake (PA inbox)

- Dedicated inbound address on the product domain (`pa@<domain>`), received via Resend Inbound (MX → webhook to `POST /api/butler/inbound-email`).
- Users forward school newsletters, booking confirmations, bills, appointment letters; the butler parses them (LLM) into diary events, tasks, school records, and amounts/deadlines.
- Attachments (PDF letters etc.) are stored and text-extracted so the butler can read them.
- Every processed email posts a summary card into the household chat with links to what was created.
- Supersedes the legacy `inbound-calendar` edge function, which is retired.

### Memory

Butler learns household facts over time, stores them in `butler_memory`, and applies them to suggestions. Members can review and delete memories in Settings.

## 6. Chat quality bar (flagship surface)

The chat must be best-in-class:

- Sub-100ms perceived send (optimistic UI), reliable ordering, delivery/read receipts
- Typing indicators and presence (kept from current build, ported)
- Rich composer: photos, GIFs, voice notes, location, polls, event composer (ported)
- WebRTC voice/video calls (ported)
- Butler messages visually distinct but native to the thread; butler tool actions render as inline cards ("✅ Added: Parents' evening, Thu 6pm — [view task]") with undo
- Full-text message search
- Push notifications per channel with per-member mute controls

## 7. Build order

Each phase ships working software.

1. **Foundation** — consolidated Express/Drizzle backend, household data model + migration of existing data, new app shell/nav, auth carried over, CI + preview deploys
2. **Tasks, Lists & Diary** — household tasks, shopping/lists, calendar + Outlook sync port, Home dashboard
3. **Butler chat** — household channel, AI participant with tool-calling, reminder engine, morning briefing
4. **Schools** — school research/shortlisting with application deadlines; current-school admin (term dates, events, permission slips); all feeding tasks and diary
5. **Holidays + couples port** — trip planner with checklists; games, intimacy, photos, shop moved into "Us"

## 8. Study-Buddy-AI disposition

Study-Buddy-AI contains **no** school-search or application-tracking features — it is a GCSE revision dashboard (subjects, AI tutor, flashcards, practice exams, revision scheduler). It is **not merged**. Reusable patterns are reimplemented: AI-scheduling-via-structured-output (basis of butler tool-calling) and ICS export. Study-Buddy remains a standalone app for the children's revision.

## 9. External services (paid, approved in principle)

| Service | Purpose |
|---|---|
| OpenAI API (GPT-4o class + realtime) | Butler reasoning, tool-calling, content suggestions |
| Anthropic API (optional) | A/B against OpenAI for butler quality; pick the winner |
| Resend | Outbound transactional email (briefings, digests) **and Inbound** (pa@ inbox → butler webhook); free tier covers household volume |
| Apple Push / FCM (existing) | Mobile push — already wired |
| Google Places API | School lookup, address autocomplete, holiday planning |
| Supabase (existing) | Auth + Realtime only |
| Stripe (existing) | Shop — unchanged |

New accounts needed: OpenAI (if not already), Resend, Google Places. Secrets live server-side only, in env vars; never in the client.

## 10. Non-goals (this spec)

- Child accounts or child-facing UI
- Grocery retailer API integration (Tesco etc.) — shopping lists are in-app; retailer deep-linking may follow later
- Merging Study-Buddy-AI
- Social/multi-household features
