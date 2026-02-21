
-- Enrich get_mission_counts() with per-mission provenance metadata
CREATE OR REPLACE FUNCTION public.get_mission_counts()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_county_id uuid;
  v_result jsonb := '{}'::jsonb;
  v_current_year int := EXTRACT(year FROM CURRENT_DATE)::int;
  v_now timestamptz := now();
  
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
      'missing', v_null_year_with_imp,
      'as_of', v_now,
      'sources', jsonb_build_array('parcels'),
      'confidence', 'high',
      'confidence_reason', 'Direct field check — no estimation'
    )
  );
  
  -- ── Missing Building Areas ──
  SELECT count(*) INTO v_missing_area
  FROM parcels WHERE county_id = v_county_id
    AND COALESCE(improvement_value, 0) > 0
    AND (building_area IS NULL OR building_area = 0);
  
  v_result := v_result || jsonb_build_object(
    'missing-building-area', jsonb_build_object(
      'total', v_missing_area,
      'as_of', v_now,
      'sources', jsonb_build_array('parcels'),
      'confidence', 'high',
      'confidence_reason', 'Direct null/zero check on building_area'
    )
  );
  
  -- ── Building Area Outliers (per property_class IQR) ──
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
    'building-area-outliers', jsonb_build_object(
      'total', v_area_outlier_count,
      'as_of', v_now,
      'sources', jsonb_build_array('parcels'),
      'confidence', CASE WHEN v_area_outlier_count > 0 THEN 'high' ELSE 'medium' END,
      'confidence_reason', '1.5×IQR per property class — statistical, not heuristic'
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
        'total', v_zero_imp,
        'as_of', v_now,
        'sources', jsonb_build_array('parcels', 'permits'),
        'confidence', 'high',
        'confidence_reason', 'Cross-table join — parcels × permits'
      )
    );
  END;
  
  -- ── Pending appeals ──
  DECLARE v_appeals bigint;
  BEGIN
    SELECT count(*) INTO v_appeals
    FROM appeals WHERE county_id = v_county_id AND status IN ('filed', 'pending');
    
    v_result := v_result || jsonb_build_object(
      'appeals', jsonb_build_object(
        'total', v_appeals,
        'as_of', v_now,
        'sources', jsonb_build_array('appeals'),
        'confidence', 'high',
        'confidence_reason', 'Direct status filter'
      )
    );
  END;
  
  -- ── Uncertified assessments ──
  DECLARE v_uncertified bigint;
  BEGIN
    SELECT count(*) INTO v_uncertified
    FROM assessments WHERE county_id = v_county_id AND certified = false;
    
    v_result := v_result || jsonb_build_object(
      'uncertified', jsonb_build_object(
        'total', v_uncertified,
        'as_of', v_now,
        'sources', jsonb_build_array('assessments'),
        'confidence', 'high',
        'confidence_reason', 'Direct boolean check'
      )
    );
  END;
  
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
          ELSE 0 END,
        'as_of', v_now,
        'sources', jsonb_build_array('parcels'),
        'confidence', 'high',
        'confidence_reason', 'Direct null check on latitude'
      )
    );
  END;
  
  -- ── Sales count ──
  DECLARE v_sales_total bigint;
  BEGIN
    SELECT count(*) INTO v_sales_total
    FROM sales WHERE county_id = v_county_id;
    
    v_result := v_result || jsonb_build_object(
      'sales-data', jsonb_build_object(
        'total', v_sales_total,
        'as_of', v_now,
        'sources', jsonb_build_array('sales'),
        'confidence', 'high',
        'confidence_reason', 'Full table count'
      )
    );
  END;
  
  RETURN v_result;
END;
$function$;
