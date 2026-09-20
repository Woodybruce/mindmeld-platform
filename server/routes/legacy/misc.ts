import type { Express, Request, Response } from "express";
import express from "express";
import { createClient } from "@supabase/supabase-js";
import { extractUserId } from "../../middleware/auth";
import { getUncachableSpotifyClient, invalidateSpotifyCache, getSpotifyAuthUrl, exchangeSpotifyCode, isSpotifyConnected, spotifyApiFetch, getSpotifyAccessToken } from "../../spotify";

// Legacy misc routes: admin/health probes, photo upload, Substack feed,
// password reset, and the Spotify integration. Moved verbatim from
// server/routes.ts (Task 10).

async function spotifyRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e: any) {
    if (e?.message?.includes("Bad OAuth") || e?.message?.includes("expired") || e?.message?.includes("401")) {
      invalidateSpotifyCache();
      return await fn();
    }
    throw e;
  }
}

interface FeedItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  imageUrl: string | null;
}

function extractItems(xml: string): FeedItem[] {
  const items: FeedItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] ||
                  block.match(/<title>(.*?)<\/title>/)?.[1] || "";
    const link = block.match(/<link>(.*?)<\/link>/)?.[1] || "";
    const rawDesc = block.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/)?.[1] ||
                    block.match(/<description>([\s\S]*?)<\/description>/)?.[1] || "";
    const imgMatch = rawDesc.match(/<img[^>]+src=["']([^"']+)["']/i);
    const imageUrl = imgMatch?.[1] || block.match(/<enclosure[^>]+url=["']([^"']+)["']/i)?.[1] || null;
    const description = rawDesc.replace(/<[^>]+>/g, "").trim().slice(0, 200);
    const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || "";
    items.push({ title, link, description, pubDate, imageUrl });
  }
  return items;
}

