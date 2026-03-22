-- RPC function to assign a county to the current user during onboarding.
-- Runs as SECURITY DEFINER to bypass the WITH CHECK on profiles
-- that prevents direct county_id changes (privilege-escalation guard).
-- Only allows assignment when the user currently has NO county.

CREATE OR REPLACE FUNCTION public.assign_user_county(target_county_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow if the user currently has no county assigned
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND county_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'County already assigned. Contact an administrator to change counties.';
  END IF;

  -- Verify the target county exists
  IF NOT EXISTS (
    SELECT 1 FROM public.counties WHERE id = target_county_id
  ) THEN
    RAISE EXCEPTION 'County not found.';
  END IF;

  -- Assign county
  UPDATE public.profiles
  SET county_id = target_county_id
  WHERE user_id = auth.uid();
END;
$$;

-- Allow authenticated users to call this function
GRANT EXECUTE ON FUNCTION public.assign_user_county(uuid) TO authenticated;
