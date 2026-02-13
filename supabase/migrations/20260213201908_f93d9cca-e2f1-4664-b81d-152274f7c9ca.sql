
-- Create storage bucket for couple photos
INSERT INTO storage.buckets (id, name, public) VALUES ('couple-photos', 'couple-photos', true);

-- Allow authenticated users to upload photos
CREATE POLICY "Authenticated users can upload photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'couple-photos');

-- Allow anyone to view photos (public bucket)
CREATE POLICY "Anyone can view couple photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'couple-photos');

-- Allow authenticated users to delete their own photos
CREATE POLICY "Authenticated users can delete photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'couple-photos');

-- Table to track photo metadata
CREATE TABLE public.couple_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  storage_path TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.couple_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own photos"
ON public.couple_photos FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can view partner photos"
ON public.couple_photos FOR SELECT
USING (is_partner(user_id));

CREATE POLICY "Users can insert own photos"
ON public.couple_photos FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own photos"
ON public.couple_photos FOR DELETE
USING (auth.uid() = user_id);
