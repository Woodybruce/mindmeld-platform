// drizzle-zod 0.8 emits zod/v4 schemas; all zod usage here must come from zod/v4.
import { z } from 'zod/v4';

// Hand-written zod schemas mirroring the holidays / holiday_items tables (see
// the note in shared/validation/household.ts for why drizzle-zod is not used
// here). Dates stay ISO strings here and map straight onto drizzle `date`
// columns, as in shared/validation/tasks.ts.

const holidayBase = z.object({
  destination: z.string().min(1),
  startsAt: z.iso.date(),
  endsAt: z.iso.date(),
  notes: z.string().optional(),
});

export const insertHolidaySchema = holidayBase;

export const patchHolidaySchema = holidayBase.partial();

const holidayItemBase = z.object({
  text: z.string().min(1),
  done: z.boolean().optional(),
  kind: z.enum(['booking', 'packing', 'admin', 'other']).optional(),
});

export const insertHolidayItemSchema = holidayItemBase;

export const patchHolidayItemSchema = holidayItemBase.partial();
