import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { extractUserId } from '../middleware/auth';
import { householdRouter } from './household';
import { tasksRouter } from './tasks';
import { listsRouter } from './lists';
import { eventsRouter } from './events';
import type { Database } from '../db';

// New (Phase 1+) API routers live under this stack: it owns the auth
// middleware (resolves req.userId via Supabase) so server/routes.ts only
// needs a single app.use('/api', newApiRouter(db)). Mount future routers
// (Tasks 4-9) below householdRouter.
export function newApiRouter(db: Database): Router {
  const router = Router();

  router.use(async (req: Request, _res: Response, next: NextFunction) => {
    req.userId = await extractUserId(req);
    next();
  });

  router.use(householdRouter(db));
  router.use(tasksRouter(db));
  router.use(listsRouter(db));
  router.use(eventsRouter(db));

  return router;
}
