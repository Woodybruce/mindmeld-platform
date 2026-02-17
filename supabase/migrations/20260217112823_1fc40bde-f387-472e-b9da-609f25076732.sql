
-- Mood check-ins table
CREATE TABLE public.mood_checkins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  mood TEXT NOT NULL,
  note TEXT,
  check_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, check_date)
);

ALTER TABLE public.mood_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own mood" ON public.mood_checkins FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can read own mood" ON public.mood_checkins FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own mood" ON public.mood_checkins FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Partners can read mood" ON public.mood_checkins FOR SELECT USING (is_partner(user_id));

-- Add anniversary date to profiles
ALTER TABLE public.profiles ADD COLUMN anniversary_date DATE;

-- Enable realtime for mood_checkins so partner sees updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.mood_checkins;
