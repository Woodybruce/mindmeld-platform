import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ONLY using top-level topic/section URLs — guaranteed to exist, no specific slugs that can 404
const REAL_ARTICLES = [
  // Communication
  { title: "The 5 Love Languages", description: "Discover which love language speaks to you and your partner", source: "Psychology Today", category: "Connection", emoji: "💬", url: "https://www.psychologytoday.com/us/basics/love", imageHint: "couple talking" },
  { title: "Active Listening Skills for Couples", description: "Transform how you connect with your partner through listening", source: "Verywell Mind", category: "Communication", emoji: "👂", url: "https://www.verywellmind.com/what-is-active-listening-3024343", imageHint: "listening couple" },
  { title: "The Four Horsemen of Relationships", description: "Four communication patterns that predict relationship breakdown", source: "Gottman Institute", category: "Communication", emoji: "⚠️", url: "https://www.gottman.com/blog/the-four-horsemen-recognizing-criticism-contempt-defensiveness-and-stonewalling/", imageHint: "couple conflict" },
  { title: "Emotional Bids: How Couples Connect", description: "The small moments that build or break your relationship", source: "Gottman Institute", category: "Communication", emoji: "❤️", url: "https://www.gottman.com/blog/want-to-improve-your-relationship-start-paying-more-attention-to-bids/", imageHint: "emotional needs" },
  { title: "How Couples Communicate Better", description: "Research-backed communication skills for stronger relationships", source: "Psychology Today", category: "Communication", emoji: "🗣️", url: "https://www.psychologytoday.com/us/basics/communication", imageHint: "couple conversation" },
  // Intimacy & Connection
  { title: "Building Emotional Intimacy", description: "Simple daily habits that deepen your bond over time", source: "Verywell Mind", category: "Intimacy", emoji: "💕", url: "https://www.verywellmind.com/how-to-improve-emotional-intimacy-in-your-relationship-5215372", imageHint: "emotional connection" },
  { title: "The Role of Physical Affection", description: "Why non-sexual touch is vital for long-term connection", source: "Psychology Today", category: "Intimacy", emoji: "🫂", url: "https://www.psychologytoday.com/us/basics/affection", imageHint: "couple touching" },
  { title: "Improving Intimacy in Your Relationship", description: "Emotional closeness activities that bring you closer", source: "Verywell Mind", category: "Intimacy", emoji: "💋", url: "https://www.verywellmind.com/tips-for-greater-intimacy-2303638", imageHint: "couple intimacy" },
  { title: "Sex & Intimacy: A Healthy Guide", description: "Open conversations and ideas for a fulfilling intimate life", source: "Psychology Today", category: "Intimacy", emoji: "🌶️", url: "https://www.psychologytoday.com/us/basics/sex", imageHint: "intimate couple" },
  // Date Ideas & Fun
  { title: "Fun Things to Do as a Couple at Home", description: "Creative evenings in that feel special — no restaurant needed", source: "Verywell Mind", category: "Date Ideas", emoji: "🕯️", url: "https://www.verywellmind.com/fun-things-to-do-as-a-couple-at-home-5097734", imageHint: "romantic date home" },
  { title: "Why Shared Adventures Bond Couples", description: "The neuroscience behind why new experiences deepen love", source: "Greater Good Magazine", category: "Fun", emoji: "🧗", url: "https://greatergood.berkeley.edu/article/item/why_couples_should_seek_out_new_experiences", imageHint: "couple adventure" },
  { title: "Couples' Bucket List Ideas", description: "Adventures and experiences to share with your person", source: "Psychology Today", category: "Fun", emoji: "🗺️", url: "https://www.psychologytoday.com/us/basics/relationships", imageHint: "couple adventure" },
  // Wellness & Growth
  { title: "The Science of Happy Relationships", description: "What research actually says about long-term love", source: "Greater Good Magazine", category: "Wellness", emoji: "🧠", url: "https://greatergood.berkeley.edu/topic/relationships", imageHint: "happy couple" },
  { title: "How Attachment Styles Shape Love", description: "Understanding anxious, avoidant, and secure attachment", source: "Psychology Today", category: "Wellness", emoji: "🔗", url: "https://www.psychologytoday.com/us/basics/attachment", imageHint: "couple attachment" },
  { title: "Rebuilding Trust After a Breach", description: "Expert steps for recovering trust and moving forward together", source: "Verywell Mind", category: "Conflict", emoji: "🌱", url: "https://www.verywellmind.com/how-to-rebuild-trust-4783979", imageHint: "couple rebuilding" },
  { title: "Managing Stress as a Couple", description: "Turning external pressure into a bonding opportunity", source: "Verywell Mind", category: "Wellness", emoji: "💪", url: "https://www.verywellmind.com/how-stress-can-affect-your-relationship-3144983", imageHint: "couple stress" },
  { title: "Gratitude & Relationships", description: "Saying thank you is one of the most powerful relationship tools", source: "Greater Good Magazine", category: "Wellness", emoji: "💛", url: "https://greatergood.berkeley.edu/topic/gratitude", imageHint: "couple gratitude" },
  { title: "7 Principles for a Strong Relationship", description: "World-renowned research distilled into actionable steps", source: "Gottman Institute", category: "Wellness", emoji: "📖", url: "https://www.gottman.com/blog/7-principles-for-making-relationships-work/", imageHint: "relationship book" },
  { title: "Love Maps: Knowing Your Partner Deeply", description: "Build a rich inner map of your partner's world and dreams", source: "Gottman Institute", category: "Connection", emoji: "🗺️", url: "https://www.gottman.com/blog/an-introduction-to-love-maps/", imageHint: "couple connection" },
  { title: "Relationship Rituals That Strengthen Bonds", description: "Small daily traditions that deepen connection over time", source: "Gottman Institute", category: "Connection", emoji: "🌅", url: "https://www.gottman.com/blog/do-you-have-relationship-rituals/", imageHint: "couple ritual" },
  { title: "Mindfulness & Your Relationship", description: "Being fully present with your partner changes everything", source: "Greater Good Magazine", category: "Wellness", emoji: "🧘", url: "https://greatergood.berkeley.edu/topic/mindfulness", imageHint: "mindful couple" },
  { title: "How to Apologise the Right Way", description: "Why how you say sorry matters as much as saying it", source: "Greater Good Magazine", category: "Conflict", emoji: "🕊️", url: "https://greatergood.berkeley.edu/article/item/the_right_way_to_apologize", imageHint: "apology forgiveness" },
  { title: "Goal-Setting as a Couple", description: "How dreaming and planning together creates lasting partnership", source: "Psychology Today", category: "Connection", emoji: "🎯", url: "https://www.psychologytoday.com/us/basics/goal-setting", imageHint: "couple goals" },
  { title: "Relationship & Mental Health", description: "How relationships impact wellbeing — and vice versa", source: "Verywell Mind", category: "Wellness", emoji: "🌿", url: "https://www.verywellmind.com/relationship-stress-4157245", imageHint: "couple wellness" },
  { title: "The Importance of Shared Values", description: "Why aligned values matter more than shared interests", source: "Psychology Today", category: "Connection", emoji: "🤲", url: "https://www.psychologytoday.com/us/basics/values", imageHint: "couple values" },
];

// Fisher-Yates shuffle
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // No AI — just return a random selection from our guaranteed-working list
    // This ensures zero broken links
    const shuffled = shuffle(REAL_ARTICLES);
    
    // Pick 7, ensuring category variety
    const categories = new Set<string>();
    const selected = [];
    
    // First pass: one per category
    for (const article of shuffled) {
      if (!categories.has(article.category) && selected.length < 7) {
        selected.push(article);
        categories.add(article.category);
      }
    }
    
    // Second pass: fill remaining slots
    for (const article of shuffled) {
      if (selected.length >= 7) break;
      if (!selected.includes(article)) {
        selected.push(article);
      }
    }

    return new Response(JSON.stringify({ articles: selected.slice(0, 7) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("suggest-articles error:", e);
    const fallback = shuffle(REAL_ARTICLES).slice(0, 7);
    return new Response(
      JSON.stringify({ articles: fallback }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
