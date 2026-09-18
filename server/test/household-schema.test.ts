import { describe, it, expect } from 'vitest';
import { createTestDb } from './db';
// Explicit `/index`: bare `../../shared/schema` resolves to the legacy shared/schema.ts file.
import { households, householdMembers, dependents, insertDependentSchema } from '../../shared/schema/index';

describe('household schema', () => {
  it('creates household with members and dependents', async () => {
    const db = await createTestDb();
    const [h] = await db.insert(households).values({ name: 'Bruce' }).returning();
    await db.insert(householdMembers).values([
      { householdId: h.id, userId: 'u1', displayName: 'Alex' },
      { householdId: h.id, userId: 'u2', displayName: 'Sam' },
    ]);
    const [kid] = await db.insert(dependents)
      .values({ householdId: h.id, name: 'Coco', yearGroup: 'Year 10' }).returning();
    expect(kid.name).toBe('Coco');
  });

  it('rejects dependent with empty name', () => {
    expect(insertDependentSchema.safeParse({ householdId: 'x', name: '' }).success).toBe(false);
  });

  it('enforces unique household_members.user_id', async () => {
    const db = await createTestDb();
    const [h1] = await db.insert(households).values({ name: 'A' }).returning();
    const [h2] = await db.insert(households).values({ name: 'B' }).returning();
    await db.insert(householdMembers).values({ householdId: h1.id, userId: 'u1', displayName: 'Alex' });
    await expect(
      db.insert(householdMembers).values({ householdId: h2.id, userId: 'u1', displayName: 'Alex' })
    ).rejects.toThrow();
  });
});
