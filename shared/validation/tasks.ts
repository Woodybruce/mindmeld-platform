// drizzle-zod 0.8 emits zod/v4 schemas; all zod usage here must come from zod/v4.
import { z } from 'zod/v4';

// Hand-written zod schemas mirroring the tasks table (see the note in
// shared/validation/household.ts for why drizzle-zod is not used here).
// dueDate is required when source is 'school'.

const taskBase = z.object({
  title: z.string().min(1),
  notes: z.string().optional(),
  assigneeUserId: z.string().optional(),
  dependentId: z.uuid().optional(),
  dueDate: z.iso.date().optional(),
  recurrence: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  source: z.enum(['manual', 'butler', 'school', 'holiday']).optional(),
  attachments: z.array(z.unknown()).optional(),
});

export const insertTaskSchema = taskBase.refine(
  (data) => data.source !== 'school' || data.dueDate !== undefined,
  { message: 'dueDate is required when source is school', path: ['dueDate'] },
);

export const patchTaskSchema = taskBase.partial();
