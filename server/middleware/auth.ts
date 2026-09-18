import { createClient } from "@supabase/supabase-js";
import type { Request } from "express";

declare module 'express-serve-static-core' {
  interface Request {
    userId?: string;
  }
}

export async function extractUserId(req: Request): Promise<string | undefined> {
  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith("Bearer ")) return undefined;
    const token = auth.slice(7);
    const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
    const { data: { user } } = await sb.auth.getUser(token);
    return user?.id;
  } catch { return undefined; }
}
