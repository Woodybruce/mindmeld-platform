import type { Express, Request, Response } from "express";
import express from "express";
import { createClient } from "@supabase/supabase-js";

// Legacy calendar routes: Microsoft/Outlook OAuth + sync and inbound
// ICS forwarding. Moved verbatim from server/routes.ts (Task 10).

function parseIcs(icsText: string) {
  const events: Array<{
    subject: string;
    start: string;
    end: string;
    isAllDay: boolean;
    location?: string;
  }> = [];

  const blocks = icsText.split("BEGIN:VEVENT");
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i].split("END:VEVENT")[0];

    const getField = (name: string): string | undefined => {
      const unfolded = block.replace(/\r?\n[ \t]/g, "");
      const regex = new RegExp(`^${name}[;:](.*)$`, "m");
      const match = unfolded.match(regex);
      return match ? match[1].trim() : undefined;
    };

    const summary = getField("SUMMARY") || "Untitled Event";
    const dtstart = getField("DTSTART") || "";
    const dtend = getField("DTEND") || dtstart;
    const location = getField("LOCATION");

    const parseIcsDate = (val: string): string => {
      const parts = val.split(":");
      const dateStr = parts[parts.length - 1];

      if (dateStr.length === 8) {
        return new Date(
          parseInt(dateStr.slice(0, 4)),
          parseInt(dateStr.slice(4, 6)) - 1,
          parseInt(dateStr.slice(6, 8))
        ).toISOString();
      }
      const y = parseInt(dateStr.slice(0, 4));
      const m = parseInt(dateStr.slice(4, 6)) - 1;
      const d = parseInt(dateStr.slice(6, 8));
      const h = parseInt(dateStr.slice(9, 11)) || 0;
      const min = parseInt(dateStr.slice(11, 13)) || 0;
      const s = parseInt(dateStr.slice(13, 15)) || 0;

      if (dateStr.endsWith("Z")) {
        return new Date(Date.UTC(y, m, d, h, min, s)).toISOString();
      }
      return new Date(y, m, d, h, min, s).toISOString();
    };

    const isAllDay = !dtstart.includes("T") &&
      (dtstart.split(":").pop()?.length === 8 || dtstart.length === 8);

    events.push({
      subject: summary,
      start: parseIcsDate(dtstart),
      end: parseIcsDate(dtend),
      isAllDay,
      location: location || undefined,
    });
  }

  return events;
}

async function refreshMicrosoftToken(refreshToken: string) {
  const res = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID!,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
      scope: "https://graph.microsoft.com/Calendars.Read offline_access",
    }),
  });
  return res.json();
}

