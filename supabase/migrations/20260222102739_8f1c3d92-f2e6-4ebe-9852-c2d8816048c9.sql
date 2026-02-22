
CREATE TABLE public.couple_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  emoji TEXT DEFAULT '📌',
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.couple_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own announcements"
  ON public.couple_announcements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own announcements"
  ON public.couple_announcements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can read partner announcements"
  ON public.couple_announcements FOR SELECT
  USING (is_partner(user_id));

CREATE POLICY "Users can delete own announcements"
  ON public.couple_announcements FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own announcements"
  ON public.couple_announcements FOR UPDATE
  USING (auth.uid() = user_id);
