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
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content: `You are a product recommendation engine for a couples/relationship app called "Us". 
Suggest 4 real, purchasable products that couples would love. Mix categories: date night experiences, couple gifts, wellness, home, travel accessories, games, books.
Each product must feel authentic — use real-sounding brand names, realistic prices in GBP, and compelling short descriptions.
Return JSON array only, no markdown. Each object: { "name": string, "brand": string, "price": string (e.g. "£29.99"), "description": string (max 60 chars), "category": string, "emoji": string, "affiliateTag": string (a slug like "date-night-box") }`,
            },
            {
              role: "user",
              content: `Suggest 4 products for couples. Category hint: ${category}. Make them varied, seasonal (February), and gift-worthy. Return only the JSON array.`,
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
                        },
                        required: ["name", "brand", "price", "description", "category", "emoji", "affiliateTag"],
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
      // Fallback: try parsing content directly
      const content = data.choices?.[0]?.message?.content || "[]";
      products = JSON.parse(content.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
    }

    return new Response(JSON.stringify({ products }), {
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
