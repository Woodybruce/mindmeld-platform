
-- Add attachments JSONB column to weekly_tasks for file, photo, and event attachments
ALTER TABLE public.weekly_tasks ADD COLUMN attachments jsonb DEFAULT '[]'::jsonb;
