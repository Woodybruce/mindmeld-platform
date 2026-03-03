import type { Express, Request, Response } from "express";
import express from "express";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import webpush from "web-push";
import { getUncachableSpotifyClient, invalidateSpotifyCache, getSpotifyAuthUrl, exchangeSpotifyCode, isSpotifyConnected, spotifyApiFetch, initSpotifyTokens, getSpotifyAccessToken } from "./spotify";

async function spotifyRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e: any) {
    if (e?.message?.includes("Bad OAuth") || e?.message?.includes("expired") || e?.message?.includes("401")) {
      invalidateSpotifyCache();
      return await fn();
    }
    throw e;
  }
}

const AMAZON_TAG = "woodybruce-21";
const PEXELS_API_KEY = process.env.PEXELS_API_KEY || "";

const imageCache = new Map<string, string | null>();

async function searchPexelsImage(query: string): Promise<string | null> {
  if (!PEXELS_API_KEY) return null;
  if (imageCache.has(query)) return imageCache.get(query)!;
  try {
    const resp = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=square`,
      { headers: { Authorization: PEXELS_API_KEY } }
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    const url = data.photos?.[0]?.src?.medium || null;
    imageCache.set(query, url);
    return url;
  } catch {
    return null;
  }
}

async function resolveProductImage(product: any): Promise<string | null> {
  if (product.imageUrl) return product.imageUrl;
  const keyword = product.imageKeyword || `${product.brand} ${product.name} luxury`;
  return searchPexelsImage(keyword);
}

function buildAmazonUrl(productName?: string): string {
  const name = productName || "couples gift";
  return `https://www.amazon.co.uk/s?k=${encodeURIComponent(name)}&tag=${AMAZON_TAG}`;
}

async function callAI(messages: any[], tools?: any[], toolChoice?: any, userId?: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

  const finalMessages = [...messages];
  if (userId) {
    const prefs = await fetchUserContext(userId);
    if (prefs && finalMessages.length > 0 && finalMessages[0].role === "system") {
      finalMessages[0] = { ...finalMessages[0], content: injectPreferences(finalMessages[0].content, prefs) };
    }
  }

  const url = process.env.AI_GATEWAY_URL || "https://api.openai.com/v1/chat/completions";
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.AI_MODEL || "gpt-4o-mini",
      messages: finalMessages,
      ...(tools ? { tools, tool_choice: toolChoice } : {}),
      temperature: 0.8,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    if (response.status === 429) throw Object.assign(new Error("Rate limited"), { status: 429 });
    if (response.status === 402) throw Object.assign(new Error("Credits required"), { status: 402 });
    throw new Error(`AI API error [${response.status}]: ${text}`);
  }

  return response.json();
}

const userContextCache = new Map<string, { context: string; ts: number }>();
const USER_CONTEXT_TTL = 1000 * 60 * 15;

async function fetchUserContext(userId?: string): Promise<string> {
  if (!userId) return "";

  const cached = userContextCache.get(userId);
  if (cached && Date.now() - cached.ts < USER_CONTEXT_TTL) return cached.context;

  try {
    const supaUrl = process.env.SUPABASE_URL!;
    const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const sb = createClient(supaUrl, supaKey);

    const [prefsResult, listsResult, messagesResult, moodResult, likesResult] = await Promise.all([
      sb.from("shared_lists").select("score_data").eq("user_id", userId).eq("name", "__ai_preferences__").maybeSingle(),
      sb.from("shared_lists").select("name, items, template").eq("user_id", userId).neq("name", "__ai_preferences__").order("updated_at", { ascending: false }).limit(10),
      sb.from("messages").select("content, message_type").or(`sender_id.eq.${userId},receiver_id.eq.${userId}`).eq("message_type", "text").order("created_at", { ascending: false }).limit(30),
      sb.from("mood_checkins").select("mood, note").eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
      sb.from("content_likes").select("content_type, content_title").eq("user_id", userId).order("created_at", { ascending: false }).limit(15),
    ]);

    const parts: string[] = [];

    const prefs = (prefsResult.data?.score_data as any)?.preferences;
    if (prefs) parts.push(`Personal preferences: ${prefs}`);

    if (listsResult.data?.length) {
      const listSummary = listsResult.data.map((l: any) => {
        const itemTexts = (l.items || []).slice(0, 5).map((i: any) => i.text).filter(Boolean).join(", ");
        return `${l.name}${l.template ? ` (${l.template})` : ""}${itemTexts ? `: ${itemTexts}` : ""}`;
      }).join("; ");
      parts.push(`Recent lists: ${listSummary}`);
    }

    if (messagesResult.data?.length) {
      const topics = messagesResult.data.map((m: any) => m.content).filter((c: string) => c && c.length > 3 && c.length < 200).slice(0, 15).join(" | ");
      if (topics) parts.push(`Recent chat topics: ${topics}`);
    }

    if (moodResult.data?.length) {
      const moods = moodResult.data.map((m: any) => `${m.mood}${m.note ? ` (${m.note})` : ""}`).join(", ");
      parts.push(`Recent moods: ${moods}`);
    }

    if (likesResult.data?.length) {
      const liked = likesResult.data.map((l: any) => `${l.content_title || l.content_type}`).join(", ");
      parts.push(`Liked content: ${liked}`);
    }

    const context = parts.join("\n");
    userContextCache.set(userId, { context, ts: Date.now() });
    return context;
  } catch { return ""; }
}

function injectPreferences(systemPrompt: string, context: string): string {
  if (!context) return systemPrompt;
  return `${systemPrompt}\n\nIMPORTANT — Here is context about this couple gathered from their app activity (preferences, lists, conversations, moods, and liked content). Use this to make your recommendations highly relevant and personalised:\n${context}`;
}

const REAL_ARTICLES = [
  { title: "The 5 Love Languages", description: "Discover which love language speaks to you and your partner", source: "Psychology Today", category: "Connection", emoji: "\u{1F4AC}", url: "https://www.psychologytoday.com/us/basics/love", imageHint: "couple talking" },
  { title: "Active Listening Skills for Couples", description: "Transform how you connect with your partner through listening", source: "Verywell Mind", category: "Communication", emoji: "\u{1F442}", url: "https://www.verywellmind.com/what-is-active-listening-3024343", imageHint: "listening couple" },
  { title: "The Four Horsemen of Relationships", description: "Four communication patterns that predict relationship breakdown", source: "Gottman Institute", category: "Communication", emoji: "\u26A0\uFE0F", url: "https://www.gottman.com/blog/the-four-horsemen-recognizing-criticism-contempt-defensiveness-and-stonewalling/", imageHint: "couple conflict" },
  { title: "Emotional Bids: How Couples Connect", description: "The small moments that build or break your relationship", source: "Gottman Institute", category: "Communication", emoji: "\u2764\uFE0F", url: "https://www.gottman.com/blog/want-to-improve-your-relationship-start-paying-more-attention-to-bids/", imageHint: "emotional needs" },
  { title: "How Couples Communicate Better", description: "Research-backed communication skills for stronger relationships", source: "Psychology Today", category: "Communication", emoji: "\u{1F5E3}\uFE0F", url: "https://www.psychologytoday.com/us/basics/communication", imageHint: "couple conversation" },
  { title: "Building Emotional Intimacy", description: "Simple daily habits that deepen your bond over time", source: "Verywell Mind", category: "Intimacy", emoji: "\u{1F495}", url: "https://www.verywellmind.com/how-to-improve-emotional-intimacy-in-your-relationship-5215372", imageHint: "emotional connection" },
  { title: "The Role of Physical Affection", description: "Why non-sexual touch is vital for long-term connection", source: "Psychology Today", category: "Intimacy", emoji: "\u{1FAC2}", url: "https://www.psychologytoday.com/us/basics/affection", imageHint: "couple touching" },
  { title: "40 Questions to Build Intimacy", description: "Deepen your connection with thoughtful conversation starters", source: "Verywell Mind", category: "Intimacy", emoji: "\u{1F48B}", url: "https://www.verywellmind.com/questions-to-build-intimacy-in-relationships-1270942", imageHint: "couple intimacy" },
  { title: "Sex & Intimacy: A Healthy Guide", description: "Open conversations and ideas for a fulfilling intimate life", source: "Psychology Today", category: "Intimacy", emoji: "\u{1F336}\uFE0F", url: "https://www.psychologytoday.com/us/basics/sex", imageHint: "intimate couple" },
  { title: "17 Fun Couple Activities to Enjoy Together", description: "Creative ways to enjoy each other's company at home or out", source: "Verywell Mind", category: "Date Ideas", emoji: "\u{1F56F}\uFE0F", url: "https://www.verywellmind.com/fun-things-couples-can-do-together-3129598", imageHint: "romantic date home" },
  { title: "Why Shared Adventures Bond Couples", description: "The neuroscience behind why new experiences deepen love", source: "Greater Good Magazine", category: "Fun", emoji: "\u{1F9D7}", url: "https://greatergood.berkeley.edu/article/item/why_couples_should_seek_out_new_experiences", imageHint: "couple adventure" },
  { title: "Managing Conflict in Relationships", description: "Healthy strategies to navigate disagreements together", source: "Gottman Institute", category: "Communication", emoji: "\u{1F9E9}", url: "https://www.gottman.com/blog/managing-conflict-solvable-vs-perpetual-problems/", imageHint: "couple discussion" },
  { title: "Relationship Trust Building", description: "How to build and rebuild trust in your relationship", source: "Psychology Today", category: "Growth", emoji: "\u{1F91D}", url: "https://www.psychologytoday.com/us/basics/trust", imageHint: "trust couple" },
  { title: "The Science of Gratitude in Love", description: "How saying 'thank you' transforms your relationship", source: "Greater Good Magazine", category: "Gratitude", emoji: "\u{1F64F}", url: "https://greatergood.berkeley.edu/topic/gratitude", imageHint: "grateful couple" },
  { title: "Attachment Styles Explained", description: "Understanding how your attachment style affects your love life", source: "Verywell Mind", category: "Growth", emoji: "\u{1F517}", url: "https://www.verywellmind.com/attachment-styles-2795344", imageHint: "attachment bond" },
  { title: "How to Keep the Spark Alive", description: "Evidence-based ways to maintain romance in long relationships", source: "Psychology Today", category: "Intimacy", emoji: "\u2728", url: "https://www.psychologytoday.com/us/basics/relationships", imageHint: "romantic couple" },
  { title: "The Power of Date Nights", description: "Why regular date nights are essential for lasting love", source: "Gottman Institute", category: "Date Ideas", emoji: "\u{1F319}", url: "https://www.gottman.com/blog/relationship-and-opportunity-the-importance-of-date-night/", imageHint: "date night" },
  { title: "Self-Care for Better Relationships", description: "Taking care of yourself so you can love better", source: "Verywell Mind", category: "Wellness", emoji: "\u{1F9D8}", url: "https://www.verywellmind.com/self-care-strategies-overall-stress-reduction-3144729", imageHint: "self care" },
  { title: "The Art of Compromise in Relationships", description: "How to find middle ground without losing yourself", source: "Psychology Today", category: "Communication", emoji: "\u{1F91D}", url: "https://www.psychologytoday.com/us/blog/in-it-together/201710/the-art-compromise", imageHint: "couple compromise" },
  { title: "How to Set Healthy Boundaries", description: "Boundaries aren't walls — they're bridges to better connection", source: "Verywell Mind", category: "Growth", emoji: "\u{1F6A7}", url: "https://www.verywellmind.com/how-to-set-healthy-boundaries-4178874", imageHint: "healthy boundaries" },
  { title: "Why Couples Stop Having Sex", description: "The common reasons intimacy fades and how to reignite it", source: "Psychology Today", category: "Intimacy", emoji: "\u{1F525}", url: "https://www.psychologytoday.com/us/blog/love-in-the-age-technology/201710/why-couples-stop-having-sex", imageHint: "couple intimacy" },
  { title: "The Magic Ratio of Relationships", description: "Gottman's 5:1 ratio — five positive interactions for every negative one", source: "Gottman Institute", category: "Communication", emoji: "\u2728", url: "https://www.gottman.com/blog/the-magic-relationship-ratio-according-science/", imageHint: "happy couple ratio" },
  { title: "How to Apologise Properly", description: "The six components of a meaningful apology that actually heals", source: "Verywell Mind", category: "Communication", emoji: "\u{1F64F}", url: "https://www.verywellmind.com/how-to-apologize-more-sincerely-3144467", imageHint: "apology couple" },
  { title: "Mindfulness for Couples", description: "How practising presence together strengthens your bond", source: "Greater Good Magazine", category: "Wellness", emoji: "\u{1F9D8}", url: "https://greatergood.berkeley.edu/article/item/how_mindfulness_can_help_couples", imageHint: "mindful couple meditation" },
  { title: "Financial Planning as a Couple", description: "Money conversations that bring you closer instead of driving you apart", source: "Verywell Mind", category: "Practical", emoji: "\u{1F4B0}", url: "https://www.verywellmind.com/managing-finances-as-a-couple-5095973", imageHint: "couple finances" },
  { title: "The Importance of Play in Relationships", description: "Why laughter and silliness are serious relationship tools", source: "Psychology Today", category: "Fun", emoji: "\u{1F3AE}", url: "https://www.psychologytoday.com/us/blog/the-mindful-self-express/201602/the-importance-play-in-relationships", imageHint: "couple playing laughing" },
  { title: "Navigating Life Transitions Together", description: "How to stay connected through big changes like moving, babies and career shifts", source: "Gottman Institute", category: "Growth", emoji: "\u{1F331}", url: "https://www.gottman.com/blog/relationship-life-transitions/", imageHint: "couple life change" },
  { title: "How to Fight Fair", description: "Rules of engagement for productive disagreements that strengthen your bond", source: "Gottman Institute", category: "Communication", emoji: "\u{1F94A}", url: "https://www.gottman.com/blog/how-to-fight-fair/", imageHint: "couple disagreement" },
  { title: "The Science of Oxytocin and Bonding", description: "Understanding the 'love hormone' and how it deepens attachment", source: "Greater Good Magazine", category: "Science", emoji: "\u{1F9EA}", url: "https://greatergood.berkeley.edu/article/item/the_science_of_love", imageHint: "oxytocin bonding" },
];

