import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Megaphone, Plus, Send, Trash2, Pin, X, ListChecks, Camera, Calendar, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { notifyPartner } from "@/lib/notifyPartner";
import { useNavigate } from "react-router-dom";

interface Announcement {
  id: string;
  user_id: string;
  content: string;
  emoji: string;
  pinned: boolean;
  created_at: string;
}

interface ActivityItem {
  id: string;
  type: string;
  label: string;
  detail: string;
  time: Date;
  route: string;
  icon: React.ReactNode;
  color: string;
}

const activityIconMap: Record<string, React.ReactNode> = {
  list: <ListChecks className="w-3.5 h-3.5" />,
  photo: <Camera className="w-3.5 h-3.5" />,
  file: <FileText className="w-3.5 h-3.5" />,
  task: <Calendar className="w-3.5 h-3.5" />,
};

const activityColorMap: Record<string, string> = {
  list: "bg-blue-500/15 text-blue-600",
  photo: "bg-pink-500/15 text-pink-600",
  file: "bg-[hsl(var(--us-sage))]/15 text-[hsl(var(--us-sage))]",
  task: "bg-[hsl(var(--us-gold))]/15 text-[hsl(var(--us-gold))]",
};

const EMOJI_OPTIONS = ["📌", "❤️", "🔥", "💬", "🎉", "⚠️", "✨", "💡"];

const AnnouncementsWidget = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const partnerId = profile?.partner_id;
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
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

  useEffect(() => {
    if (!user) return;
    const fetchActivity = async () => {
      const items: ActivityItem[] = [];

      if (partnerId) {
        const { data: photos } = await supabase
          .from("couple_photos")
          .select("id, created_at, user_id")
          .or(`user_id.eq.${user.id},user_id.eq.${partnerId}`)
          .order("created_at", { ascending: false })
          .limit(2);
        (photos || []).forEach((p) => {
          items.push({ id: `photo-${p.id}`, type: "photo", label: p.user_id === user.id ? "You uploaded a photo" : "Partner added a photo", detail: "New photo in gallery", time: new Date(p.created_at), route: "/us?tab=photos", icon: activityIconMap.photo, color: activityColorMap.photo });
        });

        const { data: files } = await supabase
          .from("shared_files")
          .select("id, file_name, created_at, user_id")
          .or(`user_id.eq.${user.id},user_id.eq.${partnerId}`)
          .order("created_at", { ascending: false })
          .limit(2);
        (files || []).forEach((f) => {
          items.push({ id: `file-${f.id}`, type: "file", label: f.user_id === user.id ? "You uploaded a file" : "Partner shared a file", detail: f.file_name, time: new Date(f.created_at), route: "/us?tab=admin", icon: activityIconMap.file, color: activityColorMap.file });
        });
      }

      const { data: tasks } = await supabase
        .from("weekly_tasks")
        .select("id, text, done, created_at, completed_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(2);
      (tasks || []).forEach((t) => {
        const doneRecently = t.done && t.completed_at;
        items.push({ id: `task-${t.id}`, type: "task", label: doneRecently ? "Task completed" : "Task added", detail: t.text?.slice(0, 40) || "Weekly task", time: new Date(doneRecently ? t.completed_at! : t.created_at), route: "/us?tab=lists", icon: activityIconMap.task, color: activityColorMap.task });
      });

      const { data: recentLists } = await supabase
        .from("shared_lists")
        .select("id, name, created_at")
        .order("created_at", { ascending: false })
        .limit(2);
      if (recentLists) {
        recentLists.forEach((l: any) => {
          items.push({ id: `list-${l.id}`, type: "list", label: "List updated", detail: l.name, time: new Date(l.created_at || Date.now()), route: "/us?tab=lists", icon: activityIconMap.list, color: activityColorMap.list });
        });
      }

      items.sort((a, b) => b.time.getTime() - a.time.getTime());
      setActivities(items.slice(0, 10));
    };
    fetchActivity();
  }, [user, partnerId]);

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

  type FeedItem =
    | { kind: "announcement"; data: Announcement; time: Date }
    | { kind: "activity"; data: ActivityItem; time: Date };

  const feed: FeedItem[] = [];
  announcements.forEach((a) => feed.push({ kind: "announcement", data: a, time: new Date(a.created_at) }));
  activities.forEach((a) => feed.push({ kind: "activity", data: a, time: a.time }));
  feed.sort((a, b) => {
    const aPinned = a.kind === "announcement" && (a.data as Announcement).pinned ? 1 : 0;
    const bPinned = b.kind === "announcement" && (b.data as Announcement).pinned ? 1 : 0;
    if (aPinned !== bPinned) return bPinned - aPinned;
    return b.time.getTime() - a.time.getTime();
  });
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
          data-testid="button-compose-announcement"
        >
          {composing ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </button>
      </div>

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

      <div className="px-4 pb-4 pt-1 space-y-1.5 max-h-[140px] overflow-y-auto scrollbar-hide">
        {feed.length === 0 && !composing && (
          <button
            onClick={() => setComposing(true)}
            className="w-full py-4 text-center text-xs text-muted-foreground"
          >
            No updates yet — tap + to post one
          </button>
        )}
        {feed.map((item, i) => {
          if (item.kind === "announcement") {
            const a = item.data as Announcement;
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
          } else {
            const a = item.data as ActivityItem;
            return (
              <motion.button
                key={a.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => navigate(a.route)}
                className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 bg-secondary/40 text-left"
                data-testid={`activity-${a.type}-${i}`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${a.color}`}>
                  {a.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{a.label}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{a.detail}</p>
                </div>
                <span className="text-[10px] text-muted-foreground/60 shrink-0 whitespace-nowrap">
                  {formatDistanceToNow(a.time, { addSuffix: true })}
                </span>
              </motion.button>
            );
          }
        })}
      </div>
    </motion.div>
  );
};

export default AnnouncementsWidget;
