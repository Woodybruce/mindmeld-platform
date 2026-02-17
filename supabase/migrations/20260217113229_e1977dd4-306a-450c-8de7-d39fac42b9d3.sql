
-- Content likes table for articles, products, feed items
CREATE TABLE public.content_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content_type TEXT NOT NULL, -- 'article', 'product', 'feed'
  content_id TEXT NOT NULL, -- URL or unique identifier
  content_title TEXT,
  content_emoji TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, content_type, content_id)
);

ALTER TABLE public.content_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own likes" ON public.content_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own likes" ON public.content_likes FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can read own likes" ON public.content_likes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Partners can read likes" ON public.content_likes FOR SELECT USING (is_partner(user_id));

ALTER PUBLICATION supabase_realtime ADD TABLE public.content_likes;
