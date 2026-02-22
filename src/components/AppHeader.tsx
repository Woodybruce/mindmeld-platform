import { Bell, Settings, Heart, CheckCheck, MessageSquare, Gamepad2, ListChecks, Smile } from "lucide-react";
import { haptics } from "@/lib/haptics";
import { useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import usLogo from "@/assets/us-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications, type AppNotification } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";

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

const notifIcon = (type: AppNotification["type"]) => {
  switch (type) {
    case "game": return <Gamepad2 className="w-4 h-4 text-primary" />;
    case "list": return <ListChecks className="w-4 h-4 text-primary" />;
    case "vibe": return <Heart className="w-4 h-4 text-us-coral" />;
    case "mood": return <Smile className="w-4 h-4 text-primary" />;
    default: return <MessageSquare className="w-4 h-4 text-muted-foreground" />;
  }
};

const AppHeader = ({ subtitle }: AppHeaderProps) => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { notifications, unreadCount, markAllRead, markOneRead } = useNotifications();
  const [vibeOpen, setVibeOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const vibeRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (vibeRef.current && !vibeRef.current.contains(e.target as Node)) setVibeOpen(false);
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleMarkAllRead = async () => {
    haptics.light();
    await markAllRead();
    toast({ title: "✓ All marked as read", duration: 2000 });
  };

  const handleNotifClick = async (n: AppNotification) => {
    if (!n.read) await markOneRead(n.id);
    setBellOpen(false);
    if (n.route) navigate(n.route);
  };

  const sendVibe = async (emoji: string, label: string) => {
    setVibeOpen(false);
    haptics.success();

    if (user && profile?.partner_id) {
      const partnerId = profile.partner_id;
      const channelName = `vibe-${[user.id, partnerId].sort().join("-")}`;
      const ts = Date.now();

      const channel = supabase.channel(channelName);
      
      if ((channel as any).state === "joined") {
        channel.send({
          type: "broadcast",
          event: "vibe",
          payload: { senderId: user.id, emoji, label, ts },
        });
      } else {
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

      await supabase.from("messages").insert({
        sender_id: user.id,
        receiver_id: partnerId,
        content: JSON.stringify({ emoji, label }),
        message_type: "vibe",
      } as any);

      try {
        await supabase.functions.invoke("send-push-notification", {
          body: {
            recipientUserId: partnerId,
            title: `${emoji} ${label}!`,
            body: `${profile.username || "Your partner"} sent you a ${label.toLowerCase()}!`,
            data: { type: "vibe", emoji, label },
          },
        });
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
              onClick={() => { setVibeOpen(!vibeOpen); setBellOpen(false); }}
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

          {/* Notifications bell */}
          <div ref={bellRef} className="relative">
            <button
              onClick={() => { setBellOpen(!bellOpen); setVibeOpen(false); }}
              className="w-11 h-11 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors relative"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-us-coral" />
              )}
            </button>

            <AnimatePresence>
              {bellOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 z-50 rounded-2xl border border-border bg-card shadow-xl w-72 max-h-80 overflow-hidden"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/50">
                    <p className="text-xs font-bold text-foreground">Notifications</p>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="flex items-center gap-1 text-[10px] font-medium text-primary hover:text-primary/80 transition-colors"
                      >
                        <CheckCheck className="w-3 h-3" />
                        Mark all read
                      </button>
                    )}
                  </div>

                  {/* List */}
                  <div className="overflow-y-auto max-h-64 divide-y divide-border/30">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center">
                        <Bell className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
                        <p className="text-xs text-muted-foreground">No notifications yet</p>
                      </div>
                    ) : (
                      notifications.slice(0, 15).map((n) => (
                        <button
                          key={n.id}
                          onClick={() => handleNotifClick(n)}
                          className={`w-full flex items-start gap-2.5 px-3 py-2.5 text-left hover:bg-accent/30 transition-colors ${
                            !n.read ? "bg-primary/5" : ""
                          }`}
                        >
                          <div className="mt-0.5 flex-shrink-0">
                            {notifIcon(n.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs leading-tight ${!n.read ? "font-semibold text-foreground" : "text-foreground/80"}`}>
                              {n.title}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                              {n.body}
                            </p>
                            <p className="text-[9px] text-muted-foreground/70 mt-0.5">
                              {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                            </p>
                          </div>
                          {!n.read && (
                            <span className="w-2 h-2 rounded-full bg-primary mt-1 flex-shrink-0" />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

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
