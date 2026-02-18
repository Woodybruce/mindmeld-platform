import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Placeholder for Booking.com affiliate or Skyscanner API
// When ready: const BOOKING_API_KEY = Deno.env.get("BOOKING_API_KEY");

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
            content: `You are a couples travel recommender. Suggest 4 romantic UK/Europe weekend getaways or travel experiences.
Mix city breaks (Paris, Rome, Edinburgh, Amsterdam), coastal retreats, countryside escapes, and spa weekends.
Include realistic price-per-couple estimates. Use Booking.com search URLs: "https://www.booking.com/searchresults.html?ss=DESTINATION"
Keep descriptions under 60 chars. Return valid JSON array only.`,
          },
          {
            role: "user",
            content: `Suggest 4 romantic couple travel getaways departing from the UK. Return only the JSON array.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_travel",
              description: "Return 4 couples travel suggestions",
              parameters: {
                type: "object",
                properties: {
                  destinations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        destination: { type: "string" },
                        country: { type: "string" },
                        price: { type: "string" },
                        description: { type: "string" },
                        category: { type: "string", enum: ["City Break", "Beach", "Countryside", "Spa", "Adventure", "Cultural"] },
                        emoji: { type: "string" },
                        duration: { type: "string" },
                        bookingUrl: { type: "string" },
                      },
                      required: ["name", "destination", "country", "price", "description", "category", "emoji", "duration", "bookingUrl"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["destinations"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_travel" } },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("AI error:", response.status, text);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let destinations;
    if (toolCall?.function?.arguments) {
      destinations = JSON.parse(toolCall.function.arguments).destinations;
    } else {
      const content = data.choices?.[0]?.message?.content || "[]";
      destinations = JSON.parse(content.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
    }

    return new Response(JSON.stringify({ destinations }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("suggest-travel error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
