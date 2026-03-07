import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface CalendarEvent {
  id: string;
  subject: string;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
  location: string | null;
  source: string;
  user_id: string;
  created_at: string;
}

const getCalCache = (userId: string): CalendarEvent[] | null => {
  try {
    const raw = localStorage.getItem(`us-calendar-${userId}`);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > 1000 * 60 * 30) return null;
    return data;
  } catch { return null; }
};
const setCalCache = (userId: string, data: CalendarEvent[]) => {
  try { localStorage.setItem(`us-calendar-${userId}`, JSON.stringify({ data, ts: Date.now() })); } catch {}
};

export function useCalendarEvents() {
  const { user } = useAuth();
  const cached = user ? getCalCache(user.id) : null;
  const [events, setEvents] = useState<CalendarEvent[]>(cached || []);
  const [loading, setLoading] = useState(!cached);
  const [forwardToken, setForwardToken] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    if (!events.length) setLoading(true);
    const { data, error } = await supabase
      .from("calendar_events")
      .select("*")
      .eq("user_id", user.id)
      .order("start_time", { ascending: true });

    if (!error && data) {
      setEvents(data as CalendarEvent[]);
      if (user) setCalCache(user.id, data as CalendarEvent[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // Get forward token from profile (column may not exist yet)
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data && data.calendar_forward_token) {
          setForwardToken(data.calendar_forward_token);
        }
      });
  }, [user]);

  // Generate forward token
  const generateForwardToken = useCallback(async () => {
    if (!user) return null;
    const token = crypto.randomUUID();
    await supabase
      .from("profiles")
      .update({ calendar_forward_token: token } as any)
      .eq("id", user.id);
    setForwardToken(token);
    return token;
  }, [user]);

  // Add event
  const addEvent = useCallback(async (event: {
    subject: string;
    start_time: string;
    end_time: string;
    is_all_day: boolean;
    location?: string;
  }) => {
    if (!user) return;
    const { error } = await supabase.from("calendar_events").insert({
      user_id: user.id,
      subject: event.subject,
      start_time: event.start_time,
      end_time: event.end_time,
      is_all_day: event.is_all_day,
      location: event.location || null,
      source: "manual",
    } as any);
    if (error) {
      console.error("Calendar insert error:", error);
      throw error;
    }
    await fetchEvents();
  }, [user, fetchEvents]);

  // Delete event
  const deleteEvent = useCallback(async (id: string) => {
    await supabase.from("calendar_events").delete().eq("id", id);
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  // Helpers
  const getEventsForMonth = useCallback(
    (year: number, month: number) =>
      events.filter((e) => {
        const d = new Date(e.start_time);
        return d.getFullYear() === year && d.getMonth() === month;
      }),
    [events]
  );

  const getUpcomingEvents = useCallback(
    (limit = 4) => {
      const now = new Date().toISOString();
      return events
        .filter((e) => e.start_time >= now)
        .sort((a, b) => a.start_time.localeCompare(b.start_time))
        .slice(0, limit);
    },
    [events]
  );

  const forwardUrl = forwardToken
    ? `/api/inbound-calendar?token=${forwardToken}`
    : null;

  return {
    events,
    loading,
    addEvent,
    deleteEvent,
    getEventsForMonth,
    getUpcomingEvents,
    forwardToken,
    forwardUrl,
    generateForwardToken,
    fetchEvents,
  };
}
