import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Check, Trash2, CalendarDays, ChevronDown, ChevronRight, Loader2, Eye, EyeOff } from "lucide-react";
import { useWeeklyTasks } from "@/hooks/useWeeklyTasks";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { toast } from "@/hooks/use-toast";

const WeeklyList = () => {
  const { tasks, loading, addTask, toggleTask, deleteTask, getTasksForDate, getWeekDates } = useWeeklyTasks();
  const { events } = useCalendarEvents();
  const weekDates = getWeekDates();
  const [expandedDays, setExpandedDays] = useState<Set<string>>(() => {
    // Auto-expand today
    const todayStr = new Date().toISOString().split("T")[0];
    return new Set([todayStr]);
  });
  const [newItemText, setNewItemText] = useState<Record<string, string>>({});
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [showAllDays, setShowAllDays] = useState(false);

  const toggleDay = (dateStr: string) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dateStr)) next.delete(dateStr);
      else next.add(dateStr);
      return next;
    });
  };

  const handleAdd = async (dateStr: string) => {
    const text = (newItemText[dateStr] || "").trim();
    if (!text) return;
    try {
      await addTask(text, dateStr);
      setNewItemText((prev) => ({ ...prev, [dateStr]: "" }));
    } catch {
      toast({ title: "Couldn't add task", variant: "destructive" });
    }
  };

  const handleAddCalendarEvent = async (subject: string, dateStr: string, eventId: string) => {
    // Check if already added
    const dayTasks = getTasksForDate(dateStr);
    if (dayTasks.some((t) => t.source === "calendar" && t.source_id === eventId)) {
      toast({ title: "Already in your list" });
      return;
    }
    try {
      await addTask(subject, dateStr, "calendar", eventId);
      toast({ title: "Added from calendar ✓" });
    } catch {
      toast({ title: "Couldn't add event", variant: "destructive" });
    }
  };

  // Get calendar events for a specific date
  const getCalendarEventsForDate = (dateStr: string) => {
    return events.filter((e) => {
      const eventDate = new Date(e.start_time).toISOString().split("T")[0];
      return eventDate === dateStr;
    });
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.done).length;

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <CalendarDays className="w-5 h-5 text-primary" />
        <div className="flex-1">
          <h3 className="text-sm font-bold text-foreground">Weekly List</h3>
          <p className="text-[11px] text-muted-foreground">
            {doneTasks}/{totalTasks} done this week
          </p>
        </div>
        {totalTasks > 0 && (
          <div className="w-16 h-1.5 rounded-full bg-secondary overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0}%` }}
              className="h-full rounded-full bg-primary"
            />
          </div>
        )}
        <button
          onClick={() => setShowAllDays((v) => !v)}
          className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground"
          title={showAllDays ? "Show today only" : "Show all days"}
        >
          {showAllDays ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>

      {/* Days */}
      {weekDates.filter(({ isToday }) => showAllDays || isToday).map(({ dateStr, label, isToday, date }) => {
        const dayTasks = getTasksForDate(dateStr);
        const calEvents = getCalendarEventsForDate(dateStr);
        const addedCalIds = new Set(dayTasks.filter((t) => t.source === "calendar").map((t) => t.source_id));
        const unaddedCalEvents = calEvents.filter((e) => !addedCalIds.has(e.id));
        const isExpanded = expandedDays.has(dateStr);
        const dayDone = dayTasks.filter((t) => t.done).length;
        const dayNum = date.getDate();
        const monthShort = date.toLocaleString("default", { month: "short" });

        return (
          <div
            key={dateStr}
            className={`rounded-xl border overflow-hidden transition-colors ${
              isToday ? "border-primary/40 bg-primary/5" : "border-border/50 bg-card"
            }`}
          >
            <button
              onClick={() => toggleDay(dateStr)}
              className="w-full flex items-center gap-3 p-3 text-left"
            >
              <div className={`w-9 h-9 rounded-lg flex flex-col items-center justify-center text-center flex-shrink-0 ${
                isToday ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
              }`}>
                <span className="text-[9px] font-semibold uppercase leading-none">{monthShort}</span>
                <span className="text-sm font-bold leading-none">{dayNum}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${isToday ? "text-primary" : "text-foreground"}`}>
                  {label} {isToday && <span className="text-xs font-normal text-muted-foreground ml-1">· Today</span>}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {dayTasks.length === 0 ? "No tasks" : `${dayDone}/${dayTasks.length} done`}
                  {unaddedCalEvents.length > 0 && ` · ${unaddedCalEvents.length} event${unaddedCalEvents.length > 1 ? "s" : ""}`}
                </p>
              </div>
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
            </button>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border-t border-border/30 overflow-hidden"
                >
                  <div className="px-3 py-2 space-y-1">
                    {/* Tasks */}
                    {dayTasks.map((task) => (
                      <div key={task.id} className="group flex items-center gap-2.5 py-1.5">
                        <button
                          onClick={() => toggleTask(task.id)}
                          className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center transition-colors ${
                            task.done ? "bg-primary text-primary-foreground" : "border-2 border-border hover:border-primary"
                          }`}
                        >
                          {task.done && <Check className="w-3 h-3" />}
                        </button>
                        <span className={`flex-1 text-sm ${task.done ? "text-muted-foreground" : "text-foreground"}`}>
                          {task.text}
                        </span>
                        {task.source !== "manual" && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground uppercase tracking-wider">
                            {task.source}
                          </span>
                        )}
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                    ))}

                    {/* Unadded calendar events */}
                    {unaddedCalEvents.length > 0 && (
                      <div className="pt-1 space-y-1">
                        <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">From Calendar</p>
                        {unaddedCalEvents.map((event) => (
                          <button
                            key={event.id}
                            onClick={() => handleAddCalendarEvent(event.subject, dateStr, event.id)}
                            className="w-full flex items-center gap-2.5 py-1.5 text-left group hover:bg-secondary/50 rounded-lg px-1 -mx-1 transition-colors"
                          >
                            <Plus className="w-4 h-4 text-primary flex-shrink-0" />
                            <span className="flex-1 text-sm text-muted-foreground group-hover:text-foreground transition-colors">{event.subject}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(event.start_time).toLocaleTimeString("default", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Add new */}
                    <div className="flex gap-2 pt-1 pb-1">
                      <input
                        value={newItemText[dateStr] || ""}
                        onChange={(e) => setNewItemText((prev) => ({ ...prev, [dateStr]: e.target.value }))}
                        onKeyDown={(e) => e.key === "Enter" && handleAdd(dateStr)}
                        placeholder="Add task…"
                        className="flex-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <button
                        onClick={() => handleAdd(dateStr)}
                        className="rounded-lg bg-primary p-1.5 text-primary-foreground hover:bg-primary/90 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
};

export default WeeklyList;
