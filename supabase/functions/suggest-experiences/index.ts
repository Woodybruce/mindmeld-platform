import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Date Night experiences → Amazon.co.uk gift/experience vouchers with affiliate tag

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
            content: `You are a date night gift recommender for couples. Suggest 4 romantic date night experience gifts or vouchers available on Amazon UK (gift vouchers, experience boxes, date night kits, spa day gift sets, cocktail kits, restaurant voucher cards, cooking class kits, cinema gift sets).
For bookingUrl use Amazon.co.uk search: "https://www.amazon.co.uk/s?k=SEARCH+TERM&tag=woodybruce-21"
Always include &tag=woodybruce-21. Keep descriptions under 60 chars.`,
          },
          {
            role: "user",
            content: `Suggest 4 romantic date night experience gifts or vouchers for couples on Amazon UK. Varied mix (spa, dining, cocktails, adventure). Return only valid JSON.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_experiences",
              description: "Return 4 date night experience gift suggestions",
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
      try {
        experiences = JSON.parse(content.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
      } catch { experiences = []; }
    }

    // Fallback
    if (!experiences || experiences.length === 0) {
      experiences = [
        { name: "Romantic Dining Experience Gift Box", venue: "Amazon UK", price: "£49.99", description: "Voucher for a luxury couples dinner", category: "Restaurant", emoji: "🍽️", city: "UK", bookingUrl: "https://www.amazon.co.uk/s?k=romantic+dining+experience+gift+voucher&tag=woodybruce-21", duration: "3 hours" },
        { name: "Couples Spa Day Gift Set", venue: "Amazon UK", price: "£35.00", description: "Luxurious spa day for two gift set", category: "Spa", emoji: "🛁", city: "UK", bookingUrl: "https://www.amazon.co.uk/s?k=couples+spa+day+gift+set&tag=woodybruce-21", duration: "Half day" },
        { name: "Cocktail Making Kit for Two", venue: "Amazon UK", price: "£29.99", description: "Make craft cocktails together at home", category: "Class", emoji: "🍹", city: "UK", bookingUrl: "https://www.amazon.co.uk/s?k=cocktail+making+kit+for+two&tag=woodybruce-21", duration: "2 hours" },
        { name: "Adventure Experience Gift Voucher", venue: "Amazon UK", price: "£59.99", description: "Thrilling couples adventure day out", category: "Activity", emoji: "🎯", city: "UK", bookingUrl: "https://www.amazon.co.uk/s?k=couples+adventure+experience+gift+voucher&tag=woodybruce-21", duration: "Full day" },
      ];
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
