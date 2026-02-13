import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMicrosoftCalendar, type OutlookEvent } from "@/hooks/useMicrosoftCalendar";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

const eventColors = [
  "bg-primary", "bg-us-sage", "bg-us-gold", "bg-us-terracotta",
  "bg-us-coral", "bg-us-blush",
];

const CalendarWidget = () => {
  const navigate = useNavigate();
  const { connected, events, fetchEvents } = useMicrosoftCalendar();
  const [viewDate, setViewDate] = useState(new Date());

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthName = viewDate.toLocaleString("default", { month: "long" });
  const today = new Date();
  const currentDay = today.getDate();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = (firstDay + 6) % 7;

  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  // Fetch Outlook events when connected and month changes
  useEffect(() => {
    if (!connected) return;
    const start = new Date(year, month, 1).toISOString();
    const end = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
    fetchEvents(start, end);
  }, [connected, year, month, fetchEvents]);

  // Map events to days
  const dayEventsMap = new Map<number, OutlookEvent[]>();
  events.forEach((e) => {
    const date = new Date(e.start.dateTime);
    if (date.getFullYear() === year && date.getMonth() === month) {
      const day = date.getDate();
      const existing = dayEventsMap.get(day) || [];
      existing.push(e);
      dayEventsMap.set(day, existing);
    }
  });

  // Upcoming events (from today forward)
  const upcoming = events
    .filter((e) => new Date(e.start.dateTime) >= new Date(today.toDateString()))
    .sort((a, b) => new Date(a.start.dateTime).getTime() - new Date(b.start.dateTime).getTime())
    .slice(0, 4);

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="rounded-2xl border border-border bg-card overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <h3 className="font-display text-base font-bold text-foreground">
          {monthName} {year}
        </h3>
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className="w-7 h-7 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={nextMonth} className="w-7 h-7 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Connect prompt */}
      {!connected && (
        <div className="px-4 pb-3">
          <button
            onClick={() => navigate("/us?tab=events")}
            className="w-full rounded-lg bg-gradient-to-r from-primary/10 to-us-blush/20 px-3 py-2.5 text-xs text-center text-primary font-medium hover:from-primary/15 transition-colors"
          >
            🔗 Connect Outlook to see your events
          </button>
        </div>
      )}

      {/* Day headers */}
      <div className="px-4 grid grid-cols-7 gap-0">
        {DAYS.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="px-4 pb-3 grid grid-cols-7 gap-0">
        {cells.map((day, i) => {
          const dayEvents = day ? dayEventsMap.get(day) : undefined;
          const isToday = isCurrentMonth && day === currentDay;

          return (
            <div key={i} className="flex flex-col items-center py-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                  isToday
                    ? "bg-primary text-primary-foreground font-bold"
                    : day
                    ? "text-foreground hover:bg-secondary"
                    : ""
                }`}
              >
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

      {/* Upcoming events */}
      {upcoming.length > 0 && (
        <div className="px-4 pb-4 space-y-2 border-t border-border/50 pt-3">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Upcoming</p>
          {upcoming.map((event, idx) => {
            const startDate = new Date(event.start.dateTime);
            const dayStr = startDate.toLocaleDateString("default", { month: "short", day: "numeric" });
            const isEventToday = startDate.toDateString() === today.toDateString();
            return (
              <div key={event.id} className="flex items-center gap-2.5">
                <div className={`w-2 h-2 rounded-full ${eventColors[idx % eventColors.length]} flex-shrink-0`} />
                <span className="text-sm text-foreground flex-1 truncate">{event.subject}</span>
                <span className="text-[11px] text-muted-foreground">
                  {isEventToday ? "Today" : dayStr}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* No events fallback when connected */}
      {connected && events.length === 0 && (
        <div className="px-4 pb-4 text-center">
          <p className="text-xs text-muted-foreground">No events this month</p>
        </div>
      )}
    </motion.div>
  );
};

export default CalendarWidget;
