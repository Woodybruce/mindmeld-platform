
-- Add reply_to_id for quoting messages
ALTER TABLE public.messages ADD COLUMN reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL;

-- Add message_type to distinguish text/image/voice
ALTER TABLE public.messages ADD COLUMN message_type TEXT NOT NULL DEFAULT 'text';

-- Create voice-notes storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('voice-notes', 'voice-notes', true);

-- Storage policies for voice notes
CREATE POLICY "Users can upload voice notes"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'voice-notes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Voice notes are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'voice-notes');

CREATE POLICY "Users can delete own voice notes"
ON storage.objects FOR DELETE
USING (bucket_id = 'voice-notes' AND auth.uid()::text = (storage.foldername(name))[1]);
