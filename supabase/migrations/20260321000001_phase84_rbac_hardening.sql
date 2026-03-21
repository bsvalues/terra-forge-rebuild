-- Phase 84.1: RBAC Hardening — Role-Aware RLS Policies
-- Adds has_role() enforcement on critical write tables so that
-- viewers cannot insert/update data they are only allowed to read.
-- 
-- Hierarchy: admin > analyst > viewer
-- Viewers: read-only on all tables
-- Analysts: read + write own-domain (valuations, permits, appeals, exemptions, workflows)
-- Admins: full access

-- ─────────────────────────────────────────────────────────────
-- 1. ASSESSMENTS — analysts and admins can write
-- ─────────────────────────────────────────────────────────────

-- Drop overly-permissive existing write policies if they exist
DROP POLICY IF EXISTS "Authenticated users can insert assessments" ON public.assessments;
DROP POLICY IF EXISTS "Authenticated users can update assessments" ON public.assessments;

-- Analysts and admins can insert assessments
DROP POLICY IF EXISTS "Analysts can insert assessments" ON public.assessments;
CREATE POLICY "Analysts can insert assessments"
  ON public.assessments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'analyst')
    OR public.has_role(auth.uid(), 'admin')
  );

-- Analysts and admins can update assessments
DROP POLICY IF EXISTS "Analysts can update assessments" ON public.assessments;
CREATE POLICY "Analysts can update assessments"
  ON public.assessments
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'analyst')
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'analyst')
    OR public.has_role(auth.uid(), 'admin')
  );

-- Only admins can delete assessments
DROP POLICY IF EXISTS "Admins can delete assessments" ON public.assessments;
CREATE POLICY "Admins can delete assessments"
  ON public.assessments
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ─────────────────────────────────────────────────────────────
-- 2. APPEALS — analysts and admins can write
-- ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Authenticated users can insert appeals" ON public.appeals;
DROP POLICY IF EXISTS "Authenticated users can update appeals" ON public.appeals;
DROP POLICY IF EXISTS "Users can manage their own appeals" ON public.appeals;
DROP POLICY IF EXISTS "County users can manage appeals" ON public.appeals;

DROP POLICY IF EXISTS "Analysts can insert appeals" ON public.appeals;
CREATE POLICY "Analysts can insert appeals"
  ON public.appeals
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'analyst')
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Analysts can update appeals" ON public.appeals;
CREATE POLICY "Analysts can update appeals"
  ON public.appeals
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'analyst')
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'analyst')
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Admins can delete appeals" ON public.appeals;
CREATE POLICY "Admins can delete appeals"
  ON public.appeals
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ─────────────────────────────────────────────────────────────
-- 3. EXEMPTIONS — analysts and admins can write
-- ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Authenticated users can insert exemptions" ON public.exemptions;
DROP POLICY IF EXISTS "Authenticated users can update exemptions" ON public.exemptions;
DROP POLICY IF EXISTS "County users can manage exemptions" ON public.exemptions;

DROP POLICY IF EXISTS "Analysts can insert exemptions" ON public.exemptions;
CREATE POLICY "Analysts can insert exemptions"
  ON public.exemptions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'analyst')
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Analysts can update exemptions" ON public.exemptions;
CREATE POLICY "Analysts can update exemptions"
  ON public.exemptions
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'analyst')
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'analyst')
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Admins can delete exemptions" ON public.exemptions;
CREATE POLICY "Admins can delete exemptions"
  ON public.exemptions
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ─────────────────────────────────────────────────────────────
-- 4. CALIBRATION_RUNS — admin-only write
-- ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Authenticated users can insert calibration_runs" ON public.calibration_runs;
DROP POLICY IF EXISTS "Authenticated users can update calibration_runs" ON public.calibration_runs;

DROP POLICY IF EXISTS "Admins can insert calibration_runs" ON public.calibration_runs;
CREATE POLICY "Admins can insert calibration_runs"
  ON public.calibration_runs
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update calibration_runs" ON public.calibration_runs;
CREATE POLICY "Admins can update calibration_runs"
  ON public.calibration_runs
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ─────────────────────────────────────────────────────────────
-- 5. CERTIFICATION EVENTS — admin-only write
--    (certify_assessment is the most sensitive operation)
-- ─────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'certification_events' AND table_schema = 'public') THEN
    -- Drop overly-permissive policies
    DROP POLICY IF EXISTS "Authenticated users can insert certification_events" ON public.certification_events;

    -- Admin-only certification
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'certification_events'
        AND policyname = 'Admins can insert certification_events'
    ) THEN
      EXECUTE 'CREATE POLICY "Admins can insert certification_events"
        ON public.certification_events
        FOR INSERT TO authenticated
        WITH CHECK (public.has_role(auth.uid(), ''admin''))';
    END IF;
  END IF;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 6. AVM_RUNS — admin-only write (model runs are privileged)
-- ─────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'avm_runs' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "Authenticated users can insert avm_runs" ON public.avm_runs;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'avm_runs'
        AND policyname = 'Admins can insert avm_runs'
    ) THEN
      EXECUTE 'CREATE POLICY "Admins can insert avm_runs"
        ON public.avm_runs
        FOR INSERT TO authenticated
        WITH CHECK (public.has_role(auth.uid(), ''admin''))';
    END IF;
  END IF;
END;
$$;
