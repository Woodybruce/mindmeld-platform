import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface GameConfig {
  reward: string;
  timeMinutes: number;
  startedBy: string;
  startedAt: number;
}

export const useGameSession = () => {
  const { user, profile } = useAuth();
  const [partnerGame, setPartnerGame] = useState<GameConfig | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const userId = user?.id;
  const partnerId = profile?.partner_id;

  const pairKey =
    userId && partnerId
      ? [userId, partnerId].sort().join("-")
      : null;

  const listName = pairKey ? `__kiss_chase_${pairKey}__` : null;

  const channelName = pairKey ? `kiss-chase-session-${pairKey}` : null;

  const loadPersistedGame = useCallback(async () => {
    if (!userId || !listName) return;
    const { data } = await supabase
      .from("shared_lists")
      .select("items")
      .eq("name", listName)
      .maybeSingle();

    if (data?.items) {
      try {
        const items = typeof data.items === "string" ? JSON.parse(data.items) : data.items;
        if (Array.isArray(items) && items.length > 0) {
          const session = items[0] as GameConfig;
          if (session.startedBy !== userId) {
            const elapsedSec = Math.floor((Date.now() - session.startedAt) / 1000);
            const totalSec = session.timeMinutes * 60;
            if (elapsedSec < totalSec) {
              setPartnerGame(session);
            } else {
              await clearPersistedGame();
            }
          }
        }
      } catch {}
    }
  }, [userId, listName]);

  const persistGame = useCallback(async (config: GameConfig) => {
    if (!userId || !listName) return;
    try {
      const { data: existing } = await supabase
        .from("shared_lists")
        .select("id")
        .eq("name", listName)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("shared_lists")
          .update({ items: [config] } as any)
          .eq("id", existing.id);
      } else {
        await supabase.from("shared_lists").insert({
          user_id: userId,
          name: listName,
          icon: "💋",
          items: [config],
        } as any);
      }
    } catch (e) {
      console.error("Failed to persist game session:", e);
    }
  }, [userId, listName]);

  const clearPersistedGame = useCallback(async () => {
    if (!listName) return;
    try {
      await supabase
        .from("shared_lists")
        .delete()
        .eq("name", listName);
    } catch {}
  }, [listName]);

  useEffect(() => {
    loadPersistedGame();
  }, [loadPersistedGame]);

  useEffect(() => {
    if (!channelName || !userId) return;

    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    channel
      .on("broadcast", { event: "game-start" }, ({ payload }) => {
        if (payload.startedBy !== userId) {
          setPartnerGame(payload as GameConfig);
        }
      })
      .on("broadcast", { event: "game-quit" }, ({ payload }) => {
        if (payload.userId !== userId) {
          setPartnerGame(null);
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [channelName, userId]);

  const broadcastStart = useCallback(
    (reward: string, timeMinutes: number) => {
      if (!userId) return;
      const config: GameConfig = {
        reward,
        timeMinutes,
        startedBy: userId,
        startedAt: Date.now(),
      };
      persistGame(config);
      if (channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "game-start",
          payload: config,
        });
      }
    },
    [userId, persistGame]
  );

  const broadcastQuit = useCallback(() => {
    clearPersistedGame();
    if (!channelRef.current || !userId) return;
    channelRef.current.send({
      type: "broadcast",
      event: "game-quit",
      payload: { userId },
    });
  }, [userId, clearPersistedGame]);

  const clearPartnerGame = useCallback(() => {
    setPartnerGame(null);
    clearPersistedGame();
  }, [clearPersistedGame]);

  return {
    partnerGame,
    broadcastStart,
    broadcastQuit,
    clearPartnerGame,
    hasPartner: !!partnerId,
  };
};
