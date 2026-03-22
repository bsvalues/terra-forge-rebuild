-- TerraFusion OS — Fix assign_parcels_from_polygon_layer properties extraction
-- =============================================================================
-- seed_arcgis.py stored gis_features.properties as json.dumps(props), so the
-- JSONB column holds a *string* value (not an object).
-- f.properties ->> key returns NULL on a JSONB string; the result was
-- val IS NULL for every candidate, so the UPDATE always wrote 0 rows.
--
-- Fix: unwrap with (f.properties #>> '{}')::jsonb ->> key to first extract the
-- raw text of the string, then cast to JSONB object, then access the key.
--
-- Also adds SET LOCAL statement_timeout to '120s' inside the function so that
-- large-county spatial joins (e.g. 70k parcels x 9 school district polygons)
-- can complete within the Supabase 8s default.

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
  -- Allow large spatial joins to run beyond the default 8 s statement timeout.
  SET LOCAL statement_timeout = '120s';

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

  -- Assign using first matching polygon (deterministic by source_object_id, id).
  -- properties is stored as a JSONB string (json.dumps artifact), so we unwrap
  -- it with (#>> '{}')::jsonb before applying the ->> key operator.
  EXECUTE format($fmt$
    WITH candidates AS (
      SELECT
        p.id AS parcel_id,
        ((f.properties #>> '{}')::jsonb ->> %L) AS val
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
