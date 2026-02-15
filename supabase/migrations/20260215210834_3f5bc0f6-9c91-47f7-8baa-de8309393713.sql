-- Add parent_id column to shared_folders for subfolder support
ALTER TABLE public.shared_folders
ADD COLUMN parent_id uuid REFERENCES public.shared_folders(id) ON DELETE CASCADE DEFAULT NULL;