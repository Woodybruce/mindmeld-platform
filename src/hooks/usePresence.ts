import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * App-wide presence tracking. Call once at the app root level.
 * Tracks whether the current user's partner is online across ANY page.
 */
export function usePresence(userId: string | undefined, partnerId: string | undefined) {
  const [partnerOnline, setPartnerOnline] = useState(false);

  useEffect(() => {
    if (!userId || !partnerId) return;

    // Use a stable channel name based on sorted IDs so both partners join the same channel
    const channelName = `app-presence-${[userId, partnerId].sort().join("-")}`;
    const channel = supabase.channel(channelName, {
      config: { presence: { key: userId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setPartnerOnline(!!state[partnerId]);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ user_id: userId, online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, partnerId]);

  return partnerOnline;
}
