import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Broadcasts typing state and listens for partner's typing via Supabase Realtime.
 */
export const useTypingIndicator = (
  userId: string | undefined,
  partnerId: string | undefined
) => {
  const [partnerTyping, setPartnerTyping] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const throttleRef = useRef<number>(0);

  const channelName =
    userId && partnerId
      ? `typing-${[userId, partnerId].sort().join("-")}`
      : null;

  useEffect(() => {
    if (!channelName || !userId) return;

    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    channel
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload.userId !== userId) {
          setPartnerTyping(true);
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => setPartnerTyping(false), 3000);
        }
      })
      .on("broadcast", { event: "stop_typing" }, ({ payload }) => {
        if (payload.userId !== userId) {
          setPartnerTyping(false);
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [channelName, userId]);

  const sendTyping = useCallback(() => {
    if (!channelRef.current || !userId) return;
    const now = Date.now();
    if (now - throttleRef.current < 2000) return; // throttle to once per 2s
    throttleRef.current = now;
    channelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: { userId },
    });
  }, [userId]);

  const sendStopTyping = useCallback(() => {
    if (!channelRef.current || !userId) return;
    channelRef.current.send({
      type: "broadcast",
      event: "stop_typing",
      payload: { userId },
    });
  }, [userId]);

  return { partnerTyping, sendTyping, sendStopTyping };
};
