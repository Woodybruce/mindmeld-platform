
-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT,
  partner_id UUID REFERENCES public.profiles(id),
  partner_code TEXT UNIQUE DEFAULT substr(md5(random()::text), 1, 8),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Helper: check if two users are partners
CREATE OR REPLACE FUNCTION public.is_partner(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE (id = auth.uid() AND partner_id = _user_id)
       OR (id = _user_id AND partner_id = auth.uid())
  )
$$;

-- Profiles RLS
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can read partner profile" ON public.profiles FOR SELECT USING (public.is_partner(id));
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (id = auth.uid());

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Quiz sessions table
CREATE TABLE public.quiz_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  quiz_id TEXT NOT NULL,
  score INTEGER,
  total_questions INTEGER,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own quiz sessions" ON public.quiz_sessions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can read partner quiz sessions" ON public.quiz_sessions FOR SELECT USING (public.is_partner(user_id));
CREATE POLICY "Users can create own quiz sessions" ON public.quiz_sessions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own quiz sessions" ON public.quiz_sessions FOR UPDATE USING (user_id = auth.uid());

-- Quiz answers table
CREATE TABLE public.quiz_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.quiz_sessions(id) ON DELETE CASCADE,
  question_index INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own quiz answers" ON public.quiz_answers FOR SELECT
  USING (session_id IN (SELECT id FROM public.quiz_sessions WHERE user_id = auth.uid()));
CREATE POLICY "Users can read partner quiz answers" ON public.quiz_answers FOR SELECT
  USING (session_id IN (SELECT id FROM public.quiz_sessions WHERE public.is_partner(user_id)));
CREATE POLICY "Users can create own quiz answers" ON public.quiz_answers FOR INSERT
  WITH CHECK (session_id IN (SELECT id FROM public.quiz_sessions WHERE user_id = auth.uid()));

-- Enable realtime for quiz sessions and answers
ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_answers;

-- Link partner function (used when entering a partner code)
CREATE OR REPLACE FUNCTION public.link_partner(_partner_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _partner_id UUID;
BEGIN
  SELECT id INTO _partner_id FROM public.profiles WHERE partner_code = _partner_code AND id != auth.uid();
  IF _partner_id IS NULL THEN RETURN FALSE; END IF;
  
  -- Link both ways
  UPDATE public.profiles SET partner_id = _partner_id, updated_at = now() WHERE id = auth.uid();
  UPDATE public.profiles SET partner_id = auth.uid(), updated_at = now() WHERE id = _partner_id;
  RETURN TRUE;
END;
$$;
