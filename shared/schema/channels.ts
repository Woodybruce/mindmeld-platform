import { pgTable, pgEnum, uuid, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { households } from './household';

export const channelTypeEnum = pgEnum('channel_type', ['dm', 'household']);

export const channels = pgTable('channels', {
  id: uuid('id').defaultRandom().primaryKey(),
  householdId: uuid('household_id').references(() => households.id).notNull(),
  type: channelTypeEnum('type').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  // At most one shared butler channel per household; 'dm' channels are
  // unconstrained. Guards the webhook's select-then-insert against
  // concurrent Resend retries.
  uniqueIndex('channels_one_household_channel')
    .on(table.householdId)
    .where(sql`${table.type} = 'household'`),
]);

export const channelMessages = pgTable('channel_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  channelId: uuid('channel_id').references(() => channels.id).notNull(),
  senderUserId: text('sender_user_id'), // null = the butler
  body: text('body').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
