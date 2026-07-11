import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Plus, MapPin, Clock, Trash2, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import LocationAutocomplete from "@/components/ui/LocationAutocomplete";
import OutlookEventPicker from "@/components/OutlookEventPicker";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { localDateKey, localDateKeyFromTimestamp } from "@/lib/dateKey";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const OurEvents = () => {
  const { user } = useAuth();
  const { events, addEvent, deleteEvent, fetchEvents } = useCalendarEvents();

  const [showAdd, setShowAdd] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [showOutlookPicker, setShowOutlookPicker] = useState(false);
  const [outlookConnected, setOutlookConnected] = useState<boolean | null>(null);

  // Calendar state
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("microsoft_tokens").select("id").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setOutlookConnected(!!data));
  }, [user]);

  const handleCreate = async () => {
    if (!newSubject.trim() || !newDate) return;
    // For all-day events anchor at local noon (not midnight): midnight local converts to
    // the previous day under toISOString() in any UTC+ timezone, landing the event on the
    // wrong day. Noon stays on the intended calendar day everywhere.
    const startDt = newTime
      ? new Date(`${newDate}T${newTime}:00`).toISOString()
      : new Date(`${newDate}T12:00:00`).toISOString();
    const endDt = newTime
      ? new Date(new Date(`${newDate}T${newTime}:00`).getTime() + 3600000).toISOString()
      : new Date(`${newDate}T13:00:00`).toISOString();

    try {
      await addEvent({
        subject: newSubject.trim(),
        start_time: startDt,
        end_time: endDt,
        is_all_day: !newTime,
        location: newLocation.trim() || undefined,
      });
      setNewSubject("");
      setNewDate("");
      setNewTime("");
      setNewLocation("");
      setShowAdd(false);
    } catch (err) {
      console.error("Failed to create event:", err);
    }
  };

  // Events by date key
  const eventsByDate = useMemo(() => {
    const map = new Map<string, typeof events>();
    events.forEach((e) => {
      const key = localDateKeyFromTimestamp(e.start_time);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    });
    return map;
  }, [events]);

  // Calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    let startDow = firstDay.getDay();
    startDow = startDow === 0 ? 6 : startDow - 1;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewMonth, viewYear]);

  const dateKey = (day: number) =>
    `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const todayKey = localDateKey(today);

  const eventsForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    return eventsByDate.get(selectedDate) || [];
  }, [selectedDate, eventsByDate]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const upcomingCount = events.filter((e) => e.start_time >= new Date().toISOString()).length;

  return (
    <div className="space-y-3">
      {/* Actions bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {upcomingCount} upcoming event{upcomingCount !== 1 ? "s" : ""}
        </p>
        <div className="flex items-center gap-2">
          {outlookConnected && (
            <button
              onClick={() => setShowOutlookPicker(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Outlook
            </button>
          )}
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>
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
          <LocationAutocomplete
            value={newLocation}
            onChange={setNewLocation}
            placeholder="Search location (optional)"
            className="rounded-lg border border-border bg-background pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
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

      {/* Calendar */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        {/* Month navigation */}
        <div className="flex items-center justify-between">
          <button onClick={prevMonth} className="p-1 rounded-lg hover:bg-secondary transition-colors">
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <span className="font-display text-sm font-semibold text-foreground">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </span>
          <button onClick={nextMonth} className="p-1 rounded-lg hover:bg-secondary transition-colors">
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Day labels */}
        <div className="grid grid-cols-7 gap-0.5 text-center">
          {DAY_LABELS.map((d) => (
            <span key={d} className="text-[14px] font-medium text-muted-foreground py-0.5">{d}</span>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 gap-0.5">
          {calendarDays.map((day, idx) => {
            if (day === null) return <div key={idx} />;
            const dk = dateKey(day);
            const dayEvents = eventsByDate.get(dk);
            const hasEvents = !!dayEvents && dayEvents.length > 0;
            const isToday = dk === todayKey;
            const isSelected = dk === selectedDate;

            return (
              <button
                key={idx}
                onClick={() => setSelectedDate(isSelected ? null : dk)}
                className={cn(
                  "relative flex flex-col items-center justify-center rounded-lg py-1.5 text-xs transition-all",
                  isSelected
                    ? "bg-primary text-primary-foreground font-semibold"
                    : isToday
                    ? "bg-accent text-accent-foreground font-medium"
                    : hasEvents
                    ? "hover:bg-secondary/80 text-foreground"
                    : "text-muted-foreground/60"
                )}
              >
                {day}
                {hasEvents && (
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full mt-0.5",
                    isSelected ? "bg-primary-foreground" : "bg-primary"
                  )} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day events */}
      <AnimatePresence mode="wait">
        {selectedDate && (
          <motion.div
            key={selectedDate}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2 overflow-hidden"
          >
            <p className="text-xs font-semibold text-foreground">
              {new Date(selectedDate + "T00:00:00").toLocaleDateString("default", {
                weekday: "long", day: "numeric", month: "long",
              })}
            </p>

            {eventsForSelectedDate.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-4 text-center">
                <p className="text-xs text-muted-foreground">No events on this day</p>
              </div>
            ) : (
              eventsForSelectedDate.map((event, i) => {
                const startDate = new Date(event.start_time);
                const timeStr = event.is_all_day
                  ? "All day"
                  : startDate.toLocaleTimeString("default", { hour: "2-digit", minute: "2-digit" });

                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="rounded-xl border border-border/50 bg-card p-3.5 flex items-start gap-3"
                  >
                    <span className="text-lg">📅</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{event.subject}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1 text-[13px] text-muted-foreground">
                          <Clock className="w-3 h-3" /> {timeStr}
                        </span>
                        {event.source === "outlook" && (
                          <span className="text-[14px] text-muted-foreground bg-secondary rounded px-1.5 py-0.5">Outlook</span>
                        )}
                      </div>
                      {event.location && (
                        <span className="flex items-center gap-1 text-[13px] text-muted-foreground mt-0.5">
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
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* No events at all */}
      {events.length === 0 && !selectedDate && (
        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <Calendar className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No events yet — add one above!</p>
        </div>
      )}

      {/* Outlook picker modal */}
      {showOutlookPicker && (
        <OutlookEventPicker
          onClose={() => setShowOutlookPicker(false)}
          onImported={() => fetchEvents()}
        />
      )}
    </div>
  );
};

export default OurEvents;
