import { pgTable, uuid, text, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { households } from './household';

export const butlerProposals = pgTable('butler_proposals', {
  id: uuid('id').defaultRandom().primaryKey(),
  householdId: uuid('household_id').references(() => households.id).notNull(),
  source: text('source').notNull(),           // 'email' (v1)
  sender: text('sender'),                     // From: header
  subject: text('subject'),
  receivedAt: timestamp('received_at').defaultNow().notNull(),
  // AI-proposed actions; null when extraction was unavailable/failed.
  payload: jsonb('payload').$type<unknown>(),
  status: text('status').default('pending').notNull(), // pending | accepted | dismissed | error
  error: text('error'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  resolvedAt: timestamp('resolved_at'),
});
