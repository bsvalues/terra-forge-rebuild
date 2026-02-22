
-- =========================================================
-- Spatial Join Package: ParcelsAndAssess Layer (SRID 2927)
-- Adds native PostGIS geometry columns to parcels table,
-- a native geom column to gis_features for spatial ops,
-- and a generic polygon-layer assignment RPC.
-- =========================================================

-- 1) Add parcel polygon geometry columns to parcels
ALTER TABLE public.parcels
  ADD COLUMN IF NOT EXISTS parcel_geom_wgs84 geometry(MultiPolygon, 4326);

-- GiST index for spatial queries
CREATE INDEX IF NOT EXISTS parcels_parcel_geom_wgs84_gist
  ON public.parcels USING gist (parcel_geom_wgs84);

-- SRID constraint
ALTER TABLE public.parcels
  ADD CONSTRAINT parcels_parcel_geom_wgs84_srid_chk
  CHECK (parcel_geom_wgs84 IS NULL OR st_srid(parcel_geom_wgs84) = 4326);

-- 2) Add native PostGIS geom column to gis_features for real spatial ops
--    (existing 'coordinates' jsonb stays for backward compat)
ALTER TABLE public.gis_features
  ADD COLUMN IF NOT EXISTS geom geometry(Geometry, 4326);

CREATE INDEX IF NOT EXISTS gis_features_geom_gist
  ON public.gis_features USING gist (geom);

ALTER TABLE public.gis_features
  ADD CONSTRAINT gis_features_geom_srid_chk
  CHECK (geom IS NULL OR st_srid(geom) = 4326);

-- Add source_object_id to gis_features if not exists (for ArcGIS GlobalID/OBJECTID tracking)
ALTER TABLE public.gis_features
  ADD COLUMN IF NOT EXISTS source_object_id text;

-- Add county_id to gis_features if not exists
ALTER TABLE public.gis_features
  ADD COLUMN IF NOT EXISTS county_id uuid;

-- 3) Generic polygon-layer spatial join RPC
--    Assigns a parcel column from a polygon layer's property key
--    using ST_Intersects(polygon.geom, parcel.situs_point_wgs84)
CREATE OR REPLACE FUNCTION public.assign_parcels_from_polygon_layer(
  p_county_id uuid,
  p_layer_id uuid,
  p_layer_property_key text,
  p_target_column text,
  p_limit integer DEFAULT 50000
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assigned bigint := 0;
  v_unassigned bigint := 0;
  v_ambiguous bigint := 0;
BEGIN
  -- Count ambiguous parcels (intersect >1 polygon in layer)
  WITH hits AS (
    SELECT p.id AS parcel_id, count(*) AS n
    FROM parcels p
    JOIN gis_features f
      ON f.layer_id = p_layer_id
     AND f.geom IS NOT NULL
     AND p.situs_point_wgs84 IS NOT NULL
     AND ST_Intersects(f.geom, p.situs_point_wgs84::geometry)
    WHERE p.county_id = p_county_id
    GROUP BY p.id
  )
  SELECT count(*) INTO v_ambiguous
  FROM hits WHERE n > 1;

  -- Assign using first matching polygon (deterministic by source_object_id, id)
  EXECUTE format($fmt$
    WITH candidates AS (
      SELECT
        p.id AS parcel_id,
        (f.properties ->> %L) AS val
      FROM parcels p
      JOIN LATERAL (
        SELECT f2.*
        FROM gis_features f2
        WHERE f2.layer_id = %L::uuid
          AND f2.geom IS NOT NULL
          AND ST_Intersects(f2.geom, p.situs_point_wgs84::geometry)
        ORDER BY f2.source_object_id NULLS LAST, f2.id
        LIMIT 1
      ) f ON true
      WHERE p.county_id = %L::uuid
        AND p.situs_point_wgs84 IS NOT NULL
      LIMIT %s
    )
    UPDATE parcels p
    SET %I = c.val
    FROM candidates c
    WHERE p.id = c.parcel_id
      AND c.val IS NOT NULL
  $fmt$, p_layer_property_key, p_layer_id, p_county_id, p_limit, p_target_column);

  GET DIAGNOSTICS v_assigned = ROW_COUNT;

  -- Count unassigned (have situs point but no polygon match)
  SELECT count(*) INTO v_unassigned
  FROM parcels p
  WHERE p.county_id = p_county_id
    AND p.situs_point_wgs84 IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM gis_features f
      WHERE f.layer_id = p_layer_id
        AND f.geom IS NOT NULL
        AND ST_Intersects(f.geom, p.situs_point_wgs84::geometry)
    );

  -- Trace event
  INSERT INTO trace_events (county_id, source_module, event_type, event_data)
  VALUES (
    p_county_id, 'spatial-join', 'assign_parcels_from_polygon_layer',
    jsonb_build_object(
      'layer_id', p_layer_id,
      'property_key', p_layer_property_key,
      'target_column', p_target_column,
      'assigned', v_assigned,
      'unassigned', v_unassigned,
      'ambiguous', v_ambiguous,
      'limit', p_limit
    )
  );

  RETURN jsonb_build_object(
    'assigned', v_assigned,
    'unassigned', v_unassigned,
    'ambiguous', v_ambiguous
  );
END;
$$;

REVOKE ALL ON FUNCTION public.assign_parcels_from_polygon_layer(uuid, uuid, text, text, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.assign_parcels_from_polygon_layer(uuid, uuid, text, text, integer) TO authenticated;

-- 4) RPC to ingest ArcGIS parcel polygons by matching Parcel_ID → parcels.parcel_number
--    Stores polygon in gis_features.geom (WGS84) and updates parcels.parcel_geom_wgs84
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
  -- Parse GeoJSON geometry (already in WGS84 from edge function transform)
  v_geom := ST_SetSRID(ST_GeomFromGeoJSON(p_geojson_geometry::text), 4326);

  -- Find matching parcel
  SELECT id INTO v_parcel_id
  FROM parcels
  WHERE county_id = p_county_id
    AND parcel_number = p_parcel_number
  LIMIT 1;

  -- Upsert gis_feature
  INSERT INTO gis_features (layer_id, parcel_id, geometry_type, coordinates, properties, geom, source_object_id, county_id)
  VALUES (
    p_layer_id,
    v_parcel_id,
    'MultiPolygon',
    p_geojson_geometry,
    p_properties,
    CASE WHEN ST_GeometryType(v_geom) = 'ST_Polygon'
         THEN ST_Multi(v_geom)
         ELSE v_geom
    END,
    p_source_object_id,
    p_county_id
  )
  ON CONFLICT (id) DO NOTHING
  RETURNING id INTO v_feature_id;

  -- Update parcel polygon if we found a match
  IF v_parcel_id IS NOT NULL THEN
    UPDATE parcels
    SET parcel_geom_wgs84 = CASE
          WHEN ST_GeometryType(v_geom) = 'ST_Polygon' THEN ST_Multi(v_geom)
          ELSE v_geom
        END
    WHERE id = v_parcel_id;
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
