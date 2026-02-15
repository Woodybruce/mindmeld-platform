-- Allow sender to update own messages (needed for poll voting)
CREATE POLICY "Users can update sent messages"
ON public.messages FOR UPDATE
USING (auth.uid() = sender_id);
