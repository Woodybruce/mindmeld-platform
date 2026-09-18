import type { Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { extractUserId } from "./auth";

// Moved verbatim from server/routes.ts (Task 10).

export async function requireAdmin(req: Request, res: Response): Promise<string | null> {
  const userId = await extractUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }
  try {
    const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data } = await sb.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (!data) {
      res.status(403).json({ error: "Admin access required" });
      return null;
    }
    return userId;
  } catch {
    res.status(500).json({ error: "Failed to verify permissions" });
    return null;
  }
}
