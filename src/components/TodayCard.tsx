import { useState } from "react";
import { Check, Plus, CalendarDays, Clock, MapPin, ListChecks, ChevronRight, ChevronLeft, ChevronDown } from "lucide-react";
import { haptics } from "@/lib/haptics";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useWeeklyTasks } from "@/hooks/useWeeklyTasks";
import { useCalendarEvents, CalendarEvent } from "@/hooks/useCalendarEvents";
import { useSharedLists } from "@/hooks/useSharedLists";

type Section = "tasks" | "calendar" | "lists";

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

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];
const eventColors = [
  "bg-primary", "bg-us-sage", "bg-us-gold", "bg-us-terracotta",
  "bg-us-coral", "bg-us-blush",
];

type CalendarViewMode = "month" | "week" | "day";

function getWeekDays(date: Date) {
  const day = date.getDay();
  const monday = new Date(date);
  monday.setDate(date.getDate() - ((day + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

const TodayCard = () => {
  const navigate = useNavigate();
  const { tasks, loading: tasksLoading, toggleTask, getTodayTasks } = useWeeklyTasks();
  const { events, loading: eventsLoading, getEventsForMonth, getUpcomingEvents } = useCalendarEvents();
  const { lists, loading: listsLoading, updateList } = useSharedLists();

  const [activeSection, setActiveSection] = useState<Section>("tasks");
  const [calViewMode, setCalViewMode] = useState<CalendarViewMode>("day");
  const [viewDate, setViewDate] = useState(new Date());
  const [expandedListId, setExpandedListId] = useState<string | null>(null);

  const toggleListExpand = (id: string) => {
    setExpandedListId((prev) => (prev === id ? null : id));
  };

  const toggleListItem = (listId: string, itemId: string) => {
    const list = lists.find((l) => l.id === listId);
    if (!list) return;
    const updatedItems = list.items.map((i: any) =>
      i.id === itemId ? { ...i, done: !i.done } : i
    );
    updateList(listId, { items: updatedItems });
    haptics.light();
  };

  const allTodayTasks = getTodayTasks();
  const todayTasks = allTodayTasks.filter((t) => !t.done);
  const todayEvents = getTodayEvents(events);

  const loading = tasksLoading || eventsLoading;
  if (loading) return null;

  const doneCount = allTodayTasks.filter((t) => t.done).length;
  const totalCount = allTodayTasks.length + todayEvents.length;
  const todayLabel = new Date().toLocaleDateString("default", { weekday: "long" });

  const taskCount = allTodayTasks.length;
  const eventCount = todayEvents.length;
  const activeLists = lists.filter((l) => l.status !== "pending_partner");
  const listCount = activeLists.length;

  const today = new Date();
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthName = viewDate.toLocaleString("default", { month: "long" });
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const currentDay = today.getDate();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = (firstDay + 6) % 7;
  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const monthEvents = getEventsForMonth(year, month);
  const upcoming = getUpcomingEvents(4);
  const dayEventsMap = new Map<number, typeof monthEvents>();
  monthEvents.forEach((e) => {
    const day = new Date(e.start_time).getDate();
    const existing = dayEventsMap.get(day) || [];
    existing.push(e);
    dayEventsMap.set(day, existing);
  });

  const weekDays = getWeekDays(viewDate);
  const dayLabel = viewDate.toLocaleDateString("default", { weekday: "long", month: "long", day: "numeric" });
  const getEventsForDate = (d: Date) =>
    events.filter((e) => new Date(e.start_time).toDateString() === d.toDateString());

  const calPrev = () => {
    if (calViewMode === "month") setViewDate(new Date(year, month - 1, 1));
    else if (calViewMode === "week") { const d = new Date(viewDate); d.setDate(d.getDate() - 7); setViewDate(d); }
    else { const d = new Date(viewDate); d.setDate(d.getDate() - 1); setViewDate(d); }
  };
  const calNext = () => {
    if (calViewMode === "month") setViewDate(new Date(year, month + 1, 1));
    else if (calViewMode === "week") { const d = new Date(viewDate); d.setDate(d.getDate() + 7); setViewDate(d); }
    else { const d = new Date(viewDate); d.setDate(d.getDate() + 1); setViewDate(d); }
  };
  const calHeaderLabel = calViewMode === "month"
    ? `${monthName} ${year}`
    : calViewMode === "week"
    ? `${weekDays[0].toLocaleDateString("default", { month: "short", day: "numeric" })} – ${weekDays[6].toLocaleDateString("default", { month: "short", day: "numeric", year: "numeric" })}`
    : dayLabel;

  const summaries = activeLists.map((list) => {
    const checkableItems = list.items.filter((i: any) => !i.isHeading);
    const done = checkableItems.filter((i: any) => i.done).length;
    const total = checkableItems.length;
    return { id: list.id, name: list.name, icon: list.icon, doneCount: done, totalCount: total };
  });

  const hasTaskContent = todayTasks.length > 0 || todayEvents.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="rounded-2xl border border-border bg-card overflow-hidden"
      data-testid="card-today"
    >
      <div className="flex border-b border-border/50">
        {([
          { key: "tasks" as Section, label: todayLabel, badge: taskCount > 0 ? `${doneCount}/${taskCount}` : null },
          { key: "calendar" as Section, label: "Calendar", badge: eventCount > 0 ? String(eventCount) : null },
          { key: "lists" as Section, label: "Lists", badge: listCount > 0 ? String(listCount) : null },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveSection(tab.key)}
            className={`flex-1 py-3 text-center transition-colors relative ${
              activeSection === tab.key
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground/70"
            }`}
            data-testid={`tab-${tab.key}`}
          >
            <span className="text-xs font-semibold">{tab.label}</span>
            {tab.badge && (
              <span className={`ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                activeSection === tab.key ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"
              }`}>
                {tab.badge}
              </span>
            )}
            {activeSection === tab.key && (
              <motion.div
                layoutId="today-tab-indicator"
                className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full"
              />
            )}
          </button>
        ))}
      </div>

      {activeSection === "tasks" && (
        <div>
          <button onClick={() => navigate("/us?tab=lists")} className="w-full px-4 pt-3 pb-1 flex items-center justify-between text-left" data-testid="button-manage-tasks">
            <div className="flex items-center gap-2.5">
              <CalendarDays className="w-5 h-5 text-primary" />
              <div>
                <h3 className="font-display text-sm font-bold text-foreground">{todayLabel}'s Tasks</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {taskCount > 0 ? `${doneCount}/${taskCount} done` : ""}
                  {taskCount > 0 && eventCount > 0 ? " · " : ""}
                  {eventCount > 0 ? `${eventCount} event${eventCount !== 1 ? "s" : ""}` : ""}
                </p>
              </div>
            </div>
          </button>

          {!hasTaskContent ? (
            <button
              onClick={() => navigate("/us?tab=lists")}
              className="w-full p-6 text-center"
              data-testid="button-add-tasks"
            >
              <Plus className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <h3 className="font-display text-base font-bold text-foreground">Add Today's Tasks</h3>
              <p className="text-xs text-muted-foreground mt-1">Plan your day in the Weekly List</p>
            </button>
          ) : (
            <>
              <div className="max-h-[140px] overflow-y-auto scrollbar-hide">
                {todayEvents.length > 0 && (
                  <div className="px-4 pt-3 pb-1 space-y-1">
                    {todayEvents.map((event) => (
                      <div key={event.id} className="flex items-start gap-3 py-1.5" data-testid={`event-today-${event.id}`}>
                        <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center bg-primary/15 mt-0.5">
                          <Clock className="w-3 h-3 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground truncate">{event.subject}</p>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
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

                {todayTasks.length > 0 && (
                  <div className="px-4 pb-1 space-y-1">
                    {todayTasks.map((task) => (
                      <div key={task.id} className="flex items-center gap-3 py-2" data-testid={`task-today-${task.id}`}>
                        <button
                          onClick={(e) => { e.stopPropagation(); haptics.light(); toggleTask(task.id); }}
                          className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center transition-colors ${
                            task.done ? "bg-primary text-primary-foreground" : "border-2 border-border"
                          }`}
                          data-testid={`button-toggle-task-${task.id}`}
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
              </div>

              {totalCount > 0 && (
                <div className="px-4 pb-4 pt-2">
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
            </>
          )}
        </div>
      )}

      {activeSection === "calendar" && (
        <div>
          <div className="px-4 pt-3 pb-2 flex items-center justify-between">
            <h3 className="font-display text-sm font-bold text-foreground truncate flex-1 pr-2">
              {calHeaderLabel}
            </h3>
            <div className="flex items-center gap-1">
              <button onClick={calPrev} className="w-7 h-7 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground transition-colors" data-testid="button-cal-prev">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={calNext} className="w-7 h-7 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground transition-colors" data-testid="button-cal-next">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="px-4 pb-3 flex gap-1">
            {(["month", "week", "day"] as CalendarViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setCalViewMode(mode)}
                className={`flex-1 py-1 text-xs font-semibold rounded-lg transition-colors capitalize ${
                  calViewMode === mode
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
                data-testid={`button-cal-${mode}`}
              >
                {mode}
              </button>
            ))}
          </div>

          {calViewMode === "month" && (
            <>
              <div className="px-4 grid grid-cols-7 gap-0">
                {DAYS.map((d, i) => (
                  <div key={i} className="text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider py-1">
                    {d}
                  </div>
                ))}
              </div>
              <div className="px-4 pb-3 grid grid-cols-7 gap-0">
                {cells.map((day, i) => {
                  const dayEvents = day ? dayEventsMap.get(day) : undefined;
                  const isToday = isCurrentMonth && day === currentDay;
                  return (
                    <div key={i} className="flex flex-col items-center py-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                        isToday ? "bg-primary text-primary-foreground font-bold" : day ? "text-foreground hover:bg-secondary" : ""
                      }`}>
                        {day || ""}
                      </div>
                      {dayEvents && dayEvents.length > 0 && (
                        <div className="flex gap-0.5 mt-0.5">
                          {dayEvents.slice(0, 3).map((_, j) => (
                            <div key={j} className={`w-1.5 h-1.5 rounded-full ${eventColors[j % eventColors.length]}`} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {upcoming.length > 0 && (
                <div className="px-4 pb-4 space-y-2 border-t border-border/50 pt-3">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Upcoming</p>
                  {upcoming.map((event, idx) => {
                    const startDate = new Date(event.start_time);
                    const dayStr = startDate.toLocaleDateString("default", { month: "short", day: "numeric" });
                    const isEventToday = startDate.toDateString() === today.toDateString();
                    return (
                      <div key={event.id} className="flex items-center gap-2.5">
                        <div className={`w-2 h-2 rounded-full ${eventColors[idx % eventColors.length]} flex-shrink-0`} />
                        <span className="text-sm text-foreground flex-1 truncate">{event.subject}</span>
                        <span className="text-[11px] text-muted-foreground">{isEventToday ? "Today" : dayStr}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              {monthEvents.length === 0 && (
                <div className="px-4 pb-4 text-center">
                  <p className="text-xs text-muted-foreground">No events this month</p>
                </div>
              )}
            </>
          )}

          {calViewMode === "week" && (
            <div className="px-2 pb-3">
              <div className="grid grid-cols-7 gap-0.5 mb-2">
                {weekDays.map((d, i) => {
                  const isToday = d.toDateString() === today.toDateString();
                  const dayEvts = getEventsForDate(d);
                  return (
                    <div key={i} className="flex flex-col items-center gap-0.5">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                        {d.toLocaleDateString("default", { weekday: "narrow" })}
                      </span>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                        isToday ? "bg-primary text-primary-foreground font-bold" : "text-foreground"
                      }`}>
                        {d.getDate()}
                      </div>
                      {dayEvts.length > 0 && (
                        <div className="flex gap-0.5">
                          {dayEvts.slice(0, 3).map((_, j) => (
                            <div key={j} className={`w-1.5 h-1.5 rounded-full ${eventColors[j % eventColors.length]}`} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="space-y-1.5 border-t border-border/50 pt-2">
                {weekDays.flatMap((d) => getEventsForDate(d)).length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">No events this week</p>
                ) : (
                  weekDays.flatMap((d) =>
                    getEventsForDate(d).map((e, idx) => {
                      const isToday = d.toDateString() === today.toDateString();
                      const timeStr = e.is_all_day ? "All day" : new Date(e.start_time).toLocaleTimeString("default", { hour: "numeric", minute: "2-digit" });
                      return (
                        <div key={e.id} className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${eventColors[idx % eventColors.length]} flex-shrink-0`} />
                          <span className="text-[11px] text-muted-foreground w-12 flex-shrink-0">
                            {isToday ? "Today" : d.toLocaleDateString("default", { weekday: "short" })}
                          </span>
                          <span className="text-sm text-foreground flex-1 truncate">{e.subject}</span>
                          <span className="text-[11px] text-muted-foreground">{timeStr}</span>
                        </div>
                      );
                    })
                  )
                )}
              </div>
            </div>
          )}

          {calViewMode === "day" && (
            <div className="px-4 pb-3">
              {(() => {
                const dayEvts = getEventsForDate(viewDate);
                if (dayEvts.length === 0) {
                  return <p className="text-xs text-muted-foreground text-center py-4">No events today</p>;
                }
                return (
                  <div className="space-y-2">
                    {dayEvts.map((e, idx) => {
                      const startDate = new Date(e.start_time);
                      const endDate = new Date(e.end_time);
                      const timeStr = e.is_all_day
                        ? "All day"
                        : `${startDate.toLocaleTimeString("default", { hour: "numeric", minute: "2-digit" })} – ${endDate.toLocaleTimeString("default", { hour: "numeric", minute: "2-digit" })}`;
                      return (
                        <div key={e.id} className="flex gap-3 p-3 rounded-xl border border-border/60 bg-secondary/30">
                          <div className={`w-1 rounded-full self-stretch ${eventColors[idx % eventColors.length]}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{e.subject}</p>
                            <p className="text-xs text-muted-foreground">{timeStr}</p>
                            {e.location && <p className="text-xs text-muted-foreground truncate">{e.location}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {activeSection === "lists" && (
        <div>
          {listsLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3 bg-secondary/40 rounded-xl px-3 py-3 animate-pulse">
                  <div className="w-6 h-6 rounded bg-secondary" />
                  <div className="flex-1">
                    <div className="h-3 bg-secondary rounded w-2/3 mb-1.5" />
                    <div className="h-2 bg-secondary rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : lists.length === 0 ? (
            <button
              onClick={() => navigate("/us?tab=lists")}
              className="w-full p-6 text-center"
            >
              <ListChecks className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">No lists yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Create shared lists in the Us tab</p>
            </button>
          ) : (
            <>
              <button
                onClick={() => navigate("/us?tab=lists")}
                className="w-full flex items-center gap-3 px-4 pt-3 pb-2 text-left"
                data-testid="button-view-all-lists"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">{lists.length} list{lists.length !== 1 ? "s" : ""} active</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>

              <div className="px-4 pb-4 space-y-2 max-h-[320px] overflow-y-auto scrollbar-hide">
                {summaries.map((s) => {
                  const isExpanded = expandedListId === s.id;
                  const fullList = activeLists.find((l) => l.id === s.id);
                  const listItems = fullList?.items.filter((i: any) => !i.isHeading) || [];

                  return (
                    <div key={s.id} className="rounded-xl bg-secondary/60 overflow-hidden">
                      <button
                        onClick={() => toggleListExpand(s.id)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-secondary transition-colors"
                        data-testid={`button-list-${s.id}`}
                      >
                        <span className="text-base">{s.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{s.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {s.doneCount}/{s.totalCount} completed
                          </p>
                        </div>
                        {s.totalCount > 0 && (
                          <div className="w-7 h-7 rounded-full border-2 border-border flex items-center justify-center">
                            {s.doneCount === s.totalCount ? (
                              <Check className="w-3.5 h-3.5 text-primary" />
                            ) : (
                              <span className="text-[10px] font-bold text-muted-foreground">
                                {Math.round((s.doneCount / s.totalCount) * 100)}%
                              </span>
                            )}
                          </div>
                        )}
                        <motion.div
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        </motion.div>
                      </button>

                      <motion.div
                        initial={false}
                        animate={{ height: isExpanded ? "auto" : 0, opacity: isExpanded ? 1 : 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="px-3 pb-3 space-y-1 border-t border-border/30 pt-2">
                          {listItems.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-2">No items yet</p>
                          ) : (
                            <div className="max-h-[200px] overflow-y-auto scrollbar-hide space-y-1">
                              {listItems.map((item: any, idx: number) => (
                                <button
                                  key={item.id}
                                  onClick={() => toggleListItem(s.id, item.id)}
                                  className="w-full flex items-center gap-2.5 py-1.5 px-1 text-left rounded-lg hover:bg-background/50 transition-colors"
                                  data-testid={`button-list-item-${item.id}`}
                                >
                                  <div
                                    className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-colors ${
                                      item.done
                                        ? "bg-primary text-primary-foreground"
                                        : "border-2 border-border"
                                    }`}
                                  >
                                    {item.done ? (
                                      <Check className="w-3 h-3" />
                                    ) : (
                                      <span className="text-[9px] font-medium text-muted-foreground">{idx + 1}</span>
                                    )}
                                  </div>
                                  <span
                                    className={`text-xs flex-1 ${
                                      item.done ? "line-through text-muted-foreground" : "text-foreground"
                                    }`}
                                  >
                                    {item.text}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                          <button
                            onClick={() => navigate(`/us?tab=lists&listId=${s.id}`)}
                            className="w-full text-center text-[11px] text-primary font-medium pt-1.5 hover:underline"
                            data-testid={`button-open-list-${s.id}`}
                          >
                            Open full list →
                          </button>
                        </div>
                      </motion.div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default TodayCard;
