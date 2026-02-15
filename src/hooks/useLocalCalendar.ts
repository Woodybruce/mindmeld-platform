import { useState, useCallback, useEffect } from "react";

export interface LocalEvent {
  id: string;
  subject: string;
  start: string; // ISO string
  end: string;
  isAllDay: boolean;
  location?: string;
}

const STORAGE_KEY = "us-calendar-events";

function loadEvents(): LocalEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveEvents(events: LocalEvent[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

export function useLocalCalendar() {
  const [events, setEvents] = useState<LocalEvent[]>(loadEvents);

  useEffect(() => {
    saveEvents(events);
  }, [events]);

  const addEvent = useCallback((event: Omit<LocalEvent, "id">) => {
    const newEvent: LocalEvent = { ...event, id: crypto.randomUUID() };
    setEvents((prev) => [...prev, newEvent]);
    return newEvent;
  }, []);

  const deleteEvent = useCallback((id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const getEventsForMonth = useCallback(
    (year: number, month: number) =>
      events.filter((e) => {
        const d = new Date(e.start);
        return d.getFullYear() === year && d.getMonth() === month;
      }),
    [events]
  );

  const getUpcomingEvents = useCallback(
    (limit = 4) => {
      const now = new Date().toISOString();
      return events
        .filter((e) => e.start >= now)
        .sort((a, b) => a.start.localeCompare(b.start))
        .slice(0, limit);
    },
    [events]
  );

  return { events, addEvent, deleteEvent, getEventsForMonth, getUpcomingEvents };
}
