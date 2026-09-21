import { pgTable, pgEnum, uuid, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
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
  // Legacy data-migration marker, e.g. 'calendar_events:<legacy id>'; null for native rows.
  migratedFrom: text('migrated_from'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  // Dedupe for externally-sourced events (Outlook sync / ICS forwarding):
  // at most one row per (household, external id). Manually-created rows have
  // null external_id and are unconstrained.
  uniqueIndex('events_household_external_id')
    .on(table.householdId, table.externalId)
    .where(sql`${table.externalId} IS NOT NULL`),
]);
