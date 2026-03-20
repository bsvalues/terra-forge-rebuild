
-- Make get_county_vitals county-aware: accepts optional county_id parameter
-- Falls back to scanning all counties if NULL (backward compatible)
CREATE OR REPLACE FUNCTION public.get_county_vitals(p_county_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET statement_timeout = '30s'
AS $$
DECLARE
  v_county uuid := p_county_id;
  v_parcels_total bigint;
  v_parcels_coord bigint;
  v_parcels_val bigint;
  v_parcels_class bigint;
  v_parcels_nbhd bigint;
  v_calibratable_nbhd bigint;
  v_calibrated_nbhds bigint;
  v_avg_rsq numeric;
  v_completeness numeric;
  v_consistency numeric;
  v_market numeric;
  v_stability numeric;
  v_overall numeric;
  v_verdict text;
  v_hard_blockers bigint;
  v_open_issues bigint;
  v_total_sales bigint;
  v_qualified_sales bigint;
  v_latest_sale date;
  v_total_appeals bigint;
  v_pending_appeals bigint;
BEGIN
  -- If no county specified, try to get from caller's profile
  IF v_county IS NULL THEN
    SELECT county_id INTO v_county FROM profiles WHERE user_id = auth.uid();
  END IF;

  -- Single-pass parcel aggregation scoped to county
  IF v_county IS NOT NULL THEN
    SELECT count(*),
      count(*) FILTER (WHERE latitude_wgs84 IS NOT NULL),
      count(*) FILTER (WHERE assessed_value IS NOT NULL AND assessed_value > 0),
      count(*) FILTER (WHERE property_class IS NOT NULL AND property_class != ''),
      count(*) FILTER (WHERE neighborhood_code IS NOT NULL AND neighborhood_code != '')
    INTO v_parcels_total, v_parcels_coord, v_parcels_val, v_parcels_class, v_parcels_nbhd
    FROM parcels WHERE county_id = v_county;
  ELSE
    SELECT count(*),
      count(*) FILTER (WHERE latitude_wgs84 IS NOT NULL),
      count(*) FILTER (WHERE assessed_value IS NOT NULL AND assessed_value > 0),
      count(*) FILTER (WHERE property_class IS NOT NULL AND property_class != ''),
      count(*) FILTER (WHERE neighborhood_code IS NOT NULL AND neighborhood_code != '')
    INTO v_parcels_total, v_parcels_coord, v_parcels_val, v_parcels_class, v_parcels_nbhd
    FROM parcels;
  END IF;

  -- Calibratable neighborhoods scoped to county
  IF v_county IS NOT NULL THEN
    SELECT count(*) INTO v_calibratable_nbhd FROM (
      SELECT p.neighborhood_code
      FROM sales s JOIN parcels p ON s.parcel_id = p.id
      WHERE s.is_qualified = true AND s.sale_price > 0
        AND p.neighborhood_code IS NOT NULL AND p.neighborhood_code != ''
        AND p.county_id = v_county
      GROUP BY p.neighborhood_code HAVING count(*) >= 10
    ) sub;
  ELSE
    SELECT count(*) INTO v_calibratable_nbhd FROM (
      SELECT p.neighborhood_code
      FROM sales s JOIN parcels p ON s.parcel_id = p.id
      WHERE s.is_qualified = true AND s.sale_price > 0
        AND p.neighborhood_code IS NOT NULL AND p.neighborhood_code != ''
      GROUP BY p.neighborhood_code HAVING count(*) >= 10
    ) sub;
  END IF;

  -- Calibration stats scoped to county
  IF v_county IS NOT NULL THEN
    SELECT count(DISTINCT neighborhood_code) INTO v_calibrated_nbhds
    FROM calibration_runs WHERE status = 'applied' AND county_id = v_county;

    SELECT avg(r_squared) INTO v_avg_rsq FROM (
      SELECT DISTINCT ON (neighborhood_code) r_squared
      FROM calibration_runs WHERE status = 'applied' AND county_id = v_county
      ORDER BY neighborhood_code, created_at DESC
    ) latest;
  ELSE
    SELECT count(DISTINCT neighborhood_code) INTO v_calibrated_nbhds
    FROM calibration_runs WHERE status = 'applied';

    SELECT avg(r_squared) INTO v_avg_rsq FROM (
      SELECT DISTINCT ON (neighborhood_code) r_squared
      FROM calibration_runs WHERE status = 'applied'
      ORDER BY neighborhood_code, created_at DESC
    ) latest;
  END IF;

  -- Sales
  IF v_county IS NOT NULL THEN
    SELECT count(*), count(*) FILTER (WHERE is_qualified), max(sale_date)
    INTO v_total_sales, v_qualified_sales, v_latest_sale
    FROM sales WHERE county_id = v_county;
  ELSE
    SELECT count(*), count(*) FILTER (WHERE is_qualified), max(sale_date)
    INTO v_total_sales, v_qualified_sales, v_latest_sale FROM sales;
  END IF;

  -- DQ issues scoped to county
  IF v_county IS NOT NULL THEN
    SELECT count(*) FILTER (WHERE is_hard_blocker = true), count(*)
    INTO v_hard_blockers, v_open_issues
    FROM dq_issue_registry WHERE status = 'open' AND county_id = v_county;
  ELSE
    SELECT count(*) FILTER (WHERE is_hard_blocker = true), count(*)
    INTO v_hard_blockers, v_open_issues
    FROM dq_issue_registry WHERE status = 'open';
  END IF;

  -- Appeals
  IF v_county IS NOT NULL THEN
    SELECT count(*), count(*) FILTER (WHERE status = 'pending')
    INTO v_total_appeals, v_pending_appeals
    FROM appeals WHERE county_id = v_county;
  ELSE
    SELECT count(*), count(*) FILTER (WHERE status = 'pending')
    INTO v_total_appeals, v_pending_appeals FROM appeals;
  END IF;

  -- Pillar scores
  v_completeness := CASE WHEN v_parcels_total > 0 THEN ROUND(
    (v_parcels_coord::numeric / v_parcels_total * 25) +
    (v_parcels_val::numeric / v_parcels_total * 35) +
    (v_parcels_class::numeric / v_parcels_total * 15) +
    (v_parcels_nbhd::numeric / v_parcels_total * 25)
  ) ELSE 0 END;

  v_consistency := CASE
    WHEN v_hard_blockers > 0 THEN GREATEST(10, 50 - v_hard_blockers * 15)
    WHEN v_open_issues > 10 THEN 45
    WHEN v_open_issues > 5 THEN 55
    WHEN v_open_issues > 0 THEN 70
    ELSE 90
  END;

  v_market := CASE WHEN v_total_sales = 0 THEN 0
    ELSE LEAST(ROUND(v_qualified_sales::numeric / GREATEST(v_parcels_total * 0.05, 1) * 100), 100)
  END;

  v_stability := CASE WHEN v_calibratable_nbhd > 0 THEN ROUND(
    (LEAST(v_calibrated_nbhds::numeric / v_calibratable_nbhd, 1) * 50) +
    (COALESCE(v_avg_rsq, 0) * 50)
  ) ELSE 0 END;

  v_overall := ROUND(v_completeness * 0.30 + v_consistency * 0.25 + v_market * 0.25 + v_stability * 0.20);
  v_verdict := CASE WHEN v_overall >= 80 THEN 'strong' WHEN v_overall >= 50 THEN 'watch' ELSE 'at_risk' END;

  RETURN jsonb_build_object(
    'county_id', v_county,
    'parcels', jsonb_build_object(
      'total', v_parcels_total, 'withCoordinates', v_parcels_coord,
      'withValue', v_parcels_val, 'withClass', v_parcels_class, 'withNeighborhood', v_parcels_nbhd
    ),
    'sales', jsonb_build_object('total', v_total_sales, 'qualified', v_qualified_sales, 'latestDate', v_latest_sale),
    'dataQuality', jsonb_build_object('hardBlockers', v_hard_blockers, 'openIssues', v_open_issues),
    'appeals', jsonb_build_object('total', v_total_appeals, 'pending', v_pending_appeals),
    'defensibility', jsonb_build_object(
      'score', v_overall, 'verdict', v_verdict,
      'pillars', jsonb_build_object(
        'dataCompleteness', v_completeness, 'dataConsistency', v_consistency,
        'marketSupport', v_market, 'modelStability', v_stability
      ),
      'detail', jsonb_build_object(
        'calibratableNeighborhoods', v_calibratable_nbhd,
        'calibratedNeighborhoods', v_calibrated_nbhds,
        'avgRSquared', COALESCE(v_avg_rsq, 0)
      )
    )
  );
END;
$$;
