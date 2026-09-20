// drizzle-zod 0.8 emits zod/v4 schemas; all zod usage here must come from zod/v4.
import { z } from 'zod/v4';

// Hand-written zod schemas mirroring the butler_memory / channel_messages
// tables (see the note in shared/validation/household.ts for why drizzle-zod
// is not used here).

export const insertButlerMemorySchema = z.object({
  key: z.string().min(1),
  value: z.string(),
  provenance: z.string().optional(),
});

// senderUserId null (or omitted) = a butler message; a non-null sender must
// match the authenticated user (enforced in the route, not here).
export const insertChannelMessageSchema = z.object({
  senderUserId: z.string().min(1).nullable().optional(),
  body: z.string().min(1),
});
