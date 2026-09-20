import { pgTable, uuid, text, timestamp, unique } from 'drizzle-orm/pg-core';
import { households } from './household';

export const butlerMemory = pgTable('butler_memory', {
  id: uuid('id').defaultRandom().primaryKey(),
  householdId: uuid('household_id').references(() => households.id).notNull(),
  key: text('key').notNull(),
  value: text('value').notNull(),
  provenance: text('provenance'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  // One row per key within a household; POST returns 409 on a duplicate
  // (this constraint is the race-safe backstop).
  unique('butler_memory_household_key_unique').on(t.householdId, t.key),
]);
