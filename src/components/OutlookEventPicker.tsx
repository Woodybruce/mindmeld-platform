import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar as CalendarIcon, MapPin, Clock, Users, X, Check, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

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

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const OutlookEventPicker = ({ onClose, onImported }: Props) => {
  const [events, setEvents] = useState<OutlookEvent[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Calendar navigation
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());

  useEffect(() => { fetchEvents(); }, []);

  const fetchEvents = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError("Please sign in first"); setLoading(false); return; }

      const headers = {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      };

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-outlook-calendar`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ mode: "preview" }),
        }
      );

      const result = await res.json();
      if (result.error) {
        setError(result.error);
      } else {
        const allEvents: OutlookEvent[] = result.events || [];
        setEvents(allEvents);

        // Auto-import events where both partners are invited
        const sharedNotImported = allEvents
          .filter((e) => e.partner_invited && !e.already_imported);

        if (sharedNotImported.length > 0) {
          // Auto-import shared events in the background
          fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-outlook-calendar`,
            {
              method: "POST",
              headers,
              body: JSON.stringify({ mode: "import", events: sharedNotImported }),
            }
          ).then(async (importRes) => {
            const importResult = await importRes.json();
            if (importResult.count > 0) {
              toast.success(`Auto-added ${importResult.count} shared event${importResult.count !== 1 ? "s" : ""} ✓`);
              onImported();
              // Mark them as already imported in the UI
              setEvents((prev) =>
                prev.map((e) =>
                  e.partner_invited && !e.already_imported
                    ? { ...e, already_imported: true }
                    : e
                )
              );
            }
          }).catch(() => {});
        }

        // Pre-select remaining non-imported events for manual selection
        const autoSelect = new Set<number>();
        allEvents.forEach((e, i) => {
          if (!e.partner_invited && !e.already_imported) {
            // Don't auto-select non-shared events
          }
        });
        setSelected(autoSelect);
      }
    } catch {
      setError("Failed to fetch Outlook events");
    } finally {
      setLoading(false);
    }
  };

  // Build a map of dateKey -> event indices
  const eventsByDate = useMemo(() => {
    const map = new Map<string, number[]>();
    events.forEach((e, i) => {
      const key = new Date(e.start_time).toISOString().slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(i);
    });
    return map;
  }, [events]);

  // Calendar grid for current view month
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    let startDow = firstDay.getDay(); // 0=Sun
    startDow = startDow === 0 ? 6 : startDow - 1; // convert to Mon=0

    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewMonth, viewYear]);

  const dateKey = (day: number) =>
    `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const todayKey = today.toISOString().slice(0, 10);

  const eventsForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    return (eventsByDate.get(selectedDate) || []).map((i) => ({ index: i, event: events[i] }));
  }, [selectedDate, eventsByDate, events]);

  const toggleEvent = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

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
        <div className="flex items-center justify-between p-4 border-b border-border/50 flex-shrink-0">
          <div>
            <h2 className="font-display font-bold text-foreground">Outlook Calendar</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tap a day to see events, then select which to add
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-secondary transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
              <p className="text-sm text-muted-foreground">Fetching 6 months of events…</p>
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-destructive/10 p-4 text-center m-4">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {!loading && !error && (
            <div className="p-4 space-y-3">
              {/* Month navigation */}
              <div className="flex items-center justify-between">
                <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                  <ChevronLeft className="w-5 h-5 text-muted-foreground" />
                </button>
                <span className="font-display font-semibold text-foreground">
                  {MONTH_NAMES[viewMonth]} {viewYear}
                </span>
                <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              {/* Day labels */}
              <div className="grid grid-cols-7 gap-0.5 text-center">
                {DAY_LABELS.map((d) => (
                  <span key={d} className="text-[10px] font-medium text-muted-foreground py-1">{d}</span>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-0.5">
                {calendarDays.map((day, idx) => {
                  if (day === null) return <div key={idx} />;
                  const dk = dateKey(day);
                  const dayEvents = eventsByDate.get(dk);
                  const hasEvents = !!dayEvents && dayEvents.length > 0;
                  const hasPartnerEvent = hasEvents && dayEvents.some((i) => events[i].partner_invited);
                  const isToday = dk === todayKey;
                  const isSelected = dk === selectedDate;

                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedDate(isSelected ? null : dk)}
                      className={cn(
                        "relative flex flex-col items-center justify-center rounded-lg py-2 text-sm transition-all",
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
                        <span className="flex gap-0.5 mt-0.5">
                          <span className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            isSelected ? "bg-primary-foreground" : "bg-primary"
                          )} />
                          {hasPartnerEvent && (
                            <span className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              isSelected ? "bg-primary-foreground/70" : "bg-us-coral"
                            )} />
                          )}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 text-[10px] text-muted-foreground pt-1">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-primary" /> Has events
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-us-coral" /> Both invited
                </span>
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
                    <p className="text-xs font-semibold text-foreground pt-2">
                      {new Date(selectedDate + "T00:00:00").toLocaleDateString("default", {
                        weekday: "long", day: "numeric", month: "long",
                      })}
                    </p>

                    {eventsForSelectedDate.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-3 text-center">No Outlook events on this day</p>
                    ) : (
                      eventsForSelectedDate.map(({ index, event }) => {
                        const startDate = new Date(event.start_time);
                        const timeStr = event.is_all_day
                          ? "All day"
                          : startDate.toLocaleTimeString("default", { hour: "2-digit", minute: "2-digit" });

                        return (
                          <motion.div
                            key={`${event.subject}-${event.start_time}`}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={cn(
                              "rounded-xl border p-3 flex items-start gap-3 transition-colors",
                              event.already_imported
                                ? "border-border/30 bg-secondary/50 opacity-60"
                                : selected.has(index)
                                ? "border-primary/50 bg-primary/5"
                                : "border-border/50 bg-card hover:bg-secondary/30"
                            )}
                          >
                            <div className="pt-0.5">
                              {event.already_imported ? (
                                <div className="w-4 h-4 rounded-sm bg-muted flex items-center justify-center">
                                  <Check className="w-3 h-3 text-muted-foreground" />
                                </div>
                              ) : (
                                <Checkbox
                                  checked={selected.has(index)}
                                  onCheckedChange={() => toggleEvent(index)}
                                />
                              )}
                            </div>
                            <div
                              className="flex-1 min-w-0 cursor-pointer"
                              onClick={() => !event.already_imported && toggleEvent(index)}
                            >
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-foreground truncate">{event.subject}</p>
                                {event.partner_invited && (
                                  <span className="shrink-0 flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                                    <Users className="w-3 h-3" /> Both
                                  </span>
                                )}
                                {event.already_imported && (
                                  <span className="shrink-0 text-[10px] text-muted-foreground">Added</span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                  <Clock className="w-3 h-3" /> {timeStr}
                                </span>
                                {event.location && (
                                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                    <MapPin className="w-3 h-3" /> {event.location}
                                  </span>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Footer - always visible */}
        {!loading && events.length > 0 && (
          <div className="p-4 border-t border-border/50 flex-shrink-0 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <button
              onClick={handleImport}
              disabled={selected.size === 0 || importing}
              className="w-full rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {importing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CalendarIcon className="w-4 h-4" />
              )}
              {importing
                ? "Adding…"
                : selected.size === 0
                ? "Select events to add"
                : `Add ${selected.size} Event${selected.size !== 1 ? "s" : ""}`}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default OutlookEventPicker;
