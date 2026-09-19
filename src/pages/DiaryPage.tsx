import { useQuery } from "@tanstack/react-query";
import { addDays, format, isSameDay, startOfWeek } from "date-fns";
import { CalendarDays } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import AppHeader from "@/components/AppHeader";
import { fetchEvents } from "@/lib/household";
import { usePageTitle } from "@/hooks/usePageTitle";

const DiaryPage = () => {
  usePageTitle("Diary");

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const eventsQuery = useQuery({
    queryKey: ["events", "week", weekStart.toISOString()],
    queryFn: () => fetchEvents(weekStart, weekEnd),
  });

  const events = eventsQuery.data ?? [];

  return (
    <AppShell>
      <AppHeader subtitle="The week ahead" />

      <div className="px-4 py-4 space-y-5">
        {eventsQuery.isError && (
          <p className="text-sm text-muted-foreground">Couldn't load this week's events.</p>
        )}
        {days.map((day) => {
          const dayEvents = events.filter((e) => isSameDay(new Date(e.startsAt), day));
          const isToday = isSameDay(day, new Date());
          return (
            <section key={day.toISOString()} aria-label={format(day, "EEEE d MMMM")}>
              <div className="flex items-center gap-2 mb-2">
                <CalendarDays className={`w-4 h-4 ${isToday ? "text-primary" : "text-muted-foreground"}`} />
                <h2
                  className={`text-xs font-semibold uppercase tracking-wider ${
                    isToday ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {format(day, "EEEE d MMMM")}
                  {isToday ? " · Today" : ""}
                </h2>
              </div>
              {dayEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground/60 pl-6">—</p>
              ) : (
                <ul className="space-y-2">
                  {dayEvents.map((event) => (
                    <li
                      key={event.id}
                      className="rounded-2xl bg-card border border-border px-4 py-3 flex items-center gap-3"
                    >
                      <span className="text-xs font-semibold text-primary whitespace-nowrap">
                        {format(new Date(event.startsAt), "HH:mm")}
                      </span>
                      <span className="flex-1 text-sm text-foreground truncate">{event.title}</span>
                      <span className="text-[11px] text-muted-foreground capitalize">{event.category}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </AppShell>
  );
};

export default DiaryPage;
