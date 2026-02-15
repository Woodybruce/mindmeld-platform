
-- Allow partners to delete folders too
CREATE POLICY "Partners can delete folders"
ON public.shared_folders FOR DELETE
USING (is_partner(user_id));

-- Allow partners to update folders too
CREATE POLICY "Partners can update folders"
ON public.shared_folders FOR UPDATE
USING (is_partner(user_id));

-- Allow partners to delete files too
CREATE POLICY "Partners can delete files"
ON public.shared_files FOR DELETE
USING (is_partner(user_id));
