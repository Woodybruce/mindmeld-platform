import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Calendar, Plus, MapPin, Clock, Link2, LogOut, Loader2, ExternalLink } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useMicrosoftCalendar, type OutlookEvent } from "@/hooks/useMicrosoftCalendar";
import { useAuth } from "@/contexts/AuthContext";

const OurEvents = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    connected, loading, events, eventsLoading,
    connect, handleCallback, fetchEvents, createEvent, disconnect,
  } = useMicrosoftCalendar();

  const [showAdd, setShowAdd] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [creating, setCreating] = useState(false);

  // Handle OAuth callback
  useEffect(() => {
    const code = searchParams.get("code");
    const isCallback = searchParams.get("ms_callback");
    if (code && isCallback && user) {
      handleCallback(code).then(() => {
        // Clean URL params
        searchParams.delete("code");
        searchParams.delete("ms_callback");
        searchParams.delete("session_state");
        setSearchParams(searchParams, { replace: true });
      }).catch((e) => console.error("Callback error:", e));
    }
  }, [searchParams, user]);

  // Fetch events when connected
  useEffect(() => {
    if (!connected) return;
    const start = new Date().toISOString();
    const end = new Date(Date.now() + 90 * 86400000).toISOString();
    fetchEvents(start, end);
  }, [connected, fetchEvents]);

  const handleCreateEvent = async () => {
    if (!newSubject.trim() || !newDate) return;
    setCreating(true);
    try {
      const startDt = newTime
        ? new Date(`${newDate}T${newTime}:00`).toISOString()
        : new Date(`${newDate}T00:00:00`).toISOString();
      const endDt = newTime
        ? new Date(new Date(`${newDate}T${newTime}:00`).getTime() + 3600000).toISOString()
        : new Date(`${newDate}T23:59:59`).toISOString();

      await createEvent({
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

      // Refresh events
      const start = new Date().toISOString();
      const end = new Date(Date.now() + 90 * 86400000).toISOString();
      fetchEvents(start, end);
    } catch (e) {
      console.error("Failed to create event:", e);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <Calendar className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
        <h3 className="font-display text-base font-semibold text-foreground">Sign in to connect calendar</h3>
        <p className="text-sm text-muted-foreground mt-1">Link your Outlook calendar to see events here</p>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Connect your Outlook calendar to see and create events</p>
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={connect}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-us-terracotta p-4 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <Link2 className="w-4 h-4" /> Connect Outlook Calendar
        </motion.button>
        <p className="text-[11px] text-muted-foreground text-center">
          We'll read your events and let you create joint events. You can disconnect anytime.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {eventsLoading ? "Loading events…" : `${events.length} upcoming event${events.length !== 1 ? "s" : ""}`}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Event
          </button>
          <button
            onClick={disconnect}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive transition-colors"
          >
            <LogOut className="w-3 h-3" /> Disconnect
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
          <input
            value={newLocation}
            onChange={(e) => setNewLocation(e.target.value)}
            placeholder="Location (optional)"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreateEvent}
              disabled={creating || !newSubject.trim() || !newDate}
              className="flex-1 rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground disabled:opacity-40"
            >
              {creating ? "Creating…" : "Create Event"}
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
      {events.length === 0 && !eventsLoading && (
        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <Calendar className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No upcoming events</p>
        </div>
      )}

      {events
        .sort((a, b) => new Date(a.start.dateTime).getTime() - new Date(b.start.dateTime).getTime())
        .map((event, i) => {
          const startDate = new Date(event.start.dateTime);
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
                {event.location?.displayName && (
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                    <MapPin className="w-3 h-3" /> {event.location.displayName}
                  </span>
                )}
              </div>
              {event.webLink && (
                <a
                  href={event.webLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                </a>
              )}
            </motion.div>
          );
        })}
    </div>
  );
};

export default OurEvents;
