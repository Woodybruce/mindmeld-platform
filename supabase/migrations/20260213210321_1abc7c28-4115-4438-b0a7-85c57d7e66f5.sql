
-- Function to link partner by email (looks up auth.users securely)
CREATE OR REPLACE FUNCTION public.link_partner_by_email(_partner_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _partner_id UUID;
BEGIN
  -- Find user by email in auth.users
  SELECT id INTO _partner_id FROM auth.users WHERE email = lower(trim(_partner_email)) AND id != auth.uid();
  IF _partner_id IS NULL THEN RETURN FALSE; END IF;
  
  -- Check they don't already have a partner
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = _partner_id AND partner_id IS NOT NULL) THEN
    RETURN FALSE;
  END IF;
  
  -- Link both ways
  UPDATE public.profiles SET partner_id = _partner_id, updated_at = now() WHERE id = auth.uid();
  UPDATE public.profiles SET partner_id = auth.uid(), updated_at = now() WHERE id = _partner_id;
  RETURN TRUE;
END;
$$;
