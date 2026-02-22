import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AppNotification {
  id: string;
  type: "message" | "game" | "list" | "vibe" | "mood" | "announcement";
  title: string;
  body: string;
  route?: string;
  read: boolean;
  created_at: string;
}

/**
 * Aggregates recent notifications from messages table.
 * Messages with message_type "vibe", "text", "image", "voice", "poll" etc.
 * are all treated as notification sources.
 */
export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!user) { setNotifications([]); setLoading(false); return; }

    const { data, error } = await supabase
      .from("messages")
      .select("id, content, message_type, read, created_at, sender_id")
      .eq("receiver_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);

    if (error || !data) { setLoading(false); return; }

    const mapped: AppNotification[] = data.map((msg: any) => {
      const type = mapMessageType(msg.message_type);
      const { title, body } = formatNotification(msg.message_type, msg.content);
      return {
        id: msg.id,
        type,
        title,
        body,
        route: getRoute(msg.message_type),
        read: msg.read,
        created_at: msg.created_at,
      };
    });

    setNotifications(mapped);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("notifications-rt")
      .on("postgres_changes", {
        event: "*", schema: "public", table: "messages",
        filter: `receiver_id=eq.${user.id}`,
      }, () => fetchNotifications())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchNotifications]);

  const markAllRead = useCallback(async () => {
    if (!user) return;
    await supabase
      .from("messages")
      .update({ read: true } as any)
      .eq("receiver_id", user.id)
      .eq("read", false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, [user]);

  const markOneRead = useCallback(async (id: string) => {
    await supabase.from("messages").update({ read: true } as any).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return { notifications, unreadCount, loading, markAllRead, markOneRead, refetch: fetchNotifications };
}

function mapMessageType(mt: string): AppNotification["type"] {
  if (mt === "vibe") return "vibe";
  if (mt === "game" || mt === "game-start" || mt === "game-end") return "game";
  if (mt === "list" || mt === "list-invite") return "list";
  if (mt === "mood") return "mood";
  if (mt === "announcement") return "announcement";
  return "message";
}

function formatNotification(mt: string, content: string): { title: string; body: string } {
  try {
    if (mt === "vibe") {
      const parsed = JSON.parse(content);
      return { title: `${parsed.emoji} ${parsed.label}`, body: "Sent you a vibe" };
    }
  } catch {}

  // Game notifications
  if (content.includes("Kiss Chase")) return { title: "💋 Kiss Chase", body: content };
  if (content.includes("Dare Duel")) return { title: "⚔️ Dare Duel", body: content };
  if (content.includes("Would You Rather")) return { title: "🔥 Would You Rather", body: content };
  if (content.includes("Truth or Dare")) return { title: "😈 Truth or Dare", body: content };
  if (content.includes("Photo Challenge")) return { title: "📸 Photo Challenge", body: content };
  if (content.includes("Design My Night")) return { title: "🌙 Design My Night", body: content };
  if (content.includes("Sex Bucket")) return { title: "🔥 Sex Bucket", body: content };

  // List notifications
  if (content.includes("list")) return { title: "📝 List Update", body: content };

  // Default
  if (mt === "image") return { title: "📷 Photo", body: "Sent you a photo" };
  if (mt === "voice") return { title: "🎙 Voice Note", body: "Sent you a voice note" };
  if (mt === "poll") return { title: "📊 Poll", body: content };

  return { title: "💬 Message", body: content.length > 60 ? content.slice(0, 60) + "…" : content };
}

function getRoute(mt: string): string | undefined {
  if (mt === "game" || mt === "game-start") return undefined; // already navigated via push
  return "/chat";
}
