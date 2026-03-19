
-- Phase 69: Upgrade get_county_vitals with Data Quality & Defensibility Score
-- "The county pulse learned to feel feelings" — Ralph Wiggum, Cardiologist

CREATE OR REPLACE FUNCTION public.get_county_vitals()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result jsonb;
  v_parcels_total bigint;
  v_parcels_coords bigint;
  v_parcels_class bigint;
  v_parcels_nbhd bigint;
  v_sales_total bigint;
  v_assess_total bigint;
  v_assess_certified bigint;
  v_appeals_pending bigint;
  v_permits_open bigint;
  v_exemptions_pending bigint;
  v_calib_runs bigint;
  v_calib_detail jsonb;
  v_recent_jobs jsonb;
  v_dq_latest jsonb;
  v_dq_open_issues bigint;
  v_dq_hard_blockers bigint;
  v_defensibility jsonb;
BEGIN
  -- Parcels counts in one pass
  SELECT
    count(*),
    count(*) FILTER (WHERE latitude IS NOT NULL),
    count(*) FILTER (WHERE property_class IS NOT NULL),
    count(*) FILTER (WHERE neighborhood_code IS NOT NULL)
  INTO v_parcels_total, v_parcels_coords, v_parcels_class, v_parcels_nbhd
  FROM parcels;

  -- Sales
  SELECT count(*) INTO v_sales_total FROM sales;

  -- Assessments
  SELECT count(*), count(*) FILTER (WHERE certified = true)
  INTO v_assess_total, v_assess_certified
  FROM assessments;

  -- Workflows
  SELECT count(*) INTO v_appeals_pending
  FROM appeals WHERE status IN ('filed', 'pending', 'scheduled');

  SELECT count(*) INTO v_permits_open
  FROM permits WHERE status IN ('applied', 'pending', 'issued');

  SELECT count(*) INTO v_exemptions_pending
  FROM exemptions WHERE status = 'pending';

  -- Calibration
  SELECT count(*) INTO v_calib_runs FROM calibration_runs;

  SELECT COALESCE(jsonb_agg(row_to_json(sub)::jsonb), '[]'::jsonb)
  INTO v_calib_detail
  FROM (
    SELECT DISTINCT ON (neighborhood_code)
      neighborhood_code, r_squared
    FROM calibration_runs
    ORDER BY neighborhood_code, created_at DESC
  ) sub;

  -- Recent ingest jobs
  SELECT COALESCE(jsonb_agg(row_to_json(sub)::jsonb), '[]'::jsonb)
  INTO v_recent_jobs
  FROM (
    SELECT id, file_name, target_table, status, row_count, rows_imported, created_at
    FROM ingest_jobs
    ORDER BY created_at DESC
    LIMIT 3
  ) sub;

  -- Data Quality: latest verification snapshot
  SELECT row_to_json(sub)::jsonb INTO v_dq_latest
  FROM (
    SELECT quality_score, passed_all_gates, metrics, gate_results, created_at
    FROM dq_verification_snapshots
    ORDER BY created_at DESC
    LIMIT 1
  ) sub;

  -- Open DQ issues
  SELECT count(*), count(*) FILTER (WHERE is_hard_blocker = true)
  INTO v_dq_open_issues, v_dq_hard_blockers
  FROM dq_issue_registry
  WHERE status = 'open';

  -- ── Defensibility Score (4 pillars, 0-100 each) ──
  DECLARE
    p_data_completeness numeric := 0;
    p_data_consistency numeric := 0;
    p_market_support numeric := 0;
    p_model_stability numeric := 0;
    p_overall numeric := 0;
    p_verdict text := 'at_risk';
    v_calib_applied bigint;
    v_nbhd_total bigint;
    v_avg_rsq numeric;
  BEGIN
    -- Pillar 1: Data Completeness (field coverage)
    IF v_parcels_total > 0 THEN
      p_data_completeness := ROUND(
        (v_parcels_coords::numeric / v_parcels_total * 25) +
        (v_parcels_class::numeric / v_parcels_total * 25) +
        (v_parcels_nbhd::numeric / v_parcels_total * 25) +
        (LEAST(v_assess_total::numeric / v_parcels_total, 1) * 25)
      );
    END IF;

    -- Pillar 2: Data Consistency (open issues as penalty)
    IF v_dq_open_issues = 0 THEN
      p_data_consistency := 100;
    ELSIF v_dq_hard_blockers > 0 THEN
      p_data_consistency := GREATEST(0, 40 - (v_dq_hard_blockers * 10));
    ELSE
      p_data_consistency := GREATEST(0, ROUND(100 - (v_dq_open_issues * 5)));
    END IF;

    -- Pillar 3: Market Support (sales sufficiency)
    IF v_parcels_total > 0 THEN
      -- IAAO recommends ~5% sales ratio; 100% at >= 5% of parcels
      p_market_support := LEAST(100, ROUND(v_sales_total::numeric / GREATEST(v_parcels_total, 1) * 100 / 5 * 100));
    END IF;

    -- Pillar 4: Model Stability (calibration coverage + avg R²)
    SELECT count(DISTINCT neighborhood_code) INTO v_nbhd_total FROM parcels WHERE neighborhood_code IS NOT NULL;
    SELECT count(DISTINCT neighborhood_code) INTO v_calib_applied FROM calibration_runs WHERE status = 'applied';
    SELECT AVG(r_squared) INTO v_avg_rsq FROM (
      SELECT DISTINCT ON (neighborhood_code) r_squared
      FROM calibration_runs WHERE status = 'applied'
      ORDER BY neighborhood_code, created_at DESC
    ) latest_cal;

    IF v_nbhd_total > 0 THEN
      p_model_stability := ROUND(
        (LEAST(v_calib_applied::numeric / v_nbhd_total, 1) * 50) +
        (COALESCE(v_avg_rsq, 0) * 50)
      );
    END IF;

    -- Overall composite (weighted)
    p_overall := ROUND(
      p_data_completeness * 0.30 +
      p_data_consistency * 0.25 +
      p_market_support * 0.25 +
      p_model_stability * 0.20
    );

    p_verdict := CASE
      WHEN p_overall >= 80 THEN 'strong'
      WHEN p_overall >= 50 THEN 'watch'
      ELSE 'at_risk'
    END;

    v_defensibility := jsonb_build_object(
      'overall', p_overall,
      'verdict', p_verdict,
      'pillars', jsonb_build_object(
        'dataCompleteness', p_data_completeness,
        'dataConsistency', p_data_consistency,
        'marketSupport', p_market_support,
        'modelStability', p_model_stability
      )
    );
  END;

  result := jsonb_build_object(
    'parcels', jsonb_build_object(
      'total', v_parcels_total,
      'withCoords', v_parcels_coords,
      'withClass', v_parcels_class,
      'withNeighborhood', v_parcels_nbhd
    ),
    'sales', jsonb_build_object('total', v_sales_total),
    'assessments', jsonb_build_object(
      'total', v_assess_total,
      'certified', v_assess_certified
    ),
    'workflows', jsonb_build_object(
      'pendingAppeals', v_appeals_pending,
      'openPermits', v_permits_open,
      'pendingExemptions', v_exemptions_pending
    ),
    'calibration', jsonb_build_object(
      'runCount', v_calib_runs,
      'detail', v_calib_detail
    ),
    'ingest', jsonb_build_object(
      'recentJobs', v_recent_jobs
    ),
    'dataQuality', jsonb_build_object(
      'latestSnapshot', COALESCE(v_dq_latest, 'null'::jsonb),
      'openIssues', v_dq_open_issues,
      'hardBlockers', v_dq_hard_blockers
    ),
    'defensibility', v_defensibility
  );

  RETURN result;
END;
$$;
