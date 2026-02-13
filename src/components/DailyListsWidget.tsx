import { Check, Circle, Plus } from "lucide-react";
import { motion } from "framer-motion";

interface TaskItem {
  id: string;
  label: string;
  done: boolean;
  assignee: "you" | "partner";
}

const sampleTasks: TaskItem[] = [
  { id: "1", label: "Pick up dry cleaning", done: true, assignee: "you" },
  { id: "2", label: "Book restaurant for Friday", done: false, assignee: "partner" },
  { id: "3", label: "Renew gym membership", done: false, assignee: "you" },
  { id: "4", label: "Call the vet", done: true, assignee: "partner" },
  { id: "5", label: "Grocery run — meal prep", done: false, assignee: "you" },
];

const DailyListsWidget = () => {
  const doneCount = sampleTasks.filter((t) => t.done).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="rounded-2xl border border-border bg-card overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div>
          <h3 className="font-display text-base font-bold text-foreground">Today's List</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {doneCount}/{sampleTasks.length} done · Shared with partner
          </p>
        </div>
        <button className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Task list */}
      <div className="px-4 pb-3 space-y-1">
        {sampleTasks.map((task) => (
          <div
            key={task.id}
            className="flex items-center gap-3 py-2 group"
          >
            <div
              className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center transition-colors ${
                task.done
                  ? "bg-us-sage text-primary-foreground"
                  : "border-2 border-border group-hover:border-muted-foreground"
              }`}
            >
              {task.done && <Check className="w-3 h-3" />}
            </div>
            <span
              className={`flex-1 text-sm ${
                task.done
                  ? "line-through text-muted-foreground"
                  : "text-foreground"
              }`}
            >
              {task.label}
            </span>
            <span
              className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full ${
                task.assignee === "you"
                  ? "bg-primary/10 text-primary"
                  : "bg-us-sage/20 text-us-sage"
              }`}
            >
              {task.assignee === "you" ? "You" : "Them"}
            </span>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="px-4 pb-4">
        <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(doneCount / sampleTasks.length) * 100}%` }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="h-full rounded-full bg-us-sage"
          />
        </div>
      </div>
    </motion.div>
  );
};

export default DailyListsWidget;
