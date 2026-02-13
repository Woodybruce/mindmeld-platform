import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MICROSOFT_CLIENT_ID = Deno.env.get("MICROSOFT_CLIENT_ID")!;
const MICROSOFT_CLIENT_SECRET = Deno.env.get("MICROSOFT_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
const GRAPH_URL = "https://graph.microsoft.com/v1.0";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getUserId(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const supabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims) return null;
  return data.claims.sub as string;
}

/** Exchange authorization code for tokens */
async function exchangeCode(code: string, redirectUri: string, userId: string) {
  const body = new URLSearchParams({
    client_id: MICROSOFT_CLIENT_ID,
    client_secret: MICROSOFT_CLIENT_SECRET,
    code,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
    scope: "offline_access Calendars.ReadWrite",
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`Token exchange failed: ${JSON.stringify(data)}`);

  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  await admin.from("microsoft_tokens").upsert({
    user_id: userId,
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });

  return { success: true };
}

/** Refresh access token if expired */
async function getValidToken(userId: string): Promise<string> {
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: tokenRow, error } = await admin
    .from("microsoft_tokens")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !tokenRow) throw new Error("No Microsoft account linked");

  // If token not expired, return it
  if (new Date(tokenRow.expires_at) > new Date(Date.now() + 60000)) {
    return tokenRow.access_token;
  }

  // Refresh
  const body = new URLSearchParams({
    client_id: MICROSOFT_CLIENT_ID,
    client_secret: MICROSOFT_CLIENT_SECRET,
    refresh_token: tokenRow.refresh_token,
    grant_type: "refresh_token",
    scope: "offline_access Calendars.ReadWrite",
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`Token refresh failed: ${JSON.stringify(data)}`);

  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
  await admin.from("microsoft_tokens").update({
    access_token: data.access_token,
    refresh_token: data.refresh_token || tokenRow.refresh_token,
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  }).eq("user_id", userId);

  return data.access_token;
}

/** Fetch events from Microsoft Graph */
async function getEvents(userId: string, startDate: string, endDate: string) {
  const accessToken = await getValidToken(userId);
  const res = await fetch(
    `${GRAPH_URL}/me/calendarView?startDateTime=${startDate}&endDateTime=${endDate}&$orderby=start/dateTime&$top=50&$select=id,subject,start,end,location,isAllDay,webLink`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(`Graph API error [${res.status}]: ${JSON.stringify(data)}`);
  return data.value;
}

/** Create event in Microsoft Graph */
async function createEvent(userId: string, event: {
  subject: string;
  start: string;
  end: string;
  isAllDay?: boolean;
  location?: string;
}) {
  const accessToken = await getValidToken(userId);
  const body: Record<string, unknown> = {
    subject: event.subject,
    start: event.isAllDay
      ? { dateTime: event.start, timeZone: "UTC" }
      : { dateTime: event.start, timeZone: "UTC" },
    end: event.isAllDay
      ? { dateTime: event.end, timeZone: "UTC" }
      : { dateTime: event.end, timeZone: "UTC" },
    isAllDay: event.isAllDay || false,
  };
  if (event.location) {
    body.location = { displayName: event.location };
  }

  const res = await fetch(`${GRAPH_URL}/me/events`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Create event failed [${res.status}]: ${JSON.stringify(data)}`);
  return data;
}

/** Check if user has linked Microsoft account */
async function checkConnection(userId: string) {
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data } = await admin
    .from("microsoft_tokens")
    .select("id")
    .eq("user_id", userId)
    .single();
  return { connected: !!data };
}

/** Disconnect Microsoft account */
async function disconnect(userId: string) {
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  await admin.from("microsoft_tokens").delete().eq("user_id", userId);
  return { success: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const userId = await getUserId(req);
    if (!userId) return json({ error: "Unauthorized" }, 401);

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (action === "auth-url") {
      const redirectUri = url.searchParams.get("redirect_uri") || "";
      const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
        `client_id=${MICROSOFT_CLIENT_ID}` +
        `&response_type=code` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&scope=${encodeURIComponent("offline_access Calendars.ReadWrite")}` +
        `&response_mode=query` +
        `&prompt=consent`;
      return json({ url: authUrl });
    }

    if (action === "callback") {
      const code = url.searchParams.get("code") || "";
      const redirectUri = url.searchParams.get("redirect_uri") || "";
      const result = await exchangeCode(code, redirectUri, userId);
      return json(result);
    }

    if (action === "status") {
      return json(await checkConnection(userId));
    }

    if (action === "disconnect") {
      return json(await disconnect(userId));
    }

    if (action === "events") {
      const startDate = url.searchParams.get("start") || new Date().toISOString();
      const endDate = url.searchParams.get("end") || new Date(Date.now() + 30 * 86400000).toISOString();
      const events = await getEvents(userId, startDate, endDate);
      return json({ events });
    }

    if (action === "create-event" && req.method === "POST") {
      const body = await req.json();
      const event = await createEvent(userId, body);
      return json({ event });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    console.error("Microsoft Calendar error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return json({ error: message }, 500);
  }
});
