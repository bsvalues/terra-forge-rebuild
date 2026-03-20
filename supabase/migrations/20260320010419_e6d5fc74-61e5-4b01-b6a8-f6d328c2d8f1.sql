
CREATE OR REPLACE FUNCTION public.get_county_vitals()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
 SET statement_timeout TO '15s'
AS $function$
DECLARE
  result jsonb;
  v_parcel_stats jsonb;
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
  v_parcels_total bigint;
  v_parcels_coords bigint;
  v_parcels_class bigint;
  v_parcels_nbhd bigint;
  v_distinct_nbhd bigint;
BEGIN
  -- Single-pass parcel aggregation
  SELECT jsonb_build_object(
    'total', count(*),
    'withCoords', count(*) FILTER (WHERE latitude IS NOT NULL OR latitude_wgs84 IS NOT NULL),
    'withClass', count(*) FILTER (WHERE property_class IS NOT NULL),
    'withNeighborhood', count(*) FILTER (WHERE neighborhood_code IS NOT NULL AND neighborhood_code != '')
  ) INTO v_parcel_stats FROM parcels;
  
  v_parcels_total := (v_parcel_stats->>'total')::bigint;
  v_parcels_coords := (v_parcel_stats->>'withCoords')::bigint;
  v_parcels_class := (v_parcel_stats->>'withClass')::bigint;
  v_parcels_nbhd := (v_parcel_stats->>'withNeighborhood')::bigint;

  -- Distinct neighborhood count for model stability denominator
  SELECT count(DISTINCT neighborhood_code) INTO v_distinct_nbhd
  FROM parcels WHERE neighborhood_code IS NOT NULL AND neighborhood_code != '';

  SELECT count(*) INTO v_sales_total FROM sales;
  
  SELECT count(*), count(*) FILTER (WHERE certified = true)
  INTO v_assess_total, v_assess_certified FROM assessments;

  SELECT count(*) INTO v_appeals_pending
  FROM appeals WHERE status IN ('filed', 'pending', 'scheduled');

  BEGIN
    SELECT count(*) INTO v_permits_open FROM permits WHERE status IN ('applied', 'pending', 'issued');
  EXCEPTION WHEN undefined_table THEN
    v_permits_open := 0;
  END;

  SELECT count(*) INTO v_exemptions_pending FROM exemptions WHERE status = 'pending';

  SELECT count(*) INTO v_calib_runs FROM calibration_runs;
  SELECT COALESCE(jsonb_agg(row_to_json(sub)::jsonb), '[]'::jsonb) INTO v_calib_detail
  FROM (
    SELECT DISTINCT ON (neighborhood_code) neighborhood_code, r_squared
    FROM calibration_runs ORDER BY neighborhood_code, created_at DESC
  ) sub;

  SELECT COALESCE(jsonb_agg(row_to_json(sub)::jsonb), '[]'::jsonb) INTO v_recent_jobs
  FROM (
    SELECT id, file_name, target_table, status, row_count, rows_imported, created_at
    FROM ingest_jobs ORDER BY created_at DESC LIMIT 3
  ) sub;

  SELECT row_to_json(sub)::jsonb INTO v_dq_latest
  FROM (
    SELECT quality_score, passed_all_gates, metrics, gate_results, created_at
    FROM dq_verification_snapshots ORDER BY created_at DESC LIMIT 1
  ) sub;

  SELECT count(*), count(*) FILTER (WHERE is_hard_blocker = true)
  INTO v_dq_open_issues, v_dq_hard_blockers
  FROM dq_issue_registry WHERE status = 'open';

  -- Defensibility Score
  DECLARE
    p_data_completeness numeric := 0;
    p_data_consistency numeric := 0;
    p_market_support numeric := 0;
    p_model_stability numeric := 0;
    p_overall numeric := 0;
    p_verdict text := 'at_risk';
    v_calib_applied bigint;
    v_avg_rsq numeric;
    v_calibrated_nbhds bigint;
  BEGIN
    IF v_parcels_total > 0 THEN
      p_data_completeness := ROUND(
        (v_parcels_coords::numeric / v_parcels_total * 25) +
        (v_parcels_class::numeric / v_parcels_total * 25) +
        (v_parcels_nbhd::numeric / v_parcels_total * 25) +
        (LEAST(v_assess_total::numeric / v_parcels_total, 1) * 25)
      );
      -- Market support: sales/parcels ratio, 5% = 100
      p_market_support := LEAST(100, ROUND(v_sales_total::numeric / GREATEST(v_parcels_total, 1) * 100 / 5 * 100));
    END IF;

    -- Data consistency: no hard blockers = good base, each open issue costs 5pts
    IF v_dq_open_issues = 0 THEN
      p_data_consistency := 100;
    ELSIF v_dq_hard_blockers > 0 THEN
      p_data_consistency := GREATEST(0, 40 - (v_dq_hard_blockers * 10));
    ELSE
      p_data_consistency := GREATEST(30, ROUND(100 - (v_dq_open_issues * 5)));
    END IF;

    -- Model stability: use DISTINCT neighborhood count as denominator (not parcel count)
    SELECT count(DISTINCT neighborhood_code) INTO v_calibrated_nbhds 
    FROM calibration_runs WHERE status = 'applied';
    
    SELECT AVG(r_squared) INTO v_avg_rsq FROM (
      SELECT DISTINCT ON (neighborhood_code) r_squared
      FROM calibration_runs WHERE status = 'applied'
      ORDER BY neighborhood_code, created_at DESC
    ) latest_cal;

    IF v_distinct_nbhd > 0 THEN
      p_model_stability := ROUND(
        (LEAST(v_calibrated_nbhds::numeric / v_distinct_nbhd, 1) * 50) +
        (COALESCE(v_avg_rsq, 0) * 50)
      );
    END IF;

    p_overall := ROUND(
      p_data_completeness * 0.30 + p_data_consistency * 0.25 +
      p_market_support * 0.25 + p_model_stability * 0.20
    );
    p_verdict := CASE WHEN p_overall >= 80 THEN 'strong' WHEN p_overall >= 50 THEN 'watch' ELSE 'at_risk' END;

    v_defensibility := jsonb_build_object(
      'overall', p_overall, 'verdict', p_verdict,
      'pillars', jsonb_build_object(
        'dataCompleteness', p_data_completeness, 'dataConsistency', p_data_consistency,
        'marketSupport', p_market_support, 'modelStability', p_model_stability
      ),
      'detail', jsonb_build_object(
        'distinctNeighborhoods', v_distinct_nbhd,
        'calibratedNeighborhoods', v_calibrated_nbhds,
        'avgRSquared', COALESCE(v_avg_rsq, 0)
      )
    );
  END;

  result := jsonb_build_object(
    'parcels', v_parcel_stats,
    'sales', jsonb_build_object('total', v_sales_total),
    'assessments', jsonb_build_object('total', v_assess_total, 'certified', v_assess_certified),
    'workflows', jsonb_build_object('pendingAppeals', v_appeals_pending, 'openPermits', v_permits_open, 'pendingExemptions', v_exemptions_pending),
    'calibration', jsonb_build_object('runCount', v_calib_runs, 'detail', v_calib_detail, 'calibratedNeighborhoods', (SELECT count(DISTINCT neighborhood_code) FROM calibration_runs)),
    'ingest', jsonb_build_object('recentJobs', v_recent_jobs),
    'dataQuality', jsonb_build_object('latestSnapshot', COALESCE(v_dq_latest, 'null'::jsonb), 'openIssues', v_dq_open_issues, 'hardBlockers', v_dq_hard_blockers),
    'defensibility', v_defensibility
  );

  RETURN result;
END;
$function$;
