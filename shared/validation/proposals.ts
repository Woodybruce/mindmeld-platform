// Hand-written zod schemas (drizzle-zod is banned here); see
// shared/validation/butler.ts for the existing pattern.
import { z } from 'zod/v4';

export const proposalStatusSchema = z.enum(['pending', 'accepted', 'dismissed', 'error']);

export const butlerActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('create_task'), title: z.string().min(1), dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), notes: z.string().optional() }),
  z.object({ type: z.literal('create_event'), title: z.string().min(1), startsAt: z.string().datetime({ offset: true }), endsAt: z.string().datetime({ offset: true }).optional(), location: z.string().optional() }),
  z.object({ type: z.literal('remember'), key: z.string().min(1).regex(/^[a-z0-9_]+$/), value: z.string().min(1) }),
]);

export const proposalPayloadSchema = z.object({
  summary: z.string().min(1),
  actions: z.array(butlerActionSchema),
});

export type ButlerAction = z.infer<typeof butlerActionSchema>;
export type ProposalPayload = z.infer<typeof proposalPayloadSchema>;
