-- Phase 93: Smart Views Engine — Enhance saved_filters with alert & sharing
-- Adds alert_on_change and is_shared columns for live monitoring and collaboration

ALTER TABLE public.saved_filters
  ADD COLUMN IF NOT EXISTS alert_on_change boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_shared boolean DEFAULT false;

-- Shared views policy: users in same county can see shared views
DROP POLICY IF EXISTS "Users see own + shared filters" ON public.saved_filters;

CREATE POLICY "Users see own + shared filters" ON public.saved_filters
  FOR SELECT USING (
    auth.uid() = user_id
    OR (is_shared = true AND county_id IN (
      SELECT county_id FROM public.profiles WHERE user_id = auth.uid()
    ))
  );
