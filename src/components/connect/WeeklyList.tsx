import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Check, Trash2, CalendarDays, ChevronDown, ChevronRight, Loader2, Pencil, Paperclip, CalendarPlus, Image } from "lucide-react";
import { useWeeklyTasks, TaskAttachment } from "@/hooks/useWeeklyTasks";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { toast } from "@/hooks/use-toast";

const WeeklyList = () => {
  const { tasks, loading, addTask, toggleTask, deleteTask, updateTaskText, updateTaskAttachments, getTasksForDate, getWeekDates } = useWeeklyTasks();
  const { events } = useCalendarEvents();
  const weekDates = getWeekDates();
  const [expandedDays, setExpandedDays] = useState<Set<string>>(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    return new Set([todayStr]);
  });
  const [newItemText, setNewItemText] = useState<Record<string, string>>({});
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [showAllDays, setShowAllDays] = useState(false);

  // Edit state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  // Attachment state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachingTaskId, setAttachingTaskId] = useState<string | null>(null);

  // Event picker state
  const [eventPickerTaskId, setEventPickerTaskId] = useState<string | null>(null);
  const [eventDate, setEventDate] = useState("");

  const toggleDay = (dateStr: string) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dateStr)) next.delete(dateStr);
      else next.add(dateStr);
      return next;
    });
  };

  const handleAdd = async (dateStr: string) => {
    const text = (newItemText[dateStr] || "").trim();
    if (!text) return;
    try {
      await addTask(text, dateStr);
      setNewItemText((prev) => ({ ...prev, [dateStr]: "" }));
    } catch {
      toast({ title: "Couldn't add task", variant: "destructive" });
    }
  };

  const handleAddCalendarEvent = async (subject: string, dateStr: string, eventId: string) => {
    const dayTasks = getTasksForDate(dateStr);
    if (dayTasks.some((t) => t.source === "calendar" && t.source_id === eventId)) {
      toast({ title: "Already in your list" });
      return;
    }
    try {
      await addTask(subject, dateStr, "calendar", eventId);
      toast({ title: "Added from calendar ✓" });
    } catch {
      toast({ title: "Couldn't add event", variant: "destructive" });
    }
  };

  const getCalendarEventsForDate = (dateStr: string) => {
    return events.filter((e) => {
      const eventDate = new Date(e.start_time).toISOString().split("T")[0];
      return eventDate === dateStr;
    });
  };

  const handleSaveEdit = (taskId: string) => {
    if (!editText.trim()) return;
    updateTaskText(taskId, editText.trim());
    setEditingTaskId(null);
    setEditText("");
  };

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!attachingTaskId || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    const isImage = file.type.startsWith("image/");
    const url = URL.createObjectURL(file);
    const task = tasks.find((t) => t.id === attachingTaskId);
    if (!task) return;
    const newAttachment: TaskAttachment = { type: isImage ? "photo" : "file", url, name: file.name };
    updateTaskAttachments(attachingTaskId, [...(task.attachments || []), newAttachment]);
    setAttachingTaskId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAddEvent = (taskId: string, taskText: string) => {
    if (!eventDate) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const newAttachment: TaskAttachment = { type: "event", name: taskText, date: eventDate };
    updateTaskAttachments(taskId, [...(task.attachments || []), newAttachment]);
    setEventPickerTaskId(null);
    setEventDate("");
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.done).length;

  return (
    <div className="space-y-2">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf,.doc,.docx,.txt"
        className="hidden"
        onChange={handleFileAttach}
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <CalendarDays className="w-5 h-5 text-primary" />
        <div className="flex-1">
          <h3 className="text-sm font-bold text-foreground">Weekly List</h3>
          <p className="text-[11px] text-muted-foreground">
            {doneTasks}/{totalTasks} done this week
          </p>
        </div>
        {totalTasks > 0 && (
          <div className="w-16 h-1.5 rounded-full bg-secondary overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0}%` }}
              className="h-full rounded-full bg-primary"
            />
          </div>
        )}
        <button
          onClick={() => setShowAllDays((v) => !v)}
          className="rounded-lg px-2.5 py-1 text-[11px] font-semibold border border-border hover:bg-secondary transition-colors text-muted-foreground"
        >
          {showAllDays ? "Today" : "Week"}
        </button>
      </div>

      {/* Days */}
      {weekDates.filter(({ isToday }) => showAllDays || isToday).map(({ dateStr, label, isToday, date }) => {
        const dayTasks = getTasksForDate(dateStr);
        const calEvents = getCalendarEventsForDate(dateStr);
        const addedCalIds = new Set(dayTasks.filter((t) => t.source === "calendar").map((t) => t.source_id));
        const unaddedCalEvents = calEvents.filter((e) => !addedCalIds.has(e.id));
        const isExpanded = expandedDays.has(dateStr);
        const dayDone = dayTasks.filter((t) => t.done).length;
        const dayNum = date.getDate();
        const monthShort = date.toLocaleString("default", { month: "short" });

        return (
          <div
            key={dateStr}
            className={`rounded-xl border overflow-hidden transition-colors ${
              isToday ? "border-primary/40 bg-primary/5" : "border-border/50 bg-card"
            }`}
          >
            <button
              onClick={() => toggleDay(dateStr)}
              className="w-full flex items-center gap-3 p-3 text-left"
            >
              <div className={`w-9 h-9 rounded-lg flex flex-col items-center justify-center text-center flex-shrink-0 ${
                isToday ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
              }`}>
                <span className="text-[9px] font-semibold uppercase leading-none">{monthShort}</span>
                <span className="text-sm font-bold leading-none">{dayNum}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${isToday ? "text-primary" : "text-foreground"}`}>
                  {label} {isToday && <span className="text-xs font-normal text-muted-foreground ml-1">· Today</span>}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {dayTasks.length === 0 ? "No tasks" : `${dayDone}/${dayTasks.length} done`}
                  {unaddedCalEvents.length > 0 && ` · ${unaddedCalEvents.length} event${unaddedCalEvents.length > 1 ? "s" : ""}`}
                </p>
              </div>
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
            </button>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border-t border-border/30 overflow-hidden"
                >
                  <div className="px-3 py-2 space-y-1">
                    {/* Tasks */}
                    {dayTasks.map((task) => {
                      const isEditing = editingTaskId === task.id;

                      return (
                        <div key={task.id} className="group">
                          <div className="flex items-center gap-2.5 py-1.5">
                            <button
                              onClick={() => toggleTask(task.id)}
                              className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center transition-colors ${
                                task.done ? "bg-primary text-primary-foreground" : "border-2 border-border hover:border-primary"
                              }`}
                            >
                              {task.done && <Check className="w-3 h-3" />}
                            </button>

                            {isEditing ? (
                              <input
                                autoFocus
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSaveEdit(task.id);
                                  if (e.key === "Escape") { setEditingTaskId(null); setEditText(""); }
                                }}
                                onBlur={() => handleSaveEdit(task.id)}
                                className="flex-1 rounded-lg border border-primary bg-background px-2 py-0.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                              />
                            ) : (
                              <span
                                onClick={() => { setEditingTaskId(task.id); setEditText(task.text); }}
                                className={`flex-1 text-sm cursor-text hover:text-primary/80 transition-colors ${task.done ? "text-muted-foreground line-through" : "text-foreground"}`}
                              >
                                {task.text}
                              </span>
                            )}

                            {task.source !== "manual" && !isEditing && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground uppercase tracking-wider">
                                {task.source}
                              </span>
                            )}

                            {!isEditing && (
                              <>
                                <button
                                  onClick={() => { setEditingTaskId(task.id); setEditText(task.text); }}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                  title="Edit"
                                >
                                  <Pencil className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
                                </button>
                                <button
                                  onClick={() => {
                                    setAttachingTaskId(task.id);
                                    fileInputRef.current?.click();
                                  }}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                  title="Attach photo/file"
                                >
                                  <Paperclip className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
                                </button>
                                <button
                                  onClick={() => setEventPickerTaskId(
                                    eventPickerTaskId === task.id ? null : task.id
                                  )}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                  title="Create event"
                                >
                                  <CalendarPlus className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
                                </button>
                                <button
                                  onClick={() => deleteTask(task.id)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                                </button>
                              </>
                            )}
                          </div>

                          {/* Inline event date picker */}
                          {eventPickerTaskId === task.id && (
                            <div className="flex items-center gap-2 pl-7 mt-1.5">
                              <input
                                type="datetime-local"
                                value={eventDate}
                                onChange={(e) => setEventDate(e.target.value)}
                                className="rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                              />
                              <button
                                onClick={() => handleAddEvent(task.id, task.text)}
                                className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                              >
                                Add
                              </button>
                              <button
                                onClick={() => { setEventPickerTaskId(null); setEventDate(""); }}
                                className="text-xs text-muted-foreground hover:text-foreground"
                              >
                                ✕
                              </button>
                            </div>
                          )}

                          {/* Attachments */}
                          {task.attachments && task.attachments.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pl-7 mt-1">
                              {task.attachments.map((att, ai) => (
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
                      );
                    })}

                    {/* Unadded calendar events */}
                    {unaddedCalEvents.length > 0 && (
                      <div className="pt-1 space-y-1">
                        <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">From Calendar</p>
                        {unaddedCalEvents.map((event) => (
                          <button
                            key={event.id}
                            onClick={() => handleAddCalendarEvent(event.subject, dateStr, event.id)}
                            className="w-full flex items-center gap-2.5 py-1.5 text-left group hover:bg-secondary/50 rounded-lg px-1 -mx-1 transition-colors"
                          >
                            <Plus className="w-4 h-4 text-primary flex-shrink-0" />
                            <span className="flex-1 text-sm text-muted-foreground group-hover:text-foreground transition-colors">{event.subject}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(event.start_time).toLocaleTimeString("default", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Add new */}
                    <div className="flex gap-2 pt-1 pb-1">
                      <input
                        value={newItemText[dateStr] || ""}
                        onChange={(e) => setNewItemText((prev) => ({ ...prev, [dateStr]: e.target.value }))}
                        onKeyDown={(e) => e.key === "Enter" && handleAdd(dateStr)}
                        placeholder="Add task…"
                        className="flex-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <button
                        onClick={() => handleAdd(dateStr)}
                        className="rounded-lg bg-primary p-1.5 text-primary-foreground hover:bg-primary/90 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
};

export default WeeklyList;
