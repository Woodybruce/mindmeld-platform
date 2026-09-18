import { createClient } from "@supabase/supabase-js";

// Shared AI helpers for the legacy route modules: callAI plus the
// user-context pipeline it uses to personalise prompts.
// Moved verbatim from server/routes.ts (Task 10).

export async function callAI(messages: any[], tools?: any[], toolChoice?: any, userId?: string, options?: { model?: string; temperature?: number }) {
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

export async function fetchUserContext(userId?: string): Promise<string> {
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

export function injectPreferences(systemPrompt: string, context: string): string {
  if (!context) return systemPrompt;
  return `${systemPrompt}\n\nIMPORTANT — Here is context about this couple gathered from their app activity (preferences, lists, conversations, moods, and liked content). Use this to make your recommendations highly relevant and personalised:\n${context}`;
}
