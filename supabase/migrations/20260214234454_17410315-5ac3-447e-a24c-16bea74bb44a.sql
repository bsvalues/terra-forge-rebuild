-- Fix 1: Replace overly permissive RLS on scheduled_scrapes
DROP POLICY IF EXISTS "Allow all operations on scheduled scrapes" ON public.scheduled_scrapes;

-- Keep the existing SELECT policy (already exists)
-- Add admin-only management policy
CREATE POLICY "Admins can manage scheduled scrapes"
ON public.scheduled_scrapes
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Fix 2: Tighten storage policy on data-imports bucket
-- Drop the overly permissive read policy
DROP POLICY IF EXISTS "Authenticated users can read their data files" ON storage.objects;

-- Create owner-scoped read policy
CREATE POLICY "Users can read own uploaded files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'data-imports' AND
  (owner = auth.uid() OR is_admin())
);