export function registerMiscRoutes(app: Express): void {
  app.get("/api/is-admin", async (req: Request, res: Response) => {
    const userId = await extractUserId(req);
    if (!userId) return res.json({ admin: false });
    try {
      const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      const { data } = await sb.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
      res.json({ admin: !!data });
    } catch {
      res.json({ admin: false });
    }
  });

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/upload-photo", express.raw({ type: "image/*", limit: "10mb" }), async (req: Request, res: Response) => {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_URL || !SUPABASE_KEY) return res.status(500).json({ error: "Supabase not configured" });

    const userId = req.headers["x-user-id"] as string;
    if (!userId) return res.status(400).json({ error: "Missing user ID" });

    const bucket = (req.headers["x-bucket"] as string) || "couple-photos";
    const contentType = req.headers["content-type"] || "image/jpeg";
    const ext = contentType.split("/")[1]?.split("+")[0] || "jpg";
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
    const caption = (req.headers["x-caption"] as string) || "";

    try {
      const admin = createClient(SUPABASE_URL, SUPABASE_KEY);
      const { error: uploadError } = await admin.storage
        .from(bucket)
        .upload(path, req.body, { contentType, upsert: false });

      if (uploadError) {
        console.error("Photo upload storage error:", uploadError.message);
        return res.status(500).json({ error: uploadError.message });
      }

      if (bucket === "couple-photos") {
        const insertPayload: any = { user_id: userId, storage_path: path };
        if (caption) insertPayload.caption = caption;
        const { error: dbError } = await admin.from("couple_photos").insert(insertPayload);
        if (dbError) {
          console.error("Photo upload DB error:", dbError.message);
          return res.status(500).json({ error: dbError.message });
        }
      }

      const { data: urlData } = admin.storage.from(bucket).getPublicUrl(path);
      res.json({ success: true, path, publicUrl: urlData.publicUrl });
    } catch (e: any) {
      console.error("Photo upload error:", e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // 4. POST /api/fetch-substack-feed
  app.post("/api/fetch-substack-feed", async (req: Request, res: Response) => {
    try {
      const { newsletters } = req.body;
      if (!newsletters || !Array.isArray(newsletters) || newsletters.length === 0) {
        return res.status(400).json({ success: false, error: "newsletters array required" });
      }

      const slugs = newsletters.slice(0, 5).map((n: string) =>
        n.trim().toLowerCase().replace(/^@/, "").replace(/\.substack\.com.*/, "")
      );

      const allItems: (FeedItem & { newsletter: string })[] = [];

      for (const slug of slugs) {
        try {
          const feedRes = await fetch(`https://${slug}.substack.com/feed`, {
            headers: { "User-Agent": "LovableApp/1.0" },
          });
          if (!feedRes.ok) continue;
          const xml = await feedRes.text();
          const items = extractItems(xml).slice(0, 3);
          items.forEach((item) => allItems.push({ ...item, newsletter: slug }));
        } catch {
          // Skip failed feeds
        }
      }

      allItems.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
      res.json({ success: true, items: allItems.slice(0, 8) });
    } catch (error: any) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ success: false, error: msg });
    }
  });

  // 5. POST /api/send-password-reset
  app.post("/api/send-password-reset", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      const supabaseAdmin = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const redirectTo = process.env.SITE_URL
        ? `${process.env.SITE_URL}/reset-password`
        : "https://mindmeld-platform.lovable.app/reset-password";

      const { data, error } = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo },
      });

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      res.json({ success: true, resetError: resetError?.message });
    } catch (error: any) {
      console.error("Password reset error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ── Spotify routes ──

  function getSpotifyRedirectUri(req: Request): string {
    if (process.env.SPOTIFY_REDIRECT_URI) {
      return process.env.SPOTIFY_REDIRECT_URI;
    }
    const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
    const host = req.headers["x-forwarded-host"] || req.headers.host || req.hostname;
    const origin = `${protocol}://${host}`;
    return `${origin}/api/spotify/callback`;
  }

  app.get("/api/spotify/auth", (req: Request, res: Response) => {
    const redirectUri = getSpotifyRedirectUri(req);
    console.log("Spotify auth redirect_uri:", redirectUri);
    res.redirect(getSpotifyAuthUrl(redirectUri));
  });

  app.get("/api/spotify/callback", async (req: Request, res: Response) => {
    const code = req.query.code as string;
    const error = req.query.error as string;
    if (error) {
      return res.status(400).send(`Spotify auth error: ${error}`);
    }
    if (!code) {
      return res.status(400).send("Missing code parameter");
    }
    try {
      const redirectUri = getSpotifyRedirectUri(req);
      console.log("Spotify callback redirect_uri:", redirectUri);
      await exchangeSpotifyCode(code, redirectUri);
      res.send(`<html><body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#faf5f0"><div style="text-align:center"><h2 style="color:#1DB954">&#10003; Spotify connected!</h2><p style="color:#666">Redirecting back to the app&hellip;</p></div><script>setTimeout(function(){window.location.href='/'},1500)</script></body></html>`);
    } catch (e: any) {
      console.error("Spotify callback error:", e.message);
      res.status(500).send(`Spotify auth failed: ${e.message}`);
    }
  });

  app.get("/api/spotify/status", async (_req: Request, res: Response) => {
    res.json({ connected: await isSpotifyConnected() });
  });

  app.get("/api/spotify/now-playing", async (_req: Request, res: Response) => {
    try {
      const result = await spotifyRetry(async () => {
        const spotify = await getUncachableSpotifyClient();
        const playback = await spotify.player.getCurrentlyPlayingTrack();
        if (!playback || !playback.item) {
          return { playing: false };
        }
        const track = playback.item as any;
        return {
          playing: true,
          isPlaying: playback.is_playing,
          track: {
            id: track.id,
            name: track.name,
            artist: track.artists?.map((a: any) => a.name).join(", ") || "",
            album: track.album?.name || "",
            albumArt: track.album?.images?.[0]?.url || "",
            spotifyUrl: track.external_urls?.spotify || "",
            durationMs: track.duration_ms,
            progressMs: playback.progress_ms,
          },
        };
      });
      res.json(result);
    } catch (e: any) {
      console.error("Spotify now-playing error:", e.message);
      res.json({ playing: false, error: e.message });
    }
  });

  app.get("/api/spotify/search", async (req: Request, res: Response) => {
    try {
      const q = (req.query.q as string) || "";
      if (!q.trim()) return res.json({ tracks: [] });
      const tracks = await spotifyRetry(async () => {
        const spotify = await getUncachableSpotifyClient();
        const results = await spotify.search(q, ["track"], undefined, 10);
        return (results.tracks?.items || []).map((t: any) => ({
          id: t.id,
          uri: t.uri,
          name: t.name,
          artist: t.artists?.map((a: any) => a.name).join(", ") || "",
          album: t.album?.name || "",
          albumArt: t.album?.images?.[1]?.url || t.album?.images?.[0]?.url || "",
          spotifyUrl: t.external_urls?.spotify || "",
          previewUrl: t.preview_url || null,
          durationMs: t.duration_ms,
        }));
      });
      res.json({ tracks });
    } catch (e: any) {
      console.error("Spotify search error:", e.message);
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/spotify/playlist", async (req: Request, res: Response) => {
    try {
      const playlistId = req.query.playlistId as string;
      if (!playlistId) return res.status(400).json({ error: "playlistId required" });
      const playlist = await spotifyApiFetch(`/playlists/${playlistId}`);
      let trackItems: any[] = [];
      try {
        if (playlist.tracks?.items?.length > 0) {
          trackItems = playlist.tracks.items;
        } else {
          const tracksData = await spotifyApiFetch(`/playlists/${playlistId}/tracks?limit=100`);
          trackItems = tracksData?.items || [];
        }
      } catch (tracksErr: any) {
        console.warn("Could not fetch playlist tracks (may be restricted in dev mode):", tracksErr.message);
      }
      const tracks = trackItems.map((item: any) => {
        const t = item.track;
        return {
          id: t?.id,
          uri: t?.uri,
          name: t?.name,
          artist: t?.artists?.map((a: any) => a.name).join(", ") || "",
          album: t?.album?.name || "",
          albumArt: t?.album?.images?.[1]?.url || t?.album?.images?.[0]?.url || "",
          spotifyUrl: t?.external_urls?.spotify || "",
          addedAt: item.added_at,
          durationMs: t?.duration_ms,
        };
      });
      res.json({
        id: playlist.id,
        name: playlist.name,
        description: playlist.description,
        image: playlist.images?.[0]?.url || "",
        spotifyUrl: playlist.external_urls?.spotify || "",
        tracks,
        total: playlist.tracks?.total || tracks.length,
      });
    } catch (e: any) {
      console.error("Spotify playlist error:", e.message);
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/spotify/playlist/create", async (req: Request, res: Response) => {
    try {
      const { name, description } = req.body;
      const accessToken = await getSpotifyAccessToken();

      const meResp = await fetch("https://api.spotify.com/v1/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const me = await meResp.json();
      console.log("Spotify /me user id:", me.id, "product:", me.product);

      const createBody = JSON.stringify({
        name: name || "Us — Our Playlist",
        description: description || "Our shared couple playlist",
        public: false,
      });
      console.log("Spotify create playlist request:", `POST /users/${me.id}/playlists`, createBody);

      const createResp = await fetch(`https://api.spotify.com/v1/users/${me.id}/playlists`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: createBody,
      });

      const respText = await createResp.text();
      console.log("Spotify create playlist response:", createResp.status, createResp.headers.get("www-authenticate"), respText.substring(0, 500));

      if (!createResp.ok) {
        return res.status(createResp.status).json({ error: `Spotify API ${createResp.status}: ${respText}` });
      }

      const playlist = JSON.parse(respText);
      res.json({ id: playlist.id, name: playlist.name, spotifyUrl: playlist.external_urls?.spotify || "" });
    } catch (e: any) {
      console.error("Spotify create playlist error:", e.message);
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/spotify/playlist/add", async (req: Request, res: Response) => {
    try {
      const { playlistId, trackUri } = req.body;
      if (!playlistId || !trackUri) return res.status(400).json({ error: "playlistId and trackUri required" });
      const accessToken = await getSpotifyAccessToken();
      const resp = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ uris: [trackUri] }),
      });
      if (!resp.ok) {
        const errText = await resp.text();
        console.error("Spotify add track error:", resp.status, errText);
        return res.status(resp.status).json({ error: errText });
      }
      res.json({ success: true });
    } catch (e: any) {
      console.error("Spotify add track error:", e.message);
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/spotify/playlist/remove", async (req: Request, res: Response) => {
    try {
      const { playlistId, trackUri } = req.body;
      if (!playlistId || !trackUri) return res.status(400).json({ error: "playlistId and trackUri required" });
      const accessToken = await getSpotifyAccessToken();
      const resp = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ tracks: [{ uri: trackUri }] }),
      });
      if (!resp.ok) {
        const errText = await resp.text();
        console.error("Spotify remove track error:", resp.status, errText);
        return res.status(resp.status).json({ error: errText });
      }
      res.json({ success: true });
    } catch (e: any) {
      console.error("Spotify remove track error:", e.message);
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/spotify/recently-played", async (_req: Request, res: Response) => {
    try {
      const tracks = await spotifyRetry(async () => {
        const spotify = await getUncachableSpotifyClient();
        const recent = await spotify.player.getRecentlyPlayedTracks(10);
        return (recent.items || []).map((item: any) => {
          const t = item.track;
          return {
            id: t.id,
            name: t.name,
            artist: t.artists?.map((a: any) => a.name).join(", ") || "",
            album: t.album?.name || "",
            albumArt: t.album?.images?.[1]?.url || t.album?.images?.[0]?.url || "",
            spotifyUrl: t.external_urls?.spotify || "",
            playedAt: item.played_at,
          };
        });
      });
      res.json({ tracks });
    } catch (e: any) {
      console.error("Spotify recently-played error:", e.message);
      res.json({ tracks: [] });
    }
  });
}
