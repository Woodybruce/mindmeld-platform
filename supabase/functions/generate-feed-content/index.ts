import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, description } = await req.json();

    const contentType = type || "prompt";

    const systemPrompt = `You are a creative content writer for a couples' relationship app called "Us". 
You create engaging feed content items that appear on users' home screens.

Content types:
- "prompt": Conversation starters or reflection questions for couples
- "tip": Practical relationship advice or gratitude exercises  
- "quiz": Descriptions for interactive quizzes couples can take together
- "article": Short wellness/relationship article teasers
- "challenge": Fun couple challenges or activities

Return ONLY valid JSON with these fields:
{
  "title": "short engaging title (max 50 chars)",
  "subtitle": "brief context line (max 40 chars)",
  "body": "1-2 sentence description (max 150 chars)",
  "emoji": "single relevant emoji",
  "tag": "display tag like Quiz, Prompt, Tip, Challenge, Gratitude, Read · Wellness",
  "tag_color": "one of: text-us-gold, text-us-coral, text-us-sage, text-muted-foreground"
}`;

    const userPrompt = description
      ? `Create a "${contentType}" feed item about: ${description}`
      : `Create an engaging "${contentType}" feed item for couples. Be creative and warm.`;

    const response = await fetch(
      "https://api.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.8,
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`AI API error [${response.status}]: ${errText}`);
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || "";

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse AI response as JSON");
    }

    const generated = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(generated), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating feed content:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to generate content" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