const CURATED_PODCASTS = [
  { title: "Where Should We Begin?", description: "Step inside real therapy sessions with couples navigating love, betrayal, and desire", host: "Esther Perel", category: "Therapy", spotifyId: "2LfEXBqTmGJMPMYfAVHdj4", appleId: "1237931798", imageUrl: "", duration: "40 min" },
  { title: "Modern Love", description: "Real stories of love, loss, and redemption from the New York Times column", host: "New York Times", category: "Stories", spotifyId: "03Er7mSPHvc2Dn8gP5odMh", appleId: "1065559535", imageUrl: "", duration: "25 min" },
  { title: "Foreplay — Couples & Sex Therapy", description: "Sex therapists discuss intimacy, desire, and keeping the spark alive", host: "Laurie Watson", category: "Intimacy", spotifyId: "5kKKuebRUxNsaKLPM7hIBt", appleId: "1083324677", imageUrl: "", duration: "30 min" },
  { title: "Relationship Alive!", description: "Deep-dive conversations with world-renowned relationship experts", host: "Neil Sattin", category: "Growth", spotifyId: "6cQwLbS6rAku3Y84fN3aPU", appleId: "1037691804", imageUrl: "", duration: "60 min" },
  { title: "The Love Fix", description: "Clinical psychologist helps couples navigate real relationship challenges", host: "Dr Tari Mack", category: "Advice", spotifyId: "3jYyI64kRl4wERdfIc0fQO", appleId: "1551411428", imageUrl: "", duration: "45 min" },
  { title: "The Secure Love Podcast", description: "Attachment theory in action — heal anxious & avoidant patterns", host: "Julie Menanno", category: "Growth", spotifyId: "6HwbZhlhLzBJXJEq9OWaOX", appleId: "1753342452", imageUrl: "", duration: "25 min" },
  { title: "We Can Do Hard Things", description: "Glennon Doyle tackles love, identity, and partnership with radical honesty", host: "Glennon Doyle", category: "Growth", spotifyId: "5swfO4bVmFrcUsQjGeBp2o", appleId: "1564530722", imageUrl: "", duration: "50 min" },
  { title: "Just Between Us Ghoulfriends", description: "Honest chats about dating, marriage, and everything in between", host: "Allison & Gaby", category: "Fun", spotifyId: "2afVjOVyRWzyWBi8qrNkeJ", appleId: "1440694086", imageUrl: "", duration: "35 min" },
  { title: "Couples Therapy", description: "Candid conversations about modern love, dating and everything couples go through", host: "Naistoise Pointet & Andy Gallagher", category: "Fun", spotifyId: "4bOjKjHwMabow4y3KdPcZs", appleId: "1458699122", imageUrl: "", duration: "45 min" },
  { title: "The Couples Therapist Couch", description: "A therapist shares tools and insights for building a thriving relationship", host: "Shane Birkel", category: "Therapy", spotifyId: "0otDmfAYSUaEjBoYOxQCL7", appleId: "1251578818", imageUrl: "", duration: "40 min" },
  { title: "The Gottman Relationship Coach", description: "Science-backed relationship skills from the world's leading couples research institute", host: "Gottman Institute", category: "Growth", spotifyId: "2I4xsSiDLiQRWNMF7SIvKt", appleId: "1588107023", imageUrl: "", duration: "30 min" },
  { title: "Dear Therapists", description: "Lori Gottlieb and Guy Winch help real people with their relationship dilemmas", host: "Lori Gottlieb & Guy Winch", category: "Advice", spotifyId: "1f8XB2kQVfXvFGwDCGdQ8r", appleId: "1458710283", imageUrl: "", duration: "35 min" },
  { title: "How's Work?", description: "Esther Perel coaches real colleagues through workplace relationships and dynamics", host: "Esther Perel", category: "Growth", spotifyId: "6wlHuJJ0JhD6Zt0kIbKH8R", appleId: "1476831473", imageUrl: "", duration: "45 min" },
  { title: "Unlocking Us", description: "Brene Brown explores what it means to be brave, connected and wholehearted", host: "Brene Brown", category: "Connection", spotifyId: "3UDLSY7sGSX5xmOFCqLViD", appleId: "1504099185", imageUrl: "", duration: "55 min" },
  { title: "On Purpose", description: "Jay Shetty interviews thought leaders on love, purpose and building meaningful relationships", host: "Jay Shetty", category: "Growth", spotifyId: "5EqqB52m2bsr4k1Ii7sStc", appleId: "1450994021", imageUrl: "", duration: "60 min" },
  { title: "Ten Percent Happier", description: "Meditation and mindfulness for sceptics — great episodes on loving relationships", host: "Dan Harris", category: "Wellness", spotifyId: "1CfW319UkBMVhiTb0WKxyp", appleId: "1087147821", imageUrl: "", duration: "50 min" },
];

const CURATED_VIDEOS = [
  { title: "The Secret to Desire in Long-Term Relationships", description: "Esther Perel reveals why desire fades and how to bring it back", creator: "TED", category: "Intimacy", emoji: "\u{1F525}", youtubeId: "sa0RUmGTCYY", tedSlug: "esther_perel_the_secret_to_desire_in_a_long_term_relationship", duration: "19 min", thumbnailUrl: "https://pi.tedcdn.com/r/pe.tedcdn.com/images/ted/f0420115a72f8b4ce1f54bdf96dd3dc700fee0aa_2880x1620.jpg?w=560" },
  { title: "How to Make Love Last", description: "Neuroscientist Helen Fisher on the science behind lasting love", creator: "TED", category: "Science", emoji: "\u{1F9EC}", youtubeId: "OYfoGTIG7pY", tedSlug: "helen_fisher_the_brain_in_love", duration: "18 min", thumbnailUrl: "https://pi.tedcdn.com/r/pe.tedcdn.com/images/ted/26035_480x360.jpg?w=560" },
  { title: "The 4 Attachment Styles Explained", description: "Understand how your attachment style shapes your relationships", creator: "The School of Life", category: "Growth", emoji: "\u{1F517}", youtubeId: "2s9ACDMcpjA", tedSlug: "", duration: "7 min", thumbnailUrl: "" },
  { title: "10 Ways to Have a Better Conversation", description: "Communication tips that will transform every relationship", creator: "TED", category: "Communication", emoji: "\u{1F4AC}", youtubeId: "R1vskiVDwl4", tedSlug: "celeste_headlee_10_ways_to_have_a_better_conversation", duration: "12 min", thumbnailUrl: "https://pi.tedcdn.com/r/pe.tedcdn.com/images/ted/353ddb2a3a8e3cfb9ea7b61f3f1a884e3f39bc79_2880x1620.jpg?w=560" },
  { title: "Why We All Need to Practice Emotional First Aid", description: "How taking care of your emotional health benefits your relationship", creator: "TED", category: "Wellness", emoji: "\u{1FA79}", youtubeId: "F2hc2FLOdhI", tedSlug: "guy_winch_why_we_all_need_to_practice_emotional_first_aid", duration: "18 min", thumbnailUrl: "https://pi.tedcdn.com/r/pe.tedcdn.com/images/ted/8b5bbd28ba62f7e1ab1e53020762d58a8d3bba9d_2880x1620.jpg?w=560" },
  { title: "The Power of Vulnerability", description: "Brene Brown on how vulnerability is the birthplace of connection", creator: "TED", category: "Connection", emoji: "\u2764\uFE0F", youtubeId: "iCvmsMzlF7o", tedSlug: "brene_brown_the_power_of_vulnerability", duration: "21 min", thumbnailUrl: "https://pi.tedcdn.com/r/pe.tedcdn.com/images/ted/93e66fc02eb5b86537e1ccf37c53875c4ff3edda_2880x1620.jpg?w=560" },
  { title: "How to Fix a Broken Relationship", description: "John Gottman breaks down the key to repairing relationship trust", creator: "Big Think", category: "Communication", emoji: "\u{1F527}", youtubeId: "AKTyPgwfPgg", tedSlug: "", duration: "8 min", thumbnailUrl: "" },
  { title: "5 Love Languages Explained", description: "Gary Chapman walks through each love language with examples", creator: "Gary Chapman", category: "Connection", emoji: "\u{1F5E3}\uFE0F", youtubeId: "doRMsni0sno", tedSlug: "", duration: "10 min", thumbnailUrl: "" },
  { title: "Rethinking Infidelity", description: "Esther Perel explores why people cheat and what it means for modern love", creator: "TED", category: "Therapy", emoji: "\u{1F4A1}", youtubeId: "P2AUat93a8Q", tedSlug: "esther_perel_rethinking_infidelity_a_talk_for_anyone_who_has_ever_loved", duration: "21 min", thumbnailUrl: "https://pi.tedcdn.com/r/pe.tedcdn.com/images/ted/f88a5e5bea6c59a34015e2df3f0aa02e35b93ddd_2880x1620.jpg?w=560" },
  { title: "A Better Way to Talk About Love", description: "Mandy Len Catron on how the stories we tell about love shape how we experience it", creator: "TED", category: "Stories", emoji: "\u{1F4D6}", youtubeId: "tVY8m6bU0XQ", tedSlug: "mandy_len_catron_a_better_way_to_talk_about_love", duration: "14 min", thumbnailUrl: "" },
  { title: "The Mathematics of Love", description: "Mathematician Hannah Fry reveals the hidden patterns behind successful relationships", creator: "TED", category: "Science", emoji: "\u{1F4CA}", youtubeId: "yFVXsjVdvmY", tedSlug: "hannah_fry_the_mathematics_of_love", duration: "17 min", thumbnailUrl: "" },
  { title: "What Makes a Good Life?", description: "The longest study on happiness reveals that good relationships keep us healthier and happier", creator: "TED", category: "Science", emoji: "\u{1F331}", youtubeId: "8KkKuTCFvzI", tedSlug: "robert_waldinger_what_makes_a_good_life_lessons_from_the_longest_study_on_happiness", duration: "13 min", thumbnailUrl: "" },
  { title: "How to Build and Rebuild Trust", description: "Frances Frei explains the three components of trust and how to restore it", creator: "TED", category: "Growth", emoji: "\u{1F91D}", youtubeId: "pVeq-0dIqpk", tedSlug: "frances_frei_how_to_build_and_rebuild_trust", duration: "15 min", thumbnailUrl: "" },
  { title: "Listening to Shame", description: "Brene Brown's follow-up on why shame is an epidemic and how empathy is the antidote", creator: "TED", category: "Connection", emoji: "\u{1F49C}", youtubeId: "psN1DORYYV0", tedSlug: "brene_brown_listening_to_shame", duration: "21 min", thumbnailUrl: "" },
  { title: "The Surprising Science of Happiness", description: "Dan Gilbert reveals how we can synthesise happiness even when things don't go as planned", creator: "TED", category: "Science", emoji: "\u{1F600}", youtubeId: "4q1dgn_C0AU", tedSlug: "dan_gilbert_the_surprising_science_of_happiness", duration: "21 min", thumbnailUrl: "" },
  { title: "How to Stop Screwing Yourself Over", description: "Mel Robbins on the five-second rule and taking action in your relationship and life", creator: "TEDx", category: "Growth", emoji: "\u26A1", youtubeId: "Lp7E973zozc", tedSlug: "", duration: "22 min", thumbnailUrl: "" },
  { title: "Connected, But Alone?", description: "Sherry Turkle on how technology affects our ability to have real conversations with partners", creator: "TED", category: "Communication", emoji: "\u{1F4F1}", youtubeId: "t7Xr3AsBEK4", tedSlug: "sherry_turkle_connected_but_alone", duration: "20 min", thumbnailUrl: "" },
  { title: "Everything You Think You Know About Addiction Is Wrong", description: "Johann Hari reveals that the opposite of addiction isn't sobriety — it's connection", creator: "TED", category: "Connection", emoji: "\u{1F9E0}", youtubeId: "PY9DcIMGxMs", tedSlug: "johann_hari_everything_you_think_you_know_about_addiction_is_wrong", duration: "15 min", thumbnailUrl: "" },
];

const CURATED_QUOTES = [
  { text: "The best thing to hold onto in life is each other.", author: "Audrey Hepburn", category: "Love" },
  { text: "A great relationship is about two things: first, appreciating the similarities, and second, respecting the differences.", author: "Unknown", category: "Growth" },
  { text: "In the end, the love you take is equal to the love you make.", author: "Paul McCartney", category: "Love" },
  { text: "Being deeply loved by someone gives you strength, while loving someone deeply gives you courage.", author: "Lao Tzu", category: "Courage" },
  { text: "The greatest thing you'll ever learn is just to love and be loved in return.", author: "Eden Ahbez", category: "Love" },
  { text: "We loved with a love that was more than love.", author: "Edgar Allan Poe", category: "Passion" },
  { text: "Love does not consist of gazing at each other, but in looking outward together in the same direction.", author: "Antoine de Saint-Exupéry", category: "Partnership" },
  { text: "Whatever our souls are made of, his and mine are the same.", author: "Emily Brontë", category: "Connection" },
  { text: "You know you're in love when you can't fall asleep because reality is finally better than your dreams.", author: "Dr Seuss", category: "Joy" },
  { text: "To love and be loved is to feel the sun from both sides.", author: "David Viscott", category: "Warmth" },
  { text: "The real lover is the man who can thrill you by kissing your forehead.", author: "Marilyn Monroe", category: "Intimacy" },
  { text: "Where there is love there is life.", author: "Mahatma Gandhi", category: "Life" },
  { text: "I have decided to stick with love. Hate is too great a burden to bear.", author: "Martin Luther King Jr.", category: "Choice" },
  { text: "You are my today and all of my tomorrows.", author: "Leo Christopher", category: "Forever" },
  { text: "The couples that are meant to be are the ones who go through everything that is meant to tear them apart and come out even stronger.", author: "Unknown", category: "Resilience" },
  { text: "I love you not because of who you are, but because of who I am when I am with you.", author: "Roy Croft", category: "Love" },
  { text: "The meeting of two personalities is like the contact of two chemical substances: if there is any reaction, both are transformed.", author: "Carl Jung", category: "Growth" },
  { text: "Love recognises no barriers. It jumps hurdles, leaps fences, penetrates walls to arrive at its destination full of hope.", author: "Maya Angelou", category: "Hope" },
  { text: "We are most alive when we are in love.", author: "John Updike", category: "Passion" },
  { text: "A successful marriage requires falling in love many times, always with the same person.", author: "Mignon McLaughlin", category: "Partnership" },
  { text: "The best love is the kind that awakens the soul and makes us reach for more.", author: "Nicholas Sparks", category: "Growth" },
  { text: "To get the full value of joy, you must have someone to divide it with.", author: "Mark Twain", category: "Joy" },
  { text: "Love is not about how many days, months, or years you have been together. It is about how much you love each other every single day.", author: "Unknown", category: "Forever" },
  { text: "In all the world there is no heart for me like yours. In all the world there is no love for you like mine.", author: "Maya Angelou", category: "Connection" },
  { text: "Grow old with me, the best is yet to be.", author: "Robert Browning", category: "Forever" },
  { text: "The secret of a happy marriage is finding the right person. You know they're right if you love to be with them all the time.", author: "Julia Child", category: "Partnership" },
  { text: "Love is composed of a single soul inhabiting two bodies.", author: "Aristotle", category: "Connection" },
  { text: "Happiness is anyone and anything that's loved by you.", author: "Charlie Brown", category: "Joy" },
  { text: "I would rather share one lifetime with you than face all the ages of this world alone.", author: "J.R.R. Tolkien", category: "Forever" },
];

