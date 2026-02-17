CREATE UNIQUE INDEX idx_calendar_events_no_dupes
ON public.calendar_events (user_id, LOWER(TRIM(subject)), start_time);