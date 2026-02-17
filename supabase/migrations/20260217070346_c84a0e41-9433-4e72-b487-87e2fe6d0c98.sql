
-- Feed content table: manages all content surfaced on the home screen
-- Admins add/edit rows here to control what users see
CREATE TABLE public.feed_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'quiz',           -- quiz, prompt, article, tip, challenge
  title TEXT NOT NULL,
  subtitle TEXT,
  body TEXT NOT NULL,
  emoji TEXT,
  image_url TEXT,
  tag TEXT NOT NULL DEFAULT 'Quiz',
  tag_color TEXT NOT NULL DEFAULT 'text-us-gold',
  link TEXT,                                    -- e.g. /quiz/know-me, /truth-or-dare
  size TEXT NOT NULL DEFAULT 'half',            -- full, half, banner
  active BOOLEAN NOT NULL DEFAULT true,         -- toggle visibility
  weight INTEGER NOT NULL DEFAULT 1,            -- higher = more likely to appear
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feed_content ENABLE ROW LEVEL SECURITY;

-- Everyone can read active feed content (public-facing feature)
CREATE POLICY "Anyone can read active feed content"
ON public.feed_content
FOR SELECT
USING (active = true);

-- Only service role can insert/update/delete (managed via backend/SQL)
-- No INSERT/UPDATE/DELETE policies for anon/authenticated users

-- Seed with quiz content from the existing hardcoded data
INSERT INTO public.feed_content (type, title, subtitle, body, emoji, tag, tag_color, link, size, weight) VALUES
  ('quiz', 'How Well Do You Know Me?', '10 questions · 5 min', 'Test how well you really know your partner''s preferences, dreams, and habits.', '🧠', 'Quiz', 'text-us-gold', '/quiz/know-me', 'half', 2),
  ('quiz', 'Love Language Check-In', '8 questions · 4 min', 'Discover how you both give and receive love — and where you can grow closer.', '💕', 'Quiz', 'text-us-coral', '/quiz/love-language', 'half', 2),
  ('quiz', 'Dream Life Alignment', '10 questions · 5 min', 'Are your visions for the future aligned? Find out where you match and differ.', '🌙', 'Quiz', 'text-us-sage', '/quiz/dream-life', 'half', 1),
  ('quiz', 'Our Challenges', '10 questions · 5 min', 'Reflect on your biggest strengths and growth areas as a couple.', '⚡', 'Quiz', 'text-us-gold', '/quiz/challenges', 'half', 1),
  ('quiz', 'Sex Bucket List', 'Checklist · 5 min', 'Explore desires together — tick what you''re both curious about.', '🔥', 'Quiz', 'text-us-coral', '/checklist-quiz/sex-bucket', 'half', 1),
  ('quiz', 'Us Together Checklist', 'Checklist · 5 min', 'Activities and experiences you want to share as a couple.', '💑', 'Quiz', 'text-us-sage', '/checklist-quiz/us-together', 'half', 1),
  ('prompt', 'Daily Prompt', 'Spark a conversation', 'What''s one thing you''ve never told me that you wish I knew?', '💬', 'Prompt', 'text-us-coral', NULL, 'full', 1),
  ('tip', 'Connection Tip', 'Strengthen your bond', 'Give a 20-second hug today. Count it out. Feel the difference.', '🫂', 'Tip', 'text-us-sage', NULL, 'half', 1);
