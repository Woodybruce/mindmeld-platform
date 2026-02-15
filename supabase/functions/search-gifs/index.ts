import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const GIPHY_API_KEY = Deno.env.get("GIPHY_API_KEY");
  if (!GIPHY_API_KEY) {
    return new Response(JSON.stringify({ error: "GIPHY_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q") || "";
  const offset = url.searchParams.get("offset") || "0";

  try {
    const endpoint = q
      ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(q)}&limit=20&offset=${offset}&rating=pg-13`
      : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=20&offset=${offset}&rating=pg-13`;

    const res = await fetch(endpoint);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(`GIPHY API error [${res.status}]: ${JSON.stringify(data)}`);
    }

    const gifs = (data.data || []).map((g: any) => ({
      id: g.id,
      title: g.title,
      url: g.images.fixed_height.url,
      preview: g.images.fixed_height_small.url || g.images.preview_gif?.url || g.images.fixed_height.url,
      width: parseInt(g.images.fixed_height.width),
      height: parseInt(g.images.fixed_height.height),
    }));

    return new Response(JSON.stringify({ gifs }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("GIF search error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
