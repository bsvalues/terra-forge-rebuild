
-- Fix #1: Add unique index for real upserts on gis_features
CREATE UNIQUE INDEX IF NOT EXISTS gis_features_uq_source
  ON public.gis_features (county_id, layer_id, source_object_id)
  WHERE source_object_id IS NOT NULL;

-- Fix #1: Replace upsert_parcel_polygon with proper ON CONFLICT
CREATE OR REPLACE FUNCTION public.upsert_parcel_polygon(
  p_county_id uuid,
  p_layer_id uuid,
  p_parcel_number text,
  p_geojson_geometry jsonb,
  p_properties jsonb DEFAULT '{}'::jsonb,
  p_source_object_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parcel_id uuid;
  v_feature_id uuid;
  v_geom geometry;
BEGIN
  v_geom := ST_SetSRID(ST_GeomFromGeoJSON(p_geojson_geometry::text), 4326);
  IF ST_GeometryType(v_geom) = 'ST_Polygon' THEN
    v_geom := ST_Multi(v_geom);
  END IF;

  SELECT id INTO v_parcel_id
  FROM parcels
  WHERE county_id = p_county_id AND parcel_number = p_parcel_number
  LIMIT 1;

  INSERT INTO gis_features (county_id, layer_id, source_object_id, geometry_type, coordinates, properties, geom)
  VALUES (
    p_county_id, p_layer_id, p_source_object_id,
    'MultiPolygon', p_geojson_geometry,
    COALESCE(p_properties, '{}'::jsonb),
    v_geom
  )
  ON CONFLICT (county_id, layer_id, source_object_id) WHERE source_object_id IS NOT NULL
  DO UPDATE SET
    properties = EXCLUDED.properties,
    geom = EXCLUDED.geom,
    coordinates = EXCLUDED.coordinates
  RETURNING id INTO v_feature_id;

  IF v_parcel_id IS NOT NULL THEN
    UPDATE parcels SET parcel_geom_wgs84 = v_geom WHERE id = v_parcel_id;
  END IF;

  RETURN jsonb_build_object(
    'parcel_id', v_parcel_id,
    'feature_id', v_feature_id,
    'matched', v_parcel_id IS NOT NULL
  );
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_parcel_polygon(uuid, uuid, text, jsonb, jsonb, text) FROM public;
GRANT EXECUTE ON FUNCTION public.upsert_parcel_polygon(uuid, uuid, text, jsonb, jsonb, text) TO authenticated;

-- Fix #2: Bulk RPC for page-level upserts (2K features per call)
CREATE OR REPLACE FUNCTION public.upsert_parcel_polygons_bulk(
  p_county_id uuid,
  p_layer_id uuid,
  p_rows jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted bigint := 0;
  v_matched bigint := 0;
BEGIN
  WITH input AS (
    SELECT
      (r->>'parcel_number') AS parcel_number,
      NULLIF(r->>'source_object_id','') AS source_object_id,
      (r->'geom') AS geom_geojson,
      COALESCE(r->'props', '{}'::jsonb) AS props
    FROM jsonb_array_elements(p_rows) r
  ),
  parsed AS (
    SELECT
      parcel_number, source_object_id, props,
      CASE WHEN geom_geojson IS NULL THEN NULL
           ELSE ST_SetSRID(ST_GeomFromGeoJSON(geom_geojson::text), 4326)
      END AS geom
    FROM input
  ),
  norm AS (
    SELECT
      parcel_number, source_object_id, props,
      CASE WHEN geom IS NULL THEN NULL
           WHEN ST_GeometryType(geom) = 'ST_Polygon' THEN ST_Multi(geom)
           ELSE geom
      END AS geom
    FROM parsed
    WHERE source_object_id IS NOT NULL
      AND parcel_number IS NOT NULL
      AND geom IS NOT NULL
  ),
  up AS (
    INSERT INTO gis_features (county_id, layer_id, source_object_id, geometry_type, coordinates, properties, geom)
    SELECT
      p_county_id, p_layer_id, source_object_id,
      'MultiPolygon',
      ST_AsGeoJSON(geom)::jsonb,
      props,
      geom
    FROM norm
    ON CONFLICT (county_id, layer_id, source_object_id) WHERE source_object_id IS NOT NULL
    DO UPDATE SET
      properties = EXCLUDED.properties,
      geom = EXCLUDED.geom,
      coordinates = EXCLUDED.coordinates
    RETURNING 1
  )
  SELECT count(*) INTO v_inserted FROM up;

  -- Update parcels.parcel_geom_wgs84 + neighborhood_code by parcel_number match
  WITH norm AS (
    SELECT
      (r->>'parcel_number') AS parcel_number,
      NULLIF(r->>'source_object_id','') AS source_object_id,
      COALESCE(r->'props', '{}'::jsonb) AS props,
      CASE
        WHEN r->'geom' IS NULL THEN NULL
        WHEN ST_GeometryType(ST_SetSRID(ST_GeomFromGeoJSON((r->'geom')::text), 4326)) = 'ST_Polygon'
          THEN ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON((r->'geom')::text), 4326))
        ELSE ST_SetSRID(ST_GeomFromGeoJSON((r->'geom')::text), 4326)
      END AS geom
    FROM jsonb_array_elements(p_rows) r
    WHERE NULLIF(r->>'source_object_id','') IS NOT NULL
      AND (r->>'parcel_number') IS NOT NULL
      AND r->'geom' IS NOT NULL
  ),
  pu AS (
    UPDATE parcels p
    SET parcel_geom_wgs84 = n.geom,
        neighborhood_code = COALESCE(NULLIF(n.props->>'neighborhood_code',''), p.neighborhood_code)
    FROM norm n
    WHERE n.parcel_number = p.parcel_number
      AND p.county_id = p_county_id
    RETURNING 1
  )
  SELECT count(*) INTO v_matched FROM pu;

  RETURN jsonb_build_object(
    'upserted_features', v_inserted,
    'matched_parcels', v_matched
  );
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_parcel_polygons_bulk(uuid, uuid, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.upsert_parcel_polygons_bulk(uuid, uuid, jsonb) TO authenticated;
