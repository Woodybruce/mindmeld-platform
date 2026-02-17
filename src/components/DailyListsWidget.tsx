import { useState } from "react";
import { Check, Plus, CalendarDays } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useWeeklyTasks } from "@/hooks/useWeeklyTasks";

const DailyListsWidget = () => {
  const navigate = useNavigate();
  const { tasks, loading, toggleTask, getTodayTasks } = useWeeklyTasks();
  const todayTasks = getTodayTasks();

  if (loading) return null;

  if (todayTasks.length === 0) {
    return (
      <motion.button
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => navigate("/us?tab=lists")}
        className="w-full rounded-2xl border border-dashed border-border bg-card p-6 text-center"
      >
        <Plus className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
        <h3 className="font-display text-base font-bold text-foreground">Add Today's Tasks</h3>
        <p className="text-xs text-muted-foreground mt-1">Plan your day in the Weekly List</p>
      </motion.button>
    );
  }

  const doneCount = todayTasks.filter((t) => t.done).length;
  const visibleItems = todayTasks.slice(0, 5);
  const todayLabel = new Date().toLocaleDateString("default", { weekday: "long" });

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="rounded-2xl border border-border bg-card overflow-hidden"
    >
      <button onClick={() => navigate("/us?tab=lists")} className="w-full px-4 pt-4 pb-2 flex items-center justify-between text-left">
        <div className="flex items-center gap-2.5">
          <CalendarDays className="w-5 h-5 text-primary" />
          <div>
            <h3 className="font-display text-base font-bold text-foreground">{todayLabel}'s Tasks</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {doneCount}/{todayTasks.length} done
            </p>
          </div>
        </div>
      </button>

      <div className="px-4 pb-3 space-y-1">
        {visibleItems.map((task) => (
          <div key={task.id} className="flex items-center gap-3 py-2">
            <button
              onClick={(e) => { e.stopPropagation(); toggleTask(task.id); }}
              className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center transition-colors ${
                task.done ? "bg-primary text-primary-foreground" : "border-2 border-border"
              }`}
            >
              {task.done && <Check className="w-3 h-3" />}
            </button>
            <span className={`flex-1 text-sm ${task.done ? "text-muted-foreground" : "text-foreground"}`}>
              {task.text}
            </span>
            {task.source !== "manual" && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground uppercase">
                {task.source}
              </span>
            )}
          </div>
        ))}
        {todayTasks.length > 5 && (
          <button onClick={() => navigate("/us?tab=lists")} className="text-xs text-primary font-medium py-1">
            +{todayTasks.length - 5} more
          </button>
        )}
      </div>

      {todayTasks.length > 0 && (
        <div className="px-4 pb-4">
          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(doneCount / todayTasks.length) * 100}%` }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="h-full rounded-full bg-primary"
            />
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default DailyListsWidget;
