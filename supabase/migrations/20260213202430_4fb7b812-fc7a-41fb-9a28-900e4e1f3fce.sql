
-- Create shared_links table
CREATE TABLE public.shared_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  url TEXT NOT NULL,
  title TEXT,
  note TEXT,
  platform TEXT NOT NULL DEFAULT 'Link',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shared_links ENABLE ROW LEVEL SECURITY;

-- Users can insert own links
CREATE POLICY "Users can insert own links"
ON public.shared_links FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can read own links
CREATE POLICY "Users can read own links"
ON public.shared_links FOR SELECT
USING (auth.uid() = user_id);

-- Users can read partner links
CREATE POLICY "Users can read partner links"
ON public.shared_links FOR SELECT
USING (is_partner(user_id));

-- Users can delete own links
CREATE POLICY "Users can delete own links"
ON public.shared_links FOR DELETE
USING (auth.uid() = user_id);

-- Enable realtime for instant match detection
ALTER PUBLICATION supabase_realtime ADD TABLE public.shared_links;