const LUXURY_INTIMACY_PRODUCTS = [
  { name: "Roseravished Massage Oil", brand: "Coco de Mer", price: "\u00A354.00", description: "Luxurious rose-scented sensual massage oil with neroli and ylang ylang", longDescription: "A sumptuous blend of natural oils infused with Damascus rose, neroli and ylang ylang. Designed to warm between the palms and melt into skin, creating an intoxicating aromatic experience for couples.", features: ["100ml hand-poured oil", "Damascus rose & neroli blend", "Warms between palms", "Vegan & cruelty-free"], category: "Massage", imageKeyword: "luxury massage oil rose gold bottle", imageUrl: "https://www.coco-de-mer.com/cdn/shop/products/Coco-de-Mer-Roseravished-Massage-Oil_1024x.png?v=1752055199", productUrl: "https://www.coco-de-mer.com/products/coco-de-mer-roseravished-massage-oil-100ml" },
  { name: "Enraptured Figment Massage Candle", brand: "Coco de Mer", price: "\u00A360.00", description: "Hand-poured candle that melts into warm, fragrant massage oil", longDescription: "This exquisite candle fills the room with an intoxicating scent before melting into a pool of warm, skin-nourishing massage oil. Crafted with shea butter and coconut oil for a truly indulgent experience.", features: ["200g soy wax blend", "Melts into massage oil", "Shea butter & coconut oil", "Burns for 40+ hours"], category: "Candles", imageKeyword: "luxury candle dark elegant minimal", imageUrl: "https://www.coco-de-mer.com/cdn/shop/files/Coco-de-Mer-Enraptured-Figment-Massage-Candle_1024x.png?v=1752078889", productUrl: "https://www.coco-de-mer.com/products/coco-de-mer-enraptured-figment-massage-candle-200g" },
  { name: "Pure Delight Orgasm Balm", brand: "Coco de Mer", price: "\u00A336.00", description: "Sensation-heightening intimate balm with natural botanicals", longDescription: "A delicate balm formulated with peppermint and ginger root extracts to naturally heighten sensation. Dermatologically tested and made with clean, body-safe ingredients.", features: ["20g compact size", "Peppermint & ginger root", "Dermatologically tested", "Clean ingredients"], category: "Wellness", imageKeyword: "luxury beauty balm minimal packaging", imageUrl: "https://www.coco-de-mer.com/cdn/shop/products/Coco-de-Mer-Pure-Delight-Orgasm-Balm_1024x.png?v=1752225275", productUrl: "https://www.coco-de-mer.com/products/coco-de-mer-pure-delight-orgasm-balm-20g" },
  { name: "Silk Blindfold", brand: "Coco de Mer", price: "\u00A3102.00", description: "Hand-finished mulberry silk blindfold for sensory exploration", longDescription: "Crafted from the finest mulberry silk with adjustable ribbon ties. The gentle weight and complete light exclusion heighten every other sense, transforming touch into something electric.", features: ["100% mulberry silk", "Adjustable ribbon ties", "Hand-finished in London", "Gift-boxed"], category: "Accessories", imageKeyword: "luxury silk blindfold black elegant", imageUrl: "https://www.coco-de-mer.com/cdn/shop/products/Coco_de_Mer_Silk_Blindfold_1024x.png?v=1751638173", productUrl: "https://www.coco-de-mer.com/products/coco-de-mer-blindfold" },
  { name: "Celeste Quarter Cup Bra", brand: "Coco de Mer", price: "\u00A3234.00", description: "Hand-crafted French lace quarter-cup bra in midnight blue", longDescription: "Each Celeste piece is hand-cut from the finest French Leavers lace by skilled artisans. The quarter-cup silhouette celebrates the body with a daring yet refined aesthetic.", features: ["French Leavers lace", "Hand-cut & finished", "24k gold-plated hardware", "Sizes 32A-36DD"], category: "Lingerie", imageKeyword: "luxury lingerie dark lace editorial", imageUrl: "https://www.coco-de-mer.com/cdn/shop/files/Celestequartercupbrafront_d56f88d8-1b80-4ba6-ba50-bbc63c0c4a61_1024x.png?v=1767111157", productUrl: "https://www.coco-de-mer.com/products/coco-de-mer-celeste-quarter-cup-bra" },
  { name: "Reina Playsuit", brand: "Coco de Mer", price: "\u00A3462.00", description: "Exquisite silk and Chantilly lace bodysuit", longDescription: "The Reina Playsuit is the pinnacle of intimate luxury. Combining silk-satin with delicate Chantilly lace, each piece is hand-finished with meticulous attention to detail.", features: ["Silk-satin & Chantilly lace", "Hand-finished detailing", "Adjustable straps", "Sizes XS-XL"], category: "Lingerie", imageKeyword: "luxury bodysuit silk lace editorial fashion", imageUrl: "https://www.coco-de-mer.com/cdn/shop/files/ReinaPlaysuitFront-ezgif.com-resize_1024x.png?v=1765557415", productUrl: "https://www.coco-de-mer.com/products/coco-de-mer-reina-playsuit" },
  { name: "Divine Glow Lubricant", brand: "Coco de Mer", price: "\u00A342.00", description: "Premium water-based lubricant with hyaluronic acid", longDescription: "A clean-formula lubricant enriched with hyaluronic acid for lasting comfort. pH-balanced and compatible with all materials. Designed to feel as luxurious as the rest of your evening.", features: ["100ml pump bottle", "Hyaluronic acid enriched", "pH-balanced formula", "Condom compatible"], category: "Wellness", imageKeyword: "luxury intimate product minimal white", imageUrl: "https://www.coco-de-mer.com/cdn/shop/products/Coco-de-Mer-Divine-Glow-Aqua-Lubricant_1024x.png?v=1751636529", productUrl: "https://www.coco-de-mer.com/products/coco-de-mer-divine-glow-aqua-lubricant-100ml" },
  { name: "Mercy Corset", brand: "Agent Provocateur", price: "\u00A3540.00", description: "Iconic structured corset with signature pink detailing", longDescription: "The Mercy Corset is Agent Provocateur at its most powerful. Boned for structure with signature pink satin trims and hook-and-eye closure. A piece that commands attention.", features: ["Steel boning structure", "Signature pink satin trim", "Hook-and-eye closure", "Sizes 32-38"], category: "Lingerie", imageKeyword: "luxury corset lingerie editorial pink black", imageUrl: "/products/ap-mercy-corset.png", productUrl: "https://www.agentprovocateur.com/gb_en/lingerie/corsets-basques" },
  { name: "Lorna Plunge Underwired Bra", brand: "Agent Provocateur", price: "\u00A3108.00", description: "Silk and lace plunge bra with scalloped edges", longDescription: "The Lorna combines Italian silk-satin with intricate Calais lace for a modern plunge silhouette. Scalloped edges and a deep-V neckline make this piece both versatile and luxurious.", features: ["Italian silk-satin", "Calais lace overlay", "Scalloped edge detail", "Sizes 32B-36E"], category: "Lingerie", imageKeyword: "luxury bra silk lace editorial", imageUrl: "/products/ap-lorna-bra.png", productUrl: "https://www.agentprovocateur.com/gb_en/lingerie" },
  { name: "Keia Silk Kimono", brand: "Agent Provocateur", price: "\u00A3348.00", description: "Floor-length silk kimono with hand-painted floral print", longDescription: "Wrap yourself in luxury with this floor-length silk kimono featuring an exclusive hand-painted floral print. The perfect piece for lounging at home or as an unforgettable gift.", features: ["100% mulberry silk", "Hand-painted print", "Floor-length cut", "One size fits most"], category: "Nightwear", imageKeyword: "luxury silk kimono robe floral editorial", imageUrl: null, productUrl: "https://www.agentprovocateur.com/gb_en/nightwear" },  
  { name: "Hosiery Gift Set", brand: "Agent Provocateur", price: "\u00A378.00", description: "Signature hold-ups and suspender set in gift packaging", longDescription: "The perfect introduction to Agent Provocateur. Includes silk hold-up stockings and a matching suspender belt in the iconic pink and black gift box.", features: ["Silk-blend stockings", "Matching suspender belt", "Signature gift packaging", "One size"], category: "Accessories", imageKeyword: "luxury hosiery stockings gift box elegant", imageUrl: "/products/ap-hosiery-set.png", productUrl: "https://www.agentprovocateur.com/gb_en/accessories" },
  { name: "G.Spot Vibrator", brand: "goop", price: "\u00A390.00", description: "Double-ended personal massager in medical-grade silicone", longDescription: "Designed in collaboration with intimacy experts, this beautifully sculpted vibrator features dual motors and 10 intensity settings. Medical-grade silicone with a whisper-quiet motor.", features: ["Medical-grade silicone", "10 intensity settings", "USB rechargeable", "Waterproof IPX7"], category: "Wellness", imageKeyword: "minimal luxury wellness product clean design", imageUrl: null, productUrl: "https://goop.com/wellness/sexual-health/" },
  { name: "Scented Candle: Edition 04 Orchard", brand: "goop", price: "\u00A358.00", description: "Hand-poured coconut wax candle with fig, orchard fruit and cedarwood", longDescription: "A clean-burning coconut and beeswax blend scented with sun-drenched orchard notes — ripe fig, warm cedarwood and a touch of hay. Burns for 60+ hours. Perfect for setting the mood.", features: ["60-hour burn time", "Coconut & beeswax blend", "Fig & cedarwood notes", "Non-toxic & clean"], category: "Date Night", imageKeyword: "luxury scented candle minimal", imageUrl: "https://static.thcdn.com/productimg/original/13310790-2014896412930473.jpg", productUrl: "https://goop.com/shop/home/candles/" },
  { name: "Edition 04 Orchard Eau de Parfum", brand: "goop", price: "\u00A3108.00", description: "Warm, woody unisex fragrance with fig and sandalwood", longDescription: "Edition 04 opens with sun-warmed fig and green leaves before settling into orris root and sandalwood. A clean, skin-like scent that becomes uniquely yours. Perfect for sharing.", features: ["50ml eau de parfum", "Clean & non-toxic", "Fig, orris root, sandalwood", "Unisex fragrance"], category: "Fragrance", imageKeyword: "luxury perfume bottle minimal clean", imageUrl: "https://static.thcdn.com/productimg/original/13317640-8414896456928977.jpg", productUrl: "https://goop.com/shop/beauty/fragrance/" },
  { name: "G.Tox Detox Bath Soak", brand: "goop", price: "\u00A345.00", description: "Purifying bath soak with Himalayan salt and activated charcoal", longDescription: "A deep-cleansing mineral soak that draws out impurities while replenishing with magnesium-rich Himalayan pink salt. Add to a hot bath and soak for 20 minutes for the full detox effect.", features: ["680g tub", "Himalayan pink salt", "Activated charcoal", "Clean ingredients"], category: "Bath", imageKeyword: "luxury bath soak salt minimal packaging", imageUrl: "https://static.thcdn.com/productimg/original/13310780-6404896412642401.jpg", productUrl: "https://goop.com/shop/beauty/bath-body/" },
  { name: "The Martini Bath Soak", brand: "goop", price: "\u00A342.00", description: "Emotional detox bath soak with CBD and botanicals", longDescription: "Named for the clean, sharp feeling it leaves behind. This mineral-rich soak combines Epsom salt with a calming blend of botanical oils. The ultimate couples wind-down ritual.", features: ["680g tub", "Epsom salt base", "Botanical oil blend", "Calming CBD formula"], category: "Bath", imageKeyword: "luxury bath soak wellness minimal", imageUrl: "https://static.thcdn.com/productimg/original/13310784-1444896412756539.jpg", productUrl: "https://goop.com/shop/beauty/bath-body/" },
  { name: "Lip & Cheek Duo", brand: "Space NK", price: "\u00A342.00", description: "Buildable cream colour for a natural, flushed glow", longDescription: "A bestselling multi-use colour stick that gives lips and cheeks a sheer, dewy flush. Enriched with vitamin E and jojoba oil. The perfect low-effort luxury for date night prep.", features: ["Multi-use stick", "Vitamin E & jojoba", "Buildable sheer colour", "6 shades available"], category: "Beauty", imageKeyword: "luxury makeup lip cheek tint minimal", imageUrl: "https://milkmakeup.com/cdn/shop/products/SHOT05_MINILIP_CHEEK_OPEN_DASH_533x.jpg?v=1737741718", productUrl: "https://www.spacenk.com/uk/makeup/lips" },
  { name: "Baccarat Rouge 540 Eau de Parfum", brand: "Space NK", price: "\u00A3312.00", description: "The iconic Maison Francis Kurkdjian fragrance", longDescription: "One of the most sought-after fragrances in the world. Jasmine, saffron and ambergris create a luminous, woody-floral scent that lingers on skin for hours. An unforgettable gift.", features: ["70ml eau de parfum", "Jasmine, saffron, ambergris", "Maison Francis Kurkdjian", "Signature red bottle"], category: "Fragrance", imageKeyword: "baccarat rouge 540 perfume bottle luxury", imageUrl: null, productUrl: "https://www.spacenk.com/uk/fragrance" },
  { name: "SONA 2 Cruise", brand: "LELO", price: "\u00A3139.00", description: "Sonic clitoral massager with Cruise Control technology", longDescription: "LELO's most advanced sonic massager uses SenSonic technology to stimulate the entire clitoris, not just the surface. Cruise Control reserves 20% power so intensity never drops when pressed harder.", features: ["SenSonic technology", "Cruise Control power", "12 intensity settings", "Waterproof & rechargeable"], category: "Wellness", imageKeyword: "LELO SONA luxury vibrator", imageUrl: "https://static.thcdn.com/productimg/original/12669854-1544930111945017.jpg", productUrl: "https://www.lelo.com/sona-2-cruise" },
  { name: "TIANI 3", brand: "LELO", price: "\u00A3169.00", description: "Remote-controlled couples' massager worn during intimacy", longDescription: "Designed to be worn during lovemaking, TIANI 3 uses SenseMotion technology controlled by an elegant remote. Delivers vibrations to both partners simultaneously for shared pleasure.", features: ["SenseMotion remote", "Worn during intimacy", "8 vibration modes", "Body-safe silicone"], category: "Intimacy", imageKeyword: "LELO TIANI couples vibrator", imageUrl: "https://static.thcdn.com/productimg/1600/1600/12669865-2634791714156570.jpg", productUrl: "https://www.lelo.com/tiani-3" },
  { name: "Desire Luxury G-Spot Vibrator", brand: "Lovehoney", price: "\u00A349.99", description: "Rechargeable curved vibrator with 20 patterns and storage case", longDescription: "The bestselling Desire range combines premium silicone with powerful motors. This curved G-spot vibrator has 20 vibration patterns, whisper-quiet operation, and comes in a sleek storage case.", features: ["20 vibration patterns", "Premium silicone", "USB rechargeable", "Travel storage case"], category: "Wellness", imageKeyword: "Lovehoney Desire luxury vibrator purple", imageUrl: "https://m.media-amazon.com/images/I/41tvtOkCVbL._SL500_.jpg", productUrl: "https://www.lovehoney.co.uk/vibrators/g-spot-vibrators/" },
  { name: "Augustinus Bader The Cream", brand: "Space NK", price: "\u00A3198.00", description: "Award-winning face cream with TFC8 cell-renewing technology", longDescription: "Backed by 30 years of stem cell research, The Cream uses patented TFC8 technology to support skin's natural renewal. Lightweight yet deeply hydrating — a luxury skincare essential.", features: ["50ml jar", "Patented TFC8 technology", "Fragrance-free", "Clinically proven results"], category: "Skincare", imageKeyword: "luxury face cream jar minimal elegant", imageUrl: "https://www.spacenk.com/on/demandware.static/-/Sites-spacenkmastercatalog/default/dwcbf19d94/products/AUGUSTINUS/UK200026405_AUGUSTINUS.jpg", productUrl: "https://www.spacenk.com/uk/skincare" },
  { name: "Daisy Lingerie Set", brand: "Sophie & Olivia", price: "\u00A395.00", description: "Delicate floral-inspired lingerie set with hand-finished lace", longDescription: "The Daisy set features intricate floral lace applique on a sheer tulle base. Each piece is hand-finished with satin-bound edges. Includes balconette bra, thong, and suspender belt.", features: ["Hand-finished lace", "Balconette + thong + suspender", "Satin-bound edges", "Sizes XS-XL"], category: "Lingerie", imageKeyword: "luxury lingerie set floral lace editorial", imageUrl: "https://sophieolivia-lingerie.com/cdn/shop/files/Frame187_1024x1024.png?v=1771671712", productUrl: "https://sophieolivia-lingerie.com/products/daisy-lingerie-set" },
  { name: "Gia Bodysuit", brand: "Sophie & Olivia", price: "\u00A3107.00", description: "Sculpted mesh bodysuit with strategic boning and plunge front", longDescription: "Engineered to flatter with subtle boning at the waist and a dramatic plunge neckline. Italian power-mesh with velvet-soft lining for all-day (or all-night) comfort.", features: ["Italian power-mesh", "Strategic boning", "Plunge neckline", "Sizes XS-XL"], category: "Lingerie", imageKeyword: "luxury bodysuit black sculpted editorial", imageUrl: "https://sophieolivia-lingerie.com/cdn/shop/files/Frame129_1_1024x1024.png?v=1771861708", productUrl: "https://sophieolivia-lingerie.com/products/gia-bodysuit" },
  { name: "Joyce 4-Piece Set", brand: "Sophie & Olivia", price: "\u00A3107.00", description: "Complete luxury lingerie set with bra, brief, thong and suspender", longDescription: "The ultimate lingerie wardrobe in one box. Four coordinating pieces in midnight navy lace with gold hardware. Designed to mix, match and layer for countless configurations.", features: ["4 pieces in one set", "Midnight navy lace", "Gold-plated hardware", "Gift-boxed"], category: "Lingerie", imageKeyword: "luxury lingerie set navy lace gold", imageUrl: "https://sophieolivia-lingerie.com/cdn/shop/files/Frame78_1024x1024.png?v=1771528463", productUrl: "https://sophieolivia-lingerie.com/products/joyce-4-piece-set" },
  { name: "Jade 3-Piece Set", brand: "Sophie & Olivia", price: "\u00A374.00", description: "Elegant three-piece lingerie set in delicate sheer fabric", longDescription: "The Jade set combines sheer tulle with intricate lace detailing for an effortlessly seductive look. Three coordinating pieces designed to be mixed and layered. Originally \u00A3105 \u2014 now at a special price.", features: ["3-piece set", "Sheer tulle & lace", "Coordinating design", "Sizes XS-XL"], category: "Lingerie", imageUrl: "https://sophieolivia-lingerie.com/cdn/shop/files/Frame93.png?v=1771670560&width=1024", productUrl: "https://sophieolivia-lingerie.com/products/jade-3-piece-lingerie-set" },
  { name: "Magda Lingerie Set", brand: "Sophie & Olivia", price: "\u00A374.00", description: "Romantic white lace lingerie set with a classic silhouette", longDescription: "The Magda set features classic white lace with a modern cut. A beautifully romantic choice for special occasions or everyday luxury. Delicate, feminine, and flattering.", features: ["White lace design", "Classic romantic silhouette", "Special occasion or everyday", "Sizes XS-XL"], category: "Lingerie", imageUrl: "https://sophieolivia-lingerie.com/cdn/shop/files/Frame_511.png?v=1771857683&width=1024", productUrl: "https://sophieolivia-lingerie.com/products/magda-lingerie" },
  { name: "Noa Slip Dress", brand: "Sophie & Olivia", price: "\u00A364.00", description: "Luxurious satin slip dress for lounging or layering", longDescription: "The Noa is a versatile satin slip dress that works as sleepwear, loungewear, or styled as a going-out piece. Bias-cut for a flattering drape with adjustable spaghetti straps.", features: ["Satin fabric", "Bias-cut drape", "Adjustable straps", "Sizes XS-XL"], category: "Nightwear", imageUrl: "https://sophieolivia-lingerie.com/cdn/shop/files/Frame570.png?v=1772032819&width=1024", productUrl: "https://sophieolivia-lingerie.com/products/noa-loungewear" },
  { name: "Amber Lingerie Set", brand: "Sophie & Olivia", price: "\u00A369.00", description: "Bold and sensual lingerie set with cut-out detailing", longDescription: "The Amber set features daring cut-out panels and delicate strap work for a contemporary, confident look. Designed to make you feel empowered and irresistible.", features: ["Cut-out detailing", "Strap-work design", "Contemporary styling", "Sizes XS-XL"], category: "Lingerie", imageUrl: "https://sophieolivia-lingerie.com/cdn/shop/files/Frame_700.png?v=1772031000&width=1024", productUrl: "https://sophieolivia-lingerie.com/products/amber-lingerie-set" },
  { name: "Celeste Bodysuit", brand: "Sophie & Olivia", price: "\u00A360.00", description: "Sleek bodysuit with sheer panels and lace trim", longDescription: "The Celeste bodysuit combines opaque and sheer panels for a play of reveal and conceal. Flattering lace trim at the neckline and high-cut legs elongate the silhouette.", features: ["Sheer panel design", "Lace neckline trim", "High-cut silhouette", "Sizes XS-XL"], category: "Lingerie", imageUrl: "https://sophieolivia-lingerie.com/cdn/shop/files/Frame_827.png?v=1772032365&width=1024", productUrl: "https://sophieolivia-lingerie.com/products/celeste-bodysuit" },
  { name: "Charlotte Lingerie Set", brand: "Sophie & Olivia", price: "\u00A389.00", description: "Three-piece set with gu\u00EApi\u00E8re, string and thigh bands", longDescription: "The Charlotte is a statement set featuring a structured gu\u00EApi\u00E8re with matching string and thigh bands. Designed for those who love classic French lingerie with a modern edge.", features: ["Gu\u00EApi\u00E8re + string + thigh bands", "Structured silhouette", "French-inspired design", "Sizes XS-XL"], category: "Lingerie", imageUrl: "https://sophieolivia-lingerie.com/cdn/shop/files/ensemble-trois-pieces-guepiere-string-tours-de-cuisses-confess-noir-175205_9872ca1f-0740-447f-88b1-24b9ab306c37.png?v=1756387842&width=1024", productUrl: "https://sophieolivia-lingerie.com/products/charlotte-lingerie-set" },
  { name: "Aria Lingerie Set", brand: "Sophie & Olivia", price: "\u00A374.00", description: "Elegant lingerie set with intricate embroidery and mesh", longDescription: "The Aria set combines delicate embroidered lace with soft mesh for a look that is both refined and alluring. Perfect for gifting or treating yourself.", features: ["Embroidered lace detail", "Soft mesh panels", "Elegant design", "Sizes XS-XL"], category: "Lingerie", imageUrl: "https://sophieolivia-lingerie.com/cdn/shop/files/Frame36.png?v=1771532318&width=1024", productUrl: "https://sophieolivia-lingerie.com/products/aria-lingerie-set" },
];


