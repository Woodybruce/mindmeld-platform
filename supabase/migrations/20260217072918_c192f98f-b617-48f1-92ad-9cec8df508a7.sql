
-- Weekly tasks table for the Weekly List feature
CREATE TABLE public.weekly_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  text TEXT NOT NULL,
  done BOOLEAN NOT NULL DEFAULT false,
  scheduled_date DATE NOT NULL DEFAULT CURRENT_DATE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'manual',
  source_id TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE NULL
);

-- Enable RLS
ALTER TABLE public.weekly_tasks ENABLE ROW LEVEL SECURITY;

-- Users can CRUD own tasks
CREATE POLICY "Users can view own weekly tasks"
  ON public.weekly_tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view partner weekly tasks"
  ON public.weekly_tasks FOR SELECT
  USING (is_partner(user_id));

CREATE POLICY "Users can insert own weekly tasks"
  ON public.weekly_tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weekly tasks"
  ON public.weekly_tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own weekly tasks"
  ON public.weekly_tasks FOR DELETE
  USING (auth.uid() = user_id);

-- Index for fast date-based queries
CREATE INDEX idx_weekly_tasks_user_date ON public.weekly_tasks (user_id, scheduled_date);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.weekly_tasks;

-- Function to rollover incomplete tasks (called by cron)
CREATE OR REPLACE FUNCTION public.rollover_weekly_tasks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.weekly_tasks
  SET scheduled_date = CURRENT_DATE
  WHERE done = false
    AND scheduled_date < CURRENT_DATE;
END;
$$;
