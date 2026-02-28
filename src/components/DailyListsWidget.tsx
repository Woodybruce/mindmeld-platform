import { useState } from "react";
import { Check, Plus, CalendarDays, ChevronDown, Clock, MapPin } from "lucide-react";
import { haptics } from "@/lib/haptics";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useWeeklyTasks } from "@/hooks/useWeeklyTasks";
import { useCalendarEvents, CalendarEvent } from "@/hooks/useCalendarEvents";

function formatEventTime(event: CalendarEvent) {
  if (event.is_all_day) return "All day";
  const start = new Date(event.start_time);
  const end = new Date(event.end_time);
  const fmt = (d: Date) => d.toLocaleTimeString("default", { hour: "numeric", minute: "2-digit" });
  return `${fmt(start)} – ${fmt(end)}`;
}

function getTodayEvents(events: CalendarEvent[]) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  return events.filter((e) => {
    const start = new Date(e.start_time);
    const end = new Date(e.end_time);
    return start < todayEnd && end > todayStart;
  }).sort((a, b) => {
    if (a.is_all_day && !b.is_all_day) return -1;
    if (!a.is_all_day && b.is_all_day) return 1;
    return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
  });
}

const DailyListsWidget = () => {
  const navigate = useNavigate();
  const { tasks, loading: tasksLoading, toggleTask, getTodayTasks } = useWeeklyTasks();
  const { events, loading: eventsLoading } = useCalendarEvents();
  const allTodayTasks = getTodayTasks();
  const todayTasks = allTodayTasks.filter((t) => !t.done);
  const todayEvents = getTodayEvents(events);
  const [expanded, setExpanded] = useState(false);

  const loading = tasksLoading || eventsLoading;
  if (loading) return null;

  const hasContent = todayTasks.length > 0 || todayEvents.length > 0;

  if (!hasContent) {
    return (
      <motion.button
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => navigate("/us?tab=lists")}
        className="w-full rounded-2xl border border-dashed border-border bg-card p-6 text-center"
      >
        <Plus className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
        <h3 className="font-display text-base font-bold text-foreground">Add Today's Tasks</h3>
        <p className="text-xs text-muted-foreground mt-1">Plan your day in the Weekly List</p>
      </motion.button>
    );
  }

  const doneCount = allTodayTasks.filter((t) => t.done).length;
  const totalCount = allTodayTasks.length + todayEvents.length;
  const todayLabel = new Date().toLocaleDateString("default", { weekday: "long" });

  const previewTasks = todayTasks.slice(0, 2);
  const remainingTasks = todayTasks.slice(2);
  const previewEvents = expanded ? todayEvents : todayEvents.slice(0, 2);
  const hasMore = remainingTasks.length > 0 || (!expanded && todayEvents.length > 2);
  const moreCount = remainingTasks.length + (expanded ? 0 : Math.max(0, todayEvents.length - 2));

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="rounded-2xl border border-border bg-card overflow-hidden"
    >
      <button onClick={() => navigate("/us?tab=lists")} className="w-full px-4 pt-4 pb-2 flex items-center justify-between text-left">
        <div className="flex items-center gap-2.5">
          <CalendarDays className="w-5 h-5 text-primary" />
          <div>
            <h3 className="font-display text-base font-bold text-foreground">{todayLabel}'s Tasks</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {allTodayTasks.length > 0 ? `${doneCount}/${allTodayTasks.length} done` : ""}
              {allTodayTasks.length > 0 && todayEvents.length > 0 ? " · " : ""}
              {todayEvents.length > 0 ? `${todayEvents.length} event${todayEvents.length !== 1 ? "s" : ""}` : ""}
            </p>
          </div>
        </div>
      </button>

      {/* Today's calendar events */}
      {(expanded ? todayEvents : todayEvents.slice(0, 2)).length > 0 && (
        <div className="px-4 pb-1 space-y-1">
          {(expanded ? todayEvents : todayEvents.slice(0, 2)).map((event) => (
            <div key={event.id} className="flex items-start gap-3 py-1.5" data-testid={`event-today-${event.id}`}>
              <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center bg-primary/15 mt-0.5">
                <Clock className="w-3 h-3 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate">{event.subject}</p>
                <div className="flex items-center gap-2 text-[12px] text-muted-foreground mt-0.5">
                  <span>{formatEventTime(event)}</span>
                  {event.location && (
                    <span className="flex items-center gap-0.5 truncate">
                      <MapPin className="w-2.5 h-2.5" />
                      {event.location}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tasks */}
      {previewTasks.length > 0 && (
        <div className="px-4 pb-1 space-y-1">
          {previewTasks.map((task) => (
            <div key={task.id} className="flex items-center gap-3 py-2" data-testid={`task-today-${task.id}`}>
              <button
                onClick={(e) => { e.stopPropagation(); haptics.light(); toggleTask(task.id); }}
                className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center transition-colors ${
                  task.done ? "bg-primary text-primary-foreground" : "border-2 border-border"
                }`}
              >
                {task.done && <Check className="w-3 h-3" />}
              </button>
              <span className={`flex-1 text-sm ${task.done ? "text-muted-foreground" : "text-foreground"}`}>
                {task.text}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Expandable remaining tasks */}
      <AnimatePresence>
        {expanded && remainingTasks.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 space-y-1">
              {remainingTasks.map((task) => (
                <div key={task.id} className="flex items-center gap-3 py-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); haptics.light(); toggleTask(task.id); }}
                    className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center transition-colors ${
                      task.done ? "bg-primary text-primary-foreground" : "border-2 border-border"
                    }`}
                  >
                    {task.done && <Check className="w-3 h-3" />}
                  </button>
                  <span className={`flex-1 text-sm ${task.done ? "text-muted-foreground" : "text-foreground"}`}>
                    {task.text}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1 py-2 text-xs text-primary font-medium hover:bg-secondary/50 transition-colors"
        >
          {expanded ? "Show less" : `+${moreCount} more`}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
      )}

      {totalCount > 0 && (
        <div className="px-4 pb-4">
          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(doneCount / totalCount) * 100}%` }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="h-full rounded-full bg-primary"
            />
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default DailyListsWidget;
