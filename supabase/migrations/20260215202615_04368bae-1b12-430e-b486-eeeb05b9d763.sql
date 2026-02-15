
-- Folders for organising shared files
CREATE TABLE public.shared_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shared_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own and partner folders"
ON public.shared_folders FOR SELECT
USING (auth.uid() = user_id OR is_partner(user_id));

CREATE POLICY "Users can create folders"
ON public.shared_folders FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own folders"
ON public.shared_folders FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own folders"
ON public.shared_folders FOR UPDATE
USING (auth.uid() = user_id);

-- Shared files table
CREATE TABLE public.shared_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID REFERENCES public.shared_folders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shared_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own and partner files"
ON public.shared_files FOR SELECT
USING (auth.uid() = user_id OR is_partner(user_id));

CREATE POLICY "Users can upload files"
ON public.shared_files FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own files"
ON public.shared_files FOR DELETE
USING (auth.uid() = user_id);

-- Storage bucket for shared files
INSERT INTO storage.buckets (id, name, public) VALUES ('shared-files', 'shared-files', false);

CREATE POLICY "Users can upload shared files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'shared-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view shared files"
ON storage.objects FOR SELECT
USING (bucket_id = 'shared-files');

CREATE POLICY "Users can delete own shared files"
ON storage.objects FOR DELETE
USING (bucket_id = 'shared-files' AND auth.uid()::text = (storage.foldername(name))[1]);
