
-- Restrict owner_email: admin-only access via security definer function
CREATE OR REPLACE FUNCTION public.get_appeal_owner_email(p_appeal_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT owner_email
  FROM appeals
  WHERE id = p_appeal_id
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
$$;
