import { pgTable, pgEnum, uuid, text, date, boolean, timestamp } from 'drizzle-orm/pg-core';
import { households } from './household';

export const holidayItemKindEnum = pgEnum('holiday_item_kind', [
  'booking',
  'packing',
  'admin',
  'other',
]);

export const holidays = pgTable('holidays', {
  id: uuid('id').defaultRandom().primaryKey(),
  householdId: uuid('household_id').references(() => households.id).notNull(),
  destination: text('destination').notNull(),
  startsAt: date('starts_at').notNull(),
  endsAt: date('ends_at').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const holidayItems = pgTable('holiday_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  holidayId: uuid('holiday_id').references(() => holidays.id).notNull(),
  text: text('text').notNull(),
  done: boolean('done').default(false).notNull(),
  kind: holidayItemKindEnum('kind').default('other').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
