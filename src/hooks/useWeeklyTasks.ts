import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface TaskAttachment {
  type: "photo" | "file" | "event";
  url?: string;
  name?: string;
  date?: string;
}

export interface WeeklyTask {
  id: string;
  user_id: string;
  text: string;
  done: boolean;
  scheduled_date: string;
  sort_order: number;
  source: string;
  source_id: string | null;
  created_at: string;
  completed_at: string | null;
  attachments: TaskAttachment[];
}

const getTasksCache = (userId: string): WeeklyTask[] | null => {
  try {
    const raw = localStorage.getItem(`us-tasks-${userId}`);
    if (!raw) return null;
    const { data, ts, dateStr } = JSON.parse(raw);
    const todayStr = new Date().toISOString().split("T")[0];
    if (dateStr !== todayStr || Date.now() - ts > 1000 * 60 * 15) return null;
    return data;
  } catch { return null; }
};
const setTasksCache = (userId: string, tasks: WeeklyTask[]) => {
  const todayStr = new Date().toISOString().split("T")[0];
  try { localStorage.setItem(`us-tasks-${userId}`, JSON.stringify({ data: tasks, ts: Date.now(), dateStr: todayStr })); } catch {}
};

export function useWeeklyTasks() {
  const { user } = useAuth();
  const cached = user ? getTasksCache(user.id) : null;
  const [tasks, setTasks] = useState<WeeklyTask[]>(cached || []);
  const [loading, setLoading] = useState(!cached);

  const fetchTasks = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    if (!tasks.length) setLoading(true);

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const endDate = new Date(now);
    endDate.setDate(now.getDate() + 6);

    const startStr = now.toISOString().split("T")[0];
    const endStr = endDate.toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("weekly_tasks")
      .select("*")
      .gte("scheduled_date", startStr)
      .lte("scheduled_date", endStr)
      .order("scheduled_date", { ascending: true })
      .order("sort_order", { ascending: true });

    if (!error && data) {
      const mapped = data.map((d: any) => ({ ...d, attachments: Array.isArray(d.attachments) ? d.attachments : [] })) as WeeklyTask[];
      setTasks(mapped);
      if (user) setTasksCache(user.id, mapped);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("weekly-tasks-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "weekly_tasks" }, () => {
        fetchTasks();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchTasks]);

  const addTask = useCallback(async (text: string, scheduledDate: string, source = "manual", sourceId?: string) => {
    if (!user) return;
    const maxOrder = tasks
      .filter((t) => t.scheduled_date === scheduledDate)
      .reduce((max, t) => Math.max(max, t.sort_order), -1);

    const { error } = await supabase.from("weekly_tasks").insert({
      user_id: user.id,
      text,
      scheduled_date: scheduledDate,
      sort_order: maxOrder + 1,
      source,
      source_id: sourceId || null,
    } as any);
    if (error) throw error;
    await fetchTasks();
  }, [user, tasks, fetchTasks]);

  const syncCache = useCallback((updated: WeeklyTask[]) => {
    if (user) setTasksCache(user.id, updated);
  }, [user]);

  const toggleTask = useCallback(async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const nowDone = !task.done;
    await supabase.from("weekly_tasks").update({
      done: nowDone,
      completed_at: nowDone ? new Date().toISOString() : null,
    } as any).eq("id", id);
    setTasks((prev) => {
      const updated = prev.map((t) => t.id === id ? { ...t, done: nowDone, completed_at: nowDone ? new Date().toISOString() : null } : t);
      syncCache(updated);
      return updated;
    });
  }, [tasks, syncCache]);

  const deleteTask = useCallback(async (id: string) => {
    await supabase.from("weekly_tasks").delete().eq("id", id);
    setTasks((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      syncCache(updated);
      return updated;
    });
  }, [syncCache]);

  const updateTaskText = useCallback(async (id: string, text: string) => {
    await supabase.from("weekly_tasks").update({ text } as any).eq("id", id);
    setTasks((prev) => {
      const updated = prev.map((t) => t.id === id ? { ...t, text } : t);
      syncCache(updated);
      return updated;
    });
  }, [syncCache]);

  const updateTaskAttachments = useCallback(async (id: string, attachments: TaskAttachment[]) => {
    await supabase.from("weekly_tasks").update({ attachments: JSON.parse(JSON.stringify(attachments)) } as any).eq("id", id);
    setTasks((prev) => {
      const updated = prev.map((t) => t.id === id ? { ...t, attachments } : t);
      syncCache(updated);
      return updated;
    });
  }, [syncCache]);
  const getTasksForDate = useCallback((dateStr: string) => {
    return tasks.filter((t) => t.scheduled_date === dateStr);
  }, [tasks]);

  const getTodayTasks = useCallback(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    return tasks.filter((t) => t.scheduled_date === todayStr);
  }, [tasks]);

  // Get the week ahead (today + 6 days)
  const getWeekDates = useCallback(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const todayStr = now.toISOString().split("T")[0];
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    const dates: { date: Date; dateStr: string; label: string; isToday: boolean }[] = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      const isToday = dateStr === todayStr;
      dates.push({ date: d, dateStr, label: dayNames[d.getDay()], isToday });
    }
    return dates;
  }, []);

  return {
    tasks,
    loading,
    addTask,
    toggleTask,
    deleteTask,
    updateTaskText,
    updateTaskAttachments,
    getTasksForDate,
    getTodayTasks,
    getWeekDates,
    fetchTasks,
  };
}
