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

export function useCalendarEvents() {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [forwardToken, setForwardToken] = useState<string | null>(null);

  // Fetch events
  const fetchEvents = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("calendar_events")
      .select("*")
      .order("start_time", { ascending: true });

    if (!error && data) setEvents(data as CalendarEvent[]);
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
    ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/inbound-calendar?token=${forwardToken}`
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
