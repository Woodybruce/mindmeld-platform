import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Check, Trash2, ChevronRight, ListChecks, Calendar, Target, Zap } from "lucide-react";

export interface ListItem {
  id: string;
  text: string;
  done: boolean;
}

export interface UserList {
  id: string;
  name: string;
  icon: string;
  items: ListItem[];
  createdAt: string;
  template?: string;
}

const templates = [
  {
    id: "daily",
    name: "Daily To-Do",
    icon: "☀️",
    description: "Tasks for today",
    gradient: "bg-gradient-to-br from-us-gold/15 to-us-cream/30",
    lucideIcon: Calendar,
    defaultItems: ["Morning check-in with partner", "Review shared calendar", "Send a sweet message"],
  },
  {
    id: "long-term",
    name: "Long-Term Goals",
    icon: "🎯",
    description: "Dreams & milestones",
    gradient: "bg-gradient-to-br from-us-sage/15 to-us-cream/30",
    lucideIcon: Target,
    defaultItems: ["Plan a holiday together", "Start a savings goal", "Learn something new as a couple"],
  },
  {
    id: "actions",
    name: "Action Items",
    icon: "⚡",
    description: "Things to get done",
    gradient: "bg-gradient-to-br from-us-coral/10 to-us-blush/25",
    lucideIcon: Zap,
    defaultItems: ["Book restaurant for date night", "Research weekend getaway", "Buy anniversary gift"],
  },
];

interface SharedListsProps {
  lists: UserList[];
  onUpdate: (lists: UserList[]) => void;
}

const SharedLists = ({ lists, onUpdate }: SharedListsProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newItemText, setNewItemText] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [creatingBlank, setCreatingBlank] = useState(false);

  const createFromTemplate = (templateId: string) => {
    const t = templates.find((t) => t.id === templateId)!;
    const newList: UserList = {
      id: Date.now().toString(),
      name: t.name,
      icon: t.icon,
      template: t.id,
      createdAt: new Date().toISOString(),
      items: t.defaultItems.map((text, i) => ({ id: `${Date.now()}-${i}`, text, done: false })),
    };
    const updated = [newList, ...lists];
    onUpdate(updated);
    setShowTemplates(false);
    setExpandedId(newList.id);
  };

  const createBlankList = () => {
    if (!newListName.trim()) return;
    const newList: UserList = {
      id: Date.now().toString(),
      name: newListName.trim(),
      icon: "📝",
      createdAt: new Date().toISOString(),
      items: [],
    };
    const updated = [newList, ...lists];
    onUpdate(updated);
    setCreatingBlank(false);
    setNewListName("");
    setExpandedId(newList.id);
  };

  const toggleItem = (listId: string, itemId: string) => {
    const updated = lists.map((l) =>
      l.id === listId ? { ...l, items: l.items.map((i) => (i.id === itemId ? { ...i, done: !i.done } : i)) } : l
    );
    onUpdate(updated);
  };

  const addItem = (listId: string) => {
    if (!newItemText.trim()) return;
    const updated = lists.map((l) =>
      l.id === listId ? { ...l, items: [...l.items, { id: Date.now().toString(), text: newItemText.trim(), done: false }] } : l
    );
    onUpdate(updated);
    setNewItemText("");
  };

  const removeItem = (listId: string, itemId: string) => {
    const updated = lists.map((l) =>
      l.id === listId ? { ...l, items: l.items.filter((i) => i.id !== itemId) } : l
    );
    onUpdate(updated);
  };

  const deleteList = (listId: string) => {
    onUpdate(lists.filter((l) => l.id !== listId));
    if (expandedId === listId) setExpandedId(null);
  };

  return (
    <div className="space-y-3">
      {/* Create new */}
      {!showTemplates && !creatingBlank && (
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => setShowTemplates(true)}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card p-4 text-sm font-medium text-primary hover:bg-muted/50 transition-colors"
        >
          <Plus className="w-4 h-4" /> New List
        </motion.button>
      )}

      {/* Template picker */}
      <AnimatePresence>
        {showTemplates && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2 overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Choose a template</p>
              <button onClick={() => setShowTemplates(false)} className="text-xs text-muted-foreground hover:text-foreground">
                Cancel
              </button>
            </div>
            {templates.map((t, i) => (
              <motion.button
                key={t.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                onClick={() => createFromTemplate(t.id)}
                className={`w-full flex items-center gap-3 rounded-xl p-3.5 text-left ${t.gradient} border border-border/30 hover:scale-[1.01] transition-transform`}
              >
                <span className="text-xl">{t.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.description}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </motion.button>
            ))
            }
            <button
              onClick={() => { setShowTemplates(false); setCreatingBlank(true); }}
              className="w-full flex items-center gap-3 rounded-xl p-3.5 text-left bg-secondary/50 border border-border/30 hover:bg-secondary transition-colors"
            >
              <span className="text-xl">📝</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">Blank List</p>
                <p className="text-xs text-muted-foreground">Start from scratch</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Blank list name input */}
      <AnimatePresence>
        {creatingBlank && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex gap-2 overflow-hidden"
          >
            <input
              autoFocus
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createBlankList()}
              placeholder="List name…"
              className="flex-1 rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button onClick={createBlankList} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground">
              Create
            </button>
            <button onClick={() => { setCreatingBlank(false); setNewListName(""); }} className="rounded-xl bg-secondary px-3 py-2.5 text-sm text-muted-foreground">
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Existing lists */}
      {lists.length === 0 && !showTemplates && !creatingBlank && (
        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <ListChecks className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-display text-base font-semibold text-foreground">No lists yet</h3>
          <p className="text-sm text-muted-foreground mt-1">Create a list to get started.</p>
        </div>
      )}

      {lists.map((list, i) => {
        const isExpanded = expandedId === list.id;
        const doneCount = list.items.filter((i) => i.done).length;

        return (
          <motion.div
            key={list.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-border/50 bg-card overflow-hidden"
          >
            <button
              onClick={() => setExpandedId(isExpanded ? null : list.id)}
              className="w-full flex items-center gap-3 p-4 text-left"
            >
              <span className="text-xl">{list.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{list.name}</p>
                <p className="text-xs text-muted-foreground">
                  {doneCount}/{list.items.length} done
                </p>
              </div>
              <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`} />
            </button>

            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="border-t border-border/30"
              >
                <div className="px-4 py-3 space-y-1.5">
                  {list.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-2.5 group">
                      <button
                        onClick={() => toggleItem(list.id, item.id)}
                        className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-colors ${
                          item.done ? "bg-primary border-primary" : "border-border hover:border-primary/50"
                        }`}
                      >
                        {item.done && <Check className="w-3 h-3 text-primary-foreground" />}
                      </button>
                      <span className={`flex-1 text-sm ${item.done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                        {item.text}
                      </span>
                      <button
                        onClick={() => removeItem(list.id, item.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  ))}

                  {/* Add item */}
                  <div className="flex gap-2 pt-2">
                    <input
                      value={expandedId === list.id ? newItemText : ""}
                      onChange={(e) => setNewItemText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addItem(list.id)}
                      placeholder="Add item…"
                      className="flex-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <button
                      onClick={() => addItem(list.id)}
                      className="rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Delete list */}
                <div className="px-4 py-2 border-t border-border/30">
                  <button
                    onClick={() => deleteList(list.id)}
                    className="text-[11px] text-muted-foreground hover:text-destructive transition-colors"
                  >
                    Delete list
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
};

export default SharedLists;
