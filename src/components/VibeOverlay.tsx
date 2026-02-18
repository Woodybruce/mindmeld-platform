import { useEffect, useState, useRef } from "react";
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

  useEffect(() => {
    if (!user || !profile?.partner_id) return;

    const channel = supabase
      .channel("vibe-incoming")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new as any;
          if (
            msg.message_type === "vibe" &&
            msg.receiver_id === user.id &&
            msg.sender_id === profile.partner_id
          ) {
            try {
              const data = JSON.parse(msg.content);
              triggerVibeAnimation(data.emoji, data.label);
            } catch {
              // ignore parse errors
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, profile?.partner_id]);

  const triggerVibeAnimation = (emoji: string, label: string) => {
    setIncomingVibe({ emoji, label });

    const newFloaters: FloatingEmoji[] = Array.from({ length: 22 }, (_, i) => ({
      id: `${Date.now()}-${i}`,
      emoji,
      x: Math.random() * 90,
      delay: Math.random() * 1.2,
      size: 28 + Math.random() * 40,
      duration: 2.5 + Math.random() * 2,
    }));
    setFloaters(newFloaters);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIncomingVibe(null);
      setFloaters([]);
    }, 4500);
  };

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
          className="fixed inset-0 z-[200] overflow-hidden"
          onClick={dismiss}
        >
          {/* Soft blurred backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          {/* Floating emojis rising up */}
          {floaters.map((f) => (
            <motion.span
              key={f.id}
              initial={{ opacity: 1, scale: 0.5 }}
              animate={{ y: "-110vh", opacity: [1, 1, 0.3, 0], scale: [0.5, 1.3, 1] }}
              transition={{
                duration: f.duration,
                delay: f.delay,
                ease: "easeOut",
              }}
              className="absolute"
              style={{
                fontSize: f.size,
                left: `${f.x}vw`,
                bottom: "-5vh",
              }}
            >
              {f.emoji}
            </motion.span>
          ))}

          {/* Central dramatic message */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 pointer-events-none">
            <motion.span
              initial={{ scale: 0, rotate: -15 }}
              animate={{ scale: [0, 1.5, 1], rotate: [-15, 8, 0] }}
              transition={{ duration: 0.6, ease: "backOut" }}
              style={{ fontSize: 96, display: "block" }}
            >
              {incomingVibe.emoji}
            </motion.span>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.4 }}
              className="text-center px-6"
            >
              <p className="text-white text-2xl font-bold drop-shadow-lg">
                Your partner sent you a
              </p>
              <p className="text-white text-4xl font-black drop-shadow-lg mt-1">
                {incomingVibe.label}! {incomingVibe.emoji}
              </p>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2, duration: 0.5 }}
              className="text-white/60 text-sm mt-6"
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
