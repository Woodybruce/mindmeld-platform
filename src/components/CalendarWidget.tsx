import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CalendarEvent {
  day: number;
  label: string;
  color: string; // tailwind bg class using design tokens
}

const today = new Date();
const currentDay = today.getDate();

const sampleEvents: CalendarEvent[] = [
  { day: currentDay, label: "Date Night 🍷", color: "bg-primary" },
  { day: currentDay + 2, label: "Gym together", color: "bg-us-sage" },
  { day: currentDay + 5, label: "Insurance renewal", color: "bg-us-gold" },
  { day: currentDay + 8, label: "Weekend trip 🏖️", color: "bg-us-terracotta" },
];

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

const CalendarWidget = () => {
  const year = today.getFullYear();
  const month = today.getMonth();
  const monthName = today.toLocaleString("default", { month: "long" });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Adjust so Monday = 0
  const startOffset = (firstDay + 6) % 7;

  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const eventMap = new Map(sampleEvents.map((e) => [e.day, e]));

  // Upcoming events
  const upcoming = sampleEvents
    .filter((e) => e.day >= currentDay)
    .sort((a, b) => a.day - b.day)
    .slice(0, 3);

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
          <button className="w-7 h-7 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button className="w-7 h-7 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

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
          const event = day ? eventMap.get(day) : undefined;
          const isToday = day === currentDay;

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
              {event && (
                <div className={`w-1.5 h-1.5 rounded-full ${event.color} mt-0.5`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Upcoming events */}
      {upcoming.length > 0 && (
        <div className="px-4 pb-4 space-y-2 border-t border-border/50 pt-3">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Upcoming</p>
          {upcoming.map((event) => (
            <div key={event.day} className="flex items-center gap-2.5">
              <div className={`w-2 h-2 rounded-full ${event.color} flex-shrink-0`} />
              <span className="text-sm text-foreground flex-1">{event.label}</span>
              <span className="text-[11px] text-muted-foreground">
                {event.day === currentDay ? "Today" : `${monthName.slice(0, 3)} ${event.day}`}
              </span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default CalendarWidget;
