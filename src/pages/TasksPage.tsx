import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Check, ListChecks, Plus } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import AppHeader from "@/components/AppHeader";
import { completeTask, createTask, fetchTasks } from "@/lib/household";
import { usePageTitle } from "@/hooks/usePageTitle";
import { toast } from "@/hooks/use-toast";

const TasksPage = () => {
  usePageTitle("Tasks");
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");

  const tasksQuery = useQuery({
    queryKey: ["tasks"],
    queryFn: fetchTasks,
  });

  const addMutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      setTitle("");
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (err) => {
      toast({ title: "Couldn't add task", description: err.message, variant: "destructive" });
    },
  });

  const completeMutation = useMutation({
    mutationFn: completeTask,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
    onError: (err) => {
      toast({ title: "Couldn't complete task", description: err.message, variant: "destructive" });
    },
  });

  const tasks = tasksQuery.data ?? [];
  const openTasks = tasks.filter((t) => t.status === "todo");
  const doneTasks = tasks.filter((t) => t.status === "done");

  const submit = () => {
    const trimmed = title.trim();
    if (trimmed) addMutation.mutate(trimmed);
  };

  return (
    <AppShell>
      <AppHeader subtitle="Household tasks" />

      <div className="px-4 py-4 space-y-6">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add a task…"
            aria-label="New task title"
            className="flex-1 bg-secondary/60 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 ring-primary/30"
          />
          <button
            type="submit"
            disabled={!title.trim() || addMutation.isPending}
            aria-label="Add task"
            className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground disabled:opacity-40 transition-opacity"
          >
            <Plus className="w-4 h-4" />
          </button>
        </form>

        <section aria-labelledby="tasks-open-heading">
          <div className="flex items-center gap-2 mb-3">
            <ListChecks className="w-4 h-4 text-primary" />
            <h2 id="tasks-open-heading" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              To do
            </h2>
          </div>
          {tasksQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : tasksQuery.isError ? (
            <p className="text-sm text-muted-foreground">Couldn't load tasks.</p>
          ) : openTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No open tasks.</p>
          ) : (
            <ul className="space-y-2">
              {openTasks.map((task) => (
                <li
                  key={task.id}
                  className="rounded-2xl bg-card border border-border px-4 py-3 flex items-center gap-3"
                >
                  <button
                    onClick={() => completeMutation.mutate(task.id)}
                    disabled={completeMutation.isPending}
                    aria-label={`Mark "${task.title}" done`}
                    className="w-6 h-6 rounded-full border-2 border-primary/40 flex items-center justify-center text-transparent hover:bg-primary/10 active:scale-95 transition-all shrink-0"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <span className="flex-1 text-sm text-foreground truncate">{task.title}</span>
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

        {doneTasks.length > 0 && (
          <section aria-labelledby="tasks-done-heading">
            <h2 id="tasks-done-heading" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Done
            </h2>
            <ul className="space-y-2">
              {doneTasks.map((task) => (
                <li
                  key={task.id}
                  className="rounded-2xl bg-card/50 border border-border/50 px-4 py-3 flex items-center gap-3 opacity-60"
                >
                  <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0">
                    <Check className="w-3.5 h-3.5" />
                  </span>
                  <span className="flex-1 text-sm text-muted-foreground line-through truncate">{task.title}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </AppShell>
  );
};

export default TasksPage;