const normalizeShopCategory = (cat: string): string => {
  const c = cat.toLowerCase().trim();
  const map: Record<string, string> = {
    "massage": "Wellness", "candles": "Date Night", "bath": "Wellness",
    "lingerie": "Intimacy", "nightwear": "Intimacy", "accessories": "Gifts",
    "fragrance": "Gifts", "beauty": "Wellness", "skincare": "Wellness",
  };
  return map[c] || cat;
};

const FALLBACK_PRODUCTS = LUXURY_INTIMACY_PRODUCTS.slice(0, 4);

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface FeedItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  imageUrl: string | null;
}

function extractItems(xml: string): FeedItem[] {
  const items: FeedItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] ||
                  block.match(/<title>(.*?)<\/title>/)?.[1] || "";
    const link = block.match(/<link>(.*?)<\/link>/)?.[1] || "";
    const rawDesc = block.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/)?.[1] ||
                    block.match(/<description>([\s\S]*?)<\/description>/)?.[1] || "";
    const imgMatch = rawDesc.match(/<img[^>]+src=["']([^"']+)["']/i);
    const imageUrl = imgMatch?.[1] || block.match(/<enclosure[^>]+url=["']([^"']+)["']/i)?.[1] || null;
    const description = rawDesc.replace(/<[^>]+>/g, "").trim().slice(0, 200);
    const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || "";
    items.push({ title, link, description, pubDate, imageUrl });
  }
  return items;
}

async function getAccessToken(serviceAccount: {
  client_email: string;
  private_key: string;
  token_uri: string;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: serviceAccount.token_uri,
    iat: now,
    exp: now + 3600,
  };

  const encode = (obj: unknown) =>
    btoa(JSON.stringify(obj))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

  const unsignedToken = `${encode(header)}.${encode(payload)}`;

  const pemBody = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");
  const binaryKey = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  const sig = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const jwt = `${unsignedToken}.${sig}`;

  const res = await fetch(serviceAccount.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  const data = await res.json();
  if (!data.access_token) {
    throw new Error(`Failed to get access token: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

async function fetchAmazonProductImage(searchTerm: string): Promise<string | null> {
  try {
    const url = `https://www.amazon.co.uk/s?k=${encodeURIComponent(searchTerm)}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-GB,en;q=0.9",
      },
      signal: AbortSignal.timeout(5000),
    });
    const html = await res.text();
    const patterns = [
      /https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9%._-]+?\.(?:jpg|png|jpeg)(?=["\s])/g,
      /https:\/\/images-na\.ssl-images-amazon\.com\/images\/I\/[A-Za-z0-9%._-]+?\.(?:jpg|png|jpeg)(?=["\s])/g,
    ];
    for (const pattern of patterns) {
      const matches = html.match(pattern);
      if (matches && matches.length > 0) {
        const goodMatch = matches.find(m => !m.includes("sprite") && !m.includes("icon") && !m.includes("logo") && !m.includes("transparent")) || matches[0];
        if (goodMatch) return goodMatch;
      }
    }
  } catch (e) {
    console.error("Amazon image fetch error:", e);
  }
  return null;
}

function parseIcs(icsText: string) {
  const events: Array<{
    subject: string;
    start: string;
    end: string;
    isAllDay: boolean;
    location?: string;
  }> = [];

  const blocks = icsText.split("BEGIN:VEVENT");
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i].split("END:VEVENT")[0];

    const getField = (name: string): string | undefined => {
      const unfolded = block.replace(/\r?\n[ \t]/g, "");
      const regex = new RegExp(`^${name}[;:](.*)$`, "m");
      const match = unfolded.match(regex);
      return match ? match[1].trim() : undefined;
    };

    const summary = getField("SUMMARY") || "Untitled Event";
    const dtstart = getField("DTSTART") || "";
    const dtend = getField("DTEND") || dtstart;
    const location = getField("LOCATION");

    const parseIcsDate = (val: string): string => {
      const parts = val.split(":");
      const dateStr = parts[parts.length - 1];

      if (dateStr.length === 8) {
        return new Date(
          parseInt(dateStr.slice(0, 4)),
          parseInt(dateStr.slice(4, 6)) - 1,
          parseInt(dateStr.slice(6, 8))
        ).toISOString();
      }
      const y = parseInt(dateStr.slice(0, 4));
      const m = parseInt(dateStr.slice(4, 6)) - 1;
      const d = parseInt(dateStr.slice(6, 8));
      const h = parseInt(dateStr.slice(9, 11)) || 0;
      const min = parseInt(dateStr.slice(11, 13)) || 0;
      const s = parseInt(dateStr.slice(13, 15)) || 0;

      if (dateStr.endsWith("Z")) {
        return new Date(Date.UTC(y, m, d, h, min, s)).toISOString();
      }
      return new Date(y, m, d, h, min, s).toISOString();
    };

    const isAllDay = !dtstart.includes("T") &&
      (dtstart.split(":").pop()?.length === 8 || dtstart.length === 8);

    events.push({
      subject: summary,
      start: parseIcsDate(dtstart),
      end: parseIcsDate(dtend),
      isAllDay,
      location: location || undefined,
    });
  }

  return events;
}

async function refreshMicrosoftToken(refreshToken: string) {
  const res = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID!,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
      scope: "https://graph.microsoft.com/Calendars.Read offline_access",
    }),
  });
  return res.json();
}

async function ensureStorageBuckets() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;
  try {
    const admin = createClient(url, key);
    const { data: buckets } = await admin.storage.listBuckets();
    const existingNames = new Set(buckets?.map((b: any) => b.name) || []);

    const required = [
      { name: "couple-photos", opts: { public: true, allowedMimeTypes: ["image/*"], fileSizeLimit: 10485760 } },
      { name: "chat-images", opts: { public: true, allowedMimeTypes: ["image/*"], fileSizeLimit: 10485760 } },
      { name: "voice-notes", opts: { public: true, allowedMimeTypes: ["audio/*"], fileSizeLimit: 10485760 } },
    ];

    for (const { name, opts } of required) {
      if (!existingNames.has(name)) {
        const { error } = await admin.storage.createBucket(name, opts);
        if (error) {
          console.warn(`Could not create ${name} bucket:`, error.message);
        } else {
          console.log(`Created ${name} storage bucket`);
        }
      } else {
        await admin.storage.updateBucket(name, opts);
      }
    }
  } catch (e: any) {
    console.warn("Storage bucket check failed:", e.message);
  }
}

