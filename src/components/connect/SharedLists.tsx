import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Check, Trash2, ChevronRight, ListChecks, Calendar, Target, Zap, Paperclip, Image, CalendarPlus, Eye, EyeOff, RefreshCw, TrendingUp } from "lucide-react";

export interface ListItemAttachment {
  type: "photo" | "file" | "event";
  url?: string;
  name?: string;
  date?: string;
}

export interface ListItem {
  id: string;
  text: string;
  done: boolean;
  attachments?: ListItemAttachment[];
}

export interface ScoreSnapshot {
  takenAt: string;
  answers: Record<string, number | string>;
  milestone: number; // 0, 25, 50, 75, 100
}

export interface UserList {
  id: string;
  name: string;
  icon: string;
  items: ListItem[];
  createdAt: string;
  template?: string;
  /** For checklist quizzes: score sections stored separately */
  scoreData?: {
    sections: { title: string; items: { id: string; text: string; type: string; choices?: string[] }[] }[];
    snapshots: ScoreSnapshot[];
  };
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

  const [showCompleted, setShowCompleted] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachingItemId, setAttachingItemId] = useState<{ listId: string; itemId: string } | null>(null);
  const [eventPickerItem, setEventPickerItem] = useState<{ listId: string; itemId: string } | null>(null);
  const [eventDate, setEventDate] = useState("");

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

  const addAttachment = (listId: string, itemId: string, attachment: ListItemAttachment) => {
    const updated = lists.map((l) =>
      l.id === listId
        ? {
            ...l,
            items: l.items.map((i) =>
              i.id === itemId
                ? { ...i, attachments: [...(i.attachments || []), attachment] }
                : i
            ),
          }
        : l
    );
    onUpdate(updated);
  };

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!attachingItemId || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    const isImage = file.type.startsWith("image/");
    const url = URL.createObjectURL(file);
    addAttachment(attachingItemId.listId, attachingItemId.itemId, {
      type: isImage ? "photo" : "file",
      url,
      name: file.name,
    });
    setAttachingItemId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const getCompletionPercent = (list: UserList) => {
    if (list.items.length === 0) return 0;
    return Math.round((list.items.filter((i) => i.done).length / list.items.length) * 100);
  };

  const getNextMilestone = (list: UserList) => {
    const pct = getCompletionPercent(list);
    const milestones = [25, 50, 75, 100];
    const completedMilestones = (list.scoreData?.snapshots || []).map((s) => s.milestone);
    return milestones.find((m) => pct >= m && !completedMilestones.includes(m)) ?? null;
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

      {/* Hidden file input for attachments */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf,.doc,.docx,.txt"
        className="hidden"
        onChange={handleFileAttach}
      />

      {lists.map((list, i) => {
        const isExpanded = expandedId === list.id;
        const doneCount = list.items.filter((i) => i.done).length;
        const activeItems = list.items.filter((i) => !i.done);
        const completedItems = list.items.filter((i) => i.done);
        const isShowingCompleted = showCompleted[list.id] ?? false;
        const completionPct = getCompletionPercent(list);
        const nextMilestone = list.scoreData ? getNextMilestone(list) : null;

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
                  {list.scoreData && ` · ${completionPct}%`}
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
                {/* Score summary card for checklist quiz lists */}
                {list.scoreData && (
                  <div className="px-4 py-3 border-b border-border/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> Score Summary
                      </p>
                      {nextMilestone && (
                        <button
                          onClick={() => {
                            // Navigate to retest - store current list context
                            const quizId = list.id.replace(/^checklist-/, "").replace(/-\d+$/, "");
                            localStorage.setItem("retestListId", list.id);
                            localStorage.setItem("retestMilestone", String(nextMilestone));
                            window.location.href = `/checklist-quiz/${quizId}?retest=true`;
                          }}
                          className="flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
                        >
                          <RefreshCw className="w-3 h-3" /> Retest ({nextMilestone}% milestone)
                        </button>
                      )}
                    </div>

                    {/* Latest snapshot */}
                    {list.scoreData.snapshots.length > 0 && (
                      <div className="space-y-1.5">
                        {list.scoreData.snapshots.map((snap, si) => (
                          <div key={si} className="rounded-lg bg-secondary/50 p-2.5 space-y-1">
                            <p className="text-[11px] font-medium text-muted-foreground">
                              {snap.milestone === 0 ? "Initial" : `${snap.milestone}% milestone`} · {new Date(snap.takenAt).toLocaleDateString()}
                            </p>
                            <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                              {Object.entries(snap.answers).map(([key, val]) => {
                                const item = list.scoreData!.sections.flatMap(s => s.items).find(i => i.id === key);
                                return (
                                  <div key={key} className="flex items-center gap-1.5 text-xs">
                                    <span className="text-muted-foreground truncate max-w-[120px]">{item?.text?.replace(/ \(1–10\)/, "") || key}</span>
                                    <span className="font-bold text-primary">{typeof val === "number" ? `${val}/10` : val}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Active items */}
                <div className="px-4 py-3 space-y-1.5">
                  {activeItems.map((item) => (
                    <div key={item.id} className="group">
                      <div className="flex items-center gap-2.5">
                        <button
                          onClick={() => toggleItem(list.id, item.id)}
                          className="w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-colors border-border hover:border-primary/50"
                        >
                        </button>
                        <span className="flex-1 text-sm text-foreground">{item.text}</span>
                        <button
                          onClick={() => {
                            setAttachingItemId({ listId: list.id, itemId: item.id });
                            fileInputRef.current?.click();
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1"
                          title="Attach photo/file"
                        >
                          <Paperclip className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
                        </button>
                        <button
                          onClick={() => setEventPickerItem(
                            eventPickerItem?.listId === list.id && eventPickerItem?.itemId === item.id
                              ? null
                              : { listId: list.id, itemId: item.id }
                          )}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1"
                          title="Create event"
                        >
                          <CalendarPlus className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
                        </button>
                        <button
                          onClick={() => removeItem(list.id, item.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>

                      {/* Inline event date picker */}
                      {eventPickerItem?.listId === list.id && eventPickerItem?.itemId === item.id && (
                        <div className="flex items-center gap-2 pl-7 mt-1.5">
                          <input
                            type="datetime-local"
                            value={eventDate}
                            onChange={(e) => setEventDate(e.target.value)}
                            className="rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                          <button
                            onClick={() => {
                              if (!eventDate) return;
                              addAttachment(list.id, item.id, {
                                type: "event",
                                name: item.text,
                                date: eventDate,
                              });
                              setEventPickerItem(null);
                              setEventDate("");
                            }}
                            className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                          >
                            Add
                          </button>
                          <button
                            onClick={() => { setEventPickerItem(null); setEventDate(""); }}
                            className="text-xs text-muted-foreground hover:text-foreground"
                          >
                            ✕
                          </button>
                        </div>
                      )}

                      {/* Attachments */}
                      {item.attachments && item.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pl-7 mt-1">
                          {item.attachments.map((att, ai) => (
                            <a
                              key={ai}
                              href={att.type === "event" ? undefined : att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-md bg-secondary/60 px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {att.type === "photo" ? <Image className="w-2.5 h-2.5" /> : att.type === "event" ? <CalendarPlus className="w-2.5 h-2.5" /> : <Paperclip className="w-2.5 h-2.5" />}
                              {att.type === "event" && att.date ? new Date(att.date).toLocaleDateString() : att.name || "Attachment"}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {activeItems.length === 0 && completedItems.length > 0 && (
                    <p className="text-xs text-center text-muted-foreground py-2">All items completed! 🎉</p>
                  )}

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

                {/* Completed items toggle */}
                {completedItems.length > 0 && (
                  <div className="border-t border-border/30">
                    <button
                      onClick={() => setShowCompleted((prev) => ({ ...prev, [list.id]: !prev[list.id] }))}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {isShowingCompleted ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      {isShowingCompleted ? "Hide" : "Show"} {completedItems.length} completed
                    </button>
                    <AnimatePresence>
                      {isShowingCompleted && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-3 space-y-1.5">
                            {completedItems.map((item) => (
                              <div key={item.id} className="flex items-center gap-2.5 group">
                                <button
                                  onClick={() => toggleItem(list.id, item.id)}
                                  className="w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 bg-primary border-primary"
                                >
                                  <Check className="w-3 h-3 text-primary-foreground" />
                                </button>
                                <span className="flex-1 text-sm text-muted-foreground line-through">{item.text}</span>
                                <button
                                  onClick={() => removeItem(list.id, item.id)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

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
