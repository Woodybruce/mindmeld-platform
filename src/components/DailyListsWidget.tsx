import { useState, useEffect } from "react";
import { Check, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import type { UserList } from "@/components/connect/SharedLists";

const DailyListsWidget = () => {
  const navigate = useNavigate();
  const [list, setList] = useState<UserList | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("userLists");
    if (stored) {
      try {
        const lists: UserList[] = JSON.parse(stored);
        if (lists.length > 0) setList(lists[0]);
      } catch {}
    }
  }, []);

  if (!list) {
    return (
      <motion.button
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => navigate("/us?tab=lists")}
        className="w-full rounded-2xl border border-dashed border-border bg-card p-6 text-center"
      >
        <Plus className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
        <h3 className="font-display text-base font-bold text-foreground">Create Your First List</h3>
        <p className="text-xs text-muted-foreground mt-1">Daily to-dos, goals, or action items</p>
      </motion.button>
    );
  }

  const doneCount = list.items.filter((i) => i.done).length;
  const visibleItems = list.items.slice(0, 5);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="rounded-2xl border border-border bg-card overflow-hidden"
    >
      <button onClick={() => navigate("/us?tab=lists")} className="w-full px-4 pt-4 pb-2 flex items-center justify-between text-left">
        <div>
          <h3 className="font-display text-base font-bold text-foreground">{list.name}</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {doneCount}/{list.items.length} done · Shared with partner
          </p>
        </div>
        <span className="text-xl">{list.icon}</span>
      </button>

      <div className="px-4 pb-3 space-y-1">
        {visibleItems.map((task) => (
          <div key={task.id} className="flex items-center gap-3 py-2">
            <div className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center transition-colors ${
              task.done ? "bg-us-sage text-primary-foreground" : "border-2 border-border"
            }`}>
              {task.done && <Check className="w-3 h-3" />}
            </div>
            <span className={`flex-1 text-sm ${task.done ? "line-through text-muted-foreground" : "text-foreground"}`}>
              {task.text}
            </span>
          </div>
        ))}
      </div>

      {list.items.length > 0 && (
        <div className="px-4 pb-4">
          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(doneCount / list.items.length) * 100}%` }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="h-full rounded-full bg-us-sage"
            />
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default DailyListsWidget;
