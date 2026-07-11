import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface PartnerLocation {
  lat: number;
  lng: number;
  timestamp: number;
}

/**
 * Broadcasts the current user's location and listens for partner's location
 * via Supabase Realtime broadcast (ephemeral, no DB writes).
 */
export const useRealtimeLocation = (
  myLat: number | null,
  myLng: number | null,
  active: boolean
) => {
  const { user, profile } = useAuth();
  const [partnerPos, setPartnerPos] = useState<PartnerLocation | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  // Latest coords, read by the broadcast interval so it never sends a position
  // captured at subscribe time.
  const latestPos = useRef<{ lat: number | null; lng: number | null }>({ lat: myLat, lng: myLng });
  latestPos.current = { lat: myLat, lng: myLng };

  const partnerId = profile?.partner_id;
  const userId = user?.id;

  // Derive a stable channel name from the two partner IDs (sorted)
  const channelName = userId && partnerId
    ? `kiss-chase-${[userId, partnerId].sort().join("-")}`
    : null;

  // Broadcast my position
  const broadcastPosition = useCallback(() => {
    const { lat, lng } = latestPos.current;
    if (!channelRef.current || lat == null || lng == null) return;
    channelRef.current.send({
      type: "broadcast",
      event: "location",
      payload: {
        userId,
        lat,
        lng,
        timestamp: Date.now(),
      },
    });
  }, [userId]);

  useEffect(() => {
    if (!active || !channelName || !userId) return;

    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    channel
      .on("broadcast", { event: "location" }, ({ payload }) => {
        if (payload.userId !== userId) {
          setPartnerPos({
            lat: payload.lat,
            lng: payload.lng,
            timestamp: payload.timestamp,
          });
        }
      })
      .subscribe();

    channelRef.current = channel;

    // Broadcast position every 2 seconds
    const interval = setInterval(() => {
      broadcastPosition();
    }, 2000);

    // Also broadcast immediately
    broadcastPosition();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [active, channelName, userId]);

  // Re-broadcast whenever my position changes
  useEffect(() => {
    broadcastPosition();
  }, [myLat, myLng, broadcastPosition]);

  return {
    partnerPos,
    hasPartner: !!partnerId,
  };
};
