
-- Enable PostGIS if not already
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add canonical WGS84 columns + metadata to parcels
ALTER TABLE parcels
  ADD COLUMN IF NOT EXISTS latitude_wgs84 double precision,
  ADD COLUMN IF NOT EXISTS longitude_wgs84 double precision,
  ADD COLUMN IF NOT EXISTS coord_source text,
  ADD COLUMN IF NOT EXISTS coord_detected_srid integer,
  ADD COLUMN IF NOT EXISTS coord_confidence smallint,
  ADD COLUMN IF NOT EXISTS coord_updated_at timestamptz;

-- Index for spatial lookups on canonical fields
CREATE INDEX IF NOT EXISTS idx_parcels_wgs84 ON parcels(county_id, latitude_wgs84, longitude_wgs84);

-- Backfill function: detects SRID, converts to WGS84, preserves originals
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
  v_already_done integer := 0;
  v_total_candidates integer := 0;
BEGIN
  -- Count already-backfilled
  SELECT count(*) INTO v_already_done
  FROM parcels
  WHERE county_id = p_county_id
    AND latitude_wgs84 IS NOT NULL;

  WITH candidates AS (
    SELECT
      id,
      latitude AS raw_lat,
      longitude AS raw_lng
    FROM parcels
    WHERE county_id = p_county_id
      AND latitude IS NOT NULL AND longitude IS NOT NULL
      AND NOT (latitude = 0 AND longitude = 0)
      AND latitude_wgs84 IS NULL
    ORDER BY id
    LIMIT p_limit
  ),
  classified AS (
    SELECT
      id, raw_lat, raw_lng,
      (raw_lat BETWEEN -90 AND 90 AND raw_lng BETWEEN -180 AND 180) AS is_wgs84,
      (abs(raw_lat) > 1000 AND abs(raw_lng) > 1000
       AND abs(raw_lat) < 2000000 AND abs(raw_lng) < 3000000) AS looks_like_2286
    FROM candidates
  ),
  computed AS (
    SELECT
      id, raw_lat, raw_lng,
      CASE
        WHEN is_wgs84 THEN raw_lat
        WHEN looks_like_2286 THEN ST_Y(ST_Transform(ST_SetSRID(ST_MakePoint(raw_lng, raw_lat), 2286), 4326))
        ELSE NULL
      END AS new_lat,
      CASE
        WHEN is_wgs84 THEN raw_lng
        WHEN looks_like_2286 THEN ST_X(ST_Transform(ST_SetSRID(ST_MakePoint(raw_lng, raw_lat), 2286), 4326))
        ELSE NULL
      END AS new_lng,
      CASE WHEN is_wgs84 THEN 4326 WHEN looks_like_2286 THEN 2286 ELSE NULL END AS detected_srid,
      CASE WHEN is_wgs84 THEN 'raw_wgs84' WHEN looks_like_2286 THEN 'derived_from_epsg_2286' ELSE 'unknown' END AS source,
      CASE WHEN is_wgs84 THEN 95 WHEN looks_like_2286 THEN 85 ELSE 10 END AS confidence,
      is_wgs84, looks_like_2286
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
  FROM candidates ca
  WHERE NOT EXISTS (
    SELECT 1 FROM parcels p2
    WHERE p2.id = ca.id AND p2.latitude_wgs84 IS NOT NULL
  );

  -- Total remaining
  SELECT count(*) INTO v_total_candidates
  FROM parcels
  WHERE county_id = p_county_id
    AND latitude IS NOT NULL AND longitude IS NOT NULL
    AND NOT (latitude = 0 AND longitude = 0)
    AND latitude_wgs84 IS NULL;

  -- Emit trace event
  INSERT INTO trace_events (county_id, source_module, event_type, event_data)
  VALUES (p_county_id, 'geometry-backfill', 'srid_backfill_run', jsonb_build_object(
    'updated', v_updated,
    'skipped_unknown', v_skipped,
    'already_done', v_already_done,
    'remaining', v_total_candidates,
    'batch_limit', p_limit
  ));

  RETURN jsonb_build_object(
    'county_id', p_county_id,
    'updated', v_updated,
    'skipped_unknown', v_skipped,
    'already_done', v_already_done + v_updated,
    'remaining', v_total_candidates,
    'batch_limit', p_limit
  );
END;
$$;

-- Only callable by authenticated users (RLS + service role)
REVOKE ALL ON FUNCTION public.backfill_parcel_wgs84_from_raw(uuid, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.backfill_parcel_wgs84_from_raw(uuid, integer) TO authenticated;

-- Update geometry health report to include SRID backfill status
CREATE OR REPLACE FUNCTION public.get_geometry_health_report()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_county_id uuid;
  v_now timestamptz := now();
  v_result jsonb := '{}'::jsonb;
  v_total_parcels bigint;
  v_with_coords bigint;
  v_missing_coords bigint;
  v_out_of_bounds bigint;
  v_duplicate_coords bigint;
  v_zero_coords bigint;
  v_total_layers bigint;
  v_total_features bigint;
  v_orphan_features bigint;
  v_missing_centroid bigint;
  v_empty_coordinates bigint;
  v_mixed_srid_layers bigint;
  v_null_geometry_type bigint;
  v_parcels_with_features bigint;
  v_features_no_parcel bigint;
  v_suspect_lat bigint;
  v_suspect_lng bigint;
  v_coord_issues jsonb := '[]'::jsonb;
  v_gis_issues jsonb := '[]'::jsonb;
  v_nbhd_issues jsonb := '[]'::jsonb;
  v_issue_count bigint := 0;
  v_severity text := 'healthy';
  -- WGS84 backfill stats
  v_wgs84_total bigint;
  v_wgs84_done bigint;
  v_wgs84_raw bigint;
  v_wgs84_converted bigint;
  v_wgs84_unknown bigint;
BEGIN
  v_county_id := get_user_county_id();

  -- SECTION 1: Parcel Coordinates (use canonical WGS84 fields where available)
  SELECT count(*),
    count(*) FILTER (WHERE COALESCE(latitude_wgs84, latitude) IS NOT NULL AND COALESCE(longitude_wgs84, longitude) IS NOT NULL),
    count(*) FILTER (WHERE COALESCE(latitude_wgs84, latitude) IS NULL OR COALESCE(longitude_wgs84, longitude) IS NULL),
    count(*) FILTER (WHERE COALESCE(latitude_wgs84, latitude) IS NOT NULL AND COALESCE(longitude_wgs84, longitude) IS NOT NULL
      AND (COALESCE(latitude_wgs84, latitude) < 24.0 OR COALESCE(latitude_wgs84, latitude) > 50.0
        OR COALESCE(longitude_wgs84, longitude) < -125.0 OR COALESCE(longitude_wgs84, longitude) > -66.0)),
    count(*) FILTER (WHERE latitude = 0 AND longitude = 0)
  INTO v_total_parcels, v_with_coords, v_missing_coords, v_out_of_bounds, v_zero_coords
  FROM parcels WHERE county_id = v_county_id;

  SELECT COALESCE(sum(dup_count - 1), 0) INTO v_duplicate_coords
  FROM (SELECT count(*) AS dup_count FROM parcels WHERE county_id = v_county_id
    AND COALESCE(latitude_wgs84, latitude) IS NOT NULL AND COALESCE(longitude_wgs84, longitude) IS NOT NULL
    AND NOT (latitude = 0 AND longitude = 0)
    GROUP BY round(COALESCE(latitude_wgs84, latitude)::numeric, 6), round(COALESCE(longitude_wgs84, longitude)::numeric, 6) HAVING count(*) > 1) dups;

  -- Invalid WGS84: only check raw fields that haven't been backfilled yet
  SELECT count(*) FILTER (WHERE latitude_wgs84 IS NULL AND latitude IS NOT NULL AND (latitude < -90 OR latitude > 90)),
    count(*) FILTER (WHERE longitude_wgs84 IS NULL AND longitude IS NOT NULL AND (longitude < -180 OR longitude > 180))
  INTO v_suspect_lat, v_suspect_lng FROM parcels WHERE county_id = v_county_id;

  -- WGS84 backfill progress
  SELECT count(*),
    count(*) FILTER (WHERE latitude_wgs84 IS NOT NULL),
    count(*) FILTER (WHERE coord_source = 'raw_wgs84'),
    count(*) FILTER (WHERE coord_source = 'derived_from_epsg_2286'),
    count(*) FILTER (WHERE coord_source = 'unknown')
  INTO v_wgs84_total, v_wgs84_done, v_wgs84_raw, v_wgs84_converted, v_wgs84_unknown
  FROM parcels WHERE county_id = v_county_id AND latitude IS NOT NULL;

  IF v_missing_coords > 0 THEN
    v_coord_issues := v_coord_issues || jsonb_build_array(jsonb_build_object('type','missing_coordinates','severity',CASE WHEN v_missing_coords::numeric/GREATEST(v_total_parcels,1)>0.5 THEN 'critical' WHEN v_missing_coords::numeric/GREATEST(v_total_parcels,1)>0.1 THEN 'warning' ELSE 'info' END,'count',v_missing_coords,'description',v_missing_coords||' parcels have no lat/lng — invisible on maps'));
  END IF;
  IF v_out_of_bounds > 0 THEN
    v_coord_issues := v_coord_issues || jsonb_build_array(jsonb_build_object('type','out_of_bounds','severity','warning','count',v_out_of_bounds,'description',v_out_of_bounds||' parcels outside continental US bounds (after WGS84 conversion)'));
  END IF;
  IF v_zero_coords > 0 THEN
    v_coord_issues := v_coord_issues || jsonb_build_array(jsonb_build_object('type','zero_coordinates','severity','warning','count',v_zero_coords,'description',v_zero_coords||' parcels at (0,0) — likely null island'));
  END IF;
  IF v_duplicate_coords > 0 THEN
    v_coord_issues := v_coord_issues || jsonb_build_array(jsonb_build_object('type','duplicate_locations','severity','info','count',v_duplicate_coords,'description',v_duplicate_coords||' parcels share exact coordinates'));
  END IF;
  IF v_suspect_lat + v_suspect_lng > 0 THEN
    v_coord_issues := v_coord_issues || jsonb_build_array(jsonb_build_object('type','invalid_wgs84','severity','critical','count',v_suspect_lat+v_suspect_lng,'description','Coordinates outside valid WGS84 range — run SRID backfill to convert'));
  END IF;

  v_result := v_result || jsonb_build_object('parcel_coordinates', jsonb_build_object(
    'total_parcels',v_total_parcels,'with_coordinates',v_with_coords,'missing_coordinates',v_missing_coords,
    'coverage_pct',CASE WHEN v_total_parcels>0 THEN round((v_with_coords::numeric/v_total_parcels)*100,1) ELSE 0 END,
    'out_of_conus_bounds',v_out_of_bounds,'zero_coordinates',v_zero_coords,'duplicate_locations',v_duplicate_coords,
    'invalid_latitude',v_suspect_lat,'invalid_longitude',v_suspect_lng,'issues',v_coord_issues,
    'wgs84_backfill', jsonb_build_object(
      'total_with_raw', v_wgs84_total, 'backfilled', v_wgs84_done,
      'raw_wgs84', v_wgs84_raw, 'converted_2286', v_wgs84_converted, 'unknown', v_wgs84_unknown,
      'pct', CASE WHEN v_wgs84_total > 0 THEN round((v_wgs84_done::numeric/v_wgs84_total)*100,1) ELSE 0 END
    )
  ));

  -- SECTION 2: GIS Features (unchanged logic)
  SELECT count(*) INTO v_total_layers FROM gis_layers;
  SELECT count(*) INTO v_total_features FROM gis_features;
  SELECT count(*) INTO v_orphan_features FROM gis_features gf LEFT JOIN gis_layers gl ON gl.id=gf.layer_id WHERE gl.id IS NULL;
  SELECT count(*) INTO v_missing_centroid FROM gis_features WHERE centroid_lat IS NULL OR centroid_lng IS NULL;
  SELECT count(*) INTO v_empty_coordinates FROM gis_features WHERE coordinates IS NULL OR coordinates='{}'::jsonb OR coordinates='[]'::jsonb;
  SELECT count(DISTINCT srid) INTO v_mixed_srid_layers FROM gis_layers WHERE srid IS NOT NULL;
  SELECT count(*) INTO v_null_geometry_type FROM gis_features WHERE geometry_type IS NULL OR geometry_type='';
  SELECT count(DISTINCT parcel_id) INTO v_parcels_with_features FROM gis_features WHERE parcel_id IS NOT NULL;
  SELECT count(*) INTO v_features_no_parcel FROM gis_features WHERE parcel_id IS NULL;

  IF v_total_features = 0 THEN
    v_gis_issues := v_gis_issues || jsonb_build_array(jsonb_build_object('type','no_gis_data','severity','warning','count',0,'description','No GIS features loaded — upload parcel boundaries to enable spatial analysis'));
  END IF;
  IF v_orphan_features > 0 THEN
    v_gis_issues := v_gis_issues || jsonb_build_array(jsonb_build_object('type','orphan_features','severity','warning','count',v_orphan_features,'description',v_orphan_features||' features reference deleted layers'));
  END IF;
  IF v_empty_coordinates > 0 THEN
    v_gis_issues := v_gis_issues || jsonb_build_array(jsonb_build_object('type','empty_coordinates','severity','critical','count',v_empty_coordinates,'description',v_empty_coordinates||' features have empty coordinate arrays'));
  END IF;
  IF v_mixed_srid_layers > 1 THEN
    v_gis_issues := v_gis_issues || jsonb_build_array(jsonb_build_object('type','mixed_srids','severity','warning','count',v_mixed_srid_layers,'description',v_mixed_srid_layers||' different SRIDs across layers'));
  END IF;
  IF v_features_no_parcel > 0 AND v_total_features > 0 THEN
    v_gis_issues := v_gis_issues || jsonb_build_array(jsonb_build_object('type','unlinked_features','severity','info','count',v_features_no_parcel,'description',v_features_no_parcel||' features not linked to any parcel'));
  END IF;

  v_result := v_result || jsonb_build_object('gis_features', jsonb_build_object(
    'total_layers',v_total_layers,'total_features',v_total_features,'orphan_features',v_orphan_features,
    'missing_centroids',v_missing_centroid,'empty_coordinates',v_empty_coordinates,'null_geometry_type',v_null_geometry_type,
    'distinct_srids',v_mixed_srid_layers,'parcels_with_features',v_parcels_with_features,
    'features_without_parcel',v_features_no_parcel,'issues',v_gis_issues));

  -- SECTION 3: Neighborhood Coverage
  DECLARE v_parcels_no_nbhd bigint; v_nbhd_no_geometry bigint; v_total_neighborhoods bigint;
  BEGIN
    SELECT count(*) INTO v_parcels_no_nbhd FROM parcels WHERE county_id=v_county_id AND (neighborhood_code IS NULL OR neighborhood_code='');
    SELECT count(*) INTO v_total_neighborhoods FROM neighborhoods WHERE county_id=v_county_id;
    SELECT count(*) INTO v_nbhd_no_geometry FROM neighborhoods WHERE county_id=v_county_id AND (geometry IS NULL OR geometry='{}'::jsonb);

    IF v_parcels_no_nbhd > 0 THEN
      v_nbhd_issues := v_nbhd_issues || jsonb_build_array(jsonb_build_object('type','parcels_no_neighborhood','severity',CASE WHEN v_parcels_no_nbhd::numeric/GREATEST(v_total_parcels,1)>0.2 THEN 'warning' ELSE 'info' END,'count',v_parcels_no_nbhd,'description',v_parcels_no_nbhd||' parcels have no neighborhood code'));
    END IF;
    IF v_nbhd_no_geometry > 0 THEN
      v_nbhd_issues := v_nbhd_issues || jsonb_build_array(jsonb_build_object('type','neighborhoods_no_geometry','severity','info','count',v_nbhd_no_geometry,'description',v_nbhd_no_geometry||' neighborhoods lack boundary geometry'));
    END IF;

    v_result := v_result || jsonb_build_object('neighborhood_coverage', jsonb_build_object(
      'total_neighborhoods',v_total_neighborhoods,'parcels_without_neighborhood',v_parcels_no_nbhd,
      'neighborhoods_without_geometry',v_nbhd_no_geometry,'issues',v_nbhd_issues));
  END;

  -- SECTION 4: Overall Score
  SELECT count(*) INTO v_issue_count FROM jsonb_array_elements(v_coord_issues || v_gis_issues || v_nbhd_issues) issue WHERE issue->>'severity' IN ('critical','warning');

  v_severity := CASE
    WHEN v_issue_count = 0 THEN 'healthy'
    WHEN EXISTS (SELECT 1 FROM jsonb_array_elements(v_coord_issues || v_gis_issues || v_nbhd_issues) i WHERE i->>'severity'='critical') THEN 'critical'
    WHEN v_issue_count > 3 THEN 'degraded'
    ELSE 'warning' END;

  RETURN jsonb_build_object('report_time',v_now,'county_id',v_county_id,'overall_severity',v_severity,'total_issues',v_issue_count,'sections',v_result);
END;
$$;
