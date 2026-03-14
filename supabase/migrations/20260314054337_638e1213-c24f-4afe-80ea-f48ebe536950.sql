-- ===== FIX: notices table — replace bare 'true' policies with county-scoped =====
DROP POLICY IF EXISTS "Authenticated users can read notices" ON public.notices;
DROP POLICY IF EXISTS "Authenticated users can insert notices" ON public.notices;
DROP POLICY IF EXISTS "Authenticated users can update notices" ON public.notices;

CREATE POLICY "Users can view notices in their county"
  ON public.notices FOR SELECT TO authenticated
  USING (county_id = get_user_county_id());

CREATE POLICY "Users can insert notices in their county"
  ON public.notices FOR INSERT TO authenticated
  WITH CHECK (county_id = get_user_county_id());

CREATE POLICY "Users can update notices in their county"
  ON public.notices FOR UPDATE TO authenticated
  USING (county_id = get_user_county_id());

-- ===== FIX: certification_events — replace bare 'true' with county-scoped =====
DROP POLICY IF EXISTS "Authenticated users can read certification events" ON public.certification_events;
DROP POLICY IF EXISTS "Authenticated users can insert certification events" ON public.certification_events;

CREATE POLICY "Users can view certification events in their county"
  ON public.certification_events FOR SELECT TO authenticated
  USING (county_id = get_user_county_id());

CREATE POLICY "Users can insert certification events in their county"
  ON public.certification_events FOR INSERT TO authenticated
  WITH CHECK (county_id = get_user_county_id());