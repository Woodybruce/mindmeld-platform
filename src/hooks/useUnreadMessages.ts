import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { fetchChannels, fetchMessages } from "@/lib/chat";

function setAppBadge(count: number) {
  const nav = navigator as Navigator & {
    setAppBadge?: (count: number) => Promise<void>;
    clearAppBadge?: () => Promise<void>;
  };
  if (count > 0) {
    nav.setAppBadge?.(count).catch(() => {});
  } else {
    nav.clearAppBadge?.().catch(() => {});
  }
}

// Unread count for the household channel: messages not sent by the current
// user (butler messages have senderUserId null and count too) that their
// read_by list doesn't include. Polls every 30s — cheap enough for a badge.
export function useUnreadMessages() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["chat", "unread", user?.id],
    enabled: !!user,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { channels } = await fetchChannels();
      const household = channels.find((c) => c.type === "household");
      if (!household) return 0;
      const messages = await fetchMessages(household.id);
      return messages.filter(
        (m) => m.senderUserId !== user!.id && !m.readBy.includes(user!.id),
      ).length;
    },
  });

  const count = query.data ?? 0;

  useEffect(() => {
    setAppBadge(count);
  }, [count]);

  return count;
}
