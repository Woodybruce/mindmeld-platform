
CREATE TABLE public.device_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text NOT NULL,
  platform text NOT NULL DEFAULT 'ios',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, token)
);

ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own tokens" ON public.device_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own tokens" ON public.device_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tokens" ON public.device_tokens
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can update own tokens" ON public.device_tokens
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service can read partner tokens" ON public.device_tokens
  FOR SELECT USING (is_partner(user_id));
