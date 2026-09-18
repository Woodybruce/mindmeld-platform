import { pgTable, pgEnum, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { households, dependents } from './household';

export const eventCategoryEnum = pgEnum('event_category', ['school', 'holiday', 'household', 'us']);
export const eventSourceEnum = pgEnum('event_source', ['manual', 'butler', 'outlook']);

export const events = pgTable('events', {
  id: uuid('id').defaultRandom().primaryKey(),
  householdId: uuid('household_id').references(() => households.id).notNull(),
  title: text('title').notNull(),
  startsAt: timestamp('starts_at').notNull(),
  endsAt: timestamp('ends_at').notNull(),
  category: eventCategoryEnum('category').notNull(),
  dependentId: uuid('dependent_id').references(() => dependents.id),
  source: eventSourceEnum('source').default('manual').notNull(),
  externalId: text('external_id'), // Outlook id for dedupe on sync
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
