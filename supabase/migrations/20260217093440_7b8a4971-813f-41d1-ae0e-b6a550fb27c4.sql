
-- Table for bucket list proposals between partners
CREATE TABLE public.bucket_list_proposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  proposal_type TEXT NOT NULL DEFAULT 'sex-bucket',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  selected_items JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.bucket_list_proposals ENABLE ROW LEVEL SECURITY;

-- Proposer can do everything with own proposals
CREATE POLICY "Users can insert own proposals"
ON public.bucket_list_proposals FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own proposals"
ON public.bucket_list_proposals FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own proposals"
ON public.bucket_list_proposals FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own proposals"
ON public.bucket_list_proposals FOR DELETE
USING (auth.uid() = user_id);

-- Partner can read and respond (update selected_items/status)
CREATE POLICY "Partners can read proposals"
ON public.bucket_list_proposals FOR SELECT
USING (is_partner(user_id));

CREATE POLICY "Partners can respond to proposals"
ON public.bucket_list_proposals FOR UPDATE
USING (is_partner(user_id));

-- Enable realtime for instant partner notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.bucket_list_proposals;
