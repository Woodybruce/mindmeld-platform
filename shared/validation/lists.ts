// drizzle-zod 0.8 emits zod/v4 schemas; all zod usage here must come from zod/v4.
import { z } from 'zod/v4';

// Hand-written zod schemas mirroring the lists / list_items tables (see the
// note in shared/validation/household.ts for why drizzle-zod is not used here).

export const insertListSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['shopping', 'packing', 'generic']).optional(),
  aiSuggestable: z.boolean().optional(),
});

export const insertListItemSchema = z.object({
  text: z.string().min(1),
});

export const patchListItemSchema = z.object({
  text: z.string().min(1).optional(),
  checked: z.boolean().optional(),
});
