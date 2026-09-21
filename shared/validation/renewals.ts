// drizzle-zod 0.8 emits zod/v4 schemas; all zod usage here must come from zod/v4.
import { z } from 'zod/v4';

// Hand-written zod schemas mirroring the renewals table (see the note in
// shared/validation/household.ts for why drizzle-zod is not used here). Dates
// stay ISO strings and map straight onto drizzle `date` columns, as in
// shared/validation/schools.ts.

const renewalBase = z.object({
  label: z.string().min(1),
  category: z
    .enum(['passport', 'driving_licence', 'mot', 'insurance', 'tax', 'subscription', 'membership', 'other'])
    .optional(),
  renewalDate: z.iso.date(),
  dependentId: z.uuid().optional(),
  memberUserId: z.string().min(1).optional(),
  remindBeforeDays: z.int().min(0).max(365).optional(),
  notes: z.string().optional(),
  source: z.enum(['manual', 'butler']).optional(),
});

export const insertRenewalSchema = renewalBase;

export const patchRenewalSchema = renewalBase.partial();
