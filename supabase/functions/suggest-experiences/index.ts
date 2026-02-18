import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Date Night experiences → DesignMyNight search URLs

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { city = "London" } = await req.json().catch(() => ({}));

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You are a date night experience recommender for couples in ${city}, UK. 
Suggest 4 romantic date experiences (restaurants, cocktail bars, escape rooms, cooking classes, spa days, theatre, rooftop bars, wine tasting, etc).
For bookingUrl, generate a DesignMyNight search URL using this exact format: "https://www.designmynight.com/search?q=SEARCH+TERM&location=${encodeURIComponent(city)}&type=venue"
Example: "https://www.designmynight.com/search?q=cocktail+bar&location=London&type=venue"
Use a relevant search term from the experience name/category. Keep descriptions under 60 characters.`,
          },
          {
            role: "user",
            content: `Suggest 4 date night experiences in ${city} for couples. Varied mix of romantic, adventurous, and fun. Return only the JSON array.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_experiences",
              description: "Return 4 date experience suggestions",
              parameters: {
                type: "object",
                properties: {
                  experiences: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        venue: { type: "string" },
                        price: { type: "string" },
                        description: { type: "string" },
                        category: { type: "string", enum: ["Restaurant", "Bar", "Activity", "Spa", "Theatre", "Class", "Outdoor"] },
                        emoji: { type: "string" },
                        city: { type: "string" },
                        bookingUrl: { type: "string" },
                        duration: { type: "string" },
                      },
                      required: ["name", "venue", "price", "description", "category", "emoji", "city", "bookingUrl", "duration"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["experiences"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_experiences" } },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("AI error:", response.status, text);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let experiences;
    if (toolCall?.function?.arguments) {
      experiences = JSON.parse(toolCall.function.arguments).experiences;
    } else {
      const content = data.choices?.[0]?.message?.content || "[]";
      experiences = JSON.parse(content.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
    }

    return new Response(JSON.stringify({ experiences }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("suggest-experiences error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
