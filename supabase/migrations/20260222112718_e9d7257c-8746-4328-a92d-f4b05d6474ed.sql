
-- Drop all existing restrictive policies
DROP POLICY IF EXISTS "Partners can read proposals" ON public.bucket_list_proposals;
DROP POLICY IF EXISTS "Partners can respond to proposals" ON public.bucket_list_proposals;
DROP POLICY IF EXISTS "Users can delete own proposals" ON public.bucket_list_proposals;
DROP POLICY IF EXISTS "Users can insert own proposals" ON public.bucket_list_proposals;
DROP POLICY IF EXISTS "Users can read own proposals" ON public.bucket_list_proposals;
DROP POLICY IF EXISTS "Users can update own proposals" ON public.bucket_list_proposals;

-- Recreate as PERMISSIVE policies
CREATE POLICY "Users can read own proposals" ON public.bucket_list_proposals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Partners can read proposals" ON public.bucket_list_proposals
  FOR SELECT USING (is_partner(user_id));

CREATE POLICY "Users can insert own proposals" ON public.bucket_list_proposals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own proposals" ON public.bucket_list_proposals
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Partners can respond to proposals" ON public.bucket_list_proposals
  FOR UPDATE USING (is_partner(user_id));

CREATE POLICY "Users can delete own proposals" ON public.bucket_list_proposals
  FOR DELETE USING (auth.uid() = user_id);
