import { pgTable, pgEnum, uuid, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { households } from './household';

export const listTypeEnum = pgEnum('list_type', ['shopping', 'packing', 'generic']);

export const lists = pgTable('lists', {
  id: uuid('id').defaultRandom().primaryKey(),
  householdId: uuid('household_id').references(() => households.id).notNull(),
  name: text('name').notNull(),
  type: listTypeEnum('type').default('generic').notNull(),
  aiSuggestable: boolean('ai_suggestable').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const listItems = pgTable('list_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  listId: uuid('list_id').references(() => lists.id).notNull(),
  text: text('text').notNull(),
  checked: boolean('checked').default(false).notNull(),
  addedByUserId: text('added_by_user_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
