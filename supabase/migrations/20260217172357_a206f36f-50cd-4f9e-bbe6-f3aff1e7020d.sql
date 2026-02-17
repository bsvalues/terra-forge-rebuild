
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
    )
  );

  RETURN result;
END;
$$;
