
-- Update backfill function: WKID 2927 (WA South State Plane, feet) → WGS84
CREATE OR REPLACE FUNCTION public.backfill_parcel_wgs84_from_raw(
  p_county_id uuid,
  p_limit integer DEFAULT 5000
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated integer := 0;
  v_skipped integer := 0;
BEGIN
  WITH candidates AS (
    SELECT id, latitude AS raw_lat, longitude AS raw_lng
    FROM parcels
    WHERE county_id = p_county_id
      AND latitude IS NOT NULL AND longitude IS NOT NULL
      AND NOT (latitude = 0 AND longitude = 0)
      AND (latitude_wgs84 IS NULL OR longitude_wgs84 IS NULL)
    ORDER BY id
    LIMIT p_limit
  ),
  classified AS (
    SELECT
      id, raw_lat, raw_lng,
      (raw_lat BETWEEN -90 AND 90 AND raw_lng BETWEEN -180 AND 180) AS is_wgs84,
      -- Benton County WA / WKID 2927 typical ranges (feet):
      -- X (easting) ~ 1.7M–2.2M, Y (northing) ~ 150k–600k
      -- Raw data stored lat=Y, lng=X
      (raw_lat BETWEEN 150000 AND 600000 AND raw_lng BETWEEN 1700000 AND 2200000) AS looks_like_2927
    FROM candidates
  ),
  computed AS (
    SELECT
      id, raw_lat, raw_lng,
      CASE
        WHEN is_wgs84 THEN raw_lat
        WHEN looks_like_2927 THEN ST_Y(ST_Transform(ST_SetSRID(ST_MakePoint(raw_lng, raw_lat), 2927), 4326))
        ELSE NULL
      END AS new_lat,
      CASE
        WHEN is_wgs84 THEN raw_lng
        WHEN looks_like_2927 THEN ST_X(ST_Transform(ST_SetSRID(ST_MakePoint(raw_lng, raw_lat), 2927), 4326))
        ELSE NULL
      END AS new_lng,
      CASE
        WHEN is_wgs84 THEN 4326
        WHEN looks_like_2927 THEN 2927
        ELSE NULL
      END AS detected_srid,
      CASE
        WHEN is_wgs84 THEN 'raw_wgs84'
        WHEN looks_like_2927 THEN 'derived_from_wkid_2927'
        ELSE 'unknown'
      END AS source,
      CASE
        WHEN is_wgs84 THEN 95
        WHEN looks_like_2927 THEN 90
        ELSE 10
      END AS confidence
    FROM classified
  ),
  upd AS (
    UPDATE parcels p
    SET
      latitude_wgs84 = c.new_lat,
      longitude_wgs84 = c.new_lng,
      coord_detected_srid = c.detected_srid,
      coord_source = c.source,
      coord_confidence = c.confidence,
      coord_updated_at = now()
    FROM computed c
    WHERE p.id = c.id
      AND c.new_lat IS NOT NULL
      AND c.new_lng IS NOT NULL
    RETURNING p.id
  )
  SELECT count(*) INTO v_updated FROM upd;

  SELECT count(*) INTO v_skipped
  FROM classified
  WHERE NOT is_wgs84 AND NOT looks_like_2927;

  RETURN jsonb_build_object(
    'county_id', p_county_id,
    'updated', v_updated,
    'skipped_unknown', v_skipped,
    'limit', p_limit,
    'assumed_projected_wkid', 2927
  );
END;
$$;

REVOKE ALL ON FUNCTION public.backfill_parcel_wgs84_from_raw(uuid, integer) FROM public;

-- Update health report to distinguish 2927-convertible from generic invalid_wgs84
CREATE OR REPLACE FUNCTION public.get_geometry_health_report(p_county_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total integer;
  v_null_coords integer;
  v_zero_coords integer;
  v_invalid_wgs84 integer;
  v_convertible_2927 integer;
  v_out_of_bounds integer;
  v_duplicate_coords integer;
  v_issues jsonb := '[]'::jsonb;
  v_backfill_done integer;
  v_backfill_total integer;
BEGIN
  SELECT count(*) INTO v_total FROM parcels WHERE county_id = p_county_id;

  SELECT count(*) INTO v_null_coords FROM parcels
  WHERE county_id = p_county_id AND (latitude IS NULL OR longitude IS NULL);

  SELECT count(*) INTO v_zero_coords FROM parcels
  WHERE county_id = p_county_id AND latitude = 0 AND longitude = 0;

  -- Convertible WKID 2927 (State Plane feet)
  SELECT count(*) INTO v_convertible_2927 FROM parcels
  WHERE county_id = p_county_id
    AND latitude IS NOT NULL AND longitude IS NOT NULL
    AND NOT (latitude = 0 AND longitude = 0)
    AND (latitude BETWEEN 150000 AND 600000 AND longitude BETWEEN 1700000 AND 2200000);

  -- Invalid WGS84: not valid degrees AND not convertible 2927
  SELECT count(*) INTO v_invalid_wgs84 FROM parcels
  WHERE county_id = p_county_id
    AND latitude IS NOT NULL AND longitude IS NOT NULL
    AND NOT (latitude = 0 AND longitude = 0)
    AND NOT (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
    AND NOT (latitude BETWEEN 150000 AND 600000 AND longitude BETWEEN 1700000 AND 2200000);

  -- Out of CONUS bounds (only check values that ARE valid WGS84 degrees)
  SELECT count(*) INTO v_out_of_bounds FROM parcels
  WHERE county_id = p_county_id
    AND latitude IS NOT NULL AND longitude IS NOT NULL
    AND (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
    AND NOT (latitude BETWEEN 24.0 AND 50.0 AND longitude BETWEEN -125.0 AND -66.0);

  SELECT count(*) INTO v_duplicate_coords FROM (
    SELECT latitude, longitude FROM parcels
    WHERE county_id = p_county_id
      AND latitude IS NOT NULL AND longitude IS NOT NULL
      AND NOT (latitude = 0 AND longitude = 0)
    GROUP BY latitude, longitude HAVING count(*) > 1
  ) dupes;

  -- WGS84 backfill progress
  SELECT count(*) INTO v_backfill_done FROM parcels
  WHERE county_id = p_county_id AND latitude_wgs84 IS NOT NULL AND longitude_wgs84 IS NOT NULL;

  SELECT count(*) INTO v_backfill_total FROM parcels
  WHERE county_id = p_county_id AND latitude IS NOT NULL AND longitude IS NOT NULL
    AND NOT (latitude = 0 AND longitude = 0);

  -- Build issues array
  IF v_null_coords > 0 THEN
    v_issues := v_issues || jsonb_build_object('type', 'null_coordinates', 'count', v_null_coords, 'severity', 'warning',
      'description', 'Parcels with missing latitude or longitude');
  END IF;
  IF v_zero_coords > 0 THEN
    v_issues := v_issues || jsonb_build_object('type', 'zero_coordinates', 'count', v_zero_coords, 'severity', 'warning',
      'description', 'Parcels with (0,0) coordinates');
  END IF;
  IF v_convertible_2927 > 0 THEN
    v_issues := v_issues || jsonb_build_object('type', 'convertible_wkid_2927', 'count', v_convertible_2927, 'severity', 'info',
      'description', 'Parcels with State Plane WKID 2927 coordinates (auto-convertible to WGS84)');
  END IF;
  IF v_invalid_wgs84 > 0 THEN
    v_issues := v_issues || jsonb_build_object('type', 'invalid_wgs84', 'count', v_invalid_wgs84, 'severity', 'error',
      'description', 'Parcels with non-WGS84 coordinates that could not be classified');
  END IF;
  IF v_out_of_bounds > 0 THEN
    v_issues := v_issues || jsonb_build_object('type', 'out_of_conus_bounds', 'count', v_out_of_bounds, 'severity', 'warning',
      'description', 'Parcels with WGS84 coordinates outside CONUS');
  END IF;
  IF v_duplicate_coords > 0 THEN
    v_issues := v_issues || jsonb_build_object('type', 'duplicate_coordinates', 'count', v_duplicate_coords, 'severity', 'info',
      'description', 'Coordinate pairs shared by multiple parcels');
  END IF;

  RETURN jsonb_build_object(
    'county_id', p_county_id,
    'total_parcels', v_total,
    'generated_at', now(),
    'sections', jsonb_build_object(
      'coordinate_quality', jsonb_build_object(
        'total_with_coords', v_total - v_null_coords,
        'null_coordinates', v_null_coords,
        'zero_coordinates', v_zero_coords,
        'invalid_wgs84', v_invalid_wgs84,
        'convertible_wkid_2927', v_convertible_2927,
        'out_of_conus_bounds', v_out_of_bounds,
        'duplicate_coordinate_groups', v_duplicate_coords
      ),
      'wgs84_backfill', jsonb_build_object(
        'completed', v_backfill_done,
        'total_eligible', v_backfill_total,
        'remaining', v_backfill_total - v_backfill_done,
        'pct_done', CASE WHEN v_backfill_total > 0 THEN round((v_backfill_done::numeric / v_backfill_total) * 100, 1) ELSE 0 END
      )
    ),
    'issues', v_issues
  );
END;
$$;
