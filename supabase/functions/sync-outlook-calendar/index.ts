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
    // Get user from JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabaseUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) return json({ error: "Unauthorized" }, 401);

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

    // Refresh the access token
    let accessToken = tokenRow.access_token;
    const expiresAt = new Date(tokenRow.expires_at);

    if (expiresAt <= new Date()) {
      const refreshResult = await refreshMicrosoftToken(tokenRow.refresh_token);
      if (refreshResult.error) {
        return json({ error: "Failed to refresh Microsoft token. Please reconnect your account." }, 400);
      }
      accessToken = refreshResult.access_token;

      // Update stored tokens
      await admin.from("microsoft_tokens").update({
        access_token: refreshResult.access_token,
        refresh_token: refreshResult.refresh_token || tokenRow.refresh_token,
        expires_at: new Date(Date.now() + refreshResult.expires_in * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("user_id", user.id);
    }

    // Fetch calendar events from Microsoft Graph (next 30 days)
    const now = new Date();
    const future = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const graphRes = await fetch(
      `https://graph.microsoft.com/v1.0/me/calendarview?startDateTime=${now.toISOString()}&endDateTime=${future.toISOString()}&$top=50&$orderby=start/dateTime`,
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

    if (outlookEvents.length === 0) {
      return json({ success: true, count: 0, message: "No upcoming events found" });
    }

    // Map to our calendar_events format
    const rows = outlookEvents.map((e: any) => ({
      user_id: user.id,
      subject: e.subject || "Untitled",
      start_time: e.start?.dateTime ? new Date(e.start.dateTime + "Z").toISOString() : now.toISOString(),
      end_time: e.end?.dateTime ? new Date(e.end.dateTime + "Z").toISOString() : now.toISOString(),
      is_all_day: e.isAllDay || false,
      location: e.location?.displayName || null,
      source: "outlook",
    }));

    // Upsert — avoid duplicates by checking existing events with same subject + start_time + source
    const { data: existing } = await admin
      .from("calendar_events")
      .select("subject, start_time")
      .eq("user_id", user.id)
      .eq("source", "outlook");

    const existingSet = new Set(
      (existing || []).map((e: any) => `${e.subject}|${e.start_time}`)
    );

    const newRows = rows.filter(
      (r: any) => !existingSet.has(`${r.subject}|${r.start_time}`)
    );

    if (newRows.length > 0) {
      const { error: insertError } = await admin.from("calendar_events").insert(newRows);
      if (insertError) throw insertError;
    }

    return json({ success: true, count: newRows.length, total: outlookEvents.length });
  } catch (err) {
    console.error("Outlook sync error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return json({ error: message }, 500);
  }
});
