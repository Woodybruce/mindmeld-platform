import { useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Plus, MapPin, Clock, Trash2 } from "lucide-react";
import { useLocalCalendar, type LocalEvent } from "@/hooks/useLocalCalendar";

const OurEvents = () => {
  const { events, addEvent, deleteEvent } = useLocalCalendar();

  const [showAdd, setShowAdd] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newLocation, setNewLocation] = useState("");

  const handleCreate = () => {
    if (!newSubject.trim() || !newDate) return;
    const startDt = newTime
      ? new Date(`${newDate}T${newTime}:00`).toISOString()
      : new Date(`${newDate}T00:00:00`).toISOString();
    const endDt = newTime
      ? new Date(new Date(`${newDate}T${newTime}:00`).getTime() + 3600000).toISOString()
      : new Date(`${newDate}T23:59:59`).toISOString();

    addEvent({
      subject: newSubject.trim(),
      start: startDt,
      end: endDt,
      isAllDay: !newTime,
      location: newLocation.trim() || undefined,
    });

    setNewSubject("");
    setNewDate("");
    setNewTime("");
    setNewLocation("");
    setShowAdd(false);
  };

  const upcoming = events
    .filter((e) => e.start >= new Date().toISOString())
    .sort((a, b) => a.start.localeCompare(b.start));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {upcoming.length} upcoming event{upcoming.length !== 1 ? "s" : ""}
        </p>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add Event
        </button>
      </div>

      {/* Create event form */}
      {showAdd && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="rounded-xl border border-border bg-card p-4 space-y-2.5 overflow-hidden"
        >
          <input
            autoFocus
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            placeholder="Event name…"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <input
              type="time"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              placeholder="All day"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <input
            value={newLocation}
            onChange={(e) => setNewLocation(e.target.value)}
            placeholder="Location (optional)"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={!newSubject.trim() || !newDate}
              className="flex-1 rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground disabled:opacity-40"
            >
              Create Event
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="rounded-lg bg-secondary px-4 py-2 text-sm text-muted-foreground"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      )}

      {/* Events list */}
      {upcoming.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <Calendar className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No upcoming events</p>
        </div>
      )}

      {upcoming.map((event, i) => {
        const startDate = new Date(event.start);
        const dateStr = startDate.toLocaleDateString("default", { weekday: "short", day: "numeric", month: "short" });
        const timeStr = event.isAllDay
          ? "All day"
          : startDate.toLocaleTimeString("default", { hour: "2-digit", minute: "2-digit" });

        return (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="rounded-xl border border-border/50 bg-card p-4 flex items-start gap-3"
          >
            <span className="text-2xl">📅</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{event.subject}</p>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Calendar className="w-3 h-3" /> {dateStr}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock className="w-3 h-3" /> {timeStr}
                </span>
              </div>
              {event.location && (
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                  <MapPin className="w-3 h-3" /> {event.location}
                </span>
              )}
            </div>
            <button
              onClick={() => deleteEvent(event.id)}
              className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
            </button>
          </motion.div>
        );
      })}
    </div>
  );
};

export default OurEvents;
