
-- appeal_risk_scores
DROP POLICY IF EXISTS "Authenticated users can read appeal risk scores" ON public.appeal_risk_scores;
DROP POLICY IF EXISTS "Authenticated users can insert appeal risk scores" ON public.appeal_risk_scores;
DROP POLICY IF EXISTS "Authenticated users can update appeal risk scores" ON public.appeal_risk_scores;
CREATE POLICY "County-scoped read appeal risk scores" ON public.appeal_risk_scores
  FOR SELECT TO authenticated USING (county_id = get_user_county_id());
CREATE POLICY "County-scoped insert appeal risk scores" ON public.appeal_risk_scores
  FOR INSERT TO authenticated WITH CHECK (county_id = get_user_county_id());
CREATE POLICY "County-scoped update appeal risk scores" ON public.appeal_risk_scores
  FOR UPDATE TO authenticated USING (county_id = get_user_county_id()) WITH CHECK (county_id = get_user_county_id());

-- appeal_risk_scoring_runs
DROP POLICY IF EXISTS "Authenticated users can read scoring runs" ON public.appeal_risk_scoring_runs;
DROP POLICY IF EXISTS "Authenticated users can insert scoring runs" ON public.appeal_risk_scoring_runs;
DROP POLICY IF EXISTS "Authenticated users can update scoring runs" ON public.appeal_risk_scoring_runs;
CREATE POLICY "County-scoped read scoring runs" ON public.appeal_risk_scoring_runs
  FOR SELECT TO authenticated USING (county_id = get_user_county_id());
CREATE POLICY "County-scoped insert scoring runs" ON public.appeal_risk_scoring_runs
  FOR INSERT TO authenticated WITH CHECK (county_id = get_user_county_id());
CREATE POLICY "County-scoped update scoring runs" ON public.appeal_risk_scoring_runs
  FOR UPDATE TO authenticated USING (county_id = get_user_county_id()) WITH CHECK (county_id = get_user_county_id());

-- appeals
DROP POLICY IF EXISTS "Public portal can submit appeals" ON public.appeals;
CREATE POLICY "Public portal can submit appeals" ON public.appeals
  FOR INSERT TO anon
  WITH CHECK (
    status = 'pending'
    AND original_value > 0
    AND appeal_date IS NOT NULL
    AND county_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.counties c WHERE c.id = appeals.county_id)
    AND EXISTS (SELECT 1 FROM public.parcels p WHERE p.id = appeals.parcel_id AND p.county_id = appeals.county_id)
  );

-- comparison_snapshots
DROP POLICY IF EXISTS "Users can view snapshots" ON public.comparison_snapshots;
CREATE POLICY "County-scoped view snapshots" ON public.comparison_snapshots
  FOR SELECT TO authenticated USING (county_id = get_user_county_id());

-- dq_* tables
DROP POLICY IF EXISTS "Authenticated users can read dq_diagnosis_runs" ON public.dq_diagnosis_runs;
CREATE POLICY "County-scoped read dq_diagnosis_runs" ON public.dq_diagnosis_runs
  FOR SELECT TO authenticated USING (county_id = get_user_county_id());
DROP POLICY IF EXISTS "Authenticated users can read dq_issue_registry" ON public.dq_issue_registry;
CREATE POLICY "County-scoped read dq_issue_registry" ON public.dq_issue_registry
  FOR SELECT TO authenticated USING (county_id = get_user_county_id());
DROP POLICY IF EXISTS "Authenticated users can read dq_proposed_fixes" ON public.dq_proposed_fixes;
CREATE POLICY "County-scoped read dq_proposed_fixes" ON public.dq_proposed_fixes
  FOR SELECT TO authenticated USING (county_id = get_user_county_id());
DROP POLICY IF EXISTS "Authenticated users can read dq_remediation_batches" ON public.dq_remediation_batches;
CREATE POLICY "County-scoped read dq_remediation_batches" ON public.dq_remediation_batches
  FOR SELECT TO authenticated USING (county_id = get_user_county_id());
DROP POLICY IF EXISTS "Authenticated users can read verification snapshots" ON public.dq_verification_snapshots;
CREATE POLICY "County-scoped read verification snapshots" ON public.dq_verification_snapshots
  FOR SELECT TO authenticated USING (county_id = get_user_county_id());

-- neighborhood_reviews + tasks
DROP POLICY IF EXISTS "Auth read reviews" ON public.neighborhood_reviews;
DROP POLICY IF EXISTS "Auth insert reviews" ON public.neighborhood_reviews;
DROP POLICY IF EXISTS "Auth update reviews" ON public.neighborhood_reviews;
CREATE POLICY "County-scoped read neighborhood_reviews" ON public.neighborhood_reviews
  FOR SELECT TO authenticated USING (county_id = get_user_county_id());
CREATE POLICY "County-scoped insert neighborhood_reviews" ON public.neighborhood_reviews
  FOR INSERT TO authenticated WITH CHECK (county_id = get_user_county_id());
CREATE POLICY "County-scoped update neighborhood_reviews" ON public.neighborhood_reviews
  FOR UPDATE TO authenticated USING (county_id = get_user_county_id()) WITH CHECK (county_id = get_user_county_id());
