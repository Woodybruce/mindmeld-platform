import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Bell, ListChecks, Camera, MessageCircle, Calendar, FileText, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";

interface ActivityItem {
  id: string;
  type: "list" | "photo" | "message" | "file" | "task";
  label: string;
  detail: string;
  time: Date;
  route: string;
  icon: React.ReactNode;
  color: string;
}

const iconMap = {
  list: <ListChecks className="w-3.5 h-3.5" />,
  photo: <Camera className="w-3.5 h-3.5" />,
  message: <MessageCircle className="w-3.5 h-3.5" />,
  file: <FileText className="w-3.5 h-3.5" />,
  task: <Calendar className="w-3.5 h-3.5" />,
};

const colorMap: Record<string, string> = {
  list: "bg-blue-500/15 text-blue-600",
  photo: "bg-pink-500/15 text-pink-600",
  message: "bg-[hsl(var(--us-navy))]/15 text-[hsl(var(--us-navy))]",
  file: "bg-[hsl(var(--us-sage))]/15 text-[hsl(var(--us-sage))]",
  task: "bg-[hsl(var(--us-gold))]/15 text-[hsl(var(--us-gold))]",
};

const RecentActivityWidget = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const partnerId = profile?.partner_id;

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    const fetchActivity = async () => {
      const items: ActivityItem[] = [];

      // Recent messages
      if (partnerId) {
        const { data: msgs } = await supabase
          .from("messages")
          .select("id, content, message_type, created_at, sender_id")
          .or(
            `and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`
          )
          .order("created_at", { ascending: false })
          .limit(3);

        (msgs || []).forEach((m) => {
          const isYou = m.sender_id === user.id;
          const preview = m.message_type === "image" ? "Shared a photo" : (m.content?.slice(0, 40) || "Message");
          items.push({
            id: `msg-${m.id}`,
            type: "message",
            label: isYou ? "You sent a message" : "Partner messaged you",
            detail: preview,
            time: new Date(m.created_at),
            route: "/chat",
            icon: iconMap.message,
            color: colorMap.message,
          });
        });

        // Recent photos
        const { data: photos } = await supabase
          .from("couple_photos")
          .select("id, created_at, user_id")
          .or(`user_id.eq.${user.id},user_id.eq.${partnerId}`)
          .order("created_at", { ascending: false })
          .limit(2);

        (photos || []).forEach((p) => {
          items.push({
            id: `photo-${p.id}`,
            type: "photo",
            label: p.user_id === user.id ? "You uploaded a photo" : "Partner added a photo",
            detail: "New photo in gallery",
            time: new Date(p.created_at),
            route: "/us?tab=photos",
            icon: iconMap.photo,
            color: colorMap.photo,
          });
        });

        // Recent shared files
        const { data: files } = await supabase
          .from("shared_files")
          .select("id, file_name, created_at, user_id")
          .or(`user_id.eq.${user.id},user_id.eq.${partnerId}`)
          .order("created_at", { ascending: false })
          .limit(2);

        (files || []).forEach((f) => {
          items.push({
            id: `file-${f.id}`,
            type: "file",
            label: f.user_id === user.id ? "You uploaded a file" : "Partner shared a file",
            detail: f.file_name,
            time: new Date(f.created_at),
            route: "/us?tab=admin",
            icon: iconMap.file,
            color: colorMap.file,
          });
        });
      }

      // Recent weekly tasks
      const { data: tasks } = await supabase
        .from("weekly_tasks")
        .select("id, text, done, created_at, completed_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(2);

      (tasks || []).forEach((t) => {
        const doneRecently = t.done && t.completed_at;
        items.push({
          id: `task-${t.id}`,
          type: "task",
          label: doneRecently ? "Task completed" : "Task added",
          detail: t.text?.slice(0, 40) || "Weekly task",
          time: new Date(doneRecently ? t.completed_at! : t.created_at),
          route: "/us?tab=lists",
          icon: iconMap.task,
          color: colorMap.task,
        });
      });

      // Local lists changes
      const stored = localStorage.getItem("userLists");
      if (stored) {
        try {
          const lists = JSON.parse(stored);
          lists.slice(0, 2).forEach((l: any) => {
            items.push({
              id: `list-${l.id}`,
              type: "list",
              label: "List updated",
              detail: l.name,
              time: new Date(l.createdAt || Date.now()),
              route: "/us?tab=lists",
              icon: iconMap.list,
              color: colorMap.list,
            });
          });
        } catch {}
      }

      // Sort by most recent, take top 5
      items.sort((a, b) => b.time.getTime() - a.time.getTime());
      setActivities(items.slice(0, 5));
      setLoading(false);
    };

    fetchActivity();
  }, [user, partnerId]);

  if (loading || activities.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-2xl overflow-hidden"
    >
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(var(--us-coral))] to-[hsl(var(--us-terracotta))] flex items-center justify-center text-white shrink-0">
          <Bell className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-base font-semibold text-foreground">What's New</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Recent activity across your world</p>
        </div>
      </div>

      <div className="px-4 pb-4 pt-1 space-y-1.5">
        {activities.map((a, i) => (
          <motion.button
            key={a.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => navigate(a.route)}
            className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-secondary/60 transition-colors text-left"
          >
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${a.color}`}>
              {a.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{a.label}</p>
              <p className="text-[10px] text-muted-foreground truncate">{a.detail}</p>
            </div>
            <span className="text-[10px] text-muted-foreground/60 shrink-0 whitespace-nowrap">
              {formatDistanceToNow(a.time, { addSuffix: true })}
            </span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
};

export default RecentActivityWidget;
