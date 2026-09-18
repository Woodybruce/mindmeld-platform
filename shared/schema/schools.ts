import { pgTable, pgEnum, uuid, text, date, boolean, timestamp } from 'drizzle-orm/pg-core';
import { households, dependents } from './household';

export const schoolStatusEnum = pgEnum('school_status', [
  'researching',
  'shortlisted',
  'applied',
  'offered',
  'accepted',
  'rejected',
]);
export const schoolEventKindEnum = pgEnum('school_event_kind', [
  'open_day',
  'application_deadline',
  'term_date',
  'parents_evening',
  'permission_slip',
  'other',
]);

export const schools = pgTable('schools', {
  id: uuid('id').defaultRandom().primaryKey(),
  householdId: uuid('household_id').references(() => households.id).notNull(),
  name: text('name').notNull(),
  address: text('address'),
  website: text('website'),
  status: schoolStatusEnum('status').default('researching').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const schoolEvents = pgTable('school_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  schoolId: uuid('school_id').references(() => schools.id).notNull(),
  dependentId: uuid('dependent_id').references(() => dependents.id),
  title: text('title').notNull(),
  date: date('date').notNull(),
  kind: schoolEventKindEnum('kind').notNull(),
  autoTask: boolean('auto_task').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
