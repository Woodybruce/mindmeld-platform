import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Parse VEVENT blocks from raw iCalendar text */
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
      // Handle folded lines (RFC 5545 §3.1)
      const unfolded = block.replace(/\r?\n[ \t]/g, "");
      const regex = new RegExp(`^${name}[;:](.*)$`, "m");
      const match = unfolded.match(regex);
      return match ? match[1].trim() : undefined;
    };

    const summary = getField("SUMMARY") || "Untitled Event";
    const dtstart = getField("DTSTART") || "";
    const dtend = getField("DTEND") || dtstart;
    const location = getField("LOCATION");

    // Parse date - handle both DATE and DATETIME formats
    const parseIcsDate = (val: string): string => {
      // Remove any VALUE= or TZID= prefix parts
      const parts = val.split(":");
      const dateStr = parts[parts.length - 1];
      
      if (dateStr.length === 8) {
        // DATE format: 20250215
        return new Date(
          parseInt(dateStr.slice(0, 4)),
          parseInt(dateStr.slice(4, 6)) - 1,
          parseInt(dateStr.slice(6, 8))
        ).toISOString();
      }
      // DATETIME format: 20250215T103000Z or 20250215T103000
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

/** Look up user by their forwarding token */
async function getUserByToken(token: string) {
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await admin
    .from("profiles")
    .select("id")
    .eq("calendar_forward_token", token)
    .single();
  if (error || !data) return null;
  return data.id as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return json({ error: "Missing token parameter" }, 400);
    }

    const userId = await getUserByToken(token);
    if (!userId) {
      return json({ error: "Invalid forwarding token" }, 401);
    }

    if (req.method !== "POST") {
      return json({ error: "POST required" }, 405);
    }

    const body = await req.text();

    // Try to find .ics content in the body
    let icsContent = body;

    // If it looks like a multipart email, try to extract .ics parts
    if (body.includes("BEGIN:VCALENDAR")) {
      const calStart = body.indexOf("BEGIN:VCALENDAR");
      const calEnd = body.indexOf("END:VCALENDAR");
      if (calStart !== -1 && calEnd !== -1) {
        icsContent = body.slice(calStart, calEnd + "END:VCALENDAR".length);
      }
    }

    if (!icsContent.includes("BEGIN:VEVENT")) {
      return json({ error: "No calendar events found in request" }, 400);
    }

    const events = parseIcs(icsContent);
    if (events.length === 0) {
      return json({ error: "Could not parse any events" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const rows = events.map((e) => ({
      user_id: userId,
      subject: e.subject,
      start_time: e.start,
      end_time: e.end,
      is_all_day: e.isAllDay,
      location: e.location || null,
      source: "forwarded",
    }));

    const { error } = await admin.from("calendar_events").insert(rows);
    if (error) throw error;

    return json({ success: true, count: events.length });
  } catch (err) {
    console.error("Inbound calendar error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return json({ error: message }, 500);
  }
});
