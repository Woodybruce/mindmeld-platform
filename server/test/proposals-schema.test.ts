import { describe, it, expect } from 'vitest';
import { createTestDb } from './db';
import { households, butlerProposals } from '../../shared/schema/index';
import {
  proposalStatusSchema,
  butlerActionSchema,
  proposalPayloadSchema,
} from '../../shared/validation/proposals';

describe('butler_proposals schema + validation', () => {
  it('inserts and reads back a proposal with defaults applied', async () => {
    const db = await createTestDb();
    const [household] = await db.insert(households).values({ name: 'Bruce' }).returning();

    const payload = {
      summary: 'School newsletter: trip on Friday',
      actions: [
        { type: 'create_task', title: 'Sign permission slip', dueDate: '2026-09-25' },
        { type: 'create_event', title: 'School trip', startsAt: '2026-09-25T09:00:00+01:00' },
        { type: 'remember', key: 'school_trip_day', value: 'friday' },
      ],
    };

    const [inserted] = await db.insert(butlerProposals).values({
      householdId: household.id,
      source: 'email',
      sender: 'newsletter@school.example',
      subject: 'Friday trip',
      payload,
    }).returning();

    expect(inserted.id).toBeTruthy();
    expect(inserted.status).toBe('pending');
    expect(inserted.receivedAt).toBeInstanceOf(Date);
    expect(inserted.createdAt).toBeInstanceOf(Date);
    expect(inserted.error).toBeNull();
    expect(inserted.resolvedAt).toBeNull();
    expect(inserted.payload).toEqual(payload);

    const rows = await db.select().from(butlerProposals);
    expect(rows).toHaveLength(1);
    expect(rows[0].householdId).toBe(household.id);
    expect(rows[0].source).toBe('email');
  });

  it('proposalStatusSchema accepts known statuses and rejects others', () => {
    for (const s of ['pending', 'accepted', 'dismissed', 'error']) {
      expect(proposalStatusSchema.safeParse(s).success).toBe(true);
    }
    expect(proposalStatusSchema.safeParse('archived').success).toBe(false);
  });

  it('proposalPayloadSchema accepts a mixed actions array', () => {
    const result = proposalPayloadSchema.safeParse({
      summary: 'Mixed bag',
      actions: [
        { type: 'create_task', title: 'Buy milk' },
        { type: 'create_event', title: 'Dentist', startsAt: '2026-10-01T14:30:00+01:00', endsAt: '2026-10-01T15:00:00+01:00', location: 'High St' },
        { type: 'remember', key: 'dentist_name', value: 'dr_smith' },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects unknown action types and invalid fields', () => {
    expect(butlerActionSchema.safeParse({ type: 'delete_all' }).success).toBe(false);
    expect(proposalPayloadSchema.safeParse({
      summary: 'Bad action',
      actions: [{ type: 'delete_all' }],
    }).success).toBe(false);
    expect(butlerActionSchema.safeParse({ type: 'create_task', title: '' }).success).toBe(false);
    expect(butlerActionSchema.safeParse({ type: 'remember', key: 'Not Slug!', value: 'v' }).success).toBe(false);
    expect(proposalPayloadSchema.safeParse({ actions: [] }).success).toBe(false);
  });
});
