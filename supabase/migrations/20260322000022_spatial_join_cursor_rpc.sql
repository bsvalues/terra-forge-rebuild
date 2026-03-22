-- TerraFusion OS — Cursor-based spatial join RPC (round-trips within 8s limit)
-- =============================================================================
-- assign_parcels_from_polygon_layer runs as a single statement and hits the
-- Supabase 8s statement_timeout when processing 70k+ parcels.
-- SET LOCAL statement_timeout inside the function cannot reset the outer
-- statement's timer.
--
-- Solution: spatial_join_cursor processes p_batch parcels at a time (default
-- 1000).  Each RPC call is a fresh outer statement with its own 8s clock.
-- The Python runner loops until done=true.
--
-- (f.properties #>> '{}')::jsonb unwraps the JSON-string-in-JSONB artifact
-- from seed_arcgis.py's json.dumps(props) storage pattern.
--
-- Returns: { updated, next_cursor, done }
--   updated     — parcels updated in this batch
--   next_cursor — UUID to pass as p_cursor in the next call
--   done        — true when no more parcels remain past the cursor

CREATE OR REPLACE FUNCTION public.spatial_join_cursor(
  p_county_id          uuid,
  p_layer_id           uuid,
  p_layer_property_key text,
  p_target_column      text,
  p_cursor             uuid    DEFAULT '00000000-0000-0000-0000-000000000000',
  p_batch              integer DEFAULT 1000
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated    bigint := 0;
  v_next       uuid;
  v_done       boolean := false;
BEGIN
  -- Process the next p_batch parcels (by id order) that have a situs point.
  -- LATERAL picks the first matching polygon ordered deterministically.
  -- The batch CTE carries situs_point_wgs84 to avoid a sub-SELECT per row.
  EXECUTE format($fmt$
    WITH batch AS (
      SELECT p.id, p.situs_point_wgs84
      FROM parcels p
      WHERE p.county_id         = %L::uuid
        AND p.id                 > %L::uuid
        AND p.situs_point_wgs84 IS NOT NULL
      ORDER BY p.id
      LIMIT %s
    ),
    candidates AS (
      SELECT
        b.id AS parcel_id,
        ((f.properties #>> '{}')::jsonb ->> %L) AS val
      FROM batch b
      LEFT JOIN LATERAL (
        SELECT f2.properties
        FROM gis_features f2
        WHERE f2.layer_id = %L::uuid
          AND f2.geom     IS NOT NULL
          AND ST_Intersects(f2.geom, b.situs_point_wgs84::geometry)
        ORDER BY f2.source_object_id NULLS LAST, f2.id
        LIMIT 1
      ) f ON true
    )
    UPDATE parcels p
    SET %I = c.val
    FROM candidates c
    WHERE p.id  = c.parcel_id
      AND c.val IS NOT NULL
  $fmt$,
    p_county_id,
    p_cursor,
    p_batch,
    p_layer_property_key,
    p_layer_id,
    p_target_column
  );

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  -- Advance cursor to the last id in this batch using OFFSET instead of MAX(uuid)
  -- (PostgreSQL has no built-in MAX aggregate for uuid).
  SELECT p.id INTO v_next
  FROM parcels p
  WHERE p.county_id         = p_county_id
    AND p.id                 > p_cursor
    AND p.situs_point_wgs84 IS NOT NULL
  ORDER BY p.id
  OFFSET p_batch - 1
  LIMIT 1;

  IF v_next IS NULL THEN
    v_done := true;
  ELSE
    SELECT NOT EXISTS (
      SELECT 1 FROM parcels
      WHERE county_id         = p_county_id
        AND id                 > v_next
        AND situs_point_wgs84 IS NOT NULL
    ) INTO v_done;
  END IF;

  RETURN jsonb_build_object(
    'updated',     v_updated,
    'next_cursor', COALESCE(v_next::text, ''),
    'done',        v_done
  );
END;
$$;

REVOKE ALL ON FUNCTION public.spatial_join_cursor(uuid, uuid, text, text, uuid, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.spatial_join_cursor(uuid, uuid, text, text, uuid, integer) TO authenticated;
