import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const eventColors = [
  "bg-primary", "bg-us-sage", "bg-us-gold", "bg-us-terracotta",
  "bg-us-coral", "bg-us-blush",
];

type ViewMode = "month" | "week" | "day";

function getWeekDays(date: Date) {
  const day = date.getDay(); // 0=Sun
  const monday = new Date(date);
  monday.setDate(date.getDate() - ((day + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function formatHour(h: number) {
  if (h === 0) return "12am";
  if (h < 12) return `${h}am`;
  if (h === 12) return "12pm";
  return `${h - 12}pm`;
}

const CalendarWidget = () => {
  const { events, getEventsForMonth, getUpcomingEvents } = useCalendarEvents();
  const [viewDate, setViewDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("week");

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthName = viewDate.toLocaleString("default", { month: "long" });
  const today = new Date();
  const currentDay = today.getDate();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  // Month view
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

  // Week view
  const weekDays = getWeekDays(viewDate);

  // Day view
  const dayLabel = viewDate.toLocaleDateString("default", { weekday: "long", month: "long", day: "numeric" });

  // Events for a specific date
  const getEventsForDate = (d: Date) =>
    events.filter((e) => new Date(e.start_time).toDateString() === d.toDateString());

  // Navigation
  const prev = () => {
    if (viewMode === "month") setViewDate(new Date(year, month - 1, 1));
    else if (viewMode === "week") { const d = new Date(viewDate); d.setDate(d.getDate() - 7); setViewDate(d); }
    else { const d = new Date(viewDate); d.setDate(d.getDate() - 1); setViewDate(d); }
  };
  const next = () => {
    if (viewMode === "month") setViewDate(new Date(year, month + 1, 1));
    else if (viewMode === "week") { const d = new Date(viewDate); d.setDate(d.getDate() + 7); setViewDate(d); }
    else { const d = new Date(viewDate); d.setDate(d.getDate() + 1); setViewDate(d); }
  };

  const headerLabel = viewMode === "month"
    ? `${monthName} ${year}`
    : viewMode === "week"
    ? `${weekDays[0].toLocaleDateString("default", { month: "short", day: "numeric" })} – ${weekDays[6].toLocaleDateString("default", { month: "short", day: "numeric", year: "numeric" })}`
    : dayLabel;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="rounded-2xl border border-border bg-card overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <h3 className="font-display text-base font-bold text-foreground truncate flex-1 pr-2">
          {headerLabel}
        </h3>
        <div className="flex items-center gap-1">
          <button onClick={prev} className="w-7 h-7 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={next} className="w-7 h-7 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* View mode tabs */}
      <div className="px-4 pb-3 flex gap-1">
        {(["month", "week", "day"] as ViewMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`flex-1 py-1 text-xs font-semibold rounded-lg transition-colors capitalize ${
              viewMode === mode
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {mode}
          </button>
        ))}
      </div>

      {/* MONTH VIEW */}
      {viewMode === "month" && (
        <>
          <div className="px-4 grid grid-cols-7 gap-0">
            {DAYS.map((d, i) => (
              <div key={i} className="text-center text-[12px] font-semibold text-muted-foreground uppercase tracking-wider py-1">
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
              <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">Upcoming</p>
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

      {/* WEEK VIEW */}
      {viewMode === "week" && (
        <div className="px-2 pb-3">
          <div className="grid grid-cols-7 gap-0.5 mb-2">
            {weekDays.map((d, i) => {
              const isToday = d.toDateString() === today.toDateString();
              const dayEvts = getEventsForDate(d);
              return (
                <div key={i} className="flex flex-col items-center gap-0.5">
                  <span className="text-[12px] font-semibold text-muted-foreground uppercase">
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
          {/* Events list for the week */}
          <div className="space-y-1.5 border-t border-border/50 pt-2">
            {weekDays.flatMap((d) => getEventsForDate(d).map((e) => ({ ...e, _date: d }))).length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">No events this week</p>
            ) : (
              weekDays.flatMap((d) =>
                getEventsForDate(d).map((e, idx) => {
                  const isToday = d.toDateString() === today.toDateString();
                  const timeStr = e.is_all_day ? "All day" : new Date(e.start_time).toLocaleTimeString("default", { hour: "numeric", minute: "2-digit" });
                  return (
                    <div key={e.id} className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${eventColors[idx % eventColors.length]} flex-shrink-0`} />
                      <span className="text-[11px] text-muted-foreground w-14 flex-shrink-0">
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

      {/* DAY VIEW */}
      {viewMode === "day" && (
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
                    <div key={e.id} className={`flex gap-3 p-3 rounded-xl border border-border/60 bg-secondary/30`}>
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
    </motion.div>
  );
};

export default CalendarWidget;
