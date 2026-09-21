import type { Express, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { sendPushToUser } from "../../lib/push";

// Legacy chat/notification routes (GIF search, Instagram embeds, web/FCM
// push). Moved verbatim from server/routes.ts (Task 10). The push send logic
// now lives in server/lib/push.ts so the butler can reuse it.

export function registerChatRoutes(app: Express): void {
  // 1. GET /api/search-gifs
  app.get("/api/search-gifs", async (req: Request, res: Response) => {
    const GIPHY_API_KEY = process.env.GIPHY_API_KEY;
    if (!GIPHY_API_KEY) {
      return res.status(500).json({ error: "GIPHY_API_KEY not configured" });
    }

    const q = (req.query.q as string) || "";
    const offset = (req.query.offset as string) || "0";

    try {
      const endpoint = q
        ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(q)}&limit=20&offset=${offset}&rating=pg-13`
        : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=20&offset=${offset}&rating=pg-13`;

      const giphyRes = await fetch(endpoint);
      const data = await giphyRes.json();

      if (!giphyRes.ok) {
        throw new Error(`GIPHY API error [${giphyRes.status}]: ${JSON.stringify(data)}`);
      }

      const gifs = (data.data || []).map((g: any) => ({
        id: g.id,
        title: g.title,
        url: g.images.fixed_height.url,
        preview: g.images.fixed_height_small.url || g.images.preview_gif?.url || g.images.fixed_height.url,
        width: parseInt(g.images.fixed_height.width),
        height: parseInt(g.images.fixed_height.height),
      }));

      res.json({ gifs });
    } catch (error: any) {
      console.error("GIF search error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // VAPID public key endpoint for web push
  app.get("/api/vapid-public-key", (_req: Request, res: Response) => {
    const key = process.env.VAPID_PUBLIC_KEY;
    if (!key) return res.status(500).json({ error: "VAPID not configured" });
    res.json({ publicKey: key });
  });

  // Web push subscription registration
  app.post("/api/web-push-subscribe", async (req: Request, res: Response) => {
    try {
      const { userId, subscription } = req.body;
      if (!userId || !subscription) {
        return res.status(400).json({ error: "userId and subscription required" });
      }

      const supabaseUrl = process.env.SUPABASE_URL!;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const token = JSON.stringify(subscription);

      await supabase.from("device_tokens").upsert(
        {
          user_id: userId,
          token,
          platform: "web",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,token" }
      );

      res.json({ success: true });
    } catch (error: any) {
      console.error("Web push subscribe error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // 2. POST /api/send-push-notification
  app.post("/api/send-push-notification", async (req: Request, res: Response) => {
    try {
      const { recipientUserId, title, body, data: rawData } = req.body;
      const data = rawData ? Object.fromEntries(Object.entries(rawData).map(([k, v]) => [k, String(v)])) : undefined;

      if (!recipientUserId || !title) {
        return res.status(400).json({ error: "recipientUserId and title are required" });
      }

      const result = await sendPushToUser(recipientUserId, {
        title,
        body: body || "",
        route: data?.route,
        data,
      });

      if (result.reason === "no_tokens") {
        return res.json({ success: true, sent: 0, reason: "no_tokens" });
      }
      res.json({ success: true, sent: result.sent });
    } catch (error: any) {
      console.error("Push notification error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // 3. POST /api/instagram-oembed
  app.post("/api/instagram-oembed", async (req: Request, res: Response) => {
    try {
      const { url } = req.body;
      if (!url || !url.includes("instagram.com")) {
        return res.status(400).json({ error: "Invalid Instagram URL" });
      }

      const accessToken = process.env.META_APP_TOKEN;
      if (!accessToken) {
        return res.status(500).json({ error: "META_APP_TOKEN not configured" });
      }

      const oembedUrl = `https://graph.facebook.com/v22.0/instagram_oembed?url=${encodeURIComponent(url)}&access_token=${encodeURIComponent(accessToken)}&omitscript=true&maxwidth=400`;
      const resp = await fetch(oembedUrl);

      if (resp.ok) {
        const data = await resp.json();
        return res.json({
          title: data.title || data.author_name || null,
          author: data.author_name || null,
          thumbnail_url: data.thumbnail_url || null,
          html: data.html || null,
          type: data.type || "rich",
        });
      }

      const errorBody = await resp.text();
      console.error("oEmbed API error:", resp.status, errorBody);
      res.json({
        title: null,
        author: null,
        thumbnail_url: null,
        html: null,
        type: "link",
        fallback: true,
      });
    } catch (err: any) {
      console.error("oEmbed error:", err);
      res.status(500).json({ error: "Failed to fetch embed data" });
    }
  });
}
