import { pgTable, uuid, text, date, timestamp } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';

export const MAX_HOUSEHOLD_MEMBERS = 2;

export const households = pgTable('households', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const householdMembers = pgTable('household_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  householdId: uuid('household_id').references(() => households.id).notNull(),
  userId: text('user_id').notNull().unique(), // Supabase auth user id; one household per user
  displayName: text('display_name').notNull(),
  role: text('role').default('adult').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const dependents = pgTable('dependents', {
  id: uuid('id').defaultRandom().primaryKey(),
  householdId: uuid('household_id').references(() => households.id).notNull(),
  name: text('name').notNull(),
  dateOfBirth: date('date_of_birth'),
  yearGroup: text('year_group'),
  schoolId: uuid('school_id'),             // FK wired in Task 7
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const insertHouseholdSchema = createInsertSchema(households);
export const insertDependentSchema = createInsertSchema(dependents, {
  name: (s) => s.min(1),
});
