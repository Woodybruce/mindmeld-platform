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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, redirect_uri } = await req.json();
    if (!code) return json({ error: "Missing authorization code" }, 400);

    // Get user from JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabaseUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) return json({ error: "Unauthorized" }, 401);

    // Exchange code for tokens
    const tokenRes = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: MS_CLIENT_ID,
        client_secret: MS_CLIENT_SECRET,
        code,
        redirect_uri: redirect_uri || "",
        grant_type: "authorization_code",
        scope: "https://graph.microsoft.com/Calendars.Read offline_access",
      }),
    });

    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      console.error("Microsoft token exchange error:", tokenData);
      return json({ error: tokenData.error_description || "Failed to exchange code" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Upsert token row
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
      return json({ error: "Failed to save tokens" }, 500);
    }

    return json({ success: true });
  } catch (err) {
    console.error("OAuth callback error:", err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
