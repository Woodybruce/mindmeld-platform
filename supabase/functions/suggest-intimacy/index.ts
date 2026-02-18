import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FALLBACK_PRODUCTS = [
  { name: "Couples Massage Oil Gift Set", brand: "Intimate Earth", price: "£24.99", description: "Sensual massage oils for two", category: "Massage", emoji: "💆", affiliateTag: "massage-oil-set", productUrl: "https://www.amazon.co.uk/s?k=couples+massage+oil+gift+set&tag=woodybruce-21", imageUrl: "https://m.media-amazon.com/images/I/71QnLCMDGAL._AC_SL1500_.jpg" },
  { name: "We-Vibe Sync Couples Vibrator", brand: "We-Vibe", price: "£89.99", description: "Award-winning wearable couples massager", category: "Vibrators", emoji: "💕", affiliateTag: "couples-vibrator", productUrl: "https://www.amazon.co.uk/s?k=we+vibe+sync+couples+vibrator&tag=woodybruce-21", imageUrl: "https://m.media-amazon.com/images/I/61yFJdwFZHL._AC_SL1000_.jpg" },
  { name: "Silk Chemise Lingerie Set", brand: "Bluebella", price: "£39.99", description: "Elegant silk-feel lingerie for her", category: "Lingerie", emoji: "🌸", affiliateTag: "silk-lingerie", productUrl: "https://www.amazon.co.uk/s?k=silk+chemise+lingerie+set&tag=woodybruce-21", imageUrl: "https://m.media-amazon.com/images/I/71ZJKR5YXOL._AC_UL1500_.jpg" },
  { name: "Couples Intimacy Card Game", brand: "Lovehoney", price: "£14.99", description: "50 fun dares and questions for couples", category: "Games", emoji: "🃏", affiliateTag: "couples-game", productUrl: "https://www.amazon.co.uk/s?k=couples+intimacy+card+game&tag=woodybruce-21", imageUrl: "https://m.media-amazon.com/images/I/81tSPDMFgEL._AC_SL1500_.jpg" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    await req.json().catch(() => ({}));

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You are a product recommender for a couples wellness app. Suggest 4 romantic and intimate products available on Amazon UK. 
Include a variety: couples massage oil sets, scented candles, luxury bath sets, couples board games, silk lingerie, massage candles, body paint kits, couples vibrators or intimate massagers, sensual gift sets.
For productUrl use Amazon.co.uk search: "https://www.amazon.co.uk/s?k=SEARCH+TERM&tag=woodybruce-21"
Always include &tag=woodybruce-21.
For imageUrl, provide a REAL Amazon CDN product image URL (https://m.media-amazon.com/images/I/XXXXX.jpg) — a genuine product photo.
Keep descriptions under 60 chars.`,
          },
          {
            role: "user",
            content: `Suggest 4 couples intimate and romantic products for Amazon UK. Include at least one couples vibrator or massager. For each, provide a real imageUrl from Amazon CDN (https://m.media-amazon.com/images/...). Return only valid JSON.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_intimacy",
              description: "Return 4 couples intimacy product suggestions",
              parameters: {
                type: "object",
                properties: {
                  products: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        brand: { type: "string" },
                        price: { type: "string" },
                        description: { type: "string" },
                        category: { type: "string", enum: ["Massage", "Candles", "Games", "Lingerie", "Bath", "Toys", "Accessories", "Vibrators", "Bondage"] },
                        emoji: { type: "string" },
                        affiliateTag: { type: "string" },
                        productUrl: { type: "string" },
                        imageUrl: { type: "string", description: "Real Amazon CDN product image URL" },
                      },
                      required: ["name", "brand", "price", "description", "category", "emoji", "affiliateTag", "productUrl"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["products"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_intimacy" } },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("AI error:", response.status, text);
      return new Response(JSON.stringify({ products: FALLBACK_PRODUCTS }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let products;
    if (toolCall?.function?.arguments) {
      products = JSON.parse(toolCall.function.arguments).products;
    } else {
      const content = data.choices?.[0]?.message?.content || "[]";
      try {
        products = JSON.parse(content.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
      } catch { products = []; }
    }

    if (!products || products.length === 0) {
      products = FALLBACK_PRODUCTS;
    }

    // Enrich products: scrape Amazon for real image if AI didn't return a valid one
    const enriched = await Promise.all(products.map(async (p: any) => {
      if (p.imageUrl && p.imageUrl.startsWith("https://m.media-amazon.com")) {
        return p;
      }
      try {
        const searchUrl = `https://www.amazon.co.uk/s?k=${encodeURIComponent(p.name + " " + p.brand)}`;
        const res = await fetch(searchUrl, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" },
          signal: AbortSignal.timeout(3000),
        });
        const html = await res.text();
        const imgMatch = html.match(/https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9._%-]+\.(?:jpg|png|jpeg)/);
        if (imgMatch) return { ...p, imageUrl: imgMatch[0] };
      } catch {}
      return p;
    }));

    return new Response(JSON.stringify({ products: enriched }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("suggest-intimacy error:", e);
    return new Response(
      JSON.stringify({ products: FALLBACK_PRODUCTS }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
