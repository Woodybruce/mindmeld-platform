import type { Express } from "express";
import { createClient } from "@supabase/supabase-js";
import { db } from "./db";
import { initSpotifyTokens } from "./spotify";
import { newApiRouter } from "./routes/index";
import { registerMiscRoutes } from "./routes/legacy/misc";
import { registerChatRoutes } from "./routes/legacy/chat";
import { registerAiRoutes } from "./routes/legacy/ai";
import { registerCalendarRoutes } from "./routes/legacy/calendar";
import { registerShopRoutes } from "./routes/legacy/shop";

// extractUserId moved to ./middleware/auth (Phase 1 router stack owns auth);
// re-exported here to keep the existing import contract.
export { extractUserId } from "./middleware/auth";

async function ensureStorageBuckets() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;
  try {
    const admin = createClient(url, key);
    const { data: buckets } = await admin.storage.listBuckets();
    const existingNames = new Set(buckets?.map((b: any) => b.name) || []);

    const required = [
      { name: "couple-photos", opts: { public: true, allowedMimeTypes: ["image/*"], fileSizeLimit: 10485760 } },
      { name: "chat-images", opts: { public: true, allowedMimeTypes: ["image/*"], fileSizeLimit: 10485760 } },
      { name: "voice-notes", opts: { public: true, allowedMimeTypes: ["audio/*"], fileSizeLimit: 10485760 } },
    ];

    for (const { name, opts } of required) {
      if (!existingNames.has(name)) {
        const { error } = await admin.storage.createBucket(name, opts);
        if (error) {
          console.warn(`Could not create ${name} bucket:`, error.message);
        } else {
          console.log(`Created ${name} storage bucket`);
        }
      } else {
        await admin.storage.updateBucket(name, opts);
      }
    }
  } catch (e: any) {
    console.warn("Storage bucket check failed:", e.message);
  }
}

export async function registerRoutes(app: Express): Promise<void> {
  await initSpotifyTokens();
  ensureStorageBuckets();

  // Phase 1+ API router stack: owns its own auth middleware and mounts the
  // household (and future) routers. Legacy routes below are unaffected.
  app.use("/api", newApiRouter(db));

  // Legacy route modules (pre-Phase-1 endpoints). Paths and per-route
  // auth behavior are unchanged; each module registers the exact handlers
  // that used to live inline here.
  registerMiscRoutes(app);
  registerChatRoutes(app);
  registerAiRoutes(app);
  registerCalendarRoutes(app);
  registerShopRoutes(app);
}
