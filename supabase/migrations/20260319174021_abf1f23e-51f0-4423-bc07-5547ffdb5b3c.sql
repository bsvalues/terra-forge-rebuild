-- Phase 100: Allow anonymous inserts to appeals from Owner Portal
-- The Owner Portal is public-facing (no auth) so we need a policy
-- that allows anon inserts while protecting reads to authenticated users.

-- Allow anon users to INSERT appeals (from Owner Portal)
CREATE POLICY "Public portal can submit appeals"
ON public.appeals
FOR INSERT
TO anon
WITH CHECK (
  status = 'pending'
  AND original_value > 0
  AND appeal_date IS NOT NULL
);

-- Ensure authenticated users can still read their county's appeals
-- (existing policies should handle this, but add explicit read for anon on their own)
CREATE POLICY "Anon can read own submitted appeal by email"
ON public.appeals
FOR SELECT
TO anon
USING (false);
