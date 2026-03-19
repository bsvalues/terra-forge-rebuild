-- Phase 74: Revaluation Reporting RPC
-- Returns value change summaries and ratio study metrics for a completed cycle

CREATE OR REPLACE FUNCTION public.get_revaluation_report(p_cycle_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cycle revaluation_cycles%ROWTYPE;
  v_neighborhoods text[];
  v_total_parcels integer := 0;
  v_total_land_value bigint := 0;
  v_total_imp_value bigint := 0;
  v_total_assessed bigint := 0;
  v_prior_total_assessed bigint := 0;
  v_class_summary jsonb := '[]'::jsonb;
  v_nbhd_summary jsonb := '[]'::jsonb;
  v_value_distribution jsonb := '[]'::jsonb;
  v_median_ratio numeric;
  v_cod numeric;
  v_prd numeric;
  v_sample_size integer;
  rec record;
BEGIN
  SELECT * INTO v_cycle FROM revaluation_cycles WHERE id = p_cycle_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Cycle not found');
  END IF;

  v_neighborhoods := v_cycle.neighborhoods;

  -- Current year totals by class
  FOR rec IN
    SELECT
      COALESCE(p.property_class, 'Unknown') AS prop_class,
      COUNT(DISTINCT a.parcel_id) AS parcel_count,
      SUM(a.land_value) AS sum_land,
      SUM(a.improvement_value) AS sum_imp,
      SUM(COALESCE(a.total_value, a.land_value + a.improvement_value)) AS sum_total
    FROM assessments a
    JOIN parcels p ON p.id = a.parcel_id
    WHERE p.neighborhood_code = ANY(v_neighborhoods)
      AND a.tax_year = v_cycle.tax_year
      AND a.certified = true
    GROUP BY COALESCE(p.property_class, 'Unknown')
    ORDER BY sum_total DESC
  LOOP
    v_total_parcels := v_total_parcels + rec.parcel_count;
    v_total_land_value := v_total_land_value + COALESCE(rec.sum_land, 0);
    v_total_imp_value := v_total_imp_value + COALESCE(rec.sum_imp, 0);
    v_total_assessed := v_total_assessed + COALESCE(rec.sum_total, 0);

    v_class_summary := v_class_summary || jsonb_build_object(
      'property_class', rec.prop_class,
      'parcel_count', rec.parcel_count,
      'land_value', COALESCE(rec.sum_land, 0),
      'improvement_value', COALESCE(rec.sum_imp, 0),
      'total_value', COALESCE(rec.sum_total, 0)
    );
  END LOOP;

  -- Prior year total for change calculation
  SELECT COALESCE(SUM(COALESCE(a.total_value, a.land_value + a.improvement_value)), 0)
  INTO v_prior_total_assessed
  FROM assessments a
  JOIN parcels p ON p.id = a.parcel_id
  WHERE p.neighborhood_code = ANY(v_neighborhoods)
    AND a.tax_year = v_cycle.tax_year - 1;

  -- Neighborhood summary
  FOR rec IN
    SELECT
      p.neighborhood_code AS nbhd,
      COUNT(DISTINCT a.parcel_id) AS cnt,
      SUM(COALESCE(a.total_value, 0)) AS total_val,
      AVG(COALESCE(a.total_value, 0)) AS avg_val
    FROM assessments a
    JOIN parcels p ON p.id = a.parcel_id
    WHERE p.neighborhood_code = ANY(v_neighborhoods)
      AND a.tax_year = v_cycle.tax_year
      AND a.certified = true
    GROUP BY p.neighborhood_code
    ORDER BY total_val DESC
  LOOP
    v_nbhd_summary := v_nbhd_summary || jsonb_build_object(
      'neighborhood', rec.nbhd,
      'parcel_count', rec.cnt,
      'total_value', rec.total_val,
      'avg_value', ROUND(rec.avg_val)
    );
  END LOOP;

  -- Value distribution buckets
  FOR rec IN
    SELECT
      CASE
        WHEN COALESCE(a.total_value, 0) < 100000 THEN 'Under $100K'
        WHEN COALESCE(a.total_value, 0) < 250000 THEN '$100K-$250K'
        WHEN COALESCE(a.total_value, 0) < 500000 THEN '$250K-$500K'
        WHEN COALESCE(a.total_value, 0) < 1000000 THEN '$500K-$1M'
        ELSE '$1M+'
      END AS bucket,
      COUNT(*) AS cnt,
      SUM(COALESCE(a.total_value, 0)) AS bucket_total
    FROM assessments a
    JOIN parcels p ON p.id = a.parcel_id
    WHERE p.neighborhood_code = ANY(v_neighborhoods)
      AND a.tax_year = v_cycle.tax_year
      AND a.certified = true
    GROUP BY 1
    ORDER BY MIN(COALESCE(a.total_value, 0))
  LOOP
    v_value_distribution := v_value_distribution || jsonb_build_object(
      'bucket', rec.bucket,
      'count', rec.cnt,
      'total_value', rec.bucket_total
    );
  END LOOP;

  -- Ratio study metrics (from assessment_ratios if available)
  SELECT
    COUNT(*) filter (where ar.ratio is not null),
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ar.ratio),
    NULL::numeric,
    NULL::numeric
  INTO v_sample_size, v_median_ratio, v_cod, v_prd
  FROM assessment_ratios ar
  JOIN parcels p ON p.id = ar.parcel_id
  WHERE p.neighborhood_code = ANY(v_neighborhoods)
    AND ar.ratio IS NOT NULL
    AND ar.is_outlier = false;

  RETURN jsonb_build_object(
    'cycle_id', p_cycle_id,
    'cycle_name', v_cycle.cycle_name,
    'tax_year', v_cycle.tax_year,
    'status', v_cycle.status,
    'total_parcels', v_total_parcels,
    'total_land_value', v_total_land_value,
    'total_improvement_value', v_total_imp_value,
    'total_assessed_value', v_total_assessed,
    'prior_year_assessed', v_prior_total_assessed,
    'value_change_pct', CASE WHEN v_prior_total_assessed > 0
      THEN ROUND(((v_total_assessed - v_prior_total_assessed)::numeric / v_prior_total_assessed) * 100, 2)
      ELSE NULL END,
    'class_summary', v_class_summary,
    'neighborhood_summary', v_nbhd_summary,
    'value_distribution', v_value_distribution,
    'ratio_study', jsonb_build_object(
      'sample_size', COALESCE(v_sample_size, 0),
      'median_ratio', v_median_ratio,
      'cod', v_cod,
      'prd', v_prd
    ),
    'generated_at', now()
  );
END;
$$;