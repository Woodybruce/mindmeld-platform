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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { category } = await req.json().catch(() => ({ category: "general" }));

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            {
              role: "system",
              content: `You are a product recommendation engine for a couples/relationship app called "Us". 
Suggest 4 real, purchasable products that couples would love. Mix categories: Date Night, Wellness, Travel, Intimacy, Experiences, Games, Home, Books.
Each product must feel authentic — use real-sounding brand names, realistic prices in GBP, and compelling short descriptions.
For productUrl, provide an Amazon.co.uk affiliate search URL: "https://www.amazon.co.uk/s?k=PRODUCT+NAME+BRAND&tag=woodybruce-21"
For imageUrl, provide a REAL publicly accessible product image URL. Use Amazon CDN images like "https://m.media-amazon.com/images/..." or real product images from known brands. The image must be a real product photo, not a placeholder.
IMPORTANT: The "category" field must exactly match one of: "Date Night", "Wellness", "Travel", "Intimacy", "Experiences", "Games", "Home", "Books", "Stationery", "Dining".
Return JSON array only, no markdown.`,
            },
            {
              role: "user",
              content: `Suggest 4 products for couples. Category hint: ${category}. Make them varied, seasonal (February), and gift-worthy. For each product, provide a real imageUrl — a direct link to a product photo from Amazon CDN (https://m.media-amazon.com/images/...) or a brand's CDN. Return only the JSON array.`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "suggest_products",
                description: "Return 4 product suggestions for couples",
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
                          category: { type: "string" },
                          emoji: { type: "string" },
                          affiliateTag: { type: "string" },
                          imageHint: { type: "string" },
                          imageUrl: { type: "string", description: "Real product image URL from Amazon CDN or brand CDN" },
                          productUrl: { type: "string" },
                        },
                        required: ["name", "brand", "price", "description", "category", "emoji", "affiliateTag", "imageHint", "productUrl"],
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
          tool_choice: { type: "function", function: { name: "suggest_products" } },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI error:", response.status, text);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    let products;
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      products = parsed.products;
    } else {
      const content = data.choices?.[0]?.message?.content || "[]";
      products = JSON.parse(content.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
    }

    // For each product, verify the imageUrl is valid by trying to resolve it
    // If imageUrl is missing or looks fake, fetch the real OG image from Amazon search
    const enriched = await Promise.all((products || []).map(async (p: any) => {
      if (p.imageUrl && (p.imageUrl.startsWith("https://m.media-amazon.com") || p.imageUrl.startsWith("https://images-na.ssl-images-amazon.com"))) {
        return p;
      }
      // Fetch Amazon search page OG image as fallback
      try {
        const searchUrl = `https://www.amazon.co.uk/s?k=${encodeURIComponent(p.name + " " + p.brand)}`;
        const res = await fetch(searchUrl, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" },
          signal: AbortSignal.timeout(3000),
        });
        const html = await res.text();
        // Extract first product image from Amazon search results
        const imgMatch = html.match(/https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9._%-]+\.(?:jpg|png|jpeg)/);
        if (imgMatch) {
          return { ...p, imageUrl: imgMatch[0] };
        }
      } catch {}
      return p;
    }));

    return new Response(JSON.stringify({ products: enriched }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("suggest-products error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
