-- Add calendar_forward_token column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS calendar_forward_token text UNIQUE;