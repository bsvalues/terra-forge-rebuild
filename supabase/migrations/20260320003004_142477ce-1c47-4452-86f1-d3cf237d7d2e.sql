
-- ============================================================
-- Fix 1: Drop the OLD 6-param get_county_timeline overload
--         that causes PGRST203 ambiguity with the 10-param version
-- ============================================================
DROP FUNCTION IF EXISTS public.get_county_timeline(
  timestamp with time zone,
  timestamp with time zone,
  text[],
  text,
  integer,
  integer
);

-- ============================================================
-- Fix 2: Rewrite get_mission_counts to avoid O(n²) self-join
--         for the building-area-outliers IQR calculation.
--         Uses window functions instead.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_mission_counts()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
 SET statement_timeout = '12s'
AS $function$
DECLARE
  v_county_id uuid;
  v_result jsonb := '{}'::jsonb;
  v_current_year int := EXTRACT(year FROM CURRENT_DATE)::int;
  v_now timestamptz := now();
  
  v_pre1700 bigint;
  v_future bigint;
  v_null_year_with_imp bigint;
  v_missing_area bigint;
  v_area_outlier_count bigint := 0;
  v_min_class_n bigint := 0;
  v_total_with_area bigint := 0;
BEGIN
  v_county_id := get_user_county_id();
  
  -- ── Year Built + Missing Area in ONE scan ──
  SELECT
    count(*) FILTER (WHERE year_built IS NOT NULL AND year_built < 1700),
    count(*) FILTER (WHERE year_built IS NOT NULL AND year_built > v_current_year + 1),
    count(*) FILTER (WHERE year_built IS NULL AND COALESCE(improvement_value, 0) > 0),
    count(*) FILTER (WHERE COALESCE(improvement_value, 0) > 0 AND (building_area IS NULL OR building_area = 0))
  INTO v_pre1700, v_future, v_null_year_with_imp, v_missing_area
  FROM parcels WHERE county_id = v_county_id;
  
  v_result := v_result || jsonb_build_object(
    'impossible-year-built', jsonb_build_object(
      'total', v_pre1700 + v_future + v_null_year_with_imp,
      'pre1700', v_pre1700, 'future', v_future, 'missing', v_null_year_with_imp,
      'as_of', v_now, 'sources', jsonb_build_array('parcels'),
      'confidence', 'high', 'confidence_reason', 'Direct field check — no estimation'
    )
  );
  
  v_result := v_result || jsonb_build_object(
    'missing-building-area', jsonb_build_object(
      'total', v_missing_area, 'as_of', v_now,
      'sources', jsonb_build_array('parcels'),
      'confidence', 'high', 'confidence_reason', 'Direct null/zero check on building_area'
    )
  );
  
  -- ── Building Area Outliers — window function approach (no self-join) ──
  SELECT
    COALESCE(sum(outlier_count), 0),
    COALESCE(min(class_n), 0),
    COALESCE(sum(class_n), 0)
  INTO v_area_outlier_count, v_min_class_n, v_total_with_area
  FROM (
    SELECT
      property_class,
      count(*) AS class_n,
      count(*) FILTER (
        WHERE building_area < (q1 - 1.5 * (q3 - q1))
           OR building_area > (q3 + 1.5 * (q3 - q1))
      ) AS outlier_count
    FROM (
      SELECT
        building_area,
        property_class,
        percentile_cont(0.25) WITHIN GROUP (ORDER BY building_area) OVER (PARTITION BY property_class) AS q1,
        percentile_cont(0.75) WITHIN GROUP (ORDER BY building_area) OVER (PARTITION BY property_class) AS q3
      FROM parcels
      WHERE county_id = v_county_id
        AND building_area IS NOT NULL AND building_area > 0
        AND property_class IS NOT NULL
    ) stats
    GROUP BY property_class
  ) per_class;
  
  v_result := v_result || jsonb_build_object(
    'building-area-outliers', jsonb_build_object(
      'total', v_area_outlier_count,
      'scope_n', v_total_with_area,
      'min_class_n', v_min_class_n,
      'as_of', v_now, 'sources', jsonb_build_array('parcels'),
      'confidence', CASE WHEN v_min_class_n < 20 THEN 'medium' ELSE 'high' END,
      'confidence_reason', CASE
        WHEN v_min_class_n < 20 THEN 'IQR needs ≥20 samples per class; smallest class has ' || v_min_class_n
        ELSE '1.5×IQR per property class — statistical, sufficient sample sizes'
      END
    )
  );
  
  -- ── Zero improvement with active permits ──
  DECLARE v_zero_imp bigint;
  BEGIN
    SELECT count(DISTINCT p.id) INTO v_zero_imp
    FROM parcels p
    JOIN permits pm ON pm.parcel_id = p.id
    WHERE p.county_id = v_county_id
      AND COALESCE(p.improvement_value, 0) = 0
      AND pm.status IN ('applied', 'pending', 'issued');
    v_result := v_result || jsonb_build_object(
      'zero-imp-permits', jsonb_build_object(
        'total', v_zero_imp, 'as_of', v_now,
        'sources', jsonb_build_array('parcels', 'permits'),
        'confidence', 'high', 'confidence_reason', 'Cross-table join — parcels × permits'
      )
    );
  EXCEPTION WHEN undefined_table THEN
    v_result := v_result || jsonb_build_object(
      'zero-imp-permits', jsonb_build_object('total', 0, 'as_of', v_now, 'sources', jsonb_build_array(), 'confidence', 'low', 'confidence_reason', 'permits table not found')
    );
  END;
  
  -- ── Pending appeals ──
  DECLARE v_appeals bigint;
  BEGIN
    SELECT count(*) INTO v_appeals
    FROM appeals WHERE county_id = v_county_id AND status IN ('filed', 'pending');
    v_result := v_result || jsonb_build_object(
      'appeals', jsonb_build_object('total', v_appeals, 'as_of', v_now, 'sources', jsonb_build_array('appeals'), 'confidence', 'high', 'confidence_reason', 'Direct status filter')
    );
  END;
  
  -- ── Uncertified assessments ──
  DECLARE v_uncertified bigint;
  BEGIN
    SELECT count(*) INTO v_uncertified
    FROM assessments WHERE county_id = v_county_id AND certified = false;
    v_result := v_result || jsonb_build_object(
      'uncertified', jsonb_build_object('total', v_uncertified, 'as_of', v_now, 'sources', jsonb_build_array('assessments'), 'confidence', 'high', 'confidence_reason', 'Direct boolean check')
    );
  END;
  
  -- ── Missing coordinates ──
  DECLARE v_total_parcels bigint; v_no_coords bigint;
  BEGIN
    SELECT count(*), count(*) FILTER (WHERE latitude IS NULL AND latitude_wgs84 IS NULL)
    INTO v_total_parcels, v_no_coords
    FROM parcels WHERE county_id = v_county_id;
    v_result := v_result || jsonb_build_object(
      'geocoding', jsonb_build_object(
        'total', v_total_parcels, 'missing', v_no_coords,
        'pct', CASE WHEN v_total_parcels > 0 THEN round((v_no_coords::numeric / v_total_parcels) * 100) ELSE 0 END,
        'as_of', v_now, 'sources', jsonb_build_array('parcels'), 'confidence', 'high', 'confidence_reason', 'Direct null check on latitude/latitude_wgs84'
      )
    );
  END;
  
  -- ── Sales count ──
  DECLARE v_sales_total bigint;
  BEGIN
    SELECT count(*) INTO v_sales_total
    FROM sales WHERE county_id = v_county_id;
    v_result := v_result || jsonb_build_object(
      'sales-data', jsonb_build_object('total', v_sales_total, 'as_of', v_now, 'sources', jsonb_build_array('sales'), 'confidence', 'high', 'confidence_reason', 'Full table count')
    );
  END;
  
  RETURN v_result;
END;
$function$;
