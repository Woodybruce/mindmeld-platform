import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Megaphone, Plus, Send, Trash2, Pin, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { notifyPartner } from "@/lib/notifyPartner";

interface Announcement {
  id: string;
  user_id: string;
  content: string;
  emoji: string;
  pinned: boolean;
  created_at: string;
}

const EMOJI_OPTIONS = ["📌", "❤️", "🔥", "💬", "🎉", "⚠️", "✨", "💡"];

const AnnouncementsWidget = () => {
  const { user, profile } = useAuth();
  const partnerId = profile?.partner_id;
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [composing, setComposing] = useState(false);
  const [text, setText] = useState("");
  const [emoji, setEmoji] = useState("📌");
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("couple_announcements")
      .select("*")
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(10);
    if (data) setAnnouncements(data as Announcement[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("announcements-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "couple_announcements" }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetch]);

  const post = async () => {
    if (!text.trim() || !user) return;
    const { error } = await supabase.from("couple_announcements").insert({
      user_id: user.id,
      content: text.trim(),
      emoji,
    } as any);
    if (error) {
      toast({ title: "Couldn't post", description: error.message, variant: "destructive" });
    } else {
      setText("");
      setComposing(false);
      setEmoji("📌");
      // Notify partner
      if (profile?.partner_id) {
        notifyPartner({
          partnerId: profile.partner_id,
          title: `${emoji} New update from ${profile?.username || "your partner"}`,
          body: text.trim().slice(0, 100),
          route: "/",
          senderId: user.id,
        });
      }
    }
  };

  const remove = async (id: string) => {
    await supabase.from("couple_announcements").delete().eq("id", id);
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
  };

  const togglePin = async (a: Announcement) => {
    await supabase.from("couple_announcements").update({ pinned: !a.pinned } as any).eq("id", a.id);
    fetch();
  };

  if (loading) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-2xl overflow-hidden"
    >
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white shrink-0">
          <Megaphone className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-base font-semibold text-foreground">Our Board</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Shared updates & pinned notes</p>
        </div>
        <button
          onClick={() => setComposing(!composing)}
          className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors"
        >
          {composing ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </button>
      </div>

      {/* Compose */}
      <AnimatePresence>
        {composing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 space-y-2">
              <div className="flex gap-1.5 flex-wrap">
                {EMOJI_OPTIONS.map((e) => (
                  <button
                    key={e}
                    onClick={() => setEmoji(e)}
                    className={`w-8 h-8 rounded-lg text-base flex items-center justify-center transition-colors ${
                      emoji === e ? "bg-primary/20 ring-2 ring-primary" : "bg-secondary/60 hover:bg-secondary"
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && post()}
                  placeholder="Post an update..."
                  className="flex-1 bg-secondary/60 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 ring-primary/30"
                  autoFocus
                />
                <button
                  onClick={post}
                  disabled={!text.trim()}
                  className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground disabled:opacity-40 transition-opacity"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Announcements list */}
      <div className="px-4 pb-4 pt-1 space-y-1.5 max-h-[220px] overflow-y-auto scrollbar-hide">
        {announcements.length === 0 && !composing && (
          <button
            onClick={() => setComposing(true)}
            className="w-full py-4 text-center text-xs text-muted-foreground"
          >
            No updates yet — tap + to post one
          </button>
        )}
        {announcements.map((a, i) => {
          const isOwn = a.user_id === user?.id;
          return (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`flex items-start gap-2.5 rounded-xl px-3 py-2.5 ${
                a.pinned ? "bg-amber-500/10 border border-amber-500/20" : "bg-secondary/40"
              }`}
            >
              <span className="text-base mt-0.5">{a.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">{a.content}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {isOwn ? "You" : "Partner"} · {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                </p>
              </div>
              {isOwn && (
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => togglePin(a)} className="p-1 rounded-md hover:bg-secondary transition-colors">
                    <Pin className={`w-3.5 h-3.5 ${a.pinned ? "text-amber-500" : "text-muted-foreground"}`} />
                  </button>
                  <button onClick={() => remove(a.id)} className="p-1 rounded-md hover:bg-destructive/10 transition-colors">
                    <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default AnnouncementsWidget;
