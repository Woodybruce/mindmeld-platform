import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface FloatingEmoji {
  id: string;
  emoji: string;
  x: number;
  delay: number;
  size: number;
  duration: number;
}

interface IncomingVibe {
  emoji: string;
  label: string;
}

const VibeOverlay = () => {
  const { user, profile } = useAuth();
  const [incomingVibe, setIncomingVibe] = useState<IncomingVibe | null>(null);
  const [floaters, setFloaters] = useState<FloatingEmoji[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const processedVibes = useRef(new Set<string>());
  const lastVibeTs = useRef(0);

  const triggerVibeAnimation = useCallback((emoji: string, label: string) => {
    const now = Date.now();
    if (now - lastVibeTs.current < 1000) return;
    lastVibeTs.current = now;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    setIncomingVibe({ emoji, label });

    const newFloaters: FloatingEmoji[] = Array.from({ length: 30 }, (_, i) => ({
      id: `${now}-${i}`,
      emoji,
      x: Math.random() * 95,
      delay: Math.random() * 1.5,
      size: 24 + Math.random() * 52,
      duration: 2 + Math.random() * 2.5,
    }));
    setFloaters(newFloaters);

    timeoutRef.current = setTimeout(() => {
      setIncomingVibe(null);
      setFloaters([]);
    }, 5500);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const vibeEmoji = params.get("vibe");
    const vibeLabel = params.get("vibeLabel");
    if (vibeEmoji && vibeLabel) {
      setTimeout(() => triggerVibeAnimation(vibeEmoji, vibeLabel), 300);
      const url = new URL(window.location.href);
      url.searchParams.delete("vibe");
      url.searchParams.delete("vibeLabel");
      window.history.replaceState({}, "", url.pathname + url.search);
    }
  }, [triggerVibeAnimation]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "vibe" && event.data.emoji && event.data.label) {
        triggerVibeAnimation(event.data.emoji, event.data.label);
      }
    };
    navigator.serviceWorker.addEventListener("message", handler);
    return () => navigator.serviceWorker.removeEventListener("message", handler);
  }, [triggerVibeAnimation]);

  useEffect(() => {
    if (!user || !profile?.partner_id) return;

    const partnerId = profile.partner_id;
    const channelName = `vibe-overlay-${[user.id, partnerId].sort().join("-")}`;

    const broadcastChannel = supabase
      .channel(channelName)
      .on("broadcast", { event: "vibe" }, ({ payload }) => {
        if (payload.senderId === partnerId) {
          const key = `bc-${payload.senderId}-${payload.ts}`;
          if (processedVibes.current.has(key)) return;
          processedVibes.current.add(key);
          triggerVibeAnimation(payload.emoji, payload.label);
        }
      })
      .subscribe();

    const dbChannel = supabase
      .channel(`vibe-db-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          const msg = payload.new as any;
          if (msg.message_type === "vibe" && msg.sender_id === partnerId) {
            const key = `db-${msg.id}`;
            if (processedVibes.current.has(key)) return;
            processedVibes.current.add(key);
            try {
              const data = JSON.parse(msg.content);
              triggerVibeAnimation(data.emoji, data.label);
            } catch {}
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(broadcastChannel);
      supabase.removeChannel(dbChannel);
    };
  }, [user, profile?.partner_id, triggerVibeAnimation]);

  const dismiss = () => {
    setIncomingVibe(null);
    setFloaters([]);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  return (
    <AnimatePresence>
      {incomingVibe && (
        <motion.div
          key="vibe-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[9999] overflow-hidden pointer-events-auto"
          onClick={dismiss}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-md"
          />

          {floaters.map((f) => (
            <motion.span
              key={f.id}
              initial={{ opacity: 0, scale: 0.3, y: f.delay > 0.75 ? "110vh" : "-10vh" }}
              animate={{
                y: f.delay > 0.75 ? "-20vh" : "110vh",
                opacity: [0, 1, 1, 0.5, 0],
                scale: [0.3, 1.2, 1, 0.8],
                rotate: [0, (Math.random() - 0.5) * 60],
              }}
              transition={{
                duration: f.duration,
                delay: f.delay,
                ease: "easeOut",
              }}
              className="absolute"
              style={{
                fontSize: f.size,
                left: `${f.x}%`,
                top: f.delay > 0.75 ? undefined : 0,
                bottom: f.delay > 0.75 ? 0 : undefined,
              }}
            >
              {f.emoji}
            </motion.span>
          ))}

          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 pointer-events-none">
            <motion.span
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: [0, 2, 1.3], rotate: [-20, 10, 0] }}
              transition={{ duration: 0.7, ease: "backOut" }}
              style={{ fontSize: 110, display: "block" }}
            >
              {incomingVibe.emoji}
            </motion.span>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="text-center px-6"
            >
              <p className="text-white text-xl font-semibold drop-shadow-lg">
                Your partner sent you a
              </p>
              <p className="text-white text-4xl font-black drop-shadow-lg mt-1">
                {incomingVibe.label}! {incomingVibe.emoji}
              </p>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5, duration: 0.5 }}
              className="text-white/50 text-sm mt-8"
            >
              Tap anywhere to dismiss
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default VibeOverlay;
