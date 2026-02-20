import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    if (!url || !url.includes("instagram.com")) {
      return new Response(JSON.stringify({ error: "Invalid Instagram URL" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = Deno.env.get("META_APP_TOKEN");
    if (!accessToken) {
      return new Response(JSON.stringify({ error: "META_APP_TOKEN not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const oembedUrl = `https://graph.facebook.com/v22.0/instagram_oembed?url=${encodeURIComponent(url)}&access_token=${encodeURIComponent(accessToken)}&omitscript=true&maxwidth=400`;

    const resp = await fetch(oembedUrl);

    if (resp.ok) {
      const data = await resp.json();
      return new Response(
        JSON.stringify({
          title: data.title || data.author_name || null,
          author: data.author_name || null,
          thumbnail_url: data.thumbnail_url || null,
          html: data.html || null,
          type: data.type || "rich",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log the error for debugging
    const errorBody = await resp.text();
    console.error("oEmbed API error:", resp.status, errorBody);
    return new Response(
      JSON.stringify({
        title: null,
        author: null,
        thumbnail_url: null,
        html: null,
        type: "link",
        fallback: true,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("oEmbed error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to fetch embed data" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
