import { Bell, Settings, Heart } from "lucide-react";
import { haptics } from "@/lib/haptics";
import { useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import usLogo from "@/assets/us-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const vibes = [
  { emoji: "🤗", label: "Hug" },
  { emoji: "💋", label: "Kiss" },
  { emoji: "❤️", label: "Love" },
  { emoji: "🖕", label: "Finger" },
  { emoji: "👅", label: "Oral" },
  { emoji: "👉", label: "Poke" },
];

interface AppHeaderProps {
  subtitle?: string;
}

const AppHeader = ({ subtitle }: AppHeaderProps) => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [vibeOpen, setVibeOpen] = useState(false);
  const vibeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (vibeRef.current && !vibeRef.current.contains(e.target as Node)) setVibeOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const sendVibe = async (emoji: string, label: string) => {
    setVibeOpen(false);
    haptics.success();

    if (user && profile?.partner_id) {
      const partnerId = profile.partner_id;
      const channelName = `vibe-${[user.id, partnerId].sort().join("-")}`;
      const ts = Date.now();

      // Get or create the shared vibe channel — VibeOverlay may already
      // be subscribed to it, so we must NOT remove it after sending.
      const channel = supabase.channel(channelName);
      
      // If already subscribed (VibeOverlay owns it), just send directly
      if ((channel as any).state === "joined") {
        channel.send({
          type: "broadcast",
          event: "vibe",
          payload: { senderId: user.id, emoji, label, ts },
        });
      } else {
        // Subscribe then send, but don't remove — let VibeOverlay manage lifecycle
        channel.subscribe((status) => {
          if (status === "SUBSCRIBED") {
            channel.send({
              type: "broadcast",
              event: "vibe",
              payload: { senderId: user.id, emoji, label, ts },
            });
          }
        });
      }

      // Also persist to DB (backup + history)
      await supabase.from("messages").insert({
        sender_id: user.id,
        receiver_id: partnerId,
        content: JSON.stringify({ emoji, label }),
        message_type: "vibe",
      } as any);

      // Send push notification for when partner's app is closed
      try {
        const pushRes = await supabase.functions.invoke("send-push-notification", {
          body: {
            recipientUserId: partnerId,
            title: `${emoji} ${label}!`,
            body: `${profile.username || "Your partner"} sent you a ${label.toLowerCase()}!`,
            data: { type: "vibe", emoji, label },
          },
        });
        console.log("Vibe push result:", pushRes.data, pushRes.error);
      } catch (e) {
        console.error("Vibe push notification failed:", e);
      }
    }

    toast({ title: `${emoji} ${label} sent to your partner!`, duration: 2000 });
  };

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 safe-area-top">
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-3">
          <img src={usLogo} alt="Us logo" className="w-10 h-10 rounded-full object-cover" />
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              Us
            </h1>
            {subtitle && <p className="text-xs text-muted-foreground -mt-0.5">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Send Vibe button */}
          <div ref={vibeRef} className="relative">
            <button
              onClick={() => setVibeOpen(!vibeOpen)}
              className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors"
            >
              <Heart className="w-5 h-5" />
            </button>
            <AnimatePresence>
              {vibeOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 z-50 rounded-2xl border border-border bg-card shadow-lg p-2 w-48"
                >
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 pb-1">Send a vibe</p>
                  <div className="grid grid-cols-3 gap-1">
                    {vibes.map((v) => (
                      <button
                        key={v.label}
                        onClick={() => sendVibe(v.emoji, v.label)}
                        className="flex flex-col items-center gap-0.5 rounded-xl py-2 px-1 hover:bg-accent/50 active:scale-95 transition-all"
                      >
                        <span className="text-xl">{v.emoji}</span>
                        <span className="text-[9px] font-medium text-muted-foreground">{v.label}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button className="w-11 h-11 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-us-coral" />
          </button>
          <button
            onClick={() => navigate("/profile")}
            className="w-11 h-11 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
