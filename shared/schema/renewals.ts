import { pgTable, pgEnum, uuid, text, date, integer, timestamp } from 'drizzle-orm/pg-core';
import { households, dependents } from './household';

export const renewalCategoryEnum = pgEnum('renewal_category', [
  'passport',
  'driving_licence',
  'mot',
  'insurance',
  'tax',
  'subscription',
  'membership',
  'other',
]);

export const renewals = pgTable('renewals', {
  id: uuid('id').defaultRandom().primaryKey(),
  householdId: uuid('household_id').references(() => households.id).notNull(),
  label: text('label').notNull(),
  category: renewalCategoryEnum('category').default('other').notNull(),
  renewalDate: date('renewal_date').notNull(),
  dependentId: uuid('dependent_id').references(() => dependents.id),
  // household_members.user_id; nullable for whole-household renewals.
  memberUserId: text('member_user_id'),
  remindBeforeDays: integer('remind_before_days').default(30).notNull(),
  notes: text('notes'),
  // manual = entered in the app; butler = proposed/extracted by the butler.
  source: text('source').default('manual').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
