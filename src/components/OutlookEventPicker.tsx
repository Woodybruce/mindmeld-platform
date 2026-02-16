import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, MapPin, Clock, Users, X, Check, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface OutlookEvent {
  subject: string;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
  location: string | null;
  partner_invited: boolean;
  already_imported: boolean;
  attendees: string[];
}

interface Props {
  onClose: () => void;
  onImported: () => void;
}

const OutlookEventPicker = ({ onClose, onImported }: Props) => {
  const [events, setEvents] = useState<OutlookEvent[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError("Please sign in first"); setLoading(false); return; }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-outlook-calendar`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ mode: "preview" }),
        }
      );

      const result = await res.json();
      if (result.error) {
        setError(result.error);
      } else {
        setEvents(result.events || []);
        // Auto-select partner events and not-yet-imported events
        const autoSelect = new Set<number>();
        (result.events || []).forEach((e: OutlookEvent, i: number) => {
          if (e.partner_invited && !e.already_imported) autoSelect.add(i);
        });
        setSelected(autoSelect);
      }
    } catch {
      setError("Failed to fetch Outlook events");
    } finally {
      setLoading(false);
    }
  };

  const toggleEvent = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const selectAll = () => {
    const importable = events
      .map((e, i) => (!e.already_imported ? i : -1))
      .filter((i) => i >= 0);
    setSelected(new Set(importable));
  };

  const selectNone = () => setSelected(new Set());

  const handleImport = async () => {
    if (selected.size === 0) return;
    setImporting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const eventsToImport = Array.from(selected).map((i) => events[i]);

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-outlook-calendar`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ mode: "import", events: eventsToImport }),
        }
      );

      const result = await res.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Added ${result.count} event${result.count !== 1 ? "s" : ""} ✓`);
        onImported();
        onClose();
      }
    } catch {
      toast.error("Failed to import events");
    } finally {
      setImporting(false);
    }
  };

  const importableCount = events.filter((e) => !e.already_imported).length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <div>
            <h2 className="font-display font-bold text-foreground">Outlook Events</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Choose which events to add to your shared calendar
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-secondary transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
              <p className="text-sm text-muted-foreground">Fetching your Outlook events…</p>
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-destructive/10 p-4 text-center">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {!loading && !error && events.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No upcoming Outlook events found</p>
            </div>
          )}

          {!loading && events.length > 0 && (
            <>
              <div className="flex items-center gap-2 mb-1">
                <button onClick={selectAll} className="text-xs text-primary font-medium hover:underline">
                  Select all ({importableCount})
                </button>
                <span className="text-muted-foreground text-xs">·</span>
                <button onClick={selectNone} className="text-xs text-muted-foreground hover:underline">
                  Clear
                </button>
              </div>

              {events.map((event, i) => {
                const startDate = new Date(event.start_time);
                const dateStr = startDate.toLocaleDateString("default", {
                  weekday: "short", day: "numeric", month: "short",
                });
                const timeStr = event.is_all_day
                  ? "All day"
                  : startDate.toLocaleTimeString("default", { hour: "2-digit", minute: "2-digit" });

                return (
                  <motion.div
                    key={`${event.subject}-${event.start_time}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={`rounded-xl border p-3.5 flex items-start gap-3 transition-colors ${
                      event.already_imported
                        ? "border-border/30 bg-secondary/50 opacity-60"
                        : selected.has(i)
                        ? "border-primary/50 bg-primary/5"
                        : "border-border/50 bg-card hover:bg-secondary/30"
                    }`}
                  >
                    <div className="pt-0.5">
                      {event.already_imported ? (
                        <div className="w-4 h-4 rounded-sm bg-muted flex items-center justify-center">
                          <Check className="w-3 h-3 text-muted-foreground" />
                        </div>
                      ) : (
                        <Checkbox
                          checked={selected.has(i)}
                          onCheckedChange={() => toggleEvent(i)}
                        />
                      )}
                    </div>
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => !event.already_imported && toggleEvent(i)}
                    >
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground truncate">{event.subject}</p>
                        {event.partner_invited && (
                          <span className="shrink-0 flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                            <Users className="w-3 h-3" /> Both invited
                          </span>
                        )}
                        {event.already_imported && (
                          <span className="shrink-0 text-[10px] text-muted-foreground">Already added</span>
                        )}
                      </div>
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
                  </motion.div>
                );
              })}
            </>
          )}
        </div>

        {/* Footer */}
        {!loading && events.length > 0 && (
          <div className="p-4 border-t border-border/50">
            <button
              onClick={handleImport}
              disabled={selected.size === 0 || importing}
              className="w-full rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {importing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Calendar className="w-4 h-4" />
              )}
              {importing
                ? "Adding…"
                : `Add ${selected.size} Event${selected.size !== 1 ? "s" : ""}`}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default OutlookEventPicker;
