import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ListChecks, ChevronRight, Check, Circle } from "lucide-react";
import type { UserList } from "@/components/connect/SharedLists";

export const ListsSummaryWidget = () => {
  const navigate = useNavigate();
  const [lists, setLists] = useState<UserList[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("userLists");
    if (stored) {
      try { setLists(JSON.parse(stored)); } catch {}
    }
  }, []);

  if (lists.length === 0) return null;

  // Show up to 3 lists with their completion stats
  const summaries = lists.slice(0, 4).map((list) => {
    const checkableItems = list.items.filter((i) => !i.isHeading);
    const doneCount = checkableItems.filter((i) => i.done).length;
    const totalCount = checkableItems.length;
    return { id: list.id, name: list.name, icon: list.icon, doneCount, totalCount };
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-2xl overflow-hidden"
    >
      <button
        onClick={() => navigate("/us?tab=lists")}
        className="w-full flex items-center gap-3 px-4 pt-4 pb-3 text-left"
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white shrink-0">
          <ListChecks className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-base font-semibold text-foreground">Our Lists</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{lists.length} list{lists.length !== 1 ? "s" : ""} active</p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </button>

      <div className="px-4 pb-4 pt-1 space-y-2">
        {summaries.map((s) => (
          <div key={s.id} className="flex items-center gap-3 bg-secondary/60 rounded-xl px-3 py-2.5">
            <span className="text-base">{s.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{s.name}</p>
              <p className="text-[10px] text-muted-foreground">
                {s.doneCount}/{s.totalCount} completed
              </p>
            </div>
            {s.totalCount > 0 && (
              <div className="w-8 h-8 rounded-full border-2 border-border flex items-center justify-center">
                {s.doneCount === s.totalCount ? (
                  <Check className="w-4 h-4 text-primary" />
                ) : (
                  <span className="text-[10px] font-bold text-muted-foreground">
                    {Math.round((s.doneCount / s.totalCount) * 100)}%
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
};
