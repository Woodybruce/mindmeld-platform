/**
 * Hook that keeps the iOS widget data in sync.
 * Call once near the app root (e.g. in Index.tsx).
 * It listens to auth, tasks, and calendar data and pushes updates.
 */

import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useWeeklyTasks } from "@/hooks/useWeeklyTasks";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { pushWidgetData, type WidgetData } from "@/lib/widgetBridge";

export function useWidgetSync() {
  const { profile } = useAuth();
  const { getTodayTasks } = useWeeklyTasks();
  const { getUpcomingEvents } = useCalendarEvents();

  useEffect(() => {
    const todayTasks = getTodayTasks();
    const upcoming = getUpcomingEvents(1);

    const data: WidgetData = {
      username: profile?.username || "You",
      partnerName: "Partner",
      tasks: todayTasks.map((t) => ({ text: t.text, done: t.done })),
      nextEvent: upcoming.length > 0
        ? { subject: upcoming[0].subject, date: upcoming[0].start_time }
        : null,
      streakDays: 0, // extend later with real streak data
      updatedAt: new Date().toISOString(),
    };

    pushWidgetData(data);
  }, [profile, getTodayTasks, getUpcomingEvents]);
}