export async function registerRoutes(app: Express): Promise<void> {
  await initSpotifyTokens();
  ensureStorageBuckets();

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/upload-photo", express.raw({ type: "image/*", limit: "10mb" }), async (req: Request, res: Response) => {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_URL || !SUPABASE_KEY) return res.status(500).json({ error: "Supabase not configured" });

    const userId = req.headers["x-user-id"] as string;
    if (!userId) return res.status(400).json({ error: "Missing user ID" });

    const bucket = (req.headers["x-bucket"] as string) || "couple-photos";
    const contentType = req.headers["content-type"] || "image/jpeg";
    const ext = contentType.split("/")[1]?.split("+")[0] || "jpg";
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
    const caption = (req.headers["x-caption"] as string) || "";

    try {
      const admin = createClient(SUPABASE_URL, SUPABASE_KEY);
      const { error: uploadError } = await admin.storage
        .from(bucket)
        .upload(path, req.body, { contentType, upsert: false });

      if (uploadError) {
        console.error("Photo upload storage error:", uploadError.message);
        return res.status(500).json({ error: uploadError.message });
      }

      if (bucket === "couple-photos") {
        const insertPayload: any = { user_id: userId, storage_path: path };
        if (caption) insertPayload.caption = caption;
        const { error: dbError } = await admin.from("couple_photos").insert(insertPayload);
        if (dbError) {
          console.error("Photo upload DB error:", dbError.message);
          return res.status(500).json({ error: dbError.message });
        }
      }

      const { data: urlData } = admin.storage.from(bucket).getPublicUrl(path);
      res.json({ success: true, path, publicUrl: urlData.publicUrl });
    } catch (e: any) {
      console.error("Photo upload error:", e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // 1. GET /api/search-gifs
  app.get("/api/search-gifs", async (req: Request, res: Response) => {
    const GIPHY_API_KEY = process.env.GIPHY_API_KEY;
    if (!GIPHY_API_KEY) {
      return res.status(500).json({ error: "GIPHY_API_KEY not configured" });
    }

    const q = (req.query.q as string) || "";
    const offset = (req.query.offset as string) || "0";

    try {
      const endpoint = q
        ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(q)}&limit=20&offset=${offset}&rating=pg-13`
        : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=20&offset=${offset}&rating=pg-13`;

      const giphyRes = await fetch(endpoint);
      const data = await giphyRes.json();

      if (!giphyRes.ok) {
        throw new Error(`GIPHY API error [${giphyRes.status}]: ${JSON.stringify(data)}`);
      }

      const gifs = (data.data || []).map((g: any) => ({
        id: g.id,
        title: g.title,
        url: g.images.fixed_height.url,
        preview: g.images.fixed_height_small.url || g.images.preview_gif?.url || g.images.fixed_height.url,
        width: parseInt(g.images.fixed_height.width),
        height: parseInt(g.images.fixed_height.height),
      }));

      res.json({ gifs });
    } catch (error: any) {
      console.error("GIF search error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // VAPID public key endpoint for web push
  app.get("/api/vapid-public-key", (_req: Request, res: Response) => {
    const key = process.env.VAPID_PUBLIC_KEY;
    if (!key) return res.status(500).json({ error: "VAPID not configured" });
    res.json({ publicKey: key });
  });

  // Web push subscription registration
  app.post("/api/web-push-subscribe", async (req: Request, res: Response) => {
    try {
      const { userId, subscription } = req.body;
      if (!userId || !subscription) {
        return res.status(400).json({ error: "userId and subscription required" });
      }

      const supabaseUrl = process.env.SUPABASE_URL!;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const token = JSON.stringify(subscription);

      await supabase.from("device_tokens").upsert(
        {
          user_id: userId,
          token,
          platform: "web",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,token" }
      );

      res.json({ success: true });
    } catch (error: any) {
      console.error("Web push subscribe error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // 2. POST /api/send-push-notification
  app.post("/api/send-push-notification", async (req: Request, res: Response) => {
    try {
      const supabaseUrl = process.env.SUPABASE_URL!;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { recipientUserId, title, body, data: rawData } = req.body;
      const data = rawData ? Object.fromEntries(Object.entries(rawData).map(([k, v]) => [k, String(v)])) : undefined;

      if (!recipientUserId || !title) {
        return res.status(400).json({ error: "recipientUserId and title are required" });
      }

      const [{ data: tokens, error: tokenError }, { count: unreadCount }] = await Promise.all([
        supabase
          .from("device_tokens")
          .select("token, platform")
          .eq("user_id", recipientUserId),
        supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("receiver_id", recipientUserId)
          .eq("read", false)
          .neq("message_type", "vibe"),
      ]);

      const badgeCount = (unreadCount || 0) + 1;

      if (tokenError) {
        throw new Error(`Failed to fetch tokens: ${tokenError.message}`);
      }

      if (!tokens || tokens.length === 0) {
        return res.json({ success: true, sent: 0, reason: "no_tokens" });
      }

      const webTokens = tokens.filter(t => t.platform === "web");
      const nativeTokens = tokens.filter(t => t.platform !== "web");

      const allResults: PromiseSettledResult<any>[] = [];

      // Send to web push subscriptions
      if (webTokens.length > 0) {
        const vapidPublic = process.env.VAPID_PUBLIC_KEY;
        const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
        if (vapidPublic && vapidPrivate) {
          webpush.setVapidDetails("mailto:app@us-app.com", vapidPublic, vapidPrivate);

          const webResults = await Promise.allSettled(
            webTokens.map(async ({ token }) => {
              try {
                const subscription = JSON.parse(token);
                await webpush.sendNotification(
                  subscription,
                  JSON.stringify({ title, body: body || "", data: data || {}, badge: badgeCount })
                );
                return { success: true };
              } catch (err: any) {
                if (err.statusCode === 410 || err.statusCode === 404) {
                  await supabase.from("device_tokens").delete().eq("token", token);
                }
                throw err;
              }
            })
          );
          allResults.push(...webResults);
        }
      }

      // Send to native FCM tokens
      if (nativeTokens.length > 0) {
        const serviceAccountJson = process.env.FCM_SERVICE_ACCOUNT;
        if (serviceAccountJson) {
          const serviceAccount = JSON.parse(serviceAccountJson);
          const projectId = serviceAccount.project_id;
          const accessToken = await getAccessToken(serviceAccount);
          const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

          const nativeResults = await Promise.allSettled(
            nativeTokens.map(async ({ token }) => {
              const fcmRes = await fetch(fcmUrl, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  message: {
                    token,
                    notification: { title, body: body || "" },
                    data: data || {},
                    apns: { payload: { aps: { sound: "default", badge: badgeCount } } },
                    android: { priority: "HIGH", notification: { sound: "default" } },
                  },
                }),
              });

              const result = await fcmRes.json();

              if (result.error?.details?.some((d: any) =>
                d.errorCode === "UNREGISTERED" || d.errorCode === "NOT_FOUND"
              )) {
                await supabase.from("device_tokens").delete().eq("token", token);
              }

              return result;
            })
          );
          allResults.push(...nativeResults);
        }
      }

      const sent = allResults.filter((r) => r.status === "fulfilled").length;
      res.json({ success: true, sent });
    } catch (error: any) {
      console.error("Push notification error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // 3. POST /api/instagram-oembed
  app.post("/api/instagram-oembed", async (req: Request, res: Response) => {
    try {
      const { url } = req.body;
      if (!url || !url.includes("instagram.com")) {
        return res.status(400).json({ error: "Invalid Instagram URL" });
      }

      const accessToken = process.env.META_APP_TOKEN;
      if (!accessToken) {
        return res.status(500).json({ error: "META_APP_TOKEN not configured" });
      }

      const oembedUrl = `https://graph.facebook.com/v22.0/instagram_oembed?url=${encodeURIComponent(url)}&access_token=${encodeURIComponent(accessToken)}&omitscript=true&maxwidth=400`;
      const resp = await fetch(oembedUrl);

      if (resp.ok) {
        const data = await resp.json();
        return res.json({
          title: data.title || data.author_name || null,
          author: data.author_name || null,
          thumbnail_url: data.thumbnail_url || null,
          html: data.html || null,
          type: data.type || "rich",
        });
      }

      const errorBody = await resp.text();
      console.error("oEmbed API error:", resp.status, errorBody);
      res.json({
        title: null,
        author: null,
        thumbnail_url: null,
        html: null,
        type: "link",
        fallback: true,
      });
    } catch (err: any) {
      console.error("oEmbed error:", err);
      res.status(500).json({ error: "Failed to fetch embed data" });
    }
  });

  // 4. POST /api/fetch-substack-feed
  app.post("/api/fetch-substack-feed", async (req: Request, res: Response) => {
    try {
      const { newsletters } = req.body;
      if (!newsletters || !Array.isArray(newsletters) || newsletters.length === 0) {
        return res.status(400).json({ success: false, error: "newsletters array required" });
      }

      const slugs = newsletters.slice(0, 5).map((n: string) =>
        n.trim().toLowerCase().replace(/^@/, "").replace(/\.substack\.com.*/, "")
      );

      const allItems: (FeedItem & { newsletter: string })[] = [];

      for (const slug of slugs) {
        try {
          const feedRes = await fetch(`https://${slug}.substack.com/feed`, {
            headers: { "User-Agent": "LovableApp/1.0" },
          });
          if (!feedRes.ok) continue;
          const xml = await feedRes.text();
          const items = extractItems(xml).slice(0, 3);
          items.forEach((item) => allItems.push({ ...item, newsletter: slug }));
        } catch {
          // Skip failed feeds
        }
      }

      allItems.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
      res.json({ success: true, items: allItems.slice(0, 8) });
    } catch (error: any) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ success: false, error: msg });
    }
  });

  // 5. POST /api/send-password-reset
  app.post("/api/send-password-reset", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      const supabaseAdmin = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const redirectTo = process.env.SITE_URL
        ? `${process.env.SITE_URL}/reset-password`
        : "https://mindmeld-platform.lovable.app/reset-password";

      const { data, error } = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo },
      });

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      res.json({ success: true, resetError: resetError?.message });
    } catch (error: any) {
      console.error("Password reset error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // 6. POST /api/generate-feed-content
  app.post("/api/generate-feed-content", async (req: Request, res: Response) => {
    try {
      const { type, description } = req.body;
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
  "tag": "display tag like Quiz, Prompt, Tip, Challenge, Gratitude, Read \u00B7 Wellness",
  "tag_color": "one of: text-us-gold, text-us-coral, text-us-sage, text-muted-foreground"
}`;

      const userPrompt = description
        ? `Create a "${contentType}" feed item about: ${description}`
        : `Create an engaging "${contentType}" feed item for couples. Be creative and warm.`;

      const data = await callAI([
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ], undefined, undefined, req.body?.userId);

      const raw = data.choices?.[0]?.message?.content || "";
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Could not parse AI response as JSON");
      }

      const generated = JSON.parse(jsonMatch[0]);
      res.json(generated);
    } catch (error: any) {
      console.error("Error generating feed content:", error);
      res.status(error.status || 500).json({ error: error.message || "Failed to generate content" });
    }
  });

  // 7. GET /api/suggest-articles
  app.get("/api/suggest-articles", (_req: Request, res: Response) => {
    try {
      const shuffled = shuffle(REAL_ARTICLES);
      const categories = new Set<string>();
      const selected: typeof REAL_ARTICLES = [];

      for (const article of shuffled) {
        if (!categories.has(article.category) && selected.length < 7) {
          selected.push(article);
          categories.add(article.category);
        }
      }

      for (const article of shuffled) {
        if (selected.length >= 7) break;
        if (!selected.includes(article)) {
          selected.push(article);
        }
      }

      res.json({ articles: selected.slice(0, 7) });
    } catch (e) {
      console.error("suggest-articles error:", e);
      const fallback = shuffle(REAL_ARTICLES).slice(0, 7);
      res.json({ articles: fallback });
    }
  });

  // 7a-2. GET /api/article-metadata — fetch OG metadata for article URLs
  const ogCache = new Map<string, { ogImage: string; ogTitle: string; ogDescription: string; siteName: string; ts: number }>();

  app.get("/api/article-metadata", async (req: Request, res: Response) => {
    const url = req.query.url as string;
    if (!url) return res.status(400).json({ error: "url required" });

    const cached = ogCache.get(url);
    if (cached && Date.now() - cached.ts < 86400000) {
      return res.json(cached);
    }

    try {
      const resp = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; UsApp/1.0)" },
        signal: AbortSignal.timeout(8000),
      });
      if (!resp.ok) return res.json({ ogImage: "", ogTitle: "", ogDescription: "", siteName: "" });

      const html = await resp.text();

      const getMetaContent = (property: string): string => {
        const patterns = [
          new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']+)["']`, "i"),
          new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*property=["']${property}["']`, "i"),
          new RegExp(`<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']+)["']`, "i"),
          new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*name=["']${property}["']`, "i"),
        ];
        for (const p of patterns) {
          const m = html.match(p);
          if (m?.[1]) return m[1];
        }
        return "";
      };

      const result = {
        ogImage: getMetaContent("og:image") || getMetaContent("twitter:image"),
        ogTitle: getMetaContent("og:title") || html.match(/<title[^>]*>([^<]+)</i)?.[1]?.trim() || "",
        ogDescription: getMetaContent("og:description") || getMetaContent("description"),
        siteName: getMetaContent("og:site_name") || "",
        ts: Date.now(),
      };

      ogCache.set(url, result);
      res.json(result);
    } catch (e) {
      console.error("article-metadata error:", e);
      res.json({ ogImage: "", ogTitle: "", ogDescription: "", siteName: "" });
    }
  });

  // 7a-3. GET /api/article-content — extract readable article content
  app.get("/api/article-content", async (req: Request, res: Response) => {
    const url = req.query.url as string;
    if (!url) return res.status(400).json({ error: "url required" });

    try {
      const resp = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; UsApp/1.0)" },
        signal: AbortSignal.timeout(10000),
      });
      if (!resp.ok) return res.status(502).json({ error: "Failed to fetch article" });

      const html = await resp.text();

      const getMetaContent = (property: string): string => {
        const patterns = [
          new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']+)["']`, "i"),
          new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*property=["']${property}["']`, "i"),
          new RegExp(`<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']+)["']`, "i"),
        ];
        for (const p of patterns) {
          const m = html.match(p);
          if (m?.[1]) return m[1];
        }
        return "";
      };

      const ogImage = getMetaContent("og:image") || getMetaContent("twitter:image");
      const ogTitle = getMetaContent("og:title") || html.match(/<title[^>]*>([^<]+)</i)?.[1]?.trim() || "";
      const siteName = getMetaContent("og:site_name") || new URL(url).hostname.replace("www.", "");
      const author = getMetaContent("author") || getMetaContent("article:author") || "";

      let bodyHtml = html;
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
      if (bodyMatch) bodyHtml = bodyMatch[1];

      bodyHtml = bodyHtml.replace(/<script[\s\S]*?<\/script>/gi, "");
      bodyHtml = bodyHtml.replace(/<style[\s\S]*?<\/style>/gi, "");
      bodyHtml = bodyHtml.replace(/<nav[\s\S]*?<\/nav>/gi, "");
      bodyHtml = bodyHtml.replace(/<footer[\s\S]*?<\/footer>/gi, "");
      bodyHtml = bodyHtml.replace(/<header[\s\S]*?<\/header>/gi, "");
      bodyHtml = bodyHtml.replace(/<aside[\s\S]*?<\/aside>/gi, "");
      bodyHtml = bodyHtml.replace(/<form[\s\S]*?<\/form>/gi, "");
      bodyHtml = bodyHtml.replace(/<iframe[\s\S]*?<\/iframe>/gi, "");
      bodyHtml = bodyHtml.replace(/<button[\s\S]*?<\/button>/gi, "");
      bodyHtml = bodyHtml.replace(/<!--[\s\S]*?-->/g, "");

      const blocks: string[] = [];
      const tagRx = /<(p|h[1-6]|blockquote|li)[\s>][^]*?<\/\1>/gi;
      let m;
      while ((m = tagRx.exec(bodyHtml)) !== null) {
        let block = m[0];
        block = block.replace(/<(?!\/?(?:p|h[1-6]|blockquote|ul|ol|li|strong|em|b|i|br|img)\b)[^>]+>/gi, "");
        block = block.replace(/<img[^>]*src=["']([^"']+)["'][^>]*alt=["']([^"']*?)["'][^>]*\/?>/gi, (_, src, alt) => {
          let imgSrc = src;
          if (imgSrc.startsWith("/")) { try { imgSrc = new URL(imgSrc, url).href; } catch {} }
          return `<img src="${imgSrc}" alt="${alt}" />`;
        });
        block = block.replace(/<img[^>]*src=["']([^"']+)["'][^>]*\/?>/gi, (_, src) => {
          let imgSrc = src;
          if (imgSrc.startsWith("/")) { try { imgSrc = new URL(imgSrc, url).href; } catch {} }
          return `<img src="${imgSrc}" alt="" />`;
        });
        const text = block.replace(/<[^>]+>/g, "").trim();
        if (text.length > 25) blocks.push(block);
      }

      let cleanText = blocks.join("\n");

      res.json({
        title: ogTitle,
        image: ogImage,
        siteName,
        author,
        content: cleanText.substring(0, 50000),
        url,
      });
    } catch (e) {
      console.error("article-content error:", e);
      res.status(502).json({ error: "Failed to extract article content" });
    }
  });

  // 7b. GET /api/curated-podcasts
  const podcastArtworkCache = new Map<string, { url: string; ts: number }>();
  async function enrichPodcastArtwork(podcasts: typeof CURATED_PODCASTS) {
    const enriched = await Promise.all(podcasts.map(async (p) => {
      if (p.imageUrl) return p;
      const cached = podcastArtworkCache.get(p.appleId);
      if (cached && Date.now() - cached.ts < 7 * 24 * 60 * 60 * 1000) {
        return { ...p, imageUrl: cached.url };
      }
      try {
        const resp = await fetch(`https://itunes.apple.com/lookup?id=${p.appleId}&entity=podcast`);
        const data = await resp.json() as any;
        const artwork = data.results?.[0]?.artworkUrl600 || data.results?.[0]?.artworkUrl100 || "";
        if (artwork) podcastArtworkCache.set(p.appleId, { url: artwork, ts: Date.now() });
        return { ...p, imageUrl: artwork };
      } catch {
        return p;
      }
    }));
    return enriched;
  }
  app.get("/api/curated-podcasts", async (_req: Request, res: Response) => {
    try {
      const enriched = await enrichPodcastArtwork(CURATED_PODCASTS);
      res.json({ podcasts: shuffle(enriched).slice(0, 6) });
    } catch (e) {
      console.error("curated-podcasts error:", e);
      res.json({ podcasts: CURATED_PODCASTS.slice(0, 6) });
    }
  });

  // 7c. GET /api/curated-videos
  app.get("/api/curated-videos", (_req: Request, res: Response) => {
    try {
      res.json({ videos: shuffle(CURATED_VIDEOS).slice(0, 6) });
    } catch (e) {
      console.error("curated-videos error:", e);
      res.json({ videos: CURATED_VIDEOS.slice(0, 6) });
    }
  });

  // 7d. GET /api/curated-quotes
  app.get("/api/curated-quotes", (_req: Request, res: Response) => {
    try {
      res.json({ quotes: shuffle(CURATED_QUOTES).slice(0, 5) });
    } catch (e) {
      console.error("curated-quotes error:", e);
      res.json({ quotes: CURATED_QUOTES.slice(0, 5) });
    }
  });

  // 8. POST /api/suggest-dreams
  app.post("/api/suggest-dreams", async (req: Request, res: Response) => {
    try {
      const { existingDreams = [], existingLists = [] } = req.body;

      const context = existingLists.length > 0
        ? `The couple already has these lists/interests: ${existingLists.join(", ")}. `
        : "";
      const existing = existingDreams.length > 0
        ? `They already have these dreams: ${existingDreams.join(", ")}. Suggest different ones.`
        : "";

      const data = await callAI(
        [
          {
            role: "system",
            content: "You are a relationship coach helping a couple identify their top long-term dreams together. Return exactly 5 inspiring, specific, actionable couple dreams. Mix practical life goals with aspirational experiences.",
          },
          {
            role: "user",
            content: `Suggest 5 long-term dreams for a couple. ${context}${existing}`,
          },
        ],
        [
          {
            type: "function",
            function: {
              name: "suggest_dreams",
              description: "Return exactly 5 long-term couple dream suggestions",
              parameters: {
                type: "object",
                properties: {
                  dreams: {
                    type: "array",
                    items: { type: "object", properties: { text: { type: "string" } }, required: ["text"] },
                    minItems: 5,
                    maxItems: 5,
                  },
                },
                required: ["dreams"],
                additionalProperties: false,
              },
            },
          },
        ],
        { type: "function", function: { name: "suggest_dreams" } },
        req.body?.userId
      );

      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) throw new Error("No tool call in response");

      const parsed = JSON.parse(toolCall.function.arguments);
      res.json(parsed);
    } catch (e: any) {
      console.error("suggest-dreams error:", e);
      res.status(e.status || 500).json({ error: e instanceof Error ? e.message : "Unknown error" });
    }
  });

  // 9. POST /api/suggest-experiences
  app.post("/api/suggest-experiences", async (req: Request, res: Response) => {
    try {
      try { req.body; } catch {}

      const data = await callAI(
        [
          {
            role: "system",
            content: `You are a date night gift recommender for couples. Suggest 4 romantic date night experience gifts or vouchers available on Amazon UK (gift vouchers, experience boxes, date night kits, spa day gift sets, cocktail kits, restaurant voucher cards, cooking class kits, cinema gift sets).
You MUST suggest REAL, SPECIFIC products that actually exist on Amazon UK. Use the exact brand name and full product title.
For asin: provide the real Amazon UK ASIN (the 10-character code starting with B, e.g. "B07MX6212N"). This MUST be a real ASIN for the exact product. If you are not sure of the ASIN, leave it empty.
Keep descriptions under 60 chars.`,
          },
          {
            role: "user",
            content: `Suggest 4 romantic date night experience gifts or vouchers for couples on Amazon UK. Varied mix (spa, dining, cocktails, adventure). Return only valid JSON.`,
          },
        ],
        [
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
                        asin: { type: "string", description: "Amazon UK ASIN (10-char code starting with B)" },
                        duration: { type: "string" },
                      },
                      required: ["name", "venue", "price", "description", "category", "emoji", "city", "asin", "duration"],
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
        { type: "function", function: { name: "suggest_experiences" } },
        req.body?.userId
      );

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

      if (!experiences || experiences.length === 0) {
        experiences = [
          { name: "Buyagift Spa Day for Two Gift Experience", venue: "Amazon UK", price: "\u00A349.99", description: "Luxury couples spa day voucher", category: "Spa", emoji: "\u{1F6C1}", city: "UK", asin: "B00HROQKRC", duration: "Full day" },
          { name: "VonShef Cocktail Making Set Parisian", venue: "Amazon UK", price: "\u00A329.99", description: "Make craft cocktails together at home", category: "Class", emoji: "\u{1F379}", city: "UK", asin: "B07MX6212N", duration: "2 hours" },
          { name: "Buyagift Dinner for Two Gift Experience", venue: "Amazon UK", price: "\u00A349.99", description: "Voucher for a luxury couples dinner", category: "Restaurant", emoji: "\u{1F37D}\uFE0F", city: "UK", asin: "B00HROQK7A", duration: "3 hours" },
          { name: "Virgin Experience Days Adventure for Two", venue: "Amazon UK", price: "\u00A359.99", description: "Thrilling couples adventure day out", category: "Activity", emoji: "\u{1F3AF}", city: "UK", asin: "B07WGJLZ8T", duration: "Full day" },
        ];
      }

      experiences = experiences.map((e: any) => ({
        ...e,
        bookingUrl: buildAmazonUrl(e.name),
      }));

      res.json({ experiences });
    } catch (e: any) {
      console.error("suggest-experiences error:", e);
      res.status(e.status || 500).json({ error: e instanceof Error ? e.message : "Unknown error" });
    }
  });

  // 10. POST /api/suggest-family-tasks
  app.post("/api/suggest-family-tasks", async (req: Request, res: Response) => {
    try {
      const { parents = [], children = [], categories = [] } = req.body;

      const familyDesc = [
        ...parents.map((p: { name: string }) => `${p.name} (parent)`),
        ...children.map((c: { name: string; age: string }) => `${c.name} (child, age ${c.age || "unknown"})`),
      ].join(", ");

      const data = await callAI(
        [
          {
            role: "system",
            content: `You are a family organiser helping a couple manage their family tasks. Generate practical, specific, actionable to-do items for each category requested. For per-child tasks, create items specific to each child's name and age (e.g. school-related for older kids, developmental for toddlers). Keep items concise (under 12 words). Generate 2-4 items per category, more for "Per-child tasks" (2-3 per child).`,
          },
          {
            role: "user",
            content: `Family members: ${familyDesc}. Generate tasks for these categories: ${categories.join(", ")}`,
          },
        ],
        [
          {
            type: "function",
            function: {
              name: "generate_family_tasks",
              description: "Return categorised family tasks",
              parameters: {
                type: "object",
                properties: {
                  categories: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        category: { type: "string", description: "Category name, for children use their name as category" },
                        tasks: { type: "array", items: { type: "string" } },
                      },
                      required: ["category", "tasks"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["categories"],
                additionalProperties: false,
              },
            },
          },
        ],
        { type: "function", function: { name: "generate_family_tasks" } },
        req.body?.userId
      );

      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) throw new Error("No tool call in response");

      const parsed = JSON.parse(toolCall.function.arguments);
      res.json(parsed);
    } catch (e: any) {
      console.error("suggest-family-tasks error:", e);
      res.status(e.status || 500).json({ error: e instanceof Error ? e.message : "Unknown error" });
    }
  });

  // 11. POST /api/suggest-intimacy
  app.post("/api/suggest-intimacy", async (req: Request, res: Response) => {
    try {
      try { req.body; } catch {}

      const data = await callAI(
        [
          {
            role: "system",
            content: `You are a product recommender for a couples wellness app. Suggest 2 romantic and intimate products available on Amazon UK.
Include: couples card games, bath sets, massage oils, scented candles, vibrators, sensual gift sets.
Use exact brand names and real product titles. Keep descriptions under 60 chars. Leave productUrl empty.`,
          },
          {
            role: "user",
            content: `Suggest 2 couples intimate/romantic products from Amazon UK. Mix categories (e.g. one game/accessory and one wellness/sensual item).`,
          },
        ],
        [
          {
            type: "function",
            function: {
              name: "suggest_intimacy",
              description: "Return 2 couples intimacy product suggestions from Amazon UK",
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
                        category: { type: "string", enum: ["Massage", "Candles", "Games", "Lingerie", "Bath", "Toys", "Accessories", "Vibrators", "Bondage"] },
                        emoji: { type: "string" },
                        productUrl: { type: "string", description: "Full product URL for Coco de Mer items (e.g. https://www.coco-de-mer.com/products/...). Leave empty for Amazon products." },
                        imageSearchTerm: { type: "string" },
                      },
                      required: ["name", "brand", "price", "description", "category", "emoji", "productUrl", "imageSearchTerm"],
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
        { type: "function", function: { name: "suggest_intimacy" } },
        req.body?.userId
      );

      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      let aiProducts: any[] = [];
      if (toolCall?.function?.arguments) {
        aiProducts = JSON.parse(toolCall.function.arguments).products || [];
      }

      const cdmPicks = shuffle(LUXURY_INTIMACY_PRODUCTS).slice(0, 2);
      let amazonItems = aiProducts.filter((p: any) => !p.productUrl?.includes("coco-de-mer.com") && !p.productUrl?.includes("agentprovocateur.com") && !p.productUrl?.includes("goop.com")).slice(0, 2);
      if (amazonItems.length < 2) {
        amazonItems = [
          ...amazonItems,
          { name: "Couples Intimacy Card Game", brand: "Lovehoney", price: "\u00A314.99", description: "50 fun dares and questions for couples", category: "Games", emoji: "\u{1F0CF}", imageSearchTerm: "couples intimacy card game" },
          { name: "Couples Massage Candle", brand: "Jimmyjane", price: "\u00A328.00", description: "Melts into warm massage oil", category: "Candles", emoji: "\u{1F56F}\uFE0F", imageSearchTerm: "massage candle couples" },
        ].slice(0, 2 - amazonItems.length);
      }
      const mixed = shuffle([...cdmPicks, ...amazonItems]);

      const enriched = await Promise.all(mixed.map(async (p: any) => {
        const searchTerm = p.imageSearchTerm || `${p.name} ${p.brand}`;
        const imageUrl = await fetchAmazonProductImage(searchTerm);
        const isLuxuryBrand = p.productUrl && (p.productUrl.includes("coco-de-mer.com") || p.productUrl.includes("agentprovocateur.com") || p.productUrl.includes("goop.com") || p.productUrl.includes("sophieolivia") || p.productUrl.includes("spacenk.com") || p.productUrl.includes("lelo.com") || p.productUrl.includes("lovehoney.co.uk"));
        const url = isLuxuryBrand ? p.productUrl : buildAmazonUrl(p.name);
        return { ...p, productUrl: url, affiliateTag: AMAZON_TAG, imageUrl };
      }));

      res.json({ products: enriched });
    } catch (e: any) {
      console.error("suggest-intimacy error:", e);
      res.json({ products: FALLBACK_PRODUCTS });
    }
  });

  // 12. POST /api/suggest-products
  app.post("/api/suggest-products", async (req: Request, res: Response) => {
    try {
      const { category } = req.body || { category: "general" };

      const data = await callAI(
        [
          {
            role: "system",
            content: `You are a product recommendation engine for a couples/relationship app.
Suggest 4 SPECIFIC, REAL products that actually exist on Amazon UK. Use exact product names and real brands.
For asin: provide the real Amazon UK ASIN (10-character code starting with B, e.g. "B07MX6212N"). This MUST be a real ASIN. If unsure, leave empty.
Use realistic GBP prices, short descriptions (max 60 chars).
For imageKeyword: provide a single concrete noun for an Unsplash photo (e.g. "candles", "wine", "map", "massage oil", "board game").
Category must be one of: Date Night, Wellness, Travel, Intimacy, Experiences, Games, Home, Books, Stationery, Dining.`,
          },
          {
            role: "user",
            content: `Suggest 4 specific real Amazon UK products for couples. Category hint: ${category}. Use real brand names and full product titles. Make them varied and gift-worthy.`,
          },
        ],
        [
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
                        asin: { type: "string", description: "Amazon UK ASIN (10-char code starting with B)" },
                        imageKeyword: { type: "string", description: "Simple noun/phrase for Unsplash photo" },
                      },
                      required: ["name", "brand", "price", "description", "category", "emoji", "asin", "imageKeyword"],
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
        { type: "function", function: { name: "suggest_products" } },
        req.body?.userId
      );

      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      let products;
      if (toolCall?.function?.arguments) {
        products = JSON.parse(toolCall.function.arguments).products;
      } else {
        throw new Error("No tool call response from AI");
      }

      const enriched = (products || []).map((p: any) => ({
        ...p,
        productUrl: buildAmazonUrl(p.name),
        affiliateTag: AMAZON_TAG,
      }));
      res.json({ products: enriched });
    } catch (e: any) {
      console.error("suggest-products error:", e);
      res.status(e.status || 500).json({ error: e instanceof Error ? e.message : "Unknown error" });
    }
  });

  // POST /api/shop/generate — In-app shop product catalog
  app.post("/api/shop/generate", async (req: Request, res: Response) => {
    try {
      const { category = "all" } = req.body || {};

      const categoryHint = category === "all"
        ? "Mix of categories: Date Night, Gifts, Wellness, Intimacy, Games, Home"
        : `Focus on: ${category}`;

      const data = await callAI(
        [
          {
            role: "system",
            content: `You are a premium product curator for a couples/relationship app shop.
Generate 6 SPECIFIC, REAL products that couples would love. Use exact product names and real brands you know exist.
Each product needs:
- name: Full product name (real product that exists)
- brand: Real brand name
- price: Realistic GBP price as string like "£29.99"
- description: Short one-line tagline (max 50 chars)
- longDescription: 2-3 sentences about why couples would love this product, what makes it special
- features: Array of 3-4 key highlights/features (short phrases)
- category: One of: Date Night, Gifts, Wellness, Intimacy, Games, Home
- emoji: Single relevant emoji
- imageKeyword: A descriptive 2-3 word search term for finding a relevant lifestyle/product photo (e.g. "massage candles romantic", "couples board game", "silk pajamas luxury")
- source: Where to buy - use "Amazon" for most products

Make products feel premium and gift-worthy. Include a mix of price points from £15-£150.
Products should be things couples would actually buy for each other or to enjoy together.`,
          },
          {
            role: "user",
            content: `Generate 6 premium product recommendations for couples. ${categoryHint}. Make them varied, real products from well-known brands.`,
          },
        ],
        [
          {
            type: "function",
            function: {
              name: "generate_shop_products",
              description: "Return 6 curated shop products for couples",
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
                        longDescription: { type: "string" },
                        features: { type: "array", items: { type: "string" } },
                        imageKeyword: { type: "string" },
                        source: { type: "string" },
                      },
                      required: ["name", "brand", "price", "description", "category", "emoji", "longDescription", "features", "imageKeyword", "source"],
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
        { type: "function", function: { name: "generate_shop_products" } },
        req.body?.userId
      );

      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      let rawProducts: any[] = [];
      if (toolCall?.function?.arguments) {
        rawProducts = JSON.parse(toolCall.function.arguments).products || [];
      }

      const imagePromises = rawProducts.map((p: any) =>
        searchPexelsImage(p.imageKeyword || p.name)
      );
      const images = await Promise.all(imagePromises);

      const enriched: any[] = rawProducts.map((p: any, i: number) => ({
        id: `shop-${category}-${Date.now()}-${i}`,
        name: p.name,
        brand: p.brand,
        price: p.price,
        description: p.description || "",
        longDescription: p.longDescription || p.description || "",
        features: p.features || [],
        category: p.category || "Gifts",
        emoji: p.emoji || "",
        imageKeyword: p.imageKeyword || p.name,
        imageUrl: images[i] || null,
        buyUrl: buildAmazonUrl(p.name),
        source: p.source || "Amazon",
      }));

      const catLower = category.toLowerCase();
      if (catLower.includes("intimacy") || catLower === "all" || catLower.includes("mix")) {
        const isIntimacy = catLower.includes("intimacy");
        const luxuryPick = shuffle(LUXURY_INTIMACY_PRODUCTS).slice(0, isIntimacy ? 2 : 1);
        const luxuryResolved = await Promise.all(
          luxuryPick.map(async (lp: any, i: number) => {
            const resolvedImage = await resolveProductImage(lp);
            return {
              id: `shop-luxury-${Date.now()}-${i}`,
              name: lp.name,
              brand: lp.brand,
              price: lp.price,
              description: lp.description,
              longDescription: lp.longDescription || lp.description,
              features: lp.features || [`By ${lp.brand}`, "Premium quality", "Perfect for couples"],
              category: normalizeShopCategory(lp.category || "Intimacy"),
              emoji: "",
              imageKeyword: lp.imageKeyword || `${lp.category} luxury couples`,
              imageUrl: resolvedImage,
              buyUrl: lp.productUrl,
              source: lp.brand,
            };
          })
        );
        enriched.push(...luxuryResolved);
      }

      res.json({ products: shuffle(enriched) });
    } catch (e: any) {
      console.error("shop/generate error:", e);
      // Return fallback products
      const fallback = await Promise.all(
        LUXURY_INTIMACY_PRODUCTS.slice(0, 4).map(async (lp, i) => {
          const resolvedImage = await resolveProductImage(lp);
          return {
            id: `shop-fallback-${i}`,
            name: lp.name,
            brand: lp.brand,
            price: lp.price,
            description: lp.description,
            longDescription: lp.longDescription || lp.description,
            features: lp.features || [`By ${lp.brand}`, "Premium quality"],
            category: normalizeShopCategory(lp.category),
            emoji: "",
            imageKeyword: lp.imageKeyword || `${lp.category} luxury`,
            imageUrl: resolvedImage,
            buyUrl: lp.productUrl,
            source: lp.brand,
          };
        })
      );
      res.json({ products: fallback });
    }
  });

  app.get("/api/shop/curated", async (_req: Request, res: Response) => {
    try {
      const products = await Promise.all(
        LUXURY_INTIMACY_PRODUCTS.map(async (lp: any, i: number) => {
          const resolvedImage = await resolveProductImage(lp);
          return {
            id: `curated-${i}`,
            name: lp.name,
            brand: lp.brand,
            price: lp.price,
            description: lp.description,
            longDescription: lp.longDescription || lp.description,
            features: lp.features || [`By ${lp.brand}`, "Premium quality", "Perfect for couples"],
            category: normalizeShopCategory(lp.category),
            imageKeyword: lp.imageKeyword || `${lp.category} luxury couples`,
            imageUrl: resolvedImage,
            buyUrl: lp.productUrl,
            source: lp.brand,
          };
        })
      );

      res.json({ products });
    } catch (e: any) {
      console.error("shop/curated error:", e);
      res.json({ products: [] });
    }
  });

  // 13. POST /api/suggest-tasks
  app.post("/api/suggest-tasks", async (req: Request, res: Response) => {
    try {
      const { existingItems = [], listName = "Daily To-Do" } = req.body;

      const existing = existingItems.length > 0
        ? `They already have these items: ${existingItems.join(", ")}. Suggest different ones that complement what they already have.`
        : "";

      const data = await callAI(
        [
          {
            role: "system",
            content: `You are a relationship coach helping a couple with their shared lists. Based on the list name and context, suggest relevant, meaningful items that strengthen their bond. Keep items short and actionable (under 12 words each). Match the tone and theme of the list \u2014 if it's about intimacy, suggest intimacy items; if it's about challenges, suggest challenge-related items; if it's about dreams, suggest aspirational dreams; if it's about communication, suggest communication practices. Be creative and specific, not generic.`,
          },
          {
            role: "user",
            content: `Suggest 5 items for a couple's "${listName}" list. ${existing}`,
          },
        ],
        [
          {
            type: "function",
            function: {
              name: "suggest_tasks",
              description: "Return exactly 5 list item suggestions relevant to the list theme",
              parameters: {
                type: "object",
                properties: {
                  tasks: {
                    type: "array",
                    items: { type: "object", properties: { text: { type: "string" } }, required: ["text"] },
                    minItems: 5,
                    maxItems: 5,
                  },
                },
                required: ["tasks"],
                additionalProperties: false,
              },
            },
          },
        ],
        { type: "function", function: { name: "suggest_tasks" } },
        req.body?.userId
      );

      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) throw new Error("No tool call in response");

      const parsed = JSON.parse(toolCall.function.arguments);
      res.json(parsed);
    } catch (e: any) {
      console.error("suggest-tasks error:", e);
      res.status(e.status || 500).json({ error: e instanceof Error ? e.message : "Unknown error" });
    }
  });

  // 14. POST /api/suggest-travel
  app.post("/api/suggest-travel", async (req: Request, res: Response) => {
    try {
      try { req.body; } catch {}

      const data = await callAI(
        [
          {
            role: "system",
            content: `You are a couples travel recommender. Suggest 4 romantic UK/Europe weekend getaways or travel experiences.
Mix city breaks (Paris, Rome, Edinburgh, Amsterdam), coastal retreats, countryside escapes, and spa weekends.
Include realistic price-per-couple estimates.
For bookingUrl use this exact format with the destination encoded: "https://www.booking.com/searchresults.html?ss=DESTINATION&aid=356980&affiliate_id=7540258"
Example: "https://www.booking.com/searchresults.html?ss=Paris%2C+France&aid=356980&affiliate_id=7540258"
Keep descriptions under 60 chars. Return valid JSON array only.`,
          },
          {
            role: "user",
            content: `Suggest 4 romantic couple travel getaways departing from the UK. Return only the JSON array.`,
          },
        ],
        [
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
        { type: "function", function: { name: "suggest_travel" } },
        req.body?.userId
      );

      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      let destinations;
      if (toolCall?.function?.arguments) {
        destinations = JSON.parse(toolCall.function.arguments).destinations;
      } else {
        const content = data.choices?.[0]?.message?.content || "[]";
        destinations = JSON.parse(content.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
      }

      res.json({ destinations });
    } catch (e: any) {
      console.error("suggest-travel error:", e);
      res.status(e.status || 500).json({ error: e instanceof Error ? e.message : "Unknown error" });
    }
  });

  // 15. GET /api/microsoft-auth-url
  app.get("/api/microsoft-auth-url", (req: Request, res: Response) => {
    try {
      const msClientId = process.env.MICROSOFT_CLIENT_ID;
      if (!msClientId) {
        return res.status(500).json({ error: "MICROSOFT_CLIENT_ID not configured" });
      }

      const redirectUri = (req.query.redirect_uri as string) || "";
      const scope = "https://graph.microsoft.com/Calendars.Read offline_access";

      const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
        `client_id=${encodeURIComponent(msClientId)}` +
        `&response_type=code` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&scope=${encodeURIComponent(scope)}` +
        `&response_mode=query`;

      res.json({ url: authUrl });
    } catch (err) {
      res.status(500).json({ error: "Failed to generate auth URL" });
    }
  });

  // 16. POST /api/microsoft-oauth-callback
  app.post("/api/microsoft-oauth-callback", async (req: Request, res: Response) => {
    try {
      const { code, redirect_uri } = req.body;
      if (!code) return res.status(400).json({ error: "Missing authorization code" });

      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: "Unauthorized" });

      const supabaseUser = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
      if (userError || !user) return res.status(401).json({ error: "Unauthorized" });

      const tokenRes = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.MICROSOFT_CLIENT_ID!,
          client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
          code,
          redirect_uri: redirect_uri || "",
          grant_type: "authorization_code",
          scope: "https://graph.microsoft.com/Calendars.Read offline_access",
        }),
      });

      const tokenData = await tokenRes.json();

      if (tokenData.error) {
        console.error("Microsoft token exchange error:", tokenData);
        return res.status(400).json({ error: tokenData.error_description || "Failed to exchange code" });
      }

      const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

      const { error: upsertError } = await admin.from("microsoft_tokens").upsert(
        {
          user_id: user.id,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

      if (upsertError) {
        console.error("Upsert error:", upsertError);
        return res.status(500).json({ error: "Failed to save tokens" });
      }

      res.json({ success: true });
    } catch (err: any) {
      console.error("OAuth callback error:", err);
      res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
    }
  });

  // 17. POST /api/sync-outlook-calendar
  app.post("/api/sync-outlook-calendar", async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: "Unauthorized" });

      const supabaseUser = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
      if (userError || !user) return res.status(401).json({ error: "Unauthorized" });

      const body = req.body || {};
      const mode = body.mode || "preview";

      const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

      const { data: tokenRow, error: tokenError } = await admin
        .from("microsoft_tokens")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (tokenError || !tokenRow) {
        return res.status(400).json({ error: "no_microsoft_token" });
      }

      let accessToken = tokenRow.access_token;
      const expiresAt = new Date(tokenRow.expires_at);

      if (expiresAt <= new Date()) {
        const refreshResult = await refreshMicrosoftToken(tokenRow.refresh_token);
        if (refreshResult.error) {
          return res.status(400).json({ error: "Failed to refresh Microsoft token. Please reconnect your account." });
        }
        accessToken = refreshResult.access_token;

        await admin.from("microsoft_tokens").update({
          access_token: refreshResult.access_token,
          refresh_token: refreshResult.refresh_token || tokenRow.refresh_token,
          expires_at: new Date(Date.now() + refreshResult.expires_in * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("user_id", user.id);
      }

      const normalizeKey = (subject: string, startTime: string, isAllDay: boolean) => {
        const s = subject.trim().toLowerCase();
        const t = isAllDay
          ? new Date(startTime).toISOString().slice(0, 10)
          : new Date(startTime).toISOString();
        return `${s}|${t}`;
      };

      if (mode === "import" && Array.isArray(body.events)) {
        const { data: profileData } = await admin
          .from("profiles")
          .select("partner_id")
          .eq("id", user.id)
          .maybeSingle();
        const partnerId = profileData?.partner_id || null;

        const rows = body.events.map((e: any) => ({
          user_id: user.id,
          subject: (e.subject || "Untitled").trim(),
          start_time: e.start_time,
          end_time: e.end_time,
          is_all_day: e.is_all_day || false,
          location: e.location || null,
          source: "outlook",
          partner_invited: !!e.partner_invited,
        }));

        const { data: existing } = await admin
          .from("calendar_events")
          .select("subject, start_time, is_all_day")
          .eq("user_id", user.id)
          .eq("source", "outlook");

        const existingSet = new Set(
          (existing || []).map((e: any) => normalizeKey(e.subject, e.start_time, e.is_all_day))
        );

        const newRows = rows.filter(
          (r: any) => !existingSet.has(normalizeKey(r.subject, r.start_time, r.is_all_day))
        );

        let insertedCount = 0;
        for (const row of newRows) {
          const { partner_invited, ...insertRow } = row;
          const { error: insertError } = await admin.from("calendar_events").insert(insertRow);
          if (!insertError) insertedCount++;

          if (partner_invited && partnerId) {
            const partnerRow = { ...insertRow, user_id: partnerId, source: "outlook-shared" };
            const { data: partnerExisting } = await admin
              .from("calendar_events")
              .select("id")
              .eq("user_id", partnerId)
              .eq("subject", partnerRow.subject)
              .eq("start_time", partnerRow.start_time)
              .maybeSingle();
            if (!partnerExisting) {
              await admin.from("calendar_events").insert(partnerRow);
            }
          }
        }

        return res.json({ success: true, count: insertedCount });
      }

      const now = new Date();
      const future = new Date(now.getTime() + 183 * 24 * 60 * 60 * 1000);

      const graphRes = await fetch(
        `https://graph.microsoft.com/v1.0/me/calendarview?startDateTime=${now.toISOString()}&endDateTime=${future.toISOString()}&$top=200&$orderby=start/dateTime&$select=subject,start,end,isAllDay,location,attendees`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!graphRes.ok) {
        const errBody = await graphRes.text();
        console.error("Graph API error:", errBody);
        return res.status(500).json({ error: "Failed to fetch Outlook calendar" });
      }

      const graphData = await graphRes.json();
      const outlookEvents = graphData.value || [];

      let partnerEmail: string | null = null;
      const { data: profileData } = await admin
        .from("profiles")
        .select("partner_id")
        .eq("id", user.id)
        .maybeSingle();

      if (profileData?.partner_id) {
        const { data: { users } } = await admin.auth.admin.listUsers();
        const partner = users?.find((u: any) => u.id === profileData.partner_id);
        if (partner?.email) partnerEmail = partner.email.toLowerCase();
      }

      const { data: existing } = await admin
        .from("calendar_events")
        .select("subject, start_time, is_all_day")
        .eq("user_id", user.id)
        .eq("source", "outlook");

      const existingSet = new Set(
        (existing || []).map((e: any) => normalizeKey(e.subject, e.start_time, e.is_all_day))
      );

      const events = outlookEvents.map((e: any) => {
        const startTime = e.start?.dateTime ? new Date(e.start.dateTime + "Z").toISOString() : now.toISOString();
        const endTime = e.end?.dateTime ? new Date(e.end.dateTime + "Z").toISOString() : now.toISOString();
        const isAllDay = e.isAllDay || false;
        const attendees = (e.attendees || []).map((a: any) => a.emailAddress?.address?.toLowerCase()).filter(Boolean);
        const partnerInvited = partnerEmail ? attendees.includes(partnerEmail) : false;
        const alreadyImported = existingSet.has(normalizeKey(e.subject || "Untitled", startTime, isAllDay));

        return {
          subject: (e.subject || "Untitled").trim(),
          start_time: startTime,
          end_time: endTime,
          is_all_day: e.isAllDay || false,
          location: e.location?.displayName || null,
          partner_invited: partnerInvited,
          already_imported: alreadyImported,
          attendees,
        };
      });

      res.json({ events, partner_email: partnerEmail ? "found" : null });
    } catch (err: any) {
      console.error("Outlook sync error:", err);
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  });

  // 18. POST /api/inbound-calendar
  app.post("/api/inbound-calendar", express.text({ type: "*/*" }), async (req: Request, res: Response) => {
    try {
      const token = req.query.token as string;

      if (!token) {
        return res.status(400).json({ error: "Missing token parameter" });
      }

      const adminClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      const { data: profileData, error: profileError } = await adminClient
        .from("profiles")
        .select("id")
        .eq("calendar_forward_token", token)
        .single();

      if (profileError || !profileData) {
        return res.status(401).json({ error: "Invalid forwarding token" });
      }

      const userId = profileData.id as string;
      const body = typeof req.body === "string" ? req.body : String(req.body);

      let icsContent = body;
      if (body.includes("BEGIN:VCALENDAR")) {
        const calStart = body.indexOf("BEGIN:VCALENDAR");
        const calEnd = body.indexOf("END:VCALENDAR");
        if (calStart !== -1 && calEnd !== -1) {
          icsContent = body.slice(calStart, calEnd + "END:VCALENDAR".length);
        }
      }

      if (!icsContent.includes("BEGIN:VEVENT")) {
        return res.status(400).json({ error: "No calendar events found in request" });
      }

      const events = parseIcs(icsContent);
      if (events.length === 0) {
        return res.status(400).json({ error: "Could not parse any events" });
      }

      const rows = events.map((e) => ({
        user_id: userId,
        subject: e.subject,
        start_time: e.start,
        end_time: e.end,
        is_all_day: e.isAllDay,
        location: e.location || null,
        source: "forwarded",
      }));

      const { error } = await adminClient.from("calendar_events").insert(rows);
      if (error) throw error;

      res.json({ success: true, count: events.length });
    } catch (err: any) {
      console.error("Inbound calendar error:", err);
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  });

  // ── Spotify routes ──

  function getSpotifyRedirectUri(req: Request): string {
    if (process.env.SPOTIFY_REDIRECT_URI) {
      return process.env.SPOTIFY_REDIRECT_URI;
    }
    const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
    const host = req.headers["x-forwarded-host"] || req.headers.host || req.hostname;
    const origin = `${protocol}://${host}`;
    return `${origin}/api/spotify/callback`;
  }

  app.get("/api/spotify/auth", (req: Request, res: Response) => {
    const redirectUri = getSpotifyRedirectUri(req);
    console.log("Spotify auth redirect_uri:", redirectUri);
    res.redirect(getSpotifyAuthUrl(redirectUri));
  });

  app.get("/api/spotify/callback", async (req: Request, res: Response) => {
    const code = req.query.code as string;
    const error = req.query.error as string;
    if (error) {
      return res.status(400).send(`Spotify auth error: ${error}`);
    }
    if (!code) {
      return res.status(400).send("Missing code parameter");
    }
    try {
      const redirectUri = getSpotifyRedirectUri(req);
      console.log("Spotify callback redirect_uri:", redirectUri);
      await exchangeSpotifyCode(code, redirectUri);
      res.send("<html><body><h2>Spotify connected!</h2><p>You can close this tab and go back to the app.</p><script>setTimeout(()=>window.close(),2000)</script></body></html>");
    } catch (e: any) {
      console.error("Spotify callback error:", e.message);
      res.status(500).send(`Spotify auth failed: ${e.message}`);
    }
  });

  app.get("/api/spotify/status", async (_req: Request, res: Response) => {
    res.json({ connected: await isSpotifyConnected() });
  });

  app.get("/api/spotify/now-playing", async (_req: Request, res: Response) => {
    try {
      const result = await spotifyRetry(async () => {
        const spotify = await getUncachableSpotifyClient();
        const playback = await spotify.player.getCurrentlyPlayingTrack();
        if (!playback || !playback.item) {
          return { playing: false };
        }
        const track = playback.item as any;
        return {
          playing: true,
          isPlaying: playback.is_playing,
          track: {
            id: track.id,
            name: track.name,
            artist: track.artists?.map((a: any) => a.name).join(", ") || "",
            album: track.album?.name || "",
            albumArt: track.album?.images?.[0]?.url || "",
            spotifyUrl: track.external_urls?.spotify || "",
            durationMs: track.duration_ms,
            progressMs: playback.progress_ms,
          },
        };
      });
      res.json(result);
    } catch (e: any) {
      console.error("Spotify now-playing error:", e.message);
      res.json({ playing: false, error: e.message });
    }
  });

  app.get("/api/spotify/search", async (req: Request, res: Response) => {
    try {
      const q = (req.query.q as string) || "";
      if (!q.trim()) return res.json({ tracks: [] });
      const tracks = await spotifyRetry(async () => {
        const spotify = await getUncachableSpotifyClient();
        const results = await spotify.search(q, ["track"], undefined, 10);
        return (results.tracks?.items || []).map((t: any) => ({
          id: t.id,
          uri: t.uri,
          name: t.name,
          artist: t.artists?.map((a: any) => a.name).join(", ") || "",
          album: t.album?.name || "",
          albumArt: t.album?.images?.[1]?.url || t.album?.images?.[0]?.url || "",
          spotifyUrl: t.external_urls?.spotify || "",
          previewUrl: t.preview_url || null,
          durationMs: t.duration_ms,
        }));
      });
      res.json({ tracks });
    } catch (e: any) {
      console.error("Spotify search error:", e.message);
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/spotify/playlist", async (req: Request, res: Response) => {
    try {
      const playlistId = req.query.playlistId as string;
      if (!playlistId) return res.status(400).json({ error: "playlistId required" });
      const playlist = await spotifyApiFetch(`/playlists/${playlistId}`);
      let trackItems: any[] = [];
      try {
        if (playlist.tracks?.items?.length > 0) {
          trackItems = playlist.tracks.items;
        } else {
          const tracksData = await spotifyApiFetch(`/playlists/${playlistId}/tracks?limit=100`);
          trackItems = tracksData?.items || [];
        }
      } catch (tracksErr: any) {
        console.warn("Could not fetch playlist tracks (may be restricted in dev mode):", tracksErr.message);
      }
      const tracks = trackItems.map((item: any) => {
        const t = item.track;
        return {
          id: t?.id,
          uri: t?.uri,
          name: t?.name,
          artist: t?.artists?.map((a: any) => a.name).join(", ") || "",
          album: t?.album?.name || "",
          albumArt: t?.album?.images?.[1]?.url || t?.album?.images?.[0]?.url || "",
          spotifyUrl: t?.external_urls?.spotify || "",
          addedAt: item.added_at,
          durationMs: t?.duration_ms,
        };
      });
      res.json({
        id: playlist.id,
        name: playlist.name,
        description: playlist.description,
        image: playlist.images?.[0]?.url || "",
        spotifyUrl: playlist.external_urls?.spotify || "",
        tracks,
        total: playlist.tracks?.total || tracks.length,
      });
    } catch (e: any) {
      console.error("Spotify playlist error:", e.message);
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/spotify/playlist/create", async (req: Request, res: Response) => {
    try {
      const { name, description } = req.body;
      const accessToken = await getSpotifyAccessToken();

      const meResp = await fetch("https://api.spotify.com/v1/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const me = await meResp.json();
      console.log("Spotify /me user id:", me.id, "product:", me.product);

      const createBody = JSON.stringify({
        name: name || "Us — Our Playlist",
        description: description || "Our shared couple playlist",
        public: false,
      });
      console.log("Spotify create playlist request:", `POST /users/${me.id}/playlists`, createBody);

      const createResp = await fetch(`https://api.spotify.com/v1/users/${me.id}/playlists`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: createBody,
      });

      const respText = await createResp.text();
      console.log("Spotify create playlist response:", createResp.status, createResp.headers.get("www-authenticate"), respText.substring(0, 500));

      if (!createResp.ok) {
        return res.status(createResp.status).json({ error: `Spotify API ${createResp.status}: ${respText}` });
      }

      const playlist = JSON.parse(respText);
      res.json({ id: playlist.id, name: playlist.name, spotifyUrl: playlist.external_urls?.spotify || "" });
    } catch (e: any) {
      console.error("Spotify create playlist error:", e.message);
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/spotify/playlist/add", async (req: Request, res: Response) => {
    try {
      const { playlistId, trackUri } = req.body;
      if (!playlistId || !trackUri) return res.status(400).json({ error: "playlistId and trackUri required" });
      const accessToken = await getSpotifyAccessToken();
      const resp = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ uris: [trackUri] }),
      });
      if (!resp.ok) {
        const errText = await resp.text();
        console.error("Spotify add track error:", resp.status, errText);
        return res.status(resp.status).json({ error: errText });
      }
      res.json({ success: true });
    } catch (e: any) {
      console.error("Spotify add track error:", e.message);
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/spotify/playlist/remove", async (req: Request, res: Response) => {
    try {
      const { playlistId, trackUri } = req.body;
      if (!playlistId || !trackUri) return res.status(400).json({ error: "playlistId and trackUri required" });
      const accessToken = await getSpotifyAccessToken();
      const resp = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ tracks: [{ uri: trackUri }] }),
      });
      if (!resp.ok) {
        const errText = await resp.text();
        console.error("Spotify remove track error:", resp.status, errText);
        return res.status(resp.status).json({ error: errText });
      }
      res.json({ success: true });
    } catch (e: any) {
      console.error("Spotify remove track error:", e.message);
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/spotify/recently-played", async (_req: Request, res: Response) => {
    try {
      const tracks = await spotifyRetry(async () => {
        const spotify = await getUncachableSpotifyClient();
        const recent = await spotify.player.getRecentlyPlayedTracks(10);
        return (recent.items || []).map((item: any) => {
          const t = item.track;
          return {
            id: t.id,
            name: t.name,
            artist: t.artists?.map((a: any) => a.name).join(", ") || "",
            album: t.album?.name || "",
            albumArt: t.album?.images?.[1]?.url || t.album?.images?.[0]?.url || "",
            spotifyUrl: t.external_urls?.spotify || "",
            playedAt: item.played_at,
          };
        });
      });
      res.json({ tracks });
    } catch (e: any) {
      console.error("Spotify recently-played error:", e.message);
      res.json({ tracks: [] });
    }
  });

  app.post("/api/ai-search", async (req: Request, res: Response) => {
    try {
      const { query, section } = req.body;
      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "query is required" });
      }

      const sectionContext = section === "discover"
        ? `You are a shopping & experience advisor for couples.
Return a JSON object with an "items" array of 4-6 results.
Each item MUST have: name (string), description (string, 1-2 sentences), category (string), emoji (string), type (one of "product","experience","travel").
For products also include: price (string like "£29.99"), brand (string), asin (the 10-character Amazon UK ASIN starting with B — must be real; leave empty if unsure).
For experiences also include: price (string), venue (string), city (string), duration (string), asin (Amazon UK ASIN if the experience is sold on Amazon, empty otherwise).
For travel also include: destination (string), country (string), price (string), duration (string).
Focus on items available to buy on Amazon UK or experiences in the UK. Use REAL product ASINs from Amazon UK.`
        : `You are a relationship media curator.
Return a JSON object with an "items" array of 4-6 results.
Each item MUST have: name (string), description (string, 1-2 sentences), category (string), emoji (string), type (one of "article","podcast","video","quote").
For articles include: url (a real, working URL to the article), source (string).
For podcasts include: applePodcastsName (string, the podcast show name to search on Apple Podcasts), host (string).
For videos include: youtubeSearchQuery (string to find it on YouTube), creator (string), duration (string).
For quotes include: text (the full quote text), author (string).
Focus on real, existing content about relationships, dating, couples, love, and communication.`;

      const messages = [
        { role: "system", content: `${sectionContext}\nOnly return valid JSON. No markdown, no code fences.` },
        { role: "user", content: query },
      ];

      const result = await callAI(messages, undefined, undefined, req.body?.userId);
      const content = result.choices?.[0]?.message?.content || "{}";
      const cleaned = content.replace(/```json?\n?/g, "").replace(/```/g, "").trim();

      let parsed;
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        return res.status(500).json({ error: "Failed to parse AI response" });
      }

      const items = (parsed.items || []).map((item: any) => {
        if ((item.type === "product" || item.type === "experience") && item.name) {
          item.amazonSearchUrl = buildAmazonUrl(item.name);
        }
        return item;
      });

      res.json({ items });
    } catch (e: any) {
      console.error("AI search error:", e.message);
      if (e.status === 429) return res.status(429).json({ error: "Rate limited, try again shortly" });
      res.status(500).json({ error: "AI search failed" });
    }
  });
}
