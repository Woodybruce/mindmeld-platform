import { pgTable, pgEnum, uuid, text, date, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { households, dependents } from './household';

export const taskPriorityEnum = pgEnum('task_priority', ['low', 'medium', 'high']);
export const taskSourceEnum = pgEnum('task_source', ['manual', 'butler', 'school', 'holiday']);
export const taskStatusEnum = pgEnum('task_status', ['todo', 'done']);

export const tasks = pgTable('tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  householdId: uuid('household_id').references(() => households.id).notNull(),
  title: text('title').notNull(),
  notes: text('notes'),
  assigneeUserId: text('assignee_user_id'),
  dependentId: uuid('dependent_id').references(() => dependents.id),
  dueDate: date('due_date'),
  recurrence: text('recurrence'),
  priority: taskPriorityEnum('priority').default('medium').notNull(),
  source: taskSourceEnum('source').default('manual').notNull(),
  status: taskStatusEnum('status').default('todo').notNull(),
  attachments: jsonb('attachments').$type<unknown[]>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
