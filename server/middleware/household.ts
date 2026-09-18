import { eq } from 'drizzle-orm';
import type { NextFunction, Request, Response } from 'express';
// Explicit `/index`: bare `../../shared/schema` resolves to the legacy shared/schema.ts file.
import { householdMembers } from '../../shared/schema/index';
import type { Database } from '../db';

declare module 'express-serve-static-core' {
  interface Request {
    householdId?: string;
  }
}

export function requireHousehold(db: Database) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'unauthenticated' });
    const [m] = await db.select().from(householdMembers).where(eq(householdMembers.userId, userId));
    if (!m) return res.status(403).json({ error: 'no_household' });
    req.householdId = m.householdId;
    next();
  };
}
