// drizzle-zod 0.8 emits zod/v4 schemas; all zod usage here must come from zod/v4.
import { z } from 'zod/v4';

// Hand-written zod schemas mirroring the events table (see the note in
// shared/validation/household.ts for why drizzle-zod is not used here).
// Timestamps stay ISO strings here (transforms to Date make the field type
// collapse to optional under this repo's non-strict tsconfig); routers
// convert with new Date(...) before writing to drizzle timestamp columns.

const eventBase = z.object({
  title: z.string().min(1),
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime(),
  category: z.enum(['school', 'holiday', 'household', 'us']),
  dependentId: z.uuid().optional(),
  source: z.enum(['manual', 'butler', 'outlook']).optional(),
  externalId: z.string().optional(),
});

export const insertEventSchema = eventBase.refine(
  (data) => Date.parse(data.endsAt) > Date.parse(data.startsAt),
  { message: 'endsAt must be after startsAt', path: ['endsAt'] },
);

export const patchEventSchema = eventBase.partial();

export const eventRangeQuery = z.object({
  from: z.iso.datetime().optional(),
  to: z.iso.datetime().optional(),
});
