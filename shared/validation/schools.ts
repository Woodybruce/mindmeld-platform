// drizzle-zod 0.8 emits zod/v4 schemas; all zod usage here must come from zod/v4.
import { z } from 'zod/v4';

// Hand-written zod schemas mirroring the schools / school_events tables (see
// the note in shared/validation/household.ts for why drizzle-zod is not used
// here). Dates stay ISO strings here and map straight onto drizzle `date`
// columns, as in shared/validation/tasks.ts.

const schoolBase = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  website: z.string().optional(),
  status: z.enum(['researching', 'shortlisted', 'applied', 'offered', 'accepted', 'rejected']).optional(),
  notes: z.string().optional(),
});

export const insertSchoolSchema = schoolBase;

export const patchSchoolSchema = schoolBase.partial();

export const insertSchoolEventSchema = z.object({
  title: z.string().min(1),
  date: z.iso.date(),
  kind: z.enum(['open_day', 'application_deadline', 'term_date', 'parents_evening', 'permission_slip', 'other']),
  dependentId: z.uuid().optional(),
  autoTask: z.boolean().optional(),
});
