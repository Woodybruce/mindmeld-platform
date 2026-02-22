
CREATE TABLE public.shared_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '📝',
  template TEXT,
  max_items INTEGER,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  score_data JSONB,
  ai_suggestable BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.shared_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own lists"
  ON public.shared_lists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own lists"
  ON public.shared_lists FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can read partner lists"
  ON public.shared_lists FOR SELECT
  USING (is_partner(user_id));

CREATE POLICY "Users can update own lists"
  ON public.shared_lists FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own lists"
  ON public.shared_lists FOR DELETE
  USING (auth.uid() = user_id);

-- Enable realtime for live sync
ALTER PUBLICATION supabase_realtime ADD TABLE public.shared_lists;
