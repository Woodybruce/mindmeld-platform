import { useQuery } from "@tanstack/react-query";
import { format, startOfDay, addDays } from "date-fns";
import { CalendarDays, ListChecks } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import AppHeader from "@/components/AppHeader";
import { fetchEvents, fetchTasks } from "@/lib/household";
import { usePageTitle } from "@/hooks/usePageTitle";

const HomePage = () => {
  usePageTitle("Home");

  const todayStart = startOfDay(new Date());
  const tomorrowStart = addDays(todayStart, 1);

  const eventsQuery = useQuery({
    queryKey: ["events", "today", todayStart.toISOString()],
    queryFn: () => fetchEvents(todayStart, tomorrowStart),
  });

  const tasksQuery = useQuery({
    queryKey: ["tasks"],
    queryFn: fetchTasks,
  });

  const events = eventsQuery.data ?? [];
  const openTasks = (tasksQuery.data ?? []).filter((t) => t.status === "todo");

  return (
    <AppShell>
      <AppHeader subtitle="Your day at a glance" />

      <div className="px-4 py-4 space-y-6">
        <section aria-labelledby="home-diary-heading">
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays className="w-4 h-4 text-primary" />
            <h2 id="home-diary-heading" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Today · {format(todayStart, "EEEE d MMMM")}
            </h2>
          </div>
          {eventsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : eventsQuery.isError ? (
            <p className="text-sm text-muted-foreground">Couldn't load today's events.</p>
          ) : events.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing in the diary today.</p>
          ) : (
            <ul className="space-y-2">
              {events.map((event) => (
                <li
                  key={event.id}
                  className="rounded-2xl bg-card border border-border px-4 py-3 flex items-center gap-3"
                >
                  <span className="text-xs font-semibold text-primary whitespace-nowrap">
                    {format(new Date(event.startsAt), "HH:mm")}
                  </span>
                  <span className="text-sm text-foreground truncate">{event.title}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="home-tasks-heading">
          <div className="flex items-center gap-2 mb-3">
            <ListChecks className="w-4 h-4 text-primary" />
            <h2 id="home-tasks-heading" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Open tasks
            </h2>
          </div>
          {tasksQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : tasksQuery.isError ? (
            <p className="text-sm text-muted-foreground">Couldn't load tasks.</p>
          ) : openTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">All done — nothing open.</p>
          ) : (
            <ul className="space-y-2">
              {openTasks.map((task) => (
                <li
                  key={task.id}
                  className="rounded-2xl bg-card border border-border px-4 py-3 flex items-center justify-between gap-3"
                >
                  <span className="text-sm text-foreground truncate">{task.title}</span>
                  {task.dueDate && (
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(task.dueDate), "d MMM")}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
};

export default HomePage;
