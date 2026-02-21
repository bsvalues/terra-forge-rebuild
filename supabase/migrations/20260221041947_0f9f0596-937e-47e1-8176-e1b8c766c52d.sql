
-- Server-side mission counts RPC: eliminates client-side row pulls
-- Returns a JSONB object with mission_id → count for all characteristics missions
CREATE OR REPLACE FUNCTION public.get_mission_counts()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_county_id uuid;
  v_result jsonb := '{}'::jsonb;
  v_current_year int := EXTRACT(year FROM CURRENT_DATE)::int;
  
  -- Impossible year built breakdown
  v_pre1700 bigint;
  v_future bigint;
  v_null_year_with_imp bigint;
  
  -- Missing building area
  v_missing_area bigint;
  
  -- Building area outliers (per-class IQR)
  v_area_outlier_count bigint := 0;
BEGIN
  v_county_id := get_user_county_id();
  
  -- ── Impossible Year Built ──
  SELECT count(*) INTO v_pre1700
  FROM parcels WHERE county_id = v_county_id
    AND year_built IS NOT NULL AND year_built < 1700;
    
  SELECT count(*) INTO v_future
  FROM parcels WHERE county_id = v_county_id
    AND year_built IS NOT NULL AND year_built > v_current_year + 1;
    
  SELECT count(*) INTO v_null_year_with_imp
  FROM parcels WHERE county_id = v_county_id
    AND year_built IS NULL AND COALESCE(improvement_value, 0) > 0;
  
  v_result := v_result || jsonb_build_object(
    'impossible-year-built', jsonb_build_object(
      'total', v_pre1700 + v_future + v_null_year_with_imp,
      'pre1700', v_pre1700,
      'future', v_future,
      'missing', v_null_year_with_imp
    )
  );
  
  -- ── Missing Building Areas ──
  SELECT count(*) INTO v_missing_area
  FROM parcels WHERE county_id = v_county_id
    AND COALESCE(improvement_value, 0) > 0
    AND (building_area IS NULL OR building_area = 0);
  
  v_result := v_result || jsonb_build_object(
    'missing-building-area', jsonb_build_object('total', v_missing_area)
  );
  
  -- ── Building Area Outliers (per property_class IQR) ──
  -- Flags parcels where building_area is outside 1.5×IQR within their property class
  SELECT COALESCE(sum(outlier_count), 0) INTO v_area_outlier_count
  FROM (
    SELECT 
      property_class,
      count(*) FILTER (
        WHERE building_area < (q1 - 1.5 * iqr) OR building_area > (q3 + 1.5 * iqr)
      ) AS outlier_count
    FROM (
      SELECT 
        p.id,
        p.building_area,
        p.property_class,
        percentile_cont(0.25) WITHIN GROUP (ORDER BY p2.building_area) AS q1,
        percentile_cont(0.75) WITHIN GROUP (ORDER BY p2.building_area) AS q3,
        percentile_cont(0.75) WITHIN GROUP (ORDER BY p2.building_area) 
          - percentile_cont(0.25) WITHIN GROUP (ORDER BY p2.building_area) AS iqr
      FROM parcels p
      JOIN parcels p2 ON p2.county_id = v_county_id 
        AND p2.property_class = p.property_class
        AND p2.building_area IS NOT NULL AND p2.building_area > 0
      WHERE p.county_id = v_county_id
        AND p.building_area IS NOT NULL AND p.building_area > 0
        AND p.property_class IS NOT NULL
      GROUP BY p.id, p.building_area, p.property_class
    ) stats
    GROUP BY property_class
  ) per_class;
  
  v_result := v_result || jsonb_build_object(
    'building-area-outliers', jsonb_build_object('total', v_area_outlier_count)
  );
  
  -- ── Zero improvement with active permits ──
  v_result := v_result || jsonb_build_object(
    'zero-imp-permits', jsonb_build_object('total', (
      SELECT count(DISTINCT p.id)
      FROM parcels p
      JOIN permits pm ON pm.parcel_id = p.id
      WHERE p.county_id = v_county_id
        AND COALESCE(p.improvement_value, 0) = 0
        AND pm.status IN ('applied', 'pending', 'issued')
    ))
  );
  
  -- ── Pending appeals ──
  v_result := v_result || jsonb_build_object(
    'appeals', jsonb_build_object('total', (
      SELECT count(*) FROM appeals 
      WHERE county_id = v_county_id AND status IN ('filed', 'pending')
    ))
  );
  
  -- ── Uncertified assessments ──
  v_result := v_result || jsonb_build_object(
    'uncertified', jsonb_build_object('total', (
      SELECT count(*) FROM assessments 
      WHERE county_id = v_county_id AND certified = false
    ))
  );
  
  -- ── Missing coordinates ──
  DECLARE
    v_total_parcels bigint;
    v_no_coords bigint;
  BEGIN
    SELECT count(*), count(*) FILTER (WHERE latitude IS NULL)
    INTO v_total_parcels, v_no_coords
    FROM parcels WHERE county_id = v_county_id;
    
    v_result := v_result || jsonb_build_object(
      'geocoding', jsonb_build_object(
        'total', v_total_parcels,
        'missing', v_no_coords,
        'pct', CASE WHEN v_total_parcels > 0 
          THEN round((v_no_coords::numeric / v_total_parcels) * 100)
          ELSE 0 END
      )
    );
  END;
  
  -- ── Sales count ──
  v_result := v_result || jsonb_build_object(
    'sales-data', jsonb_build_object('total', (
      SELECT count(*) FROM sales WHERE county_id = v_county_id
    ))
  );
  
  RETURN v_result;
END;
$function$;
