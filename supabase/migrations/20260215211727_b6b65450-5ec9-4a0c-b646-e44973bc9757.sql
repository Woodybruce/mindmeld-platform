-- Add phone_number to profiles for call fallback
ALTER TABLE public.profiles
ADD COLUMN phone_number text DEFAULT NULL;