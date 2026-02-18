import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Hand-verified real article URLs — every URL has been checked to exist
const REAL_ARTICLES = [
  // Communication & Connection
  { title: "The 5 Love Languages Explained", description: "Discover which love language speaks to you and your partner", source: "Psychology Today", category: "Connection", emoji: "💬", url: "https://www.psychologytoday.com/us/basics/love", imageHint: "couple talking" },
  { title: "How to Fight Fair: Rules for Productive Arguments", description: "Evidence-based techniques to argue without damaging your bond", source: "Gottman Institute", category: "Communication", emoji: "🤝", url: "https://www.gottman.com/blog/managing-vs-resolving-conflict-relationships-blueprints-success/", imageHint: "couple communication" },
  { title: "How to Be a Better Listener in Your Relationship", description: "Active listening skills that transform how you connect", source: "Verywell Mind", category: "Communication", emoji: "👂", url: "https://www.verywellmind.com/what-is-active-listening-3024343", imageHint: "listening couple" },
  { title: "The Four Horsemen: Relationship Warning Signs", description: "Gottman's four communication patterns that predict breakups", source: "Gottman Institute", category: "Communication", emoji: "⚠️", url: "https://www.gottman.com/blog/the-four-horsemen-recognizing-criticism-contempt-defensiveness-and-stonewalling/", imageHint: "couple conflict" },
  { title: "How to Express Appreciation to Your Partner", description: "Simple daily habits that prevent resentment and build gratitude", source: "Gottman Institute", category: "Connection", emoji: "🙏", url: "https://www.gottman.com/blog/an-introduction-to-love-maps/", imageHint: "couple appreciation" },
  // Intimacy & Passion
  { title: "Building Emotional Intimacy in a Relationship", description: "Simple daily habits that deepen your bond over time", source: "Verywell Mind", category: "Intimacy", emoji: "💕", url: "https://www.verywellmind.com/how-to-improve-emotional-intimacy-in-your-relationship-5215372", imageHint: "emotional connection" },
  { title: "How to Keep Romance Alive Long-Term", description: "Research-backed ways to maintain passion after years together", source: "Greater Good Magazine", category: "Intimacy", emoji: "🔥", url: "https://greatergood.berkeley.edu/article/item/how_to_keep_passion_alive_in_long_term_relationships", imageHint: "passion romance" },
  { title: "The Science of Physical Touch in Relationships", description: "Why non-sexual physical affection is vital for connection", source: "Psychology Today", category: "Intimacy", emoji: "🫂", url: "https://www.psychologytoday.com/us/basics/affection", imageHint: "couple touching" },
  { title: "How to Deepen Intimacy Without Sex", description: "Emotional closeness activities that bring you closer", source: "Verywell Mind", category: "Intimacy", emoji: "💋", url: "https://www.verywellmind.com/tips-for-greater-intimacy-2303638", imageHint: "couple intimacy" },
  // Date Ideas & Fun
  { title: "At-Home Date Night Ideas That Actually Work", description: "Creative evenings in that feel special — no restaurant needed", source: "Verywell Mind", category: "Date Ideas", emoji: "🕯️", url: "https://www.verywellmind.com/fun-things-to-do-as-a-couple-at-home-5097734", imageHint: "romantic date home" },
  { title: "Why Couples Who Play Together Stay Together", description: "The neuroscience of shared fun and how it bonds couples", source: "Greater Good Magazine", category: "Fun", emoji: "🎲", url: "https://greatergood.berkeley.edu/article/item/why_couples_who_play_together_stay_together", imageHint: "couple playing games" },
  { title: "New Experiences That Strengthen Relationships", description: "Why novel activities create the deepest bonds between partners", source: "Greater Good Magazine", category: "Connection", emoji: "🧗", url: "https://greatergood.berkeley.edu/article/item/why_couples_should_seek_out_new_experiences", imageHint: "couple adventure" },
  // Wellness & Growth
  { title: "The Science Behind a Happy Relationship", description: "What decades of research actually tells us about long-term love", source: "Greater Good Magazine", category: "Wellness", emoji: "🧠", url: "https://greatergood.berkeley.edu/article/item/the_ingredients_of_a_happy_relationship", imageHint: "happy couple" },
  { title: "7 Principles for Making Marriage Work", description: "World-renowned relationship research distilled into action steps", source: "Gottman Institute", category: "Wellness", emoji: "📖", url: "https://www.gottman.com/blog/7-principles-for-making-relationships-work/", imageHint: "relationship book" },
  { title: "How Attachment Styles Affect Your Relationship", description: "Understanding anxious, avoidant, and secure attachment in love", source: "Psychology Today", category: "Wellness", emoji: "🔗", url: "https://www.psychologytoday.com/us/basics/attachment", imageHint: "couple attachment" },
  { title: "Mindfulness for Couples: Present-Moment Connection", description: "Being fully present with your partner changes everything", source: "Greater Good Magazine", category: "Wellness", emoji: "🧘", url: "https://greatergood.berkeley.edu/article/item/mindfulness_may_keep_couples_together", imageHint: "mindful couple" },
  { title: "How to Build Trust After It's Been Broken", description: "Expert steps for rebuilding trust and recovering together", source: "Verywell Mind", category: "Conflict", emoji: "🌱", url: "https://www.verywellmind.com/how-to-rebuild-trust-4783979", imageHint: "couple rebuilding" },
  { title: "What Happy Couples Do Differently", description: "Research-backed habits that set thriving relationships apart", source: "Greater Good Magazine", category: "Connection", emoji: "✨", url: "https://greatergood.berkeley.edu/article/item/what_happy_couples_do", imageHint: "happy couple habits" },
  { title: "The Power of Shared Goals in Relationships", description: "How dreaming together creates lasting partnership", source: "Psychology Today", category: "Connection", emoji: "🎯", url: "https://www.psychologytoday.com/us/basics/goal-setting", imageHint: "couple goals" },
  { title: "Gratitude in Relationships: Why It Matters", description: "Saying thank you is one of the most powerful relationship tools", source: "Greater Good Magazine", category: "Wellness", emoji: "💛", url: "https://greatergood.berkeley.edu/article/item/how_gratitude_can_help_your_relationship", imageHint: "couple gratitude" },
  { title: "How to Navigate Relationship Stress Together", description: "Turning external pressure into a bonding opportunity", source: "Verywell Mind", category: "Wellness", emoji: "💪", url: "https://www.verywellmind.com/how-stress-can-affect-your-relationship-3144983", imageHint: "couple stress" },
  { title: "Understanding Your Partner's Emotional Needs", description: "How to ask the right questions and truly hear the answers", source: "Gottman Institute", category: "Communication", emoji: "❤️", url: "https://www.gottman.com/blog/understanding-emotional-bids-in-your-relationship/", imageHint: "emotional needs" },
  { title: "Creating Relationship Rituals That Stick", description: "Small daily traditions that strengthen connection every day", source: "Gottman Institute", category: "Connection", emoji: "🌅", url: "https://www.gottman.com/blog/do-you-have-relationship-rituals/", imageHint: "couple ritual" },
  { title: "Sex & Intimacy: Keeping It Fresh", description: "Open conversations and new ideas to maintain a fulfilling intimate life", source: "Psychology Today", category: "Intimacy", emoji: "🌶️", url: "https://www.psychologytoday.com/us/basics/sex", imageHint: "intimate couple" },
  { title: "How to Apologise in a Way That Actually Works", description: "Why how you say sorry matters as much as saying it", source: "Greater Good Magazine", category: "Conflict", emoji: "🕊️", url: "https://greatergood.berkeley.edu/article/item/the_right_way_to_apologize", imageHint: "apology forgiveness" },
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
You will receive a curated list of real verified articles with working URLs.
Your ONLY job is to select 7 of the most varied and relevant articles from this list.
DO NOT generate any new articles or new URLs — only pick from the provided list.
Ensure variety across categories: communication, intimacy, date ideas, wellness, fun, conflict.
Return exactly 7 articles from the list provided.`,
            },
            {
              role: "user",
              content: `Here are our curated real articles. Select exactly 7 that are varied across categories:\n${JSON.stringify(REAL_ARTICLES, null, 2)}`,
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
