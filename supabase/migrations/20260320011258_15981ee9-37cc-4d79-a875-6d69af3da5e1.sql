CREATE OR REPLACE FUNCTION public.get_county_vitals()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parcels_total bigint;
  v_parcels_coord bigint;
  v_parcels_val bigint;
  v_parcels_class bigint;
  v_parcels_nbhd bigint;
  v_calibratable_nbhd bigint;
BEGIN
  -- Single-pass parcel aggregation
  SELECT
    count(*),
    count(*) FILTER (WHERE latitude_wgs84 IS NOT NULL OR situs_point_wgs84 IS NOT NULL),
    count(*) FILTER (WHERE assessed_value IS NOT NULL AND assessed_value > 0),
    count(*) FILTER (WHERE property_class IS NOT NULL AND property_class != ''),
    count(*) FILTER (WHERE neighborhood_code IS NOT NULL AND neighborhood_code != '')
  INTO v_parcels_total, v_parcels_coord, v_parcels_val, v_parcels_class, v_parcels_nbhd
  FROM parcels;

  -- Count calibratable neighborhoods (those with at least 10 qualified sales)
  SELECT count(DISTINCT p.neighborhood_code) INTO v_calibratable_nbhd
  FROM sales s
  JOIN parcels p ON s.parcel_id = p.id
  WHERE s.is_qualified = true AND s.sale_price > 0
    AND p.neighborhood_code IS NOT NULL AND p.neighborhood_code != ''
  GROUP BY p.neighborhood_code
  HAVING count(*) >= 10;
  
  -- Fix: the above query returns rows, we need count of those rows
  SELECT count(*) INTO v_calibratable_nbhd FROM (
    SELECT p.neighborhood_code
    FROM sales s
    JOIN parcels p ON s.parcel_id = p.id
    WHERE s.is_qualified = true AND s.sale_price > 0
      AND p.neighborhood_code IS NOT NULL AND p.neighborhood_code != ''
    GROUP BY p.neighborhood_code
    HAVING count(*) >= 10
  ) sub;

  RETURN (
    WITH
    sales_agg AS (
      SELECT count(*) as total_sales,
             count(*) FILTER (WHERE is_qualified) as qualified_sales,
             max(sale_date) as latest_sale
      FROM sales
    ),
    dq_agg AS (
      SELECT count(*) FILTER (WHERE status = 'open' AND is_hard_blocker = true) as hard_blockers,
             count(*) FILTER (WHERE status = 'open') as open_issues
      FROM dq_issue_registry
    ),
    appeal_agg AS (
      SELECT count(*) as total_appeals,
             count(*) FILTER (WHERE status = 'pending') as pending_appeals
      FROM appeals
    )
    SELECT jsonb_build_object(
      'parcels', jsonb_build_object(
        'total', v_parcels_total,
        'withCoordinates', v_parcels_coord,
        'withValue', v_parcels_val,
        'withClass', v_parcels_class,
        'withNeighborhood', v_parcels_nbhd
      ),
      'sales', jsonb_build_object(
        'total', sa.total_sales,
        'qualified', sa.qualified_sales,
        'latestDate', sa.latest_sale
      ),
      'dataQuality', jsonb_build_object(
        'hardBlockers', dq.hard_blockers,
        'openIssues', dq.open_issues
      ),
      'appeals', jsonb_build_object(
        'total', aa.total_appeals,
        'pending', aa.pending_appeals
      ),
      'defensibility', (
        SELECT jsonb_build_object(
          'score', p_overall,
          'verdict', p_verdict,
          'pillars', jsonb_build_object(
            'dataCompleteness', p_data_completeness, 'dataConsistency', p_data_consistency,
            'marketSupport', p_market_support, 'modelStability', p_model_stability
          ),
          'detail', jsonb_build_object(
            'calibratableNeighborhoods', v_calibratable_nbhd,
            'calibratedNeighborhoods', v_calibrated_nbhds,
            'avgRSquared', COALESCE(v_avg_rsq, 0)
          )
        )
        FROM (
          SELECT
            -- Data completeness: avg coverage across key fields
            ROUND((
              CASE WHEN v_parcels_total > 0 THEN
                (v_parcels_coord::numeric / v_parcels_total * 25) +
                (v_parcels_val::numeric / v_parcels_total * 35) +
                (v_parcels_class::numeric / v_parcels_total * 15) +
                (v_parcels_nbhd::numeric / v_parcels_total * 25)
              ELSE 0 END
            )) as p_data_completeness,
            -- Data consistency: penalize hard blockers heavily
            CASE
              WHEN dq.hard_blockers > 0 THEN GREATEST(10, 50 - dq.hard_blockers * 15)
              WHEN dq.open_issues > 10 THEN 45
              WHEN dq.open_issues > 5 THEN 55
              WHEN dq.open_issues > 0 THEN 70
              ELSE 90
            END as p_data_consistency,
            -- Market support: qualified sales ratio
            CASE
              WHEN sa.total_sales = 0 THEN 0
              ELSE LEAST(ROUND(sa.qualified_sales::numeric / GREATEST(v_parcels_total * 0.05, 1) * 100), 100)
            END as p_market_support,
            -- Model stability: calibrated neighborhoods / calibratable neighborhoods + avg R²
            ROUND(
              CASE WHEN v_calibratable_nbhd > 0 THEN
                (LEAST(v_calibrated_nbhds::numeric / v_calibratable_nbhd, 1) * 50) +
                (COALESCE(v_avg_rsq, 0) * 50)
              ELSE 0 END
            ) as p_model_stability,
            -- Overall
            0 as p_overall,
            'at_risk' as p_verdict,
            v_calibrated_nbhds,
            v_avg_rsq
          FROM (
            SELECT
              count(DISTINCT neighborhood_code) as v_calibrated_nbhds,
              (SELECT avg(r_squared) FROM (
                SELECT DISTINCT ON (neighborhood_code) r_squared
                FROM calibration_runs
                WHERE status = 'applied'
                ORDER BY neighborhood_code, created_at DESC
              ) latest_cal) as v_avg_rsq
            FROM calibration_runs
            WHERE status = 'applied'
          ) cal_stats
        ) stats
        CROSS JOIN LATERAL (
          SELECT
            ROUND(
              stats.p_data_completeness * 0.30 + stats.p_data_consistency * 0.25 +
              stats.p_market_support * 0.25 + stats.p_model_stability * 0.20
            ) as p_overall,
            CASE
              WHEN ROUND(
                stats.p_data_completeness * 0.30 + stats.p_data_consistency * 0.25 +
                stats.p_market_support * 0.25 + stats.p_model_stability * 0.20
              ) >= 80 THEN 'strong'
              WHEN ROUND(
                stats.p_data_completeness * 0.30 + stats.p_data_consistency * 0.25 +
                stats.p_market_support * 0.25 + stats.p_model_stability * 0.20
              ) >= 50 THEN 'watch'
              ELSE 'at_risk'
            END as p_verdict
        ) overall_calc
      )
    )
    FROM sales_agg sa, dq_agg dq, appeal_agg aa
  );
END;
$$;