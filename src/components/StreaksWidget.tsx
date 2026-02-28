import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Flame, MessageCircle, ListChecks, Gamepad2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { differenceInCalendarDays, subDays, format } from "date-fns";

interface StreakData {
  taskStreak: number;
  chatStreak: number;
  totalTasks: number;
  totalMessages: number;
}

const StreaksWidget = () => {
  const { user } = useAuth();
  const [data, setData] = useState<StreakData>({ taskStreak: 0, chatStreak: 0, totalTasks: 0, totalMessages: 0 });

  useEffect(() => {
    if (!user) return;

    const computeStreak = async () => {
      // Get completed tasks dates
      const { data: tasks } = await supabase
        .from("weekly_tasks")
        .select("completed_at")
        .eq("user_id", user.id)
        .eq("done", true)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false })
        .limit(100);

      // Get message dates
      const { data: messages } = await supabase
        .from("messages")
        .select("created_at")
        .eq("sender_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200);

      const calcStreak = (dates: string[]) => {
        if (!dates.length) return 0;
        const uniqueDays = [...new Set(dates.map(d => format(new Date(d), "yyyy-MM-dd")))].sort().reverse();
        let streak = 0;
        const today = format(new Date(), "yyyy-MM-dd");
        const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");

        // Must include today or yesterday
        if (uniqueDays[0] !== today && uniqueDays[0] !== yesterday) return 0;

        for (let i = 0; i < uniqueDays.length; i++) {
          const expected = format(subDays(new Date(uniqueDays[0]), i), "yyyy-MM-dd");
          if (uniqueDays[i] === expected) streak++;
          else break;
        }
        return streak;
      };

      setData({
        taskStreak: calcStreak((tasks || []).map(t => t.completed_at!)),
        chatStreak: calcStreak((messages || []).map(m => m.created_at)),
        totalTasks: tasks?.length || 0,
        totalMessages: messages?.length || 0,
      });
    };

    computeStreak();
  }, [user]);

  const maxStreak = Math.max(data.taskStreak, data.chatStreak);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <Flame className={`w-4 h-4 ${maxStreak > 0 ? "text-orange-500" : "text-muted-foreground"}`} />
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Streaks & Activity</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-secondary p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <ListChecks className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium text-muted-foreground">Tasks</span>
          </div>
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-2xl font-bold text-foreground">{data.taskStreak}</span>
            <Flame className={`w-3.5 h-3.5 ${data.taskStreak > 0 ? "text-orange-500" : "text-muted-foreground/30"}`} />
          </div>
          <p className="text-[13px] text-muted-foreground mt-0.5">day streak</p>
        </div>

        <div className="rounded-xl bg-secondary p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <MessageCircle className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium text-muted-foreground">Chat</span>
          </div>
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-2xl font-bold text-foreground">{data.chatStreak}</span>
            <Flame className={`w-3.5 h-3.5 ${data.chatStreak > 0 ? "text-orange-500" : "text-muted-foreground/30"}`} />
          </div>
          <p className="text-[13px] text-muted-foreground mt-0.5">day streak</p>
        </div>
      </div>

      {/* Milestone badges */}
      <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-hide">
        {data.totalMessages >= 1 && <Badge emoji="💬" label="First Chat" />}
        {data.totalMessages >= 100 && <Badge emoji="🗣️" label="100 Msgs" />}
        {data.totalTasks >= 1 && <Badge emoji="✅" label="First Task" />}
        {data.totalTasks >= 50 && <Badge emoji="🏆" label="50 Tasks" />}
        {maxStreak >= 3 && <Badge emoji="🔥" label="3-Day Streak" />}
        {maxStreak >= 7 && <Badge emoji="⚡" label="Week Streak" />}
        {maxStreak >= 30 && <Badge emoji="🌟" label="Month Streak" />}
        {data.totalMessages === 0 && data.totalTasks === 0 && (
          <p className="text-[14px] text-muted-foreground py-1">Complete tasks & chat to earn badges!</p>
        )}
      </div>
    </motion.div>
  );
};

const Badge = ({ emoji, label }: { emoji: string; label: string }) => (
  <div className="flex-shrink-0 flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1">
    <span className="text-sm">{emoji}</span>
    <span className="text-[14px] font-medium text-foreground whitespace-nowrap">{label}</span>
  </div>
);

export default StreaksWidget;
