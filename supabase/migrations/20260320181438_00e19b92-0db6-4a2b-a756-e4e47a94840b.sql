
-- Optimize get_mission_counts: replace expensive window function with CTE-based percentile approach
CREATE OR REPLACE FUNCTION public.get_mission_counts()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
 SET statement_timeout TO '30s'
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
  
  -- ── Building Area Outliers — CTE approach (no window functions) ──
  WITH class_stats AS (
    SELECT
      property_class,
      count(*) AS class_n,
      percentile_cont(0.25) WITHIN GROUP (ORDER BY building_area) AS q1,
      percentile_cont(0.75) WITHIN GROUP (ORDER BY building_area) AS q3
    FROM parcels
    WHERE county_id = v_county_id
      AND building_area IS NOT NULL AND building_area > 0
      AND property_class IS NOT NULL
    GROUP BY property_class
  ),
  outlier_counts AS (
    SELECT
      cs.property_class,
      cs.class_n,
      count(p.id) FILTER (
        WHERE p.building_area < (cs.q1 - 1.5 * (cs.q3 - cs.q1))
           OR p.building_area > (cs.q3 + 1.5 * (cs.q3 - cs.q1))
      ) AS outlier_count
    FROM class_stats cs
    JOIN parcels p ON p.county_id = v_county_id
      AND p.property_class = cs.property_class
      AND p.building_area IS NOT NULL AND p.building_area > 0
    GROUP BY cs.property_class, cs.class_n, cs.q1, cs.q3
  )
  SELECT
    COALESCE(sum(outlier_count), 0),
    COALESCE(min(class_n), 0),
    COALESCE(sum(class_n), 0)
  INTO v_area_outlier_count, v_min_class_n, v_total_with_area
  FROM outlier_counts;
  
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

-- Add statement_timeout to the data quality RPCs
CREATE OR REPLACE FUNCTION public.get_parcel_data_quality_stats()
 RETURNS TABLE(total_parcels bigint, has_assessed_value bigint, has_building_area bigint, has_year_built bigint, has_bedrooms bigint, has_bathrooms bigint, has_coordinates bigint, has_neighborhood bigint, has_land_area bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
 SET statement_timeout TO '30s'
AS $function$
DECLARE
  v_county_id uuid := get_user_county_id();
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint AS total_parcels,
    COUNT(*) FILTER (WHERE p.assessed_value > 0)::bigint AS has_assessed_value,
    COUNT(*) FILTER (WHERE p.building_area IS NOT NULL AND p.building_area > 0)::bigint AS has_building_area,
    COUNT(*) FILTER (WHERE p.year_built IS NOT NULL AND p.year_built > 0)::bigint AS has_year_built,
    COUNT(*) FILTER (WHERE p.bedrooms IS NOT NULL AND p.bedrooms > 0)::bigint AS has_bedrooms,
    COUNT(*) FILTER (WHERE p.bathrooms IS NOT NULL AND p.bathrooms > 0)::bigint AS has_bathrooms,
    COUNT(*) FILTER (WHERE p.latitude IS NOT NULL AND p.longitude IS NOT NULL)::bigint AS has_coordinates,
    COUNT(*) FILTER (WHERE p.neighborhood_code IS NOT NULL)::bigint AS has_neighborhood,
    COUNT(*) FILTER (WHERE p.land_area IS NOT NULL AND p.land_area > 0)::bigint AS has_land_area
  FROM parcels p
  WHERE p.county_id = v_county_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_neighborhood_data_quality()
 RETURNS TABLE(neighborhood_code text, total_parcels bigint, has_assessed_value bigint, has_building_area bigint, has_coordinates bigint, has_year_built bigint, overall_pct numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
 SET statement_timeout TO '30s'
AS $function$
DECLARE
  v_county_id uuid := get_user_county_id();
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(p.neighborhood_code, 'Unknown') AS neighborhood_code,
    COUNT(*)::bigint AS total_parcels,
    COUNT(*) FILTER (WHERE p.assessed_value > 0)::bigint AS has_assessed_value,
    COUNT(*) FILTER (WHERE p.building_area IS NOT NULL AND p.building_area > 0)::bigint AS has_building_area,
    COUNT(*) FILTER (WHERE p.latitude IS NOT NULL AND p.longitude IS NOT NULL)::bigint AS has_coordinates,
    COUNT(*) FILTER (WHERE p.year_built IS NOT NULL AND p.year_built > 0)::bigint AS has_year_built,
    ROUND(
      (
        (COUNT(*) FILTER (WHERE p.assessed_value > 0)::numeric +
         COUNT(*) FILTER (WHERE p.building_area IS NOT NULL AND p.building_area > 0)::numeric +
         COUNT(*) FILTER (WHERE p.latitude IS NOT NULL AND p.longitude IS NOT NULL)::numeric +
         COUNT(*) FILTER (WHERE p.year_built IS NOT NULL AND p.year_built > 0)::numeric)
        / NULLIF(COUNT(*) * 4, 0)
      ) * 100, 1
    ) AS overall_pct
  FROM parcels p
  WHERE p.county_id = v_county_id
  GROUP BY COALESCE(p.neighborhood_code, 'Unknown')
  ORDER BY COUNT(*) DESC;
END;
$function$;

-- Add covering index for the building area outlier query
CREATE INDEX IF NOT EXISTS idx_parcels_county_class_area
ON public.parcels (county_id, property_class, building_area)
WHERE building_area IS NOT NULL AND building_area > 0 AND property_class IS NOT NULL;
