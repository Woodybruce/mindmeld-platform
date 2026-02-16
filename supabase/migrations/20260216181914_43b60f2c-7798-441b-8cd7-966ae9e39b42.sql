-- Allow partners to update each other's avatar_url
CREATE POLICY "Partners can update avatar_url"
ON public.profiles
FOR UPDATE
USING (is_partner(id))
WITH CHECK (is_partner(id));
