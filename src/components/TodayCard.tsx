import { useState } from "react";
import { Check, Plus, ChevronRight, Clock, MapPin, CalendarDays, ListChecks } from "lucide-react";
import { haptics } from "@/lib/haptics";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useWeeklyTasks } from "@/hooks/useWeeklyTasks";
import { useCalendarEvents, CalendarEvent } from "@/hooks/useCalendarEvents";
import { useSharedLists } from "@/hooks/useSharedLists";

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

const TodayCard = () => {
  const navigate = useNavigate();
  const { tasks, loading: tasksLoading, toggleTask, getTodayTasks } = useWeeklyTasks();
  const { events, loading: eventsLoading } = useCalendarEvents();
  const { lists, loading: listsLoading } = useSharedLists();
  const [expanded, setExpanded] = useState(false);

  const allTodayTasks = getTodayTasks();
  const undoneTasks = allTodayTasks.filter((t) => !t.done);
  const doneTasks = allTodayTasks.filter((t) => t.done);
  const todayEvents = getTodayEvents(events);

  const loading = tasksLoading || eventsLoading;
  if (loading) return null;

  const now = new Date();
  const dateLabel = now.toLocaleDateString("default", { weekday: "long", day: "numeric", month: "long" });

  const doneCount = doneTasks.length;
  const taskTotal = allTodayTasks.length;
  const totalItems = taskTotal + todayEvents.length;
  const progressPercent = totalItems > 0 ? (doneCount / totalItems) * 100 : 0;

  const hasContent = undoneTasks.length > 0 || todayEvents.length > 0 || doneTasks.length > 0;

  const activeListCount = lists.filter((l) => {
    const checkable = l.items.filter((i) => !i.isHeading);
    return checkable.length > 0;
  }).length;

  const previewEvents = expanded ? todayEvents : todayEvents.slice(0, 2);
  const previewTasks = expanded ? undoneTasks : undoneTasks.slice(0, 3);
  const hiddenEventCount = expanded ? 0 : Math.max(0, todayEvents.length - 2);
  const hiddenTaskCount = expanded ? 0 : Math.max(0, undoneTasks.length - 3);
  const hiddenTotal = hiddenEventCount + hiddenTaskCount;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="rounded-2xl border border-border bg-card overflow-hidden"
      data-testid="card-today"
    >
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div>
          <h3 className="font-display text-base font-bold text-foreground" data-testid="text-today-date">{dateLabel}</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {taskTotal > 0 && `${doneCount}/${taskTotal} tasks done`}
            {taskTotal > 0 && todayEvents.length > 0 && " · "}
            {todayEvents.length > 0 && `${todayEvents.length} event${todayEvents.length !== 1 ? "s" : ""}`}
            {!taskTotal && !todayEvents.length && "Nothing planned"}
          </p>
        </div>
        <button
          onClick={() => navigate("/us?tab=admin")}
          className="w-8 h-8 rounded-xl bg-secondary/60 flex items-center justify-center hover:bg-secondary transition-colors"
          data-testid="button-open-calendar"
        >
          <CalendarDays className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {!hasContent && (
        <button
          onClick={() => navigate("/us?tab=lists")}
          className="w-full px-4 pb-4 text-center"
          data-testid="button-add-tasks"
        >
          <div className="rounded-xl border border-dashed border-border/60 py-4">
            <Plus className="w-5 h-5 mx-auto text-muted-foreground/50 mb-1" />
            <p className="text-xs text-muted-foreground">Add tasks for today</p>
          </div>
        </button>
      )}

      {previewEvents.length > 0 && (
        <div className="px-4 pb-1 space-y-0.5">
          {previewEvents.map((event) => (
            <div key={event.id} className="flex items-start gap-2.5 py-1.5" data-testid={`event-today-${event.id}`}>
              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-[7px] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-foreground truncate">{event.subject}</p>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                  <Clock className="w-2.5 h-2.5" />
                  <span>{formatEventTime(event)}</span>
                  {event.location && (
                    <>
                      <span className="text-border">·</span>
                      <MapPin className="w-2.5 h-2.5" />
                      <span className="truncate">{event.location}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {previewTasks.length > 0 && (
        <div className="px-4 pb-1 space-y-0.5">
          {previewTasks.map((task) => (
            <div key={task.id} className="flex items-center gap-2.5 py-1.5" data-testid={`task-today-${task.id}`}>
              <button
                onClick={(e) => { e.stopPropagation(); haptics.light(); toggleTask(task.id); }}
                className="w-[18px] h-[18px] rounded-full flex-shrink-0 flex items-center justify-center transition-colors border-2 border-border hover:border-primary/50"
                data-testid={`button-toggle-task-${task.id}`}
              >
              </button>
              <span className="flex-1 text-[13px] text-foreground">{task.text}</span>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {expanded && doneTasks.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-1 space-y-0.5">
              {doneTasks.map((task) => (
                <div key={task.id} className="flex items-center gap-2.5 py-1.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); haptics.light(); toggleTask(task.id); }}
                    className="w-[18px] h-[18px] rounded-full flex-shrink-0 flex items-center justify-center transition-colors bg-primary text-primary-foreground"
                  >
                    <Check className="w-2.5 h-2.5" />
                  </button>
                  <span className="flex-1 text-[13px] text-muted-foreground line-through">{task.text}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {(hiddenTotal > 0 || doneTasks.length > 0) && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1 py-1.5 text-[11px] text-primary font-medium hover:bg-secondary/30 transition-colors"
          data-testid="button-expand-today"
        >
          {expanded ? "Show less" : hiddenTotal > 0 ? `+${hiddenTotal} more` : `${doneTasks.length} completed`}
        </button>
      )}

      {totalItems > 0 && (
        <div className="px-4 pb-2.5 pt-1">
          <div className="h-1 rounded-full bg-secondary overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="h-full rounded-full bg-primary"
            />
          </div>
        </div>
      )}

      {!listsLoading && activeListCount > 0 && (
        <button
          onClick={() => navigate("/us?tab=lists")}
          className="w-full flex items-center gap-2 px-4 py-2.5 border-t border-border/50 hover:bg-secondary/30 transition-colors"
          data-testid="button-lists-pill"
        >
          <ListChecks className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[11px] font-medium text-muted-foreground">{activeListCount} active list{activeListCount !== 1 ? "s" : ""}</span>
          <ChevronRight className="w-3 h-3 text-muted-foreground/50 ml-auto" />
        </button>
      )}
    </motion.div>
  );
};

export default TodayCard;