DROP POLICY IF EXISTS "Auth read tasks" ON public.neighborhood_review_tasks;
DROP POLICY IF EXISTS "Auth insert tasks" ON public.neighborhood_review_tasks;
DROP POLICY IF EXISTS "Auth update tasks" ON public.neighborhood_review_tasks;
CREATE POLICY "County-scoped read review tasks" ON public.neighborhood_review_tasks
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.neighborhood_reviews r WHERE r.id = neighborhood_review_tasks.review_id AND r.county_id = get_user_county_id())
  );
CREATE POLICY "County-scoped insert review tasks" ON public.neighborhood_review_tasks
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.neighborhood_reviews r WHERE r.id = neighborhood_review_tasks.review_id AND r.county_id = get_user_county_id())
  );
CREATE POLICY "County-scoped update review tasks" ON public.neighborhood_review_tasks
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.neighborhood_reviews r WHERE r.id = neighborhood_review_tasks.review_id AND r.county_id = get_user_county_id())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.neighborhood_reviews r WHERE r.id = neighborhood_review_tasks.review_id AND r.county_id = get_user_county_id())
  );

-- report_templates
DROP POLICY IF EXISTS "Users can read report templates" ON public.report_templates;
CREATE POLICY "County-scoped read report_templates" ON public.report_templates
  FOR SELECT TO authenticated USING (county_id = get_user_county_id() OR county_id IS NULL OR is_system = true);

-- revaluation_cycles — kill anon writes
DROP POLICY IF EXISTS "Anon insert revaluation_cycles" ON public.revaluation_cycles;
DROP POLICY IF EXISTS "Anon update revaluation_cycles" ON public.revaluation_cycles;
DROP POLICY IF EXISTS "Public read revaluation_cycles" ON public.revaluation_cycles;
CREATE POLICY "County-scoped read revaluation_cycles" ON public.revaluation_cycles
  FOR SELECT TO authenticated USING (county_id = get_user_county_id());
CREATE POLICY "Admins can insert revaluation_cycles" ON public.revaluation_cycles
  FOR INSERT TO authenticated WITH CHECK (is_admin() AND county_id = get_user_county_id());
CREATE POLICY "Admins can update revaluation_cycles" ON public.revaluation_cycles
  FOR UPDATE TO authenticated USING (is_admin() AND county_id = get_user_county_id())
  WITH CHECK (is_admin() AND county_id = get_user_county_id());

-- SLCO tables (text county_id → cast)
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'slco_parcel_assessment_summary','slco_parcel_commercial_characteristics',
    'slco_parcel_evidence_registry','slco_parcel_geometry_snapshot',
    'slco_parcel_identifier_history','slco_parcel_master',
    'slco_parcel_source_registry','slco_parcel_spatial_context',
    'slco_parcel_value_history','slco_recorder_document_index'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Anyone can view %s" ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY "County-scoped read %s" ON public.%I FOR SELECT TO authenticated USING (county_id = get_user_county_id()::text)',
      t, t
    );
  END LOOP;
END $$;

DROP POLICY IF EXISTS "Anyone can view slco_pipeline_runs" ON public.slco_pipeline_runs;
CREATE POLICY "Admins can view slco_pipeline_runs" ON public.slco_pipeline_runs
  FOR SELECT TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "Authenticated users can read value lineage" ON public.slco_value_lineage;
DROP POLICY IF EXISTS "Authenticated users can insert value lineage" ON public.slco_value_lineage;
CREATE POLICY "County-scoped read value lineage" ON public.slco_value_lineage
  FOR SELECT TO authenticated USING (county_id = get_user_county_id());
CREATE POLICY "County-scoped insert value lineage" ON public.slco_value_lineage
  FOR INSERT TO authenticated WITH CHECK (county_id = get_user_county_id());

DROP POLICY IF EXISTS "Users can view validation rules" ON public.validation_rules;
CREATE POLICY "County-scoped view validation rules" ON public.validation_rules
  FOR SELECT TO authenticated USING (county_id = get_user_county_id() OR county_id IS NULL);

DROP POLICY IF EXISTS "Anyone can view VEI metrics" ON public.vei_metrics;
CREATE POLICY "County-scoped read vei_metrics" ON public.vei_metrics
  FOR SELECT TO authenticated USING (county_id = get_user_county_id());

DROP POLICY IF EXISTS "Authenticated users can manage webhook endpoints" ON public.webhook_endpoints;
CREATE POLICY "Admins manage webhook endpoints in their county" ON public.webhook_endpoints
  FOR ALL TO authenticated
  USING (is_admin() AND county_id = get_user_county_id())
  WITH CHECK (is_admin() AND county_id = get_user_county_id());

DROP POLICY IF EXISTS "Authenticated users can view webhook deliveries" ON public.webhook_deliveries;
CREATE POLICY "Admins view webhook deliveries in their county" ON public.webhook_deliveries
  FOR SELECT TO authenticated USING (
    is_admin() AND EXISTS (
      SELECT 1 FROM public.webhook_endpoints e
      WHERE e.id = webhook_deliveries.endpoint_id AND e.county_id = get_user_county_id()
    )
  );

DROP POLICY IF EXISTS "Authenticated users can read violations" ON public.write_lane_violations;
DROP POLICY IF EXISTS "Authenticated users can log violations" ON public.write_lane_violations;
CREATE POLICY "Admins can read write_lane_violations" ON public.write_lane_violations
  FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "Authenticated can log violations" ON public.write_lane_violations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
