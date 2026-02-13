import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface OutlookEvent {
  id: string;
  subject: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  isAllDay: boolean;
  location?: { displayName?: string };
  webLink?: string;
}

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/microsoft-calendar`;

async function callApi(action: string, params: Record<string, string> = {}, method = "GET", body?: unknown) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const qs = new URLSearchParams({ action, ...params }).toString();
  const opts: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      "Content-Type": "application/json",
    },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${FUNCTION_URL}?${qs}`, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "API error");
  return data;
}

export function useMicrosoftCalendar() {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<OutlookEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  // Check connection status
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    callApi("status")
      .then((d) => setConnected(d.connected))
      .catch(() => setConnected(false))
      .finally(() => setLoading(false));
  }, [user]);

  // Start OAuth flow
  const connect = useCallback(() => {
    const redirectUri = `${window.location.origin}/us?tab=events&ms_callback=true`;
    callApi("auth-url", { redirect_uri: redirectUri })
      .then((d) => { window.location.href = d.url; })
      .catch((e) => console.error("Failed to get auth URL:", e));
  }, []);

  // Handle OAuth callback
  const handleCallback = useCallback(async (code: string) => {
    const redirectUri = `${window.location.origin}/us?tab=events&ms_callback=true`;
    await callApi("callback", { code, redirect_uri: redirectUri });
    setConnected(true);
  }, []);

  // Fetch events for date range
  const fetchEvents = useCallback(async (start: string, end: string) => {
    if (!connected) return;
    setEventsLoading(true);
    try {
      const data = await callApi("events", { start, end });
      setEvents(data.events || []);
    } catch (e) {
      console.error("Failed to fetch events:", e);
      setEvents([]);
    } finally {
      setEventsLoading(false);
    }
  }, [connected]);

  // Create event
  const createEvent = useCallback(async (event: {
    subject: string;
    start: string;
    end: string;
    isAllDay?: boolean;
    location?: string;
  }) => {
    const data = await callApi("create-event", {}, "POST", event);
    return data.event;
  }, []);

  // Disconnect
  const disconnect = useCallback(async () => {
    await callApi("disconnect");
    setConnected(false);
    setEvents([]);
  }, []);

  return {
    connected,
    loading,
    events,
    eventsLoading,
    connect,
    handleCallback,
    fetchEvents,
    createEvent,
    disconnect,
  };
}
