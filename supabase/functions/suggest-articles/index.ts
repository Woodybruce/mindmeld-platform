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
              content: `You are a relationship content curator. Suggest 5 engaging relationship articles/resources that couples would find genuinely helpful. Mix categories: communication, intimacy, date ideas, wellness, conflict resolution, fun activities, personal growth. Each must feel real and current. Return JSON array only. Each object: { "title": string (max 60 chars), "description": string (max 100 chars), "source": string (publication name), "category": string, "emoji": string, "url": string (a real, working URL to an actual article), "imageHint": string (2-word image search hint) }`,
            },
            {
              role: "user",
              content: `Suggest 5 relationship articles for couples. Make them diverse, practical, and from real publications (e.g. Psychology Today, Gottman Institute, MindBodyGreen, Cosmopolitan, etc.). Return only the JSON array.`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "suggest_articles",
                description: "Return 5 curated relationship articles",
                parameters: {
                  type: "object",
                  properties: {
                    articles: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string" },
                          description: { type: "string" },
                          source: { type: "string" },
                          category: { type: "string" },
                          emoji: { type: "string" },
                          url: { type: "string" },
                          imageHint: { type: "string" },
                        },
                        required: ["title", "description", "source", "category", "emoji", "url", "imageHint"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["articles"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "suggest_articles" } },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI error:", response.status, text);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    let articles;
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      articles = parsed.articles;
    } else {
      const content = data.choices?.[0]?.message?.content || "[]";
      articles = JSON.parse(content.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
    }

    return new Response(JSON.stringify({ articles }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("suggest-articles error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
