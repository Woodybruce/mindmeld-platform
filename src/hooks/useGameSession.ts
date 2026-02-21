import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface GameConfig {
  reward: string;
  timeMinutes: number;
  startedBy: string;
  startedAt: number;
}

/**
 * Syncs Kiss Chase game state between partners via Supabase Realtime broadcast.
 * When one partner starts, the other auto-joins with the same settings.
 */
export const useGameSession = () => {
  const { user, profile } = useAuth();
  const [partnerGame, setPartnerGame] = useState<GameConfig | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const userId = user?.id;
  const partnerId = profile?.partner_id;

  const channelName =
    userId && partnerId
      ? `kiss-chase-session-${[userId, partnerId].sort().join("-")}`
      : null;

  // Subscribe to game-start events from partner
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

  // Broadcast that I started a game
  const broadcastStart = useCallback(
    (reward: string, timeMinutes: number) => {
      if (!channelRef.current || !userId) return;
      channelRef.current.send({
        type: "broadcast",
        event: "game-start",
        payload: {
          reward,
          timeMinutes,
          startedBy: userId,
          startedAt: Date.now(),
        } satisfies GameConfig,
      });
    },
    [userId]
  );

  // Broadcast that I quit
  const broadcastQuit = useCallback(() => {
    if (!channelRef.current || !userId) return;
    channelRef.current.send({
      type: "broadcast",
      event: "game-quit",
      payload: { userId },
    });
  }, [userId]);

  const clearPartnerGame = useCallback(() => setPartnerGame(null), []);

  return {
    partnerGame,
    broadcastStart,
    broadcastQuit,
    clearPartnerGame,
    hasPartner: !!partnerId,
  };
};
