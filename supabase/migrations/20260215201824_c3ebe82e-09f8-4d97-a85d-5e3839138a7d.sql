
-- Create calendar_events table
CREATE TABLE public.calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subject TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  is_all_day BOOLEAN NOT NULL DEFAULT false,
  location TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- Users can see their own events + partner's events
CREATE POLICY "Users can view own and partner events"
ON public.calendar_events FOR SELECT
USING (
  auth.uid() = user_id
  OR public.is_partner(user_id)
);

CREATE POLICY "Users can insert own events"
ON public.calendar_events FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own events"
ON public.calendar_events FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own events"
ON public.calendar_events FOR DELETE
USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_calendar_events_user_date ON public.calendar_events (user_id, start_time);
