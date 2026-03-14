-- ===== FIX: segment_definitions — profiles.id → get_user_county_id() =====
DROP POLICY IF EXISTS "Users can view segment definitions for their county" ON public.segment_definitions;
DROP POLICY IF EXISTS "Users can insert segment definitions for their county" ON public.segment_definitions;
DROP POLICY IF EXISTS "Users can update their county segment definitions" ON public.segment_definitions;
DROP POLICY IF EXISTS "Users can delete their county segment definitions" ON public.segment_definitions;

CREATE POLICY "Users can view segment definitions for their county"
  ON public.segment_definitions FOR SELECT TO authenticated
  USING (county_id = get_user_county_id());

CREATE POLICY "Users can insert segment definitions for their county"
  ON public.segment_definitions FOR INSERT TO authenticated
  WITH CHECK (county_id = get_user_county_id());

CREATE POLICY "Users can update their county segment definitions"
  ON public.segment_definitions FOR UPDATE TO authenticated
  USING (county_id = get_user_county_id());

CREATE POLICY "Users can delete their county segment definitions"
  ON public.segment_definitions FOR DELETE TO authenticated
  USING (county_id = get_user_county_id());

-- ===== FIX: segment_calibration_runs — profiles.id → get_user_county_id() =====
DROP POLICY IF EXISTS "Users can view segment calibration runs" ON public.segment_calibration_runs;
DROP POLICY IF EXISTS "Users can insert segment calibration runs" ON public.segment_calibration_runs;

CREATE POLICY "Users can view segment calibration runs"
  ON public.segment_calibration_runs FOR SELECT TO authenticated
  USING (county_id = get_user_county_id());

CREATE POLICY "Users can insert segment calibration runs"
  ON public.segment_calibration_runs FOR INSERT TO authenticated
  WITH CHECK (county_id = get_user_county_id());

-- ===== FIX: cost_approach_runs — profiles.id → get_user_county_id() =====
DROP POLICY IF EXISTS "Users can view own county cost runs" ON public.cost_approach_runs;
DROP POLICY IF EXISTS "Users can insert own county cost runs" ON public.cost_approach_runs;
DROP POLICY IF EXISTS "Users can update own county cost runs" ON public.cost_approach_runs;

CREATE POLICY "Users can view own county cost runs"
  ON public.cost_approach_runs FOR SELECT TO authenticated
  USING (county_id = get_user_county_id());

CREATE POLICY "Users can insert own county cost runs"
  ON public.cost_approach_runs FOR INSERT TO authenticated
  WITH CHECK (county_id = get_user_county_id());

CREATE POLICY "Users can update own county cost runs"
  ON public.cost_approach_runs FOR UPDATE TO authenticated
  USING (county_id = get_user_county_id());

-- ===== FIX: income_properties — profiles.id → get_user_county_id() =====
DROP POLICY IF EXISTS "Users can view own county income properties" ON public.income_properties;
DROP POLICY IF EXISTS "Users can insert own county income properties" ON public.income_properties;
DROP POLICY IF EXISTS "Users can update own county income properties" ON public.income_properties;
DROP POLICY IF EXISTS "Users can delete own county income properties" ON public.income_properties;

CREATE POLICY "Users can view own county income properties"
  ON public.income_properties FOR SELECT TO authenticated
  USING (county_id = get_user_county_id());

CREATE POLICY "Users can insert own county income properties"
  ON public.income_properties FOR INSERT TO authenticated
  WITH CHECK (county_id = get_user_county_id());

CREATE POLICY "Users can update own county income properties"
  ON public.income_properties FOR UPDATE TO authenticated
  USING (county_id = get_user_county_id());

CREATE POLICY "Users can delete own county income properties"
  ON public.income_properties FOR DELETE TO authenticated
  USING (county_id = get_user_county_id());

-- ===== FIX: income_approach_runs — profiles.id → get_user_county_id() =====
DROP POLICY IF EXISTS "Users can view own county income runs" ON public.income_approach_runs;
DROP POLICY IF EXISTS "Users can insert own county income runs" ON public.income_approach_runs;
DROP POLICY IF EXISTS "Users can update own county income runs" ON public.income_approach_runs;

CREATE POLICY "Users can view own county income runs"
  ON public.income_approach_runs FOR SELECT TO authenticated
  USING (county_id = get_user_county_id());

CREATE POLICY "Users can insert own county income runs"
  ON public.income_approach_runs FOR INSERT TO authenticated
  WITH CHECK (county_id = get_user_county_id());

CREATE POLICY "Users can update own county income runs"
  ON public.income_approach_runs FOR UPDATE TO authenticated
  USING (county_id = get_user_county_id());