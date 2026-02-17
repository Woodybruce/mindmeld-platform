import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MS_CLIENT_ID = Deno.env.get("MICROSOFT_CLIENT_ID")!;
const MS_CLIENT_SECRET = Deno.env.get("MICROSOFT_CLIENT_SECRET")!;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function refreshMicrosoftToken(refreshToken: string) {
  const res = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: MS_CLIENT_ID,
      client_secret: MS_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
      scope: "https://graph.microsoft.com/Calendars.Read offline_access",
    }),
  });
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabaseUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) return json({ error: "Unauthorized" }, 401);

    // Parse body for mode and selected events
    let body: any = {};
    try { body = await req.json(); } catch { /* empty body is fine for preview */ }

    const mode = body.mode || "preview"; // "preview" or "import"

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get Microsoft token
    const { data: tokenRow, error: tokenError } = await admin
      .from("microsoft_tokens")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (tokenError || !tokenRow) {
      return json({ error: "no_microsoft_token" }, 400);
    }

    // Refresh the access token if expired
    let accessToken = tokenRow.access_token;
    const expiresAt = new Date(tokenRow.expires_at);

    if (expiresAt <= new Date()) {
      const refreshResult = await refreshMicrosoftToken(tokenRow.refresh_token);
      if (refreshResult.error) {
        return json({ error: "Failed to refresh Microsoft token. Please reconnect your account." }, 400);
      }
      accessToken = refreshResult.access_token;

      await admin.from("microsoft_tokens").update({
        access_token: refreshResult.access_token,
        refresh_token: refreshResult.refresh_token || tokenRow.refresh_token,
        expires_at: new Date(Date.now() + refreshResult.expires_in * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("user_id", user.id);
    }

    // ── IMPORT MODE: insert selected events ──
    if (mode === "import" && Array.isArray(body.events)) {
      const rows = body.events.map((e: any) => ({
        user_id: user.id,
        subject: (e.subject || "Untitled").trim(),
        start_time: e.start_time,
        end_time: e.end_time,
        is_all_day: e.is_all_day || false,
        location: e.location || null,
        source: "outlook",
      }));

      // Dedupe against existing — normalize start_time to ISO date-only for all-day, full ISO otherwise
      const { data: existing } = await admin
        .from("calendar_events")
        .select("subject, start_time, is_all_day")
        .eq("user_id", user.id)
        .eq("source", "outlook");

      const normalizeKey = (subject: string, startTime: string, isAllDay: boolean) => {
        const s = subject.trim().toLowerCase();
        const t = isAllDay
          ? new Date(startTime).toISOString().slice(0, 10)
          : new Date(startTime).toISOString();
        return `${s}|${t}`;
      };

      const existingSet = new Set(
        (existing || []).map((e: any) => normalizeKey(e.subject, e.start_time, e.is_all_day))
      );

      const newRows = rows.filter(
        (r: any) => !existingSet.has(normalizeKey(r.subject, r.start_time, r.is_all_day))
      );

      if (newRows.length > 0) {
        const { error: insertError } = await admin.from("calendar_events").insert(newRows);
        if (insertError) throw insertError;
      }

      return json({ success: true, count: newRows.length });
    }

    // ── PREVIEW MODE: fetch and return events ──
    const now = new Date();
    const future = new Date(now.getTime() + 183 * 24 * 60 * 60 * 1000); // ~6 months

    const graphRes = await fetch(
      `https://graph.microsoft.com/v1.0/me/calendarview?startDateTime=${now.toISOString()}&endDateTime=${future.toISOString()}&$top=200&$orderby=start/dateTime&$select=subject,start,end,isAllDay,location,attendees`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!graphRes.ok) {
      const errBody = await graphRes.text();
      console.error("Graph API error:", errBody);
      return json({ error: "Failed to fetch Outlook calendar" }, 500);
    }

    const graphData = await graphRes.json();
    const outlookEvents = graphData.value || [];

    // Get partner's email to flag shared events
    let partnerEmail: string | null = null;
    const { data: profileData } = await admin
      .from("profiles")
      .select("partner_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileData?.partner_id) {
      // Get partner's email from auth.users via admin
      const { data: { users } } = await admin.auth.admin.listUsers();
      const partner = users?.find((u: any) => u.id === profileData.partner_id);
      if (partner?.email) partnerEmail = partner.email.toLowerCase();
    }

    // Check which events are already imported
    const { data: existing } = await admin
      .from("calendar_events")
      .select("subject, start_time, is_all_day")
      .eq("user_id", user.id)
      .eq("source", "outlook");

    const normalizeKey = (subject: string, startTime: string, isAllDay: boolean) => {
      const s = subject.trim().toLowerCase();
      const t = isAllDay
        ? new Date(startTime).toISOString().slice(0, 10)
        : new Date(startTime).toISOString();
      return `${s}|${t}`;
    };

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

    return json({ events, partner_email: partnerEmail ? "found" : null });
  } catch (err) {
    console.error("Outlook sync error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return json({ error: message }, 500);
  }
});
