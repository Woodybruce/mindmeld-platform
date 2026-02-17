
-- Table for user-customisable Instagram account suggestions
CREATE TABLE public.insta_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  handle TEXT NOT NULL,
  label TEXT,
  bio TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.insta_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own suggestions"
  ON public.insta_suggestions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can read partner suggestions"
  ON public.insta_suggestions FOR SELECT
  USING (is_partner(user_id));

CREATE POLICY "Users can insert own suggestions"
  ON public.insta_suggestions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own suggestions"
  ON public.insta_suggestions FOR DELETE
  USING (auth.uid() = user_id);
