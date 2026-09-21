import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, startOfDay, addDays } from "date-fns";
import { Link } from "react-router-dom";
import { CalendarDays, Check, ListChecks, Sparkles } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import AppHeader from "@/components/AppHeader";
import ButlerInboxCard from "@/components/ButlerInboxCard";
import { completeTask, fetchEvents, fetchTasks } from "@/lib/household";
import type { EventCategory, HouseholdTask } from "@/lib/household";
import { fetchChannels, fetchLatestButlerMessage } from "@/lib/chat";
import { useAuth } from "@/contexts/AuthContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { toast } from "@/hooks/use-toast";

const CATEGORY_STYLES: Record<EventCategory, string> = {
  school: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  holiday: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  household: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  us: "bg-pink-500/15 text-pink-600 dark:text-pink-400",
};

function greeting(now: Date): string {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

const HomePage = () => {
  usePageTitle("Today");
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const now = new Date();
  const todayStart = startOfDay(now);
  const tomorrowStart = addDays(todayStart, 1);
  const todayStr = format(todayStart, "yyyy-MM-dd");

  const eventsQuery = useQuery({
    queryKey: ["events", "today", todayStart.toISOString()],
    queryFn: () => fetchEvents(todayStart, tomorrowStart),
  });

  const tasksQuery = useQuery({
    queryKey: ["tasks"],
    queryFn: fetchTasks,
  });

  const channelsQuery = useQuery({
    queryKey: ["chat", "channels"],
    queryFn: fetchChannels,
  });

  const briefingQuery = useQuery({
    queryKey: ["butler", "briefing"],
    queryFn: fetchLatestButlerMessage,
  });

  const completeMutation = useMutation({
    mutationFn: completeTask,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
    onError: (err) => {
      toast({ title: "Couldn't complete task", description: err.message, variant: "destructive" });
    },
  });

  const displayName =
    channelsQuery.data?.members.find((m) => m.userId === user?.id)?.displayName ?? null;

  const events = eventsQuery.data ?? [];
  const openTasks = (tasksQuery.data ?? []).filter((t) => t.status === "todo");
  const overdueTasks = openTasks.filter((t) => t.dueDate !== null && t.dueDate < todayStr);
  const dueTodayTasks = openTasks.filter((t) => t.dueDate === todayStr);
  const briefing = briefingQuery.data ?? null;

  const renderTask = (task: HouseholdTask, overdue: boolean) => (
    <li
      key={task.id}
      className="rounded-2xl bg-card border border-border px-4 py-3 flex items-center justify-between gap-3"
    >
      <div className="min-w-0">
        <p className="text-sm text-foreground truncate">{task.title}</p>
        {task.dueDate && (
          <p className={`text-xs mt-0.5 ${overdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
            {overdue ? `Overdue · ${format(new Date(`${task.dueDate}T00:00:00`), "d MMM")}` : "Due today"}
          </p>
        )}
      </div>
      <button
        onClick={() => completeMutation.mutate(task.id)}
        aria-label={`Mark "${task.title}" done`}
        className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors shrink-0"
      >
        <Check className="w-4 h-4" />
      </button>
    </li>
  );

  return (
    <AppShell>
      <AppHeader subtitle="Your day at a glance" />

      <div className="px-4 py-4 space-y-6">
        <section aria-label="Greeting">
          <h2 className="font-display text-2xl font-bold text-foreground">
            {greeting(now)}{displayName ? `, ${displayName}` : ""}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">{format(todayStart, "EEEE d MMMM")}</p>
        </section>

        <section aria-labelledby="butler-briefing-heading">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-primary" />
            <h2 id="butler-briefing-heading" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Butler briefing
            </h2>
          </div>
          {briefingQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : briefing ? (
            <Link
              to="/chat"
              className="block rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-600/10 border border-violet-500/20 px-4 py-3"
            >
              <p className="text-sm text-foreground whitespace-pre-line line-clamp-4">{briefing.body}</p>
              <p className="text-xs text-muted-foreground mt-1.5">
                {format(new Date(briefing.createdAt), "HH:mm")} · tap to chat
              </p>
            </Link>
          ) : (
            <Link to="/chat" className="block rounded-2xl bg-card border border-border px-4 py-3">
              <p className="text-sm text-muted-foreground">
                No briefing yet — ask the butler what's on today.
              </p>
            </Link>
          )}
        </section>

        <ButlerInboxCard />

        <section aria-labelledby="home-diary-heading">
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays className="w-4 h-4 text-primary" />
            <h2 id="home-diary-heading" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Today's events
            </h2>
          </div>
          {eventsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : eventsQuery.isError ? (
            <p className="text-sm text-muted-foreground">Couldn't load today's events.</p>
          ) : events.length === 0 ? (
            <Link to="/chat" className="block rounded-2xl bg-card border border-border px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Nothing on today — ask the butler to plan something.
              </p>
            </Link>
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
                  <span className="text-sm text-foreground truncate flex-1">{event.title}</span>
                  <span
                    className={`text-[13px] font-semibold rounded-full px-2 py-0.5 capitalize shrink-0 ${CATEGORY_STYLES[event.category]}`}
                  >
                    {event.category}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="home-tasks-heading">
          <div className="flex items-center gap-2 mb-3">
            <ListChecks className="w-4 h-4 text-primary" />
            <h2 id="home-tasks-heading" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Tasks due
            </h2>
          </div>
          {tasksQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : tasksQuery.isError ? (
            <p className="text-sm text-muted-foreground">Couldn't load tasks.</p>
          ) : overdueTasks.length === 0 && dueTodayTasks.length === 0 ? (
            <Link to="/tasks" className="block rounded-2xl bg-card border border-border px-4 py-3">
              <p className="text-sm text-muted-foreground">All clear — nothing due today.</p>
            </Link>
          ) : (
            <ul className="space-y-2">
              {overdueTasks.map((task) => renderTask(task, true))}
              {dueTodayTasks.map((task) => renderTask(task, false))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
};

export default HomePage;
