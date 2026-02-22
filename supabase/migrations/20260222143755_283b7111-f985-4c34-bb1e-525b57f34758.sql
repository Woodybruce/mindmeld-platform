-- Allow partners to delete each other's lists
CREATE POLICY "Partners can delete partner lists"
  ON public.shared_lists
  FOR DELETE
  USING (is_partner(user_id));

-- Allow partners to update each other's lists  
CREATE POLICY "Partners can update partner lists"
  ON public.shared_lists
  FOR UPDATE
  USING (is_partner(user_id));