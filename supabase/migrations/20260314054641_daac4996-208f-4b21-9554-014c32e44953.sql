-- CRITICAL FIX: Prevent users from changing their own county_id (privilege escalation)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO public
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id 
    AND county_id IS NOT DISTINCT FROM (SELECT p.county_id FROM public.profiles p WHERE p.user_id = auth.uid())
  );

-- Fix: Restrict appeals owner_email to admin-only via sanitized view (already exists)
-- The appeals_sanitized view already strips owner_email — no change needed.

-- Fix: Prevent certified assessment value lock trigger search_path
CREATE OR REPLACE FUNCTION public.prevent_certified_assessment_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.certified = true AND NEW.certified = true THEN
    IF NEW.total_value IS DISTINCT FROM OLD.total_value 
       OR NEW.land_value IS DISTINCT FROM OLD.land_value
       OR NEW.improvement_value IS DISTINCT FROM OLD.improvement_value THEN
      RAISE EXCEPTION 'Cannot modify values on a certified assessment. Unlock first.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;