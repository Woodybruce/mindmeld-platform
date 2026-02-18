import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Intimacy products → Amazon.co.uk with affiliate tag

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
            content: `You are an intimacy product recommender for a couples relationship app.
Suggest 4 adult wellness and intimacy products available on Amazon UK (massage oils, candles, couples games, bath sets, lingerie, aromatherapy). Keep it tasteful and romantic.
For productUrl use an Amazon.co.uk affiliate search URL in this exact format: "https://www.amazon.co.uk/s?k=PRODUCT+SEARCH+TERM&tag=woodybruce-21"
Always append &tag=woodybruce-21 to every URL. Keep descriptions under 60 chars.`,
          },
          {
            role: "user",
            content: `Suggest 4 couples intimacy products. Make them romantic and fun. Return only the JSON array.`,
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
                        category: { type: "string", enum: ["Massage", "Candles", "Games", "Lingerie", "Bath", "Toys", "Accessories"] },
                        emoji: { type: "string" },
                        affiliateTag: { type: "string" },
                        productUrl: { type: "string" },
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
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let products;
    if (toolCall?.function?.arguments) {
      products = JSON.parse(toolCall.function.arguments).products;
    } else {
      const content = data.choices?.[0]?.message?.content || "[]";
      products = JSON.parse(content.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
    }

    return new Response(JSON.stringify({ products }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("suggest-intimacy error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
