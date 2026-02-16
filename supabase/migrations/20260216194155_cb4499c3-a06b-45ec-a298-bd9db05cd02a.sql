
CREATE POLICY "Users can delete own sent messages"
ON public.messages
FOR DELETE
USING (auth.uid() = sender_id);
