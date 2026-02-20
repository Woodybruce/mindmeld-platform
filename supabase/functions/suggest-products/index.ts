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

    // Step 1: Get AI product suggestions (without imageUrl — we'll fetch them ourselves)
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
              content: `You are a product recommendation engine for a couples/relationship app. 
Suggest 4 real, purchasable products that couples would love. Mix categories: Date Night, Wellness, Travel, Intimacy, Experiences, Games, Home, Books.
Use real brand names, realistic GBP prices, short descriptions (max 60 chars).
For productUrl: "https://www.amazon.co.uk/s?k=PRODUCT+NAME+BRAND&tag=woodybruce-21"
For imageKeyword: provide a single simple noun/phrase for an Unsplash photo (e.g. "massage candles", "scratch map", "wine glasses", "spa oils", "board game"). Keep it visual and concrete.
Category must be one of: Date Night, Wellness, Travel, Intimacy, Experiences, Games, Home, Books, Stationery, Dining.`,
            },
            {
              role: "user",
              content: `Suggest 4 products for couples. Category hint: ${category}. Make them varied and gift-worthy for February.`,
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
                          imageKeyword: { type: "string", description: "Simple noun/phrase for Unsplash photo" },
                          productUrl: { type: "string" },
                        },
                        required: ["name", "brand", "price", "description", "category", "emoji", "affiliateTag", "imageKeyword", "productUrl"],
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
      const text = await response.text();
      console.error("AI error:", response.status, text);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    let products;
    if (toolCall?.function?.arguments) {
      products = JSON.parse(toolCall.function.arguments).products;
    } else {
      throw new Error("No tool call response from AI");
    }

    // Step 2: Build Unsplash image URLs from keywords
    const enriched = (products || []).map((p: any) => {
      const keyword = p.imageKeyword || p.category || "couple gift";
      const imageUrl = `https://source.unsplash.com/400x400/?${encodeURIComponent(keyword)}`;
      return { ...p, imageUrl };
    });

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
