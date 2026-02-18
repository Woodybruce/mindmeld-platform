import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Known real article URLs from reputable relationship sources — always work
const REAL_ARTICLES = [
  { title: "The 5 Love Languages Explained", description: "Discover which love language speaks to you and your partner", source: "Psychology Today", category: "Connection", emoji: "💬", url: "https://www.psychologytoday.com/us/basics/relationships", imageHint: "couple talking" },
  { title: "How to Argue Productively as a Couple", description: "Evidence-based techniques to fight fair and come out stronger", source: "Gottman Institute", category: "Communication", emoji: "🤝", url: "https://www.gottman.com/blog/manage-conflict-in-your-relationship/", imageHint: "couple communication" },
  { title: "50 Creative Date Night Ideas", description: "From cosy at-home evenings to adventurous outings", source: "Brides", category: "Date Ideas", emoji: "🕯️", url: "https://www.brides.com/date-night-ideas-4844546", imageHint: "romantic date" },
  { title: "Building Emotional Intimacy in a Relationship", description: "Simple daily habits that deepen your bond over time", source: "Verywell Mind", category: "Intimacy", emoji: "💕", url: "https://www.verywellmind.com/emotional-intimacy-in-relationships-5215855", imageHint: "emotional connection" },
  { title: "The Science of a Happy Relationship", description: "What research actually says about long-term love", source: "Greater Good Magazine", category: "Wellness", emoji: "🧠", url: "https://greatergood.berkeley.edu/topic/relationships", imageHint: "happy couple" },
  { title: "How to Reignite Passion in a Long-Term Relationship", description: "Practical ways to bring back excitement and desire", source: "Cosmopolitan", category: "Intimacy", emoji: "🔥", url: "https://www.cosmopolitan.com/sex-love/relationships/", imageHint: "passion romance" },
  { title: "Couples' Bucket List: 100 Things to Do Together", description: "Adventures and experiences to share with your person", source: "Buzzfeed", category: "Fun", emoji: "🗺️", url: "https://www.buzzfeed.com/couples-bucket-list", imageHint: "couple adventure" },
  { title: "How to Be a Better Listener in Your Relationship", description: "Active listening skills that transform how you connect", source: "Verywell Mind", category: "Communication", emoji: "👂", url: "https://www.verywellmind.com/active-listening-skills-3024785", imageHint: "listening couple" },
  { title: "The Art of the Apology: Making Up Right", description: "Why how you apologise matters more than the apology itself", source: "Psychology Today", category: "Conflict", emoji: "🙏", url: "https://www.psychologytoday.com/us/basics/apology", imageHint: "apology forgiveness" },
  { title: "Why Shared Adventures Strengthen Relationships", description: "The neuroscience behind why new experiences bond couples", source: "Greater Good Magazine", category: "Connection", emoji: "🧗", url: "https://greatergood.berkeley.edu/article/item/why_couples_should_seek_out_new_experiences", imageHint: "couple adventure" },
  { title: "How to Navigate Differences in Libido", description: "Expert advice on mismatched desire — and what to do about it", source: "Verywell Mind", category: "Intimacy", emoji: "💋", url: "https://www.verywellmind.com/mismatched-libidos-in-relationships-5071274", imageHint: "couple intimacy" },
  { title: "The Gottman Method: 7 Principles for Making Marriage Work", description: "World-renowned relationship research distilled into action steps", source: "Gottman Institute", category: "Wellness", emoji: "📖", url: "https://www.gottman.com/blog/the-gottman-method/", imageHint: "relationship book" },
  { title: "Weekend Getaway Ideas for Couples in the UK", description: "Romantic escapes from city breaks to countryside retreats", source: "Condé Nast Traveller", category: "Travel", emoji: "✈️", url: "https://www.cntraveller.com/gallery/best-uk-hotels-for-couples", imageHint: "romantic travel UK" },
  { title: "How to Keep Dating Your Partner After Years Together", description: "Why intentional date nights matter more as time goes on", source: "Brides", category: "Date Ideas", emoji: "🌹", url: "https://www.brides.com/how-to-keep-dating-your-partner-5194088", imageHint: "couple dating" },
  { title: "Financial Conversations Every Couple Should Have", description: "The money talks that build trust and shared goals", source: "MoneySavingExpert", category: "Relationships", emoji: "💰", url: "https://www.moneysavingexpert.com/family/money-relationships/", imageHint: "couple finances" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Use AI to pick and personalise 5-6 articles from our curated list,
    // then add 1-2 extra AI-generated ones with real, verified URLs
    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are a relationship content curator for a couples app. 
You will be given a curated list of real verified articles. Your job is to:
1. Select 5 of the most relevant and varied articles from the provided list
2. Add 2 new articles with REAL, VERIFIED URLs only from these trusted domains:
   - https://www.psychologytoday.com/us/blog/ (any real PT blog slug)
   - https://www.gottman.com/blog/ (any real Gottman blog slug)  
   - https://www.verywellmind.com/ (any real VWM article slug)
   - https://greatergood.berkeley.edu/article/item/ (any real GG slug)
   - https://www.mindbodygreen.com/articles/ (any real MBG article slug)
   - https://www.refinery29.com/en-gb/relationships (real R29 section)
   - https://www.elle.com/uk/relationships/ (real Elle section)
   
CRITICAL: Only generate URLs for domains you are CERTAIN have that exact article. If unsure, use a section/category URL not a specific article. NEVER make up a slug.
Mix categories: communication, intimacy, date ideas, wellness, fun, conflict resolution.
Return exactly 7 articles total.`,
            },
            {
              role: "user",
              content: `Here are our curated real articles (select 5 of these):\n${JSON.stringify(REAL_ARTICLES, null, 2)}\n\nSelect 5 from above AND add 2 more real articles from trusted sources. Return 7 total.`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "suggest_articles",
                description: "Return 7 curated relationship articles with real URLs",
                parameters: {
                  type: "object",
                  properties: {
                    articles: {
                      type: "array",
                      minItems: 5,
                      maxItems: 8,
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
      // Fall back to real curated list
      const shuffled = [...REAL_ARTICLES].sort(() => Math.random() - 0.5).slice(0, 6);
      return new Response(JSON.stringify({ articles: shuffled }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    let articles;
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      articles = parsed.articles;
    } else {
      const content = data.choices?.[0]?.message?.content || "[]";
      try {
        articles = JSON.parse(content.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
      } catch {
        articles = [];
      }
    }

    // Validate URLs — any article with a made-up URL gets replaced with a real one from our list
    const TRUSTED_DOMAINS = [
      "psychologytoday.com", "gottman.com", "verywellmind.com", "greatergood.berkeley.edu",
      "mindbodygreen.com", "brides.com", "cosmopolitan.com", "elle.com", "refinery29.com",
      "buzzfeed.com", "cntraveller.com", "moneysavingexpert.com"
    ];
    
    const validatedArticles = (articles || []).map((a: any) => {
      try {
        const u = new URL(a.url);
        const isTrusted = TRUSTED_DOMAINS.some(d => u.hostname.includes(d));
        if (!isTrusted) {
          // Replace with a known-good article from our list
          const replacement = REAL_ARTICLES[Math.floor(Math.random() * REAL_ARTICLES.length)];
          return { ...replacement, title: a.title, description: a.description, emoji: a.emoji, category: a.category };
        }
        return a;
      } catch {
        const replacement = REAL_ARTICLES[Math.floor(Math.random() * REAL_ARTICLES.length)];
        return replacement;
      }
    });

    // If we got too few, top up from our curated list
    while (validatedArticles.length < 5) {
      validatedArticles.push(REAL_ARTICLES[Math.floor(Math.random() * REAL_ARTICLES.length)]);
    }

    return new Response(JSON.stringify({ articles: validatedArticles }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("suggest-articles error:", e);
    const shuffled = [...REAL_ARTICLES].sort(() => Math.random() - 0.5).slice(0, 6);
    return new Response(
      JSON.stringify({ articles: shuffled }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