export function registerCalendarRoutes(app: Express): void {
  // 15. GET /api/microsoft-auth-url
  app.get("/api/microsoft-auth-url", (req: Request, res: Response) => {
    try {
      const msClientId = process.env.MICROSOFT_CLIENT_ID;
      if (!msClientId) {
        return res.status(500).json({ error: "MICROSOFT_CLIENT_ID not configured" });
      }

      const redirectUri = (req.query.redirect_uri as string) || "";
      const scope = "https://graph.microsoft.com/Calendars.Read offline_access";

      const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
        `client_id=${encodeURIComponent(msClientId)}` +
        `&response_type=code` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&scope=${encodeURIComponent(scope)}` +
        `&response_mode=query`;

      res.json({ url: authUrl });
    } catch (err) {
      res.status(500).json({ error: "Failed to generate auth URL" });
    }
  });

  // 16. POST /api/microsoft-oauth-callback
  app.post("/api/microsoft-oauth-callback", async (req: Request, res: Response) => {
    try {
      const { code, redirect_uri } = req.body;
      if (!code) return res.status(400).json({ error: "Missing authorization code" });

      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: "Unauthorized" });

      const supabaseUser = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
      if (userError || !user) return res.status(401).json({ error: "Unauthorized" });

      const tokenRes = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.MICROSOFT_CLIENT_ID!,
          client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
          code,
          redirect_uri: redirect_uri || "",
          grant_type: "authorization_code",
          scope: "https://graph.microsoft.com/Calendars.Read offline_access",
        }),
      });

      const tokenData = await tokenRes.json();

      if (tokenData.error) {
        console.error("Microsoft token exchange error:", tokenData);
        return res.status(400).json({ error: tokenData.error_description || "Failed to exchange code" });
      }

      const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

      const { error: upsertError } = await admin.from("microsoft_tokens").upsert(
        {
          user_id: user.id,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

      if (upsertError) {
        console.error("Upsert error:", upsertError);
        return res.status(500).json({ error: "Failed to save tokens" });
      }

      res.json({ success: true });
    } catch (err: any) {
      console.error("OAuth callback error:", err);
      res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
    }
  });

  // 17. POST /api/sync-outlook-calendar
  app.post("/api/sync-outlook-calendar", async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: "Unauthorized" });

      const supabaseUser = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
      if (userError || !user) return res.status(401).json({ error: "Unauthorized" });

      const body = req.body || {};
      const mode = body.mode || "preview";

      const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

      const { data: tokenRow, error: tokenError } = await admin
        .from("microsoft_tokens")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (tokenError || !tokenRow) {
        return res.status(400).json({ error: "no_microsoft_token" });
      }

      let accessToken = tokenRow.access_token;
      const expiresAt = new Date(tokenRow.expires_at);

      if (expiresAt <= new Date()) {
        const refreshResult = await refreshMicrosoftToken(tokenRow.refresh_token);
        if (refreshResult.error) {
          return res.status(400).json({ error: "Failed to refresh Microsoft token. Please reconnect your account." });
        }
        accessToken = refreshResult.access_token;

        await admin.from("microsoft_tokens").update({
          access_token: refreshResult.access_token,
          refresh_token: refreshResult.refresh_token || tokenRow.refresh_token,
          expires_at: new Date(Date.now() + refreshResult.expires_in * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("user_id", user.id);
      }

      const normalizeKey = (subject: string, startTime: string, isAllDay: boolean) => {
        const s = subject.trim().toLowerCase();
        const t = isAllDay
          ? new Date(startTime).toISOString().slice(0, 10)
          : new Date(startTime).toISOString();
        return `${s}|${t}`;
      };

      if (mode === "import" && Array.isArray(body.events)) {
        const { data: profileData } = await admin
          .from("profiles")
          .select("partner_id")
          .eq("id", user.id)
          .maybeSingle();
        const partnerId = profileData?.partner_id || null;

        const rows = body.events.map((e: any) => ({
          user_id: user.id,
          subject: (e.subject || "Untitled").trim(),
          start_time: e.start_time,
          end_time: e.end_time,
          is_all_day: e.is_all_day || false,
          location: e.location || null,
          source: "outlook",
          partner_invited: !!e.partner_invited,
        }));

        const { data: existing } = await admin
          .from("calendar_events")
          .select("subject, start_time, is_all_day")
          .eq("user_id", user.id)
          .eq("source", "outlook");

        const existingSet = new Set(
          (existing || []).map((e: any) => normalizeKey(e.subject, e.start_time, e.is_all_day))
        );

        const newRows = rows.filter(
          (r: any) => !existingSet.has(normalizeKey(r.subject, r.start_time, r.is_all_day))
        );

        let insertedCount = 0;
        for (const row of newRows) {
          const { partner_invited, ...insertRow } = row;
          const { error: insertError } = await admin.from("calendar_events").insert(insertRow);
          if (!insertError) insertedCount++;

          if (partner_invited && partnerId) {
            const partnerRow = { ...insertRow, user_id: partnerId, source: "outlook-shared" };
            const { data: partnerExisting } = await admin
              .from("calendar_events")
              .select("id")
              .eq("user_id", partnerId)
              .eq("subject", partnerRow.subject)
              .eq("start_time", partnerRow.start_time)
              .maybeSingle();
            if (!partnerExisting) {
              await admin.from("calendar_events").insert(partnerRow);
            }
          }
        }

        return res.json({ success: true, count: insertedCount });
      }

      const now = new Date();
      const future = new Date(now.getTime() + 183 * 24 * 60 * 60 * 1000);

      const graphRes = await fetch(
        `https://graph.microsoft.com/v1.0/me/calendarview?startDateTime=${now.toISOString()}&endDateTime=${future.toISOString()}&$top=200&$orderby=start/dateTime&$select=subject,start,end,isAllDay,location,attendees`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!graphRes.ok) {
        const errBody = await graphRes.text();
        console.error("Graph API error:", errBody);
        return res.status(500).json({ error: "Failed to fetch Outlook calendar" });
      }

      const graphData = await graphRes.json();
      const outlookEvents = graphData.value || [];

      let partnerEmail: string | null = null;
      const { data: profileData } = await admin
        .from("profiles")
        .select("partner_id")
        .eq("id", user.id)
        .maybeSingle();

      if (profileData?.partner_id) {
        const { data: { users } } = await admin.auth.admin.listUsers();
        const partner = users?.find((u: any) => u.id === profileData.partner_id);
        if (partner?.email) partnerEmail = partner.email.toLowerCase();
      }

      const { data: existing } = await admin
        .from("calendar_events")
        .select("subject, start_time, is_all_day")
        .eq("user_id", user.id)
        .eq("source", "outlook");

      const existingSet = new Set(
        (existing || []).map((e: any) => normalizeKey(e.subject, e.start_time, e.is_all_day))
      );

      const events = outlookEvents.map((e: any) => {
        const startTime = e.start?.dateTime ? new Date(e.start.dateTime + "Z").toISOString() : now.toISOString();
        const endTime = e.end?.dateTime ? new Date(e.end.dateTime + "Z").toISOString() : now.toISOString();
        const isAllDay = e.isAllDay || false;
        const attendees = (e.attendees || []).map((a: any) => a.emailAddress?.address?.toLowerCase()).filter(Boolean);
        const partnerInvited = partnerEmail ? attendees.includes(partnerEmail) : false;
        const alreadyImported = existingSet.has(normalizeKey(e.subject || "Untitled", startTime, isAllDay));

        return {
          subject: (e.subject || "Untitled").trim(),
          start_time: startTime,
          end_time: endTime,
          is_all_day: e.isAllDay || false,
          location: e.location?.displayName || null,
          partner_invited: partnerInvited,
          already_imported: alreadyImported,
          attendees,
        };
      });

      res.json({ events, partner_email: partnerEmail ? "found" : null });
    } catch (err: any) {
      console.error("Outlook sync error:", err);
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  });

  // 18. POST /api/inbound-calendar
  app.post("/api/inbound-calendar", express.text({ type: "*/*" }), async (req: Request, res: Response) => {
    try {
      const token = req.query.token as string;

      if (!token) {
        return res.status(400).json({ error: "Missing token parameter" });
      }

      const adminClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      const { data: profileData, error: profileError } = await adminClient
        .from("profiles")
        .select("id")
        .eq("calendar_forward_token", token)
        .single();

      if (profileError || !profileData) {
        return res.status(401).json({ error: "Invalid forwarding token" });
      }

      const userId = profileData.id as string;
      const body = typeof req.body === "string" ? req.body : String(req.body);

      let icsContent = body;
      if (body.includes("BEGIN:VCALENDAR")) {
        const calStart = body.indexOf("BEGIN:VCALENDAR");
        const calEnd = body.indexOf("END:VCALENDAR");
        if (calStart !== -1 && calEnd !== -1) {
          icsContent = body.slice(calStart, calEnd + "END:VCALENDAR".length);
        }
      }

      if (!icsContent.includes("BEGIN:VEVENT")) {
        return res.status(400).json({ error: "No calendar events found in request" });
      }

      const events = parseIcs(icsContent);
      if (events.length === 0) {
        return res.status(400).json({ error: "Could not parse any events" });
      }

      const rows = events.map((e) => ({
        user_id: userId,
        subject: e.subject,
        start_time: e.start,
        end_time: e.end,
        is_all_day: e.isAllDay,
        location: e.location || null,
        source: "forwarded",
      }));

      const { error } = await adminClient.from("calendar_events").insert(rows);
      if (error) throw error;

      res.json({ success: true, count: events.length });
    } catch (err: any) {
      console.error("Inbound calendar error:", err);
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  });
}
