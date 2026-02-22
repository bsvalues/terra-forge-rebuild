
-- Geometry Health Report RPC
-- Scans parcels + gis_features for spatial data quality issues
CREATE OR REPLACE FUNCTION public.get_geometry_health_report()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_county_id uuid;
  v_now timestamptz := now();
  v_result jsonb := '{}'::jsonb;

  -- Parcel coordinate checks
  v_total_parcels bigint;
  v_with_coords bigint;
  v_missing_coords bigint;
  v_out_of_bounds bigint;
  v_duplicate_coords bigint;
  v_zero_coords bigint;

  -- GIS layer/feature checks
  v_total_layers bigint;
  v_total_features bigint;
  v_orphan_features bigint;
  v_missing_centroid bigint;
  v_empty_coordinates bigint;
  v_mixed_srid_layers bigint;
  v_null_geometry_type bigint;

  -- Parcel-GIS linkage
  v_parcels_with_features bigint;
  v_features_no_parcel bigint;

  -- Coordinate range checks (WGS84 bounds for continental US)
  v_suspect_lat bigint;
  v_suspect_lng bigint;

  -- Summary
  v_issue_count bigint := 0;
  v_severity text := 'healthy';
BEGIN
  v_county_id := get_user_county_id();

  -- ═══════════════════════════════════════════
  -- SECTION 1: Parcel Coordinate Health
  -- ═══════════════════════════════════════════

  SELECT
    count(*),
    count(*) FILTER (WHERE latitude IS NOT NULL AND longitude IS NOT NULL),
    count(*) FILTER (WHERE latitude IS NULL OR longitude IS NULL),
    count(*) FILTER (WHERE latitude IS NOT NULL AND longitude IS NOT NULL
      AND (latitude < 24.0 OR latitude > 50.0 OR longitude < -125.0 OR longitude > -66.0)),
    count(*) FILTER (WHERE latitude = 0 AND longitude = 0)
  INTO v_total_parcels, v_with_coords, v_missing_coords, v_out_of_bounds, v_zero_coords
  FROM parcels
  WHERE county_id = v_county_id;

  -- Duplicate coordinate pairs (multiple parcels at exact same point)
  SELECT COALESCE(sum(dup_count - 1), 0) INTO v_duplicate_coords
  FROM (
    SELECT count(*) AS dup_count
    FROM parcels
    WHERE county_id = v_county_id
      AND latitude IS NOT NULL AND longitude IS NOT NULL
      AND NOT (latitude = 0 AND longitude = 0)
    GROUP BY round(latitude::numeric, 6), round(longitude::numeric, 6)
    HAVING count(*) > 1
  ) dups;

  -- Suspect coordinates (valid numbers but wrong hemisphere or magnitude)
  SELECT
    count(*) FILTER (WHERE latitude IS NOT NULL AND (latitude < -90 OR latitude > 90)),
    count(*) FILTER (WHERE longitude IS NOT NULL AND (longitude < -180 OR longitude > 180))
  INTO v_suspect_lat, v_suspect_lng
  FROM parcels
  WHERE county_id = v_county_id;

  v_result := v_result || jsonb_build_object(
    'parcel_coordinates', jsonb_build_object(
      'total_parcels', v_total_parcels,
      'with_coordinates', v_with_coords,
      'missing_coordinates', v_missing_coords,
      'coverage_pct', CASE WHEN v_total_parcels > 0
        THEN round((v_with_coords::numeric / v_total_parcels) * 100, 1)
        ELSE 0 END,
      'out_of_conus_bounds', v_out_of_bounds,
      'zero_coordinates', v_zero_coords,
      'duplicate_locations', v_duplicate_coords,
      'invalid_latitude', v_suspect_lat,
      'invalid_longitude', v_suspect_lng,
      'issues', jsonb_build_array(
        CASE WHEN v_missing_coords > 0 THEN jsonb_build_object(
          'type', 'missing_coordinates', 'severity', 
          CASE WHEN v_missing_coords::numeric / GREATEST(v_total_parcels, 1) > 0.5 THEN 'critical'
               WHEN v_missing_coords::numeric / GREATEST(v_total_parcels, 1) > 0.1 THEN 'warning'
               ELSE 'info' END,
          'count', v_missing_coords,
          'description', v_missing_coords || ' parcels have no lat/lng — invisible on maps and excluded from spatial analysis'
        ) ELSE NULL END,
        CASE WHEN v_out_of_bounds > 0 THEN jsonb_build_object(
          'type', 'out_of_bounds', 'severity', 'warning',
          'count', v_out_of_bounds,
          'description', v_out_of_bounds || ' parcels have coordinates outside continental US bounds (lat 24-50, lng -125 to -66)'
        ) ELSE NULL END,
        CASE WHEN v_zero_coords > 0 THEN jsonb_build_object(
          'type', 'zero_coordinates', 'severity', 'warning',
          'count', v_zero_coords,
          'description', v_zero_coords || ' parcels at (0,0) — likely null island placeholder'
        ) ELSE NULL END,
        CASE WHEN v_duplicate_coords > 0 THEN jsonb_build_object(
          'type', 'duplicate_locations', 'severity', 'info',
          'count', v_duplicate_coords,
          'description', v_duplicate_coords || ' parcels share exact same coordinates — possible stacked condos or geocoding errors'
        ) ELSE NULL END,
        CASE WHEN v_suspect_lat > 0 OR v_suspect_lng > 0 THEN jsonb_build_object(
          'type', 'invalid_wgs84', 'severity', 'critical',
          'count', v_suspect_lat + v_suspect_lng,
          'description', 'Coordinates outside valid WGS84 range (lat ±90, lng ±180) — likely SRID mismatch or data corruption'
        ) ELSE NULL END
      ) - 'null'::jsonb
    )
  );

  -- ═══════════════════════════════════════════
  -- SECTION 2: GIS Feature Health
  -- ═══════════════════════════════════════════

  SELECT count(*) INTO v_total_layers FROM gis_layers;
  SELECT count(*) INTO v_total_features FROM gis_features;

  -- Orphan features (layer deleted but features remain)
  SELECT count(*) INTO v_orphan_features
  FROM gis_features gf
  LEFT JOIN gis_layers gl ON gl.id = gf.layer_id
  WHERE gl.id IS NULL;

  -- Missing centroids
  SELECT count(*) INTO v_missing_centroid
  FROM gis_features
  WHERE (centroid_lat IS NULL OR centroid_lng IS NULL);

  -- Empty/null coordinates
  SELECT count(*) INTO v_empty_coordinates
  FROM gis_features
  WHERE coordinates IS NULL OR coordinates = '{}'::jsonb OR coordinates = '[]'::jsonb;

  -- Mixed SRIDs across layers
  SELECT count(DISTINCT srid) INTO v_mixed_srid_layers
  FROM gis_layers
  WHERE srid IS NOT NULL;

  -- Null geometry type
  SELECT count(*) INTO v_null_geometry_type
  FROM gis_features
  WHERE geometry_type IS NULL OR geometry_type = '';

  -- Parcel-feature linkage
  SELECT count(DISTINCT parcel_id) INTO v_parcels_with_features
  FROM gis_features WHERE parcel_id IS NOT NULL;

  SELECT count(*) INTO v_features_no_parcel
  FROM gis_features WHERE parcel_id IS NULL;

  v_result := v_result || jsonb_build_object(
    'gis_features', jsonb_build_object(
      'total_layers', v_total_layers,
      'total_features', v_total_features,
      'orphan_features', v_orphan_features,
      'missing_centroids', v_missing_centroid,
      'empty_coordinates', v_empty_coordinates,
      'null_geometry_type', v_null_geometry_type,
      'distinct_srids', v_mixed_srid_layers,
      'parcels_with_features', v_parcels_with_features,
      'features_without_parcel', v_features_no_parcel,
      'issues', jsonb_build_array(
        CASE WHEN v_total_features = 0 THEN jsonb_build_object(
          'type', 'no_gis_data', 'severity', 'warning',
          'count', 0,
          'description', 'No GIS features loaded — upload parcel boundaries to enable spatial analysis'
        ) ELSE NULL END,
        CASE WHEN v_orphan_features > 0 THEN jsonb_build_object(
          'type', 'orphan_features', 'severity', 'warning',
          'count', v_orphan_features,
          'description', v_orphan_features || ' features reference deleted layers — data integrity issue'
        ) ELSE NULL END,
        CASE WHEN v_empty_coordinates > 0 THEN jsonb_build_object(
          'type', 'empty_coordinates', 'severity', 'critical',
          'count', v_empty_coordinates,
          'description', v_empty_coordinates || ' features have null or empty coordinate arrays'
        ) ELSE NULL END,
        CASE WHEN v_mixed_srid_layers > 1 THEN jsonb_build_object(
          'type', 'mixed_srids', 'severity', 'warning',
          'count', v_mixed_srid_layers,
          'description', v_mixed_srid_layers || ' different SRIDs across layers — may cause alignment issues'
        ) ELSE NULL END,
        CASE WHEN v_features_no_parcel > 0 AND v_total_features > 0 THEN jsonb_build_object(
          'type', 'unlinked_features', 'severity', 'info',
          'count', v_features_no_parcel,
          'description', v_features_no_parcel || ' features not linked to any parcel — may need spatial join'
        ) ELSE NULL END
      ) - 'null'::jsonb
    )
  );

  -- ═══════════════════════════════════════════
  -- SECTION 3: Neighborhood Spatial Coverage
  -- ═══════════════════════════════════════════
  DECLARE
    v_parcels_no_nbhd bigint;
    v_nbhd_no_geometry bigint;
    v_total_neighborhoods bigint;
  BEGIN
    SELECT count(*) INTO v_parcels_no_nbhd
    FROM parcels
    WHERE county_id = v_county_id
      AND (neighborhood_code IS NULL OR neighborhood_code = '');

    SELECT count(*) INTO v_total_neighborhoods
    FROM neighborhoods WHERE county_id = v_county_id;

    SELECT count(*) INTO v_nbhd_no_geometry
    FROM neighborhoods
    WHERE county_id = v_county_id
      AND (geometry IS NULL OR geometry = '{}'::jsonb);

    v_result := v_result || jsonb_build_object(
      'neighborhood_coverage', jsonb_build_object(
        'total_neighborhoods', v_total_neighborhoods,
        'parcels_without_neighborhood', v_parcels_no_nbhd,
        'neighborhoods_without_geometry', v_nbhd_no_geometry,
        'issues', jsonb_build_array(
          CASE WHEN v_parcels_no_nbhd > 0 THEN jsonb_build_object(
            'type', 'parcels_no_neighborhood', 'severity',
            CASE WHEN v_parcels_no_nbhd::numeric / GREATEST(v_total_parcels, 1) > 0.2 THEN 'warning'
                 ELSE 'info' END,
            'count', v_parcels_no_nbhd,
            'description', v_parcels_no_nbhd || ' parcels have no neighborhood code — excluded from neighborhood-level analytics'
          ) ELSE NULL END,
          CASE WHEN v_nbhd_no_geometry > 0 THEN jsonb_build_object(
            'type', 'neighborhoods_no_geometry', 'severity', 'info',
            'count', v_nbhd_no_geometry,
            'description', v_nbhd_no_geometry || ' neighborhoods lack boundary geometry — cannot render on map'
          ) ELSE NULL END
        ) - 'null'::jsonb
      )
    );
  END;

  -- ═══════════════════════════════════════════
  -- SECTION 4: Overall Score
  -- ═══════════════════════════════════════════

  -- Count total issues
  SELECT count(*) INTO v_issue_count
  FROM jsonb_array_elements(
    COALESCE(v_result->'parcel_coordinates'->'issues', '[]'::jsonb) ||
    COALESCE(v_result->'gis_features'->'issues', '[]'::jsonb) ||
    COALESCE(v_result->'neighborhood_coverage'->'issues', '[]'::jsonb)
  ) issue
  WHERE issue->>'severity' IN ('critical', 'warning');

  v_severity := CASE
    WHEN v_issue_count = 0 THEN 'healthy'
    WHEN EXISTS (
      SELECT 1 FROM jsonb_array_elements(
        COALESCE(v_result->'parcel_coordinates'->'issues', '[]'::jsonb) ||
        COALESCE(v_result->'gis_features'->'issues', '[]'::jsonb) ||
        COALESCE(v_result->'neighborhood_coverage'->'issues', '[]'::jsonb)
      ) i WHERE i->>'severity' = 'critical'
    ) THEN 'critical'
    WHEN v_issue_count > 3 THEN 'degraded'
    ELSE 'warning'
  END;

  v_result := jsonb_build_object(
    'report_time', v_now,
    'county_id', v_county_id,
    'overall_severity', v_severity,
    'total_issues', v_issue_count,
    'sections', v_result
  );

  RETURN v_result;
END;
$function$;
