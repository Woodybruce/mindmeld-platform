import { pgTable, pgEnum, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { households } from './household';

export const channelTypeEnum = pgEnum('channel_type', ['dm', 'household']);

export const channels = pgTable('channels', {
  id: uuid('id').defaultRandom().primaryKey(),
  householdId: uuid('household_id').references(() => households.id).notNull(),
  type: channelTypeEnum('type').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const channelMessages = pgTable('channel_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  channelId: uuid('channel_id').references(() => channels.id).notNull(),
  senderUserId: text('sender_user_id'), // null = the butler
  body: text('body').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
