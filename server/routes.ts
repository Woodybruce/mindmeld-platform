import type { Express, Request, Response } from "express";
import express from "express";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import webpush from "web-push";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import { sql } from "drizzle-orm";
import { db } from "./db";
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

async function extractUserId(req: Request): Promise<string | undefined> {
  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith("Bearer ")) return undefined;
    const token = auth.slice(7);
    const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
    const { data: { user } } = await sb.auth.getUser(token);
    return user?.id;
  } catch { return undefined; }
}

async function requireAdmin(req: Request, res: Response): Promise<string | null> {
  const userId = await extractUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }
  try {
    const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data } = await sb.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (!data) {
      res.status(403).json({ error: "Admin access required" });
      return null;
    }
    return userId;
  } catch {
    res.status(500).json({ error: "Failed to verify permissions" });
    return null;
  }
}

async function callAI(messages: any[], tools?: any[], toolChoice?: any, userId?: string, options?: { model?: string; temperature?: number }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

  const finalMessages = [...messages];
  if (userId) {
    const prefs = await fetchUserContext(userId);
    if (prefs && finalMessages.length > 0 && finalMessages[0].role === "system") {
      finalMessages[0] = { ...finalMessages[0], content: injectPreferences(finalMessages[0].content, prefs) };
    }
  }

  const model = options?.model || process.env.AI_MODEL || "gpt-5.4";
  const temperature = options?.temperature ?? 0.8;

  const url = process.env.AI_GATEWAY_URL || "https://api.openai.com/v1/chat/completions";
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: finalMessages,
      ...(tools ? { tools, tool_choice: toolChoice } : {}),
      temperature,
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
  { title: "The 5 Love Languages", description: "Discover which love language speaks to you and your partner", source: "Verywell Mind", category: "Connection", emoji: "\u{1F4AC}", url: "https://www.verywellmind.com/can-the-5-love-languages-help-your-relationship-4783538", imageHint: "couple talking" },
  { title: "Active Listening Skills for Couples", description: "Transform how you connect with your partner through listening", source: "Verywell Mind", category: "Communication", emoji: "\u{1F442}", url: "https://www.verywellmind.com/what-is-active-listening-3024343", imageHint: "listening couple" },
  { title: "The Four Horsemen of Relationships", description: "Four communication patterns that predict relationship breakdown", source: "Gottman Institute", category: "Communication", emoji: "\u26A0\uFE0F", url: "https://www.gottman.com/blog/the-four-horsemen-recognizing-criticism-contempt-defensiveness-and-stonewalling/", imageHint: "couple conflict" },
  { title: "Emotional Bids: How Couples Connect", description: "The small moments that build or break your relationship", source: "Gottman Institute", category: "Communication", emoji: "\u2764\uFE0F", url: "https://www.gottman.com/blog/want-to-improve-your-relationship-start-paying-more-attention-to-bids/", imageHint: "emotional needs" },
  { title: "How to Communicate Better in a Relationship", description: "Research-backed communication skills for stronger relationships", source: "Positive Psychology", category: "Communication", emoji: "\u{1F5E3}\uFE0F", url: "https://positivepsychology.com/communication-in-relationships/", imageHint: "couple conversation" },
  { title: "Building Emotional Intimacy", description: "Simple daily habits that deepen your bond over time", source: "Verywell Mind", category: "Intimacy", emoji: "\u{1F495}", url: "https://www.verywellmind.com/what-is-intimacy-2795161", imageHint: "emotional connection" },
  { title: "The Role of Physical Affection", description: "Why non-sexual touch is vital for long-term connection", source: "mindbodygreen", category: "Intimacy", emoji: "\u{1FAC2}", url: "https://www.mindbodygreen.com/articles/physical-touch-love-language", imageHint: "couple touching" },
  { title: "40 Questions to Build Intimacy", description: "Deepen your connection with thoughtful conversation starters", source: "Verywell Mind", category: "Intimacy", emoji: "\u{1F48B}", url: "https://www.verywellmind.com/questions-to-build-intimacy-in-relationships-1270942", imageHint: "couple intimacy" },
  { title: "Healthy Sex Life in Relationships", description: "Open conversations and ideas for a fulfilling intimate life", source: "Healthline", category: "Intimacy", emoji: "\u{1F336}\uFE0F", url: "https://www.healthline.com/health/healthy-relationship", imageHint: "intimate couple" },
  { title: "17 Fun Couple Activities to Enjoy Together", description: "Creative ways to enjoy each other's company at home or out", source: "Verywell Mind", category: "Date Ideas", emoji: "\u{1F56F}\uFE0F", url: "https://www.verywellmind.com/fun-things-couples-can-do-together-3129598", imageHint: "romantic date home" },
  { title: "Why New Experiences Strengthen Relationships", description: "The neuroscience behind why shared adventures deepen love", source: "Harvard Health", category: "Fun", emoji: "\u{1F9D7}", url: "https://www.health.harvard.edu/mind-and-mood/the-health-benefits-of-strong-relationships", imageHint: "couple adventure" },
  { title: "Managing Conflict in Relationships", description: "Healthy strategies to navigate disagreements together", source: "Gottman Institute", category: "Communication", emoji: "\u{1F9E9}", url: "https://www.gottman.com/blog/managing-conflict-solvable-vs-perpetual-problems/", imageHint: "couple discussion" },
  { title: "Relationship Trust Building", description: "How to build and rebuild trust in your relationship", source: "Healthline", category: "Growth", emoji: "\u{1F91D}", url: "https://www.healthline.com/health/how-to-rebuild-trust", imageHint: "trust couple" },
  { title: "The Science of Gratitude in Love", description: "How saying 'thank you' transforms your relationship", source: "Greater Good Magazine", category: "Gratitude", emoji: "\u{1F64F}", url: "https://greatergood.berkeley.edu/topic/gratitude", imageHint: "grateful couple" },
  { title: "Attachment Styles Explained", description: "Understanding how your attachment style affects your love life", source: "Verywell Mind", category: "Growth", emoji: "\u{1F517}", url: "https://www.verywellmind.com/attachment-styles-2795344", imageHint: "attachment bond" },
  { title: "How to Keep the Spark Alive", description: "Evidence-based ways to maintain romance in long relationships", source: "Mark Manson", category: "Intimacy", emoji: "\u2728", url: "https://markmanson.net/healthy-relationship-habits", imageHint: "romantic couple" },
  { title: "The Power of Date Nights", description: "Why regular date nights are essential for lasting love", source: "Mark Manson", category: "Date Ideas", emoji: "\u{1F319}", url: "https://markmanson.net/love", imageHint: "date night" },
  { title: "Self-Care for Better Relationships", description: "Taking care of yourself so you can love better", source: "Verywell Mind", category: "Wellness", emoji: "\u{1F9D8}", url: "https://www.verywellmind.com/self-care-strategies-overall-stress-reduction-3144729", imageHint: "self care" },
  { title: "The Art of Compromise in Relationships", description: "How to find middle ground without losing yourself", source: "TIME", category: "Communication", emoji: "\u{1F91D}", url: "https://time.com/5321262/science-compromise-relationship/", imageHint: "couple compromise" },
  { title: "How to Set Healthy Boundaries", description: "Boundaries aren't walls — they're bridges to better connection", source: "Positive Psychology", category: "Growth", emoji: "\u{1F6A7}", url: "https://positivepsychology.com/healthy-boundaries/", imageHint: "healthy boundaries" },
  { title: "Rekindling Intimacy in Your Relationship", description: "The common reasons intimacy fades and how to reignite it", source: "Healthline", category: "Intimacy", emoji: "\u{1F525}", url: "https://www.healthline.com/health/mental-health/set-boundaries", imageHint: "couple intimacy" },
  { title: "The Magic Ratio of Relationships", description: "Gottman's 5:1 ratio — five positive interactions for every negative one", source: "Gottman Institute", category: "Communication", emoji: "\u2728", url: "https://www.gottman.com/blog/the-magic-relationship-ratio-according-science/", imageHint: "happy couple ratio" },
  { title: "How to Apologise Properly", description: "The six components of a meaningful apology that actually heals", source: "Verywell Mind", category: "Communication", emoji: "\u{1F64F}", url: "https://www.verywellmind.com/how-to-apologize-more-sincerely-3144467", imageHint: "apology couple" },
  { title: "Mindfulness for Couples", description: "How practising presence together strengthens your bond", source: "Positive Psychology", category: "Wellness", emoji: "\u{1F9D8}", url: "https://positivepsychology.com/mindfulness-exercises-techniques-activities/", imageHint: "mindful couple meditation" },
  { title: "Financial Planning as a Couple", description: "Money conversations that bring you closer instead of driving you apart", source: "APA", category: "Practical", emoji: "\u{1F4B0}", url: "https://www.apa.org/topics/money", imageHint: "couple finances" },
  { title: "The Importance of Play in Relationships", description: "Why laughter and silliness are serious relationship tools", source: "HelpGuide", category: "Fun", emoji: "\u{1F3AE}", url: "https://www.helpguide.org/mental-health/wellbeing/laughter-is-the-best-medicine", imageHint: "couple playing laughing" },
  { title: "Navigating Life Transitions Together", description: "How to stay connected through big changes like moving, babies and career shifts", source: "HelpGuide", category: "Growth", emoji: "\u{1F331}", url: "https://www.helpguide.org/mental-health/stress/stress-management", imageHint: "couple life change" },
  { title: "How to Fight Fair", description: "Rules of engagement for productive disagreements that strengthen your bond", source: "HelpGuide", category: "Communication", emoji: "\u{1F94A}", url: "https://www.helpguide.org/relationships/communication/conflict-resolution-skills", imageHint: "couple disagreement" },
  { title: "The Science of Love and Bonding", description: "Understanding the 'love hormone' and how it deepens attachment", source: "Harvard Health", category: "Science", emoji: "\u{1F9EA}", url: "https://www.health.harvard.edu/mind-and-mood/oxytocin-the-love-hormone", imageHint: "oxytocin bonding" },
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

import { LUXURY_INTIMACY_PRODUCTS } from "./shopProducts";


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

  app.get("/api/is-admin", async (req: Request, res: Response) => {
    const userId = await extractUserId(req);
    if (!userId) return res.json({ admin: false });
    try {
      const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      const { data } = await sb.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
      res.json({ admin: !!data });
    } catch {
      res.json({ admin: false });
    }
  });

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

  // AI content cache: per-user, 2 hours server-side
  const aiContentCache = new Map<string, { data: any; ts: number }>();
  const AI_CACHE_TTL = 2 * 60 * 60 * 1000;
  function getAICache(key: string) {
    const cached = aiContentCache.get(key);
    if (cached && Date.now() - cached.ts < AI_CACHE_TTL) return cached.data;
    return null;
  }
  function setAICache(key: string, data: any) {
    aiContentCache.set(key, { data, ts: Date.now() });
    if (aiContentCache.size > 200) {
      const oldest = [...aiContentCache.entries()].sort((a, b) => a[1].ts - b[1].ts);
      for (let i = 0; i < 50; i++) aiContentCache.delete(oldest[i][0]);
    }
  }

  // 7. GET /api/suggest-articles
  app.get("/api/suggest-articles", async (req: Request, res: Response) => {
    const userId = await extractUserId(req);
    const fallback = () => {
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
        if (!selected.includes(article)) selected.push(article);
      }
      return selected.slice(0, 7);
    };

    if (!userId || !process.env.OPENAI_API_KEY) {
      return res.json({ articles: fallback() });
    }

    const cacheKey = `articles:${userId}`;
    const cached = getAICache(cacheKey);
    if (cached) return res.json({ articles: cached });

    try {
      const catalog = REAL_ARTICLES.map((a, i) => `${i}: [${a.category}] ${a.title} — ${a.description}`).join("\n");
      const result = await callAI([
        { role: "system", content: `You are a relationship content curator for a couples app called "Us". Given a numbered list of articles about relationships, pick the 7 most relevant for this specific couple based on their context (conversations, moods, preferences, interests). Return ONLY a JSON array of the 7 article index numbers, most relevant first. Example: [3,7,12,0,5,18,9]` },
        { role: "user", content: `Here are the available articles:\n${catalog}\n\nPick the 7 most relevant for this couple.` },
      ], undefined, undefined, userId);

      const content = result.choices?.[0]?.message?.content || "";
      const match = content.match(/\[[\d,\s]+\]/);
      if (match) {
        const indices: number[] = JSON.parse(match[0]);
        const selected = indices.filter(i => i >= 0 && i < REAL_ARTICLES.length).map(i => REAL_ARTICLES[i]).slice(0, 7);
        if (selected.length >= 5) {
          setAICache(cacheKey, selected);
          return res.json({ articles: selected });
        }
      }
      const fb = fallback();
      setAICache(cacheKey, fb);
      res.json({ articles: fb });
    } catch (e) {
      console.error("suggest-articles AI error:", e);
      res.json({ articles: fallback() });
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
        signal: AbortSignal.timeout(4000),
      });
      if (!resp.ok) {
        const empty = { ogImage: "", ogTitle: "", ogDescription: "", siteName: "", ts: Date.now() };
        ogCache.set(url, empty);
        return res.json(empty);
      }

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
      const empty = { ogImage: "", ogTitle: "", ogDescription: "", siteName: "", ts: Date.now() };
      ogCache.set(url, empty);
      res.json(empty);
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

  function normalizeForMatch(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
  }

  function titleSimilarity(a: string, b: string): number {
    const na = normalizeForMatch(a);
    const nb = normalizeForMatch(b);
    if (na === nb) return 1;
    const wordsA = na.split(" ");
    const wordsB = new Set(nb.split(" "));
    const matches = wordsA.filter(w => wordsB.has(w)).length;
    return matches / Math.max(wordsA.length, wordsB.size);
  }

  async function searchApplePodcast(query: string, expectedHost?: string): Promise<{ appleId: string; title: string; host: string; imageUrl: string; feedUrl: string } | null> {
    const cacheKey = `itunes:${query}`;
    const cached = podcastArtworkCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < 7 * 24 * 60 * 60 * 1000) {
      return JSON.parse(cached.url);
    }
    try {
      const resp = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=podcast&entity=podcast&limit=5&country=GB`);
      const data = await resp.json() as any;
      const results = data.results || [];
      if (!results.length) return null;

      let best = results[0];
      let bestScore = 0;
      for (const r of results) {
        const name = r.collectionName || r.trackName || "";
        let score = titleSimilarity(query, name);
        if (expectedHost) {
          const hostScore = titleSimilarity(expectedHost, r.artistName || "");
          score = score * 0.7 + hostScore * 0.3;
        }
        if (score > bestScore) {
          bestScore = score;
          best = r;
        }
      }

      if (bestScore < 0.2) return null;

      const found = {
        appleId: String(best.collectionId || best.trackId || ""),
        title: best.collectionName || best.trackName || query,
        host: best.artistName || "",
        imageUrl: best.artworkUrl600 || best.artworkUrl100 || "",
        feedUrl: best.feedUrl || "",
      };
      podcastArtworkCache.set(cacheKey, { url: JSON.stringify(found), ts: Date.now() });
      return found;
    } catch {
      return null;
    }
  }

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

  app.get("/api/curated-podcasts", async (req: Request, res: Response) => {
    const userId = await extractUserId(req);
    const enriched = await enrichPodcastArtwork(CURATED_PODCASTS).catch(() => CURATED_PODCASTS);
    const fallbackResult = shuffle(enriched).slice(0, 6);

    if (!userId || !process.env.OPENAI_API_KEY) {
      return res.json({ podcasts: fallbackResult });
    }

    const cacheKey = `podcasts:v4:${userId}`;
    const cached = getAICache(cacheKey);
    if (cached) return res.json({ podcasts: cached });

    try {
      const knownCatalog = enriched.map((p, i) => `${i}: "${p.title}" by ${p.host} [${p.category}] — ${p.description}`).join("\n");

      const result = await callAI([
        {
          role: "system",
          content: `You are a podcast curator for a couples/relationship app called "Us". Your job is to recommend the best podcasts for this couple to listen to together — shows they can play right now in the app.

STEP 1: Pick up to 4 from the known catalog below (by index number) that best match the couple's interests and current mood.
STEP 2: Suggest up to 6 NEW podcast shows (not in the catalog) that would be perfect for this couple. These must be REAL podcasts available on Apple Podcasts. Think broadly — relationship podcasts, wellness, intimacy, communication, cooking together, travel, parenting if relevant, personal growth, mindfulness, humor, true crime, music, culture, or any topic that matches their interests and activity in the app.

Be creative with new suggestions. Go beyond just "relationship advice" podcasts — if they like date nights, suggest food/restaurant podcasts. If they're into wellness, suggest meditation or fitness pods. If they chat about travel, suggest travel shows. Match their actual interests.

Known catalog:
${knownCatalog}

Return a JSON object with:
- "fromCatalog": array of index numbers (up to 4)
- "newPodcasts": array of objects with { "searchQuery": "exact real podcast name to search on Apple Podcasts", "title": "display title", "host": "host name", "description": "1 sentence description for the couple", "category": "category", "duration": "typical episode length" }

IMPORTANT: For newPodcasts, use the EXACT real podcast name as searchQuery so it can be found on Apple Podcasts. Only suggest shows you are confident actually exist and are currently active.`,
        },
        { role: "user", content: "What podcasts should this couple listen to?" },
      ], [
        {
          type: "function",
          function: {
            name: "recommend_podcasts",
            description: "Recommend podcasts from catalog and new Apple Podcasts discoveries",
            parameters: {
              type: "object",
              properties: {
                fromCatalog: { type: "array", items: { type: "number" } },
                newPodcasts: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      searchQuery: { type: "string" },
                      title: { type: "string" },
                      host: { type: "string" },
                      description: { type: "string" },
                      category: { type: "string" },
                      duration: { type: "string" },
                    },
                    required: ["searchQuery", "title", "host", "description", "category", "duration"],
                  },
                },
              },
              required: ["fromCatalog", "newPodcasts"],
              additionalProperties: false,
            },
          },
        },
      ], { type: "function", function: { name: "recommend_podcasts" } }, userId);

      const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall?.function?.arguments) {
        setAICache(cacheKey, fallbackResult);
        return res.json({ podcasts: fallbackResult });
      }

      const rec = JSON.parse(toolCall.function.arguments);
      const finalPodcasts: any[] = [];

      const catalogPicks = (rec.fromCatalog || [])
        .filter((i: number) => typeof i === "number" && i >= 0 && i < enriched.length)
        .slice(0, 4)
        .map((i: number) => enriched[i]);
      finalPodcasts.push(...catalogPicks);

      const newPodcasts = (rec.newPodcasts || []).slice(0, 6);
      const appleSearches = await Promise.all(
        newPodcasts.map(async (np: any) => {
          const found = await searchApplePodcast(np.searchQuery, np.host);
          if (found && found.appleId) {
            return {
              title: found.title || np.title,
              description: np.description,
              host: found.host || np.host,
              category: np.category,
              spotifyId: "",
              appleId: found.appleId,
              imageUrl: found.imageUrl || "",
              duration: np.duration,
            };
          }
          return null;
        })
      );
      finalPodcasts.push(...appleSearches.filter(Boolean));

      const deduped = finalPodcasts.filter((p, i, arr) =>
        arr.findIndex(x => x.appleId === p.appleId) === i
      ).slice(0, 10);

      if (deduped.length >= 3) {
        setAICache(cacheKey, deduped);
        return res.json({ podcasts: deduped });
      }

      setAICache(cacheKey, fallbackResult);
      res.json({ podcasts: fallbackResult });
    } catch (e) {
      console.error("curated-podcasts AI error:", e);
      res.json({ podcasts: fallbackResult });
    }
  });

  // 7c. GET /api/curated-videos
  app.get("/api/curated-videos", async (req: Request, res: Response) => {
    const userId = await extractUserId(req);
    const fallbackResult = shuffle(CURATED_VIDEOS).slice(0, 6);

    if (!userId || !process.env.OPENAI_API_KEY) {
      return res.json({ videos: fallbackResult });
    }

    const cacheKey = `videos:${userId}`;
    const cached = getAICache(cacheKey);
    if (cached) return res.json({ videos: cached });

    try {
      const catalog = CURATED_VIDEOS.map((v, i) => `${i}: [${v.category}] "${v.title}" by ${v.creator} — ${v.description}`).join("\n");
      const result = await callAI([
        { role: "system", content: `You are a relationship content curator for a couples app called "Us". Given a numbered list of relationship videos, pick the 6 most relevant for this specific couple based on their context. Return ONLY a JSON array of 6 index numbers, most relevant first. Example: [1,4,0,7,2,9]` },
        { role: "user", content: `Here are the available videos:\n${catalog}\n\nPick the 6 most relevant for this couple.` },
      ], undefined, undefined, userId);

      const content = result.choices?.[0]?.message?.content || "";
      const match = content.match(/\[[\d,\s]+\]/);
      if (match) {
        const indices: number[] = JSON.parse(match[0]);
        const selected = indices.filter(i => i >= 0 && i < CURATED_VIDEOS.length).map(i => CURATED_VIDEOS[i]).slice(0, 6);
        if (selected.length >= 4) {
          setAICache(cacheKey, selected);
          return res.json({ videos: selected });
        }
      }
      setAICache(cacheKey, fallbackResult);
      res.json({ videos: fallbackResult });
    } catch (e) {
      console.error("curated-videos AI error:", e);
      res.json({ videos: fallbackResult });
    }
  });

  // 7d. GET /api/curated-quotes
  app.get("/api/curated-quotes", async (req: Request, res: Response) => {
    const userId = await extractUserId(req);
    const fallbackResult = shuffle(CURATED_QUOTES).slice(0, 5);

    if (!userId || !process.env.OPENAI_API_KEY) {
      return res.json({ quotes: fallbackResult });
    }

    const cacheKey = `quotes:${userId}`;
    const cached = getAICache(cacheKey);
    if (cached) return res.json({ quotes: cached });

    try {
      const result = await callAI([
        { role: "system", content: `You are a poetic, warm quote writer for a couples app called "Us". Based on this couple's context (their conversations, moods, interests), generate 5 inspiring, romantic or thoughtful quotes about love and relationships. Make them feel personal and relevant to what this couple is going through. Mix original quotes with well-known ones that fit their situation. Return a JSON array of objects with "text", "author", and "category" fields. For original quotes, use "Us" as the author.` },
        { role: "user", content: "Generate 5 personalised relationship quotes for this couple." },
      ], undefined, undefined, userId);

      const content = result.choices?.[0]?.message?.content || "";
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const quotes = JSON.parse(jsonMatch[0]);
        if (Array.isArray(quotes) && quotes.length >= 3) {
          setAICache(cacheKey, quotes.slice(0, 5));
          return res.json({ quotes: quotes.slice(0, 5) });
        }
      }
      setAICache(cacheKey, fallbackResult);
      res.json({ quotes: fallbackResult });
    } catch (e) {
      console.error("curated-quotes AI error:", e);
      res.json({ quotes: fallbackResult });
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

  let shopProductsCache: any[] | null = null;
  let shopCacheTime = 0;
  const SHOP_CACHE_TTL = 1000 * 60 * 30;

  app.get("/api/shop/curated", async (_req: Request, res: Response) => {
    try {
      if (shopProductsCache && Date.now() - shopCacheTime < SHOP_CACHE_TTL) {
        return res.json({ products: shopProductsCache });
      }

      const stripe = await getUncachableStripeClient();
      const stripeProducts = await stripe.products.list({ active: true, limit: 100, expand: ['data.default_price'] });

      const stripeMap = new Map<string, { priceId: string; productId: string; unitAmount: number; currency: string; images: string[] }>();
      for (const sp of stripeProducts.data) {
        const shopName = sp.metadata?.shop_product_name?.toLowerCase()?.trim();
        if (!shopName) continue;

        let priceId = '';
        let unitAmount = 0;
        let currency = 'gbp';

        if (sp.default_price && typeof sp.default_price === 'object') {
          priceId = sp.default_price.id;
          unitAmount = (sp.default_price as any).unit_amount || 0;
          currency = (sp.default_price as any).currency || 'gbp';
        } else {
          const prices = await stripe.prices.list({ product: sp.id, active: true, limit: 5 });
          const gbpPrice = prices.data.find(p => p.currency === 'gbp') || prices.data[0];
          if (gbpPrice) {
            priceId = gbpPrice.id;
            unitAmount = gbpPrice.unit_amount || 0;
            currency = gbpPrice.currency;
          }
        }

        if (priceId) {
          stripeMap.set(shopName, {
            priceId,
            productId: sp.id,
            unitAmount,
            currency,
            images: sp.images || [],
          });
        }
      }

      const matchedNames = new Set<string>();
      const products: any[] = [];

      for (let i = 0; i < LUXURY_INTIMACY_PRODUCTS.length; i++) {
        const lp: any = LUXURY_INTIMACY_PRODUCTS[i];
        const stripeMatch = stripeMap.get(lp.name.toLowerCase().trim());
        if (!stripeMatch) continue;
        matchedNames.add(lp.name.toLowerCase().trim());
        const imageUrl = lp.imageUrl || (stripeMatch.images?.[0]) || null;
        const price = new Intl.NumberFormat("en-GB", { style: "currency", currency: stripeMatch.currency.toUpperCase() }).format(stripeMatch.unitAmount / 100);
        const allImages = (lp.images?.length > 0 ? lp.images : [imageUrl]).filter(Boolean);
        products.push({
          id: `curated-${i}`,
          name: lp.name,
          brand: lp.brand,
          price,
          description: lp.description,
          longDescription: lp.longDescription || lp.description,
          features: lp.features || [`By ${lp.brand}`, "Premium quality", "Perfect for couples"],
          category: normalizeShopCategory(lp.category),
          imageKeyword: lp.imageKeyword || `${lp.category} luxury couples`,
          imageUrl,
          images: allImages,
          source: lp.brand,
          stripePriceId: stripeMatch.priceId,
          stripeProductId: stripeMatch.productId,
          sizing: lp.sizing || null,
          materials: lp.materials || null,
          dimensions: lp.dimensions || null,
          whatsIncluded: lp.whatsIncluded || null,
          careInstructions: lp.careInstructions || null,
        });
      }

      for (const sp of stripeProducts.data) {
        const shopName = sp.metadata?.shop_product_name?.toLowerCase()?.trim();
        if (!shopName || matchedNames.has(shopName)) continue;
        const meta = sp.metadata || {};
        const stripeMatch = stripeMap.get(shopName);
        if (!stripeMatch) continue;

        const imageUrl = sp.images?.[0] || null;
        const price = new Intl.NumberFormat("en-GB", { style: "currency", currency: stripeMatch.currency.toUpperCase() }).format(stripeMatch.unitAmount / 100);
        let features: string[] = [];
        try { features = JSON.parse(meta.features || "[]"); } catch { features = [`By ${meta.brand || "Us"}`, "Premium quality", "Perfect for couples"]; }
        let sizing = null;
        try { sizing = JSON.parse(meta.sizing || "null"); } catch {}
        let whatsIncluded = null;
        try { whatsIncluded = JSON.parse(meta.whats_included || "null"); } catch {}

        products.push({
          id: `ai-${sp.id}`,
          name: meta.shop_product_name || sp.name,
          brand: meta.brand || "",
          price,
          description: sp.description || "",
          longDescription: meta.long_description || sp.description || "",
          features,
          category: normalizeShopCategory(meta.category || "Gifts"),
          imageKeyword: `${meta.category || "luxury"} couples product`,
          imageUrl,
          images: sp.images?.length ? sp.images : (imageUrl ? [imageUrl] : []),
          source: meta.brand || "",
          stripePriceId: stripeMatch.priceId,
          stripeProductId: stripeMatch.productId,
          sizing,
          materials: meta.materials || null,
          dimensions: null,
          whatsIncluded,
          careInstructions: null,
        });
      }

      shopProductsCache = products;
      shopCacheTime = Date.now();
      res.json({ products });
    } catch (e: any) {
      console.error("shop/curated error:", e);
      if (shopProductsCache) {
        return res.json({ products: shopProductsCache });
      }
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
      res.send(`<html><body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#faf5f0"><div style="text-align:center"><h2 style="color:#1DB954">&#10003; Spotify connected!</h2><p style="color:#666">Redirecting back to the app&hellip;</p></div><script>setTimeout(function(){window.location.href='/'},1500)</script></body></html>`);
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

  app.get("/api/stripe/publishable-key", async (_req: Request, res: Response) => {
    try {
      const key = await getStripePublishableKey();
      res.json({ publishableKey: key });
    } catch (e: any) {
      console.error("Stripe publishable key error:", e.message);
      res.status(500).json({ error: "Failed to get Stripe key" });
    }
  });

  app.get("/api/stripe/products", async (_req: Request, res: Response) => {
    try {
      const result = await db.execute(
        sql`SELECT 
          p.id as product_id,
          p.name as product_name,
          p.description as product_description,
          p.active as product_active,
          p.metadata as product_metadata,
          p.images as product_images,
          pr.id as price_id,
          pr.unit_amount,
          pr.currency,
          pr.active as price_active
        FROM stripe.products p
        LEFT JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
        WHERE p.active = true
        ORDER BY p.name, pr.unit_amount`
      );

      const productsMap = new Map();
      for (const row of result.rows) {
        if (!productsMap.has(row.product_id)) {
          productsMap.set(row.product_id, {
            id: row.product_id,
            name: row.product_name,
            description: row.product_description,
            active: row.product_active,
            metadata: row.product_metadata,
            images: row.product_images,
            prices: [],
          });
        }
        if (row.price_id) {
          productsMap.get(row.product_id).prices.push({
            id: row.price_id,
            unit_amount: row.unit_amount,
            currency: row.currency,
            active: row.price_active,
          });
        }
      }

      res.json({ products: Array.from(productsMap.values()) });
    } catch (e: any) {
      console.error("Stripe products error:", e.message);
      res.status(500).json({ error: "Failed to list products" });
    }
  });

  app.post("/api/stripe/checkout", async (req: Request, res: Response) => {
    try {
      const { priceId, productName, quantity = 1 } = req.body;
      if (!priceId || typeof priceId !== "string" || !priceId.startsWith("price_")) {
        return res.status(400).json({ error: "Valid priceId is required" });
      }
      const safeQuantity = Math.max(1, Math.min(10, Number(quantity) || 1));
      const safeName = typeof productName === "string" ? productName.slice(0, 200) : "";

      const stripe = await getUncachableStripeClient();
      const domains = process.env.REPLIT_DOMAINS?.split(',') || [];
      if (domains.length === 0) {
        return res.status(500).json({ error: "Server configuration error" });
      }
      const baseUrl = `https://${domains[0]}`;

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: priceId, quantity: safeQuantity }],
        mode: 'payment',
        success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/checkout/cancel`,
        metadata: {
          productName: safeName,
        },
      });

      res.json({ url: session.url, sessionId: session.id });
    } catch (e: any) {
      console.error("Stripe checkout error:", e.message);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  app.get("/api/stripe/session/:sessionId", async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      res.json({
        status: session.payment_status,
        customerEmail: session.customer_details?.email,
        amountTotal: session.amount_total,
        currency: session.currency,
        productName: session.metadata?.productName,
      });
    } catch (e: any) {
      console.error("Stripe session error:", e.message);
      res.status(500).json({ error: "Failed to retrieve session" });
    }
  });

  app.post("/api/stripe/ai-create-products", async (req: Request, res: Response) => {
    try {
      const adminUserId = await requireAdmin(req, res);
      if (!adminUserId) return;

      const { prompt, count = 3, usePersonalisation = true } = req.body;
      if (!prompt || typeof prompt !== "string") {
        return res.status(400).json({ error: "A prompt describing your products is required" });
      }
      const safeCount = Math.max(1, Math.min(10, Number(count) || 3));

      let coupleContext = "";
      if (usePersonalisation) {
        const fullContext = await fetchUserContext(adminUserId);
        coupleContext = fullContext
          .replace(/Recent messages:.*?(?=\n[A-Z]|\n$|$)/s, "")
          .replace(/\n{2,}/g, "\n")
          .trim();
      }

      const personalisationBlock = coupleContext
        ? `\n\nIMPORTANT — COUPLE CONTEXT (use this to tailor product recommendations):
${coupleContext}
Use their interests, moods, liked content, recent conversations and list themes to pick products they would genuinely love. If they discuss date nights, recommend date night products. If they like wellness, lean into spa/self-care. If intimacy is a theme, suggest tasteful intimacy products. Match the products to THEIR tastes.`
        : "";

      const aiResult = await callAI(
        [
          {
            role: "system",
            content: `You are an elite product sourcing specialist and buyer for a premium couples/relationship app called "Us". You have deep expertise in luxury consumer goods, wholesale sourcing, and e-commerce margins.

YOUR MISSION: Find and recommend exactly ${safeCount} REAL, SPECIFIC products that genuinely exist in the market right now.

CRITICAL RULES — FOLLOW THESE EXACTLY:
1. ONLY recommend products that ACTUALLY EXIST — use real product names, real brands, real SKUs where possible
2. Every product must be currently available to purchase (not discontinued)
3. Use the EXACT product name as it appears on the brand's website or retailer listings
4. Prices must be realistic — based on actual UK retail prices, not invented numbers
5. Wholesale estimates should reflect real trade pricing (typically 40-55% off RRP for beauty/lifestyle)

PRODUCT QUALITY STANDARDS:
- Premium quality befitting a luxury couples app (think Net-a-Porter, Space NK, Liberty London calibre)
- Products couples would genuinely use together or gift to each other
- Strong brand recognition or compelling emerging brand story
- Beautiful packaging / giftability is a major plus
- Avoid generic, mass-market, or cheap-looking products

SOURCING INTELLIGENCE — be specific and realistic:
- Faire.com: Check their actual categories — they carry excellent indie beauty, candles, homeware, and wellness brands
- Amazon Business UK: Good for established brands at volume pricing
- Brand direct wholesale: Many premium brands (Diptyque, ESPA, Rituals, Neal's Yard, Lush) offer trade accounts at 35-50% off RRP
- The Hut Group (THG): Lookfantastic, Dermstore — major beauty/wellness distributor with trade terms
- Sephora / Space NK: Key retailers for premium beauty
- Independent brands: Often offer the best margins (50-60% off RRP) via direct trade accounts
- Liberty London / Selfridges wholesale programmes for premium positioning

PRICING GUIDANCE:
- Sweet spot: £25-£150 retail price range (most impulse-giftable)
- Target 40-60% gross margin (e.g., wholesale £20, sell for £45-50)
- Always price in whole pence amounts (e.g. 4500 for £45.00, not 4999)

CATEGORIES (use exactly one): Massage, Candles, Wellness, Lingerie, Accessories, Nightwear, Fragrance, Beauty, Skincare, Bath, Date Night, Gifts, Games, Home, Intimacy

For each product you MUST provide detailed, accurate:
- name: Exact real product name
- brand: Real brand name
- description: 2-3 sentence luxurious customer-facing description that sells the product
- longDescription: 4-5 sentence detailed description covering ingredients/materials, usage, and why it's special for couples
- priceInPence: Recommended retail price in pence (must be realistic)
- wholesalePriceEstimate: Trade/wholesale price in pence
- category: From the list above
- supplier: Specific real supplier name
- supplierUrl: Real URL where the product can be sourced
- imageUrl: Direct URL to the actual product image on the brand's website or a major retailer (must be a real, currently accessible .jpg/.png/.webp image URL — NOT a page URL). Use the brand's CDN or a retailer like Amazon, John Lewis, Space NK, Lookfantastic etc.
- features: Array of 4-5 specific feature bullet points (include sizes, materials, key ingredients)
- marginNotes: Detailed sourcing strategy with actual estimated margins
- sizing: Object with type (one of: "volume", "weight", "dimensions", "clothing", "shade", "one-size"), options array (specific sizes/volumes), and optional guide string
- materials: Detailed ingredients or materials list
- whatsIncluded: Array of what comes in the package${personalisationBlock}`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        [
          {
            type: "function",
            function: {
              name: "create_products",
              description: `Source ${safeCount} real, purchasable premium products for a couples app shop`,
              parameters: {
                type: "object",
                properties: {
                  products: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Exact real product name" },
                        brand: { type: "string", description: "Real brand/manufacturer" },
                        description: { type: "string", description: "2-3 sentence customer description" },
                        longDescription: { type: "string", description: "4-5 sentence detailed description" },
                        priceInPence: { type: "number", description: "Retail price in GBP pence" },
                        wholesalePriceEstimate: { type: "number", description: "Wholesale/trade price in GBP pence" },
                        category: { type: "string", description: "Product category" },
                        supplier: { type: "string", description: "Real wholesale supplier name" },
                        supplierUrl: { type: "string", description: "URL to source the product" },
                        imageUrl: { type: "string", description: "Direct URL to the real product image (.jpg/.png/.webp)" },
                        features: { type: "array", items: { type: "string" }, description: "4-5 feature bullets" },
                        marginNotes: { type: "string", description: "Sourcing strategy and margin info" },
                        sizing: {
                          type: "object",
                          properties: {
                            type: { type: "string" },
                            options: { type: "array", items: { type: "string" } },
                            guide: { type: "string" },
                          },
                          required: ["type", "options"],
                        },
                        materials: { type: "string", description: "Full ingredients/materials list" },
                        whatsIncluded: { type: "array", items: { type: "string" }, description: "Package contents" },
                      },
                      required: ["name", "brand", "description", "longDescription", "priceInPence", "wholesalePriceEstimate", "category", "supplier", "supplierUrl", "imageUrl", "features", "marginNotes", "sizing", "materials", "whatsIncluded"],
                    },
                  },
                },
                required: ["products"],
                additionalProperties: false,
              },
            },
          },
        ],
        { type: "function", function: { name: "create_products" } },
        undefined,
        { model: "gpt-5.4", temperature: 0.7 }
      );

      const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall?.function?.arguments) {
        return res.status(500).json({ error: "AI failed to generate products" });
      }

      const generated = JSON.parse(toolCall.function.arguments).products || [];
      if (generated.length === 0) {
        return res.status(500).json({ error: "AI returned no products" });
      }

      const stripe = await getUncachableStripeClient();
      const created: any[] = [];

      async function verifyImageUrl(url: string): Promise<string | null> {
        if (!url || typeof url !== "string") return null;
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);
          const resp = await fetch(url, { method: "HEAD", signal: controller.signal, redirect: "follow" });
          clearTimeout(timeout);
          const ct = resp.headers.get("content-type") || "";
          if (resp.ok && ct.startsWith("image/")) return url;
          const getResp = await fetch(url, { method: "GET", signal: AbortSignal.timeout(5000), redirect: "follow" });
          const getCt = getResp.headers.get("content-type") || "";
          if (getResp.ok && getCt.startsWith("image/")) return url;
          return null;
        } catch {
          return null;
        }
      }

      async function searchPexelsImage(query: string): Promise<string | null> {
        const pexelsKey = process.env.PEXELS_API_KEY;
        if (!pexelsKey) return null;
        try {
          const resp = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=square`, {
            headers: { Authorization: pexelsKey },
          });
          if (!resp.ok) return null;
          const data = await resp.json();
          return data.photos?.[0]?.src?.medium || null;
        } catch {
          return null;
        }
      }

      for (const p of generated) {
        const retailPence = Math.max(100, Math.round(Number(p.priceInPence) || 1000));
        let wholesalePence = Math.max(50, Math.round(Number(p.wholesalePriceEstimate) || 500));
        if (wholesalePence >= retailPence) {
          wholesalePence = Math.round(retailPence * 0.5);
        }
        const marginPercent = Math.round(((retailPence - wholesalePence) / retailPence) * 100);

        let verifiedImage = await verifyImageUrl(p.imageUrl);
        if (!verifiedImage) {
          verifiedImage = await searchPexelsImage(`${p.name} ${p.brand} product`);
        }
        const productImages = verifiedImage ? [verifiedImage] : [];

        const product = await stripe.products.create({
          name: `${p.name} — ${p.brand}`,
          description: p.description,
          images: productImages,
          metadata: {
            brand: p.brand,
            category: p.category,
            shop_product_name: p.name,
            features: JSON.stringify(p.features || []).slice(0, 500),
            long_description: (p.longDescription || p.description).slice(0, 500),
            sizing: JSON.stringify(p.sizing || {}).slice(0, 500),
            materials: (p.materials || "").slice(0, 500),
            whats_included: JSON.stringify(p.whatsIncluded || []).slice(0, 500),
            supplier: p.supplier || "",
            supplier_url: p.supplierUrl || "",
            wholesale_price: String(wholesalePence),
            margin_notes: (p.marginNotes || "").slice(0, 500),
            margin_percent: String(marginPercent),
          },
        });

        const price = await stripe.prices.create({
          product: product.id,
          unit_amount: retailPence,
          currency: "gbp",
        });

        created.push({
          productId: product.id,
          priceId: price.id,
          name: p.name,
          brand: p.brand,
          retailPrice: `£${(retailPence / 100).toFixed(2)}`,
          wholesalePrice: `£${(wholesalePence / 100).toFixed(2)}`,
          margin: `${marginPercent}%`,
          description: p.description,
          longDescription: p.longDescription,
          category: p.category,
          features: p.features,
          supplier: p.supplier,
          supplierUrl: p.supplierUrl,
          marginNotes: p.marginNotes,
          sizing: p.sizing,
          materials: p.materials,
          whatsIncluded: p.whatsIncluded,
        });
      }

      shopProductsCache = null;
      shopCacheTime = 0;

      res.json({
        message: `Created ${created.length} products in Stripe`,
        products: created,
      });
    } catch (e: any) {
      console.error("AI create products error:", e.message);
      res.status(500).json({ error: e.message || "Failed to create products" });
    }
  });

  app.delete("/api/stripe/products/all", async (req: Request, res: Response) => {
    try {
      const adminUserId = await requireAdmin(req, res);
      if (!adminUserId) return;

      const stripe = await getUncachableStripeClient();
      const allProducts = await stripe.products.list({ active: true, limit: 100 });
      let deactivated = 0;
      for (const sp of allProducts.data) {
        try {
          await stripe.products.update(sp.id, { active: false });
          deactivated++;
        } catch (e: any) {
          console.error(`Failed to deactivate ${sp.id}:`, e.message);
        }
      }
      shopProductsCache = null;
      shopCacheTime = 0;
      res.json({ success: true, message: `Deactivated ${deactivated} products` });
    } catch (e: any) {
      console.error("Clear all products error:", e.message);
      res.status(500).json({ error: "Failed to clear products" });
    }
  });

  app.delete("/api/stripe/products/:productId", async (req: Request, res: Response) => {
    try {
      const adminUserId = await requireAdmin(req, res);
      if (!adminUserId) return;

      const { productId } = req.params;
      if (!productId || !productId.startsWith("prod_")) {
        return res.status(400).json({ error: "Valid product ID required" });
      }
      const stripe = await getUncachableStripeClient();
      await stripe.products.update(productId, { active: false });
      shopProductsCache = null;
      shopCacheTime = 0;
      res.json({ success: true, message: "Product deactivated" });
    } catch (e: any) {
      console.error("Delete product error:", e.message);
      res.status(500).json({ error: "Failed to deactivate product" });
    }
  });
}
