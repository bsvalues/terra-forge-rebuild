-- TerraFusion OS — Cursor-based year_built backfill (v2, range filter)
-- =====================================================================
-- Step 1: find the Nth feature id (our range end) via simple indexed scan.
-- Step 2: UPDATE using id range [_cursor, range_end] — efficient range scan,
--         no LIMIT/OFFSET inside the UPDATE subquery.
-- This avoids CTE inlining issues and double-scanning gis_features.
-- Batch 200 rows — safely under Supabase free-tier 8 s statement timeout.
--
-- Replaces migration 20260322000014 and 20260322000015.

CREATE OR REPLACE FUNCTION public.backfill_year_built_cursor(
  _cursor  uuid    DEFAULT '00000000-0000-0000-0000-000000000000',
  _limit   integer DEFAULT 200
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_layer_id  uuid;
  v_range_end uuid;
  cnt         integer := 0;
BEGIN
  SELECT id INTO v_layer_id
  FROM   gis_layers
  WHERE  name = 'Benton Parcels (ArcGIS)'
  LIMIT  1;

  IF v_layer_id IS NULL THEN
    RAISE EXCEPTION 'Layer "Benton Parcels (ArcGIS)" not found';
  END IF;

  -- Step 1: find the id of the _limit-th feature after cursor (our range end).
  SELECT f.id INTO v_range_end
  FROM   gis_features f
  WHERE  f.layer_id  = v_layer_id
    AND  f.id        > _cursor
    AND  f.parcel_id IS NOT NULL
  ORDER  BY f.id
  LIMIT  1 OFFSET (_limit - 1);

  -- If no row at that offset, we're at the tail — process remaining rows
  -- with an open-ended range and mark done.
  IF v_range_end IS NULL THEN
    UPDATE parcels p
    SET    year_built = (f.properties->>'year_blt')::integer
    FROM   gis_features f
    WHERE  f.layer_id  = v_layer_id
      AND  f.id        > _cursor
      AND  f.parcel_id = p.id
      AND  p.year_built IS NULL
      AND  (f.properties->>'year_blt') IS NOT NULL
      AND  (f.properties->>'year_blt')::integer BETWEEN 1800 AND 2100;
    GET DIAGNOSTICS cnt = ROW_COUNT;

    RETURN jsonb_build_object(
      'updated',     cnt,
      'next_cursor', NULL,
      'done',        true
    );
  END IF;

  -- Step 2: UPDATE parcels for features in [_cursor, v_range_end].
  UPDATE parcels p
  SET    year_built = (f.properties->>'year_blt')::integer
  FROM   gis_features f
  WHERE  f.layer_id  = v_layer_id
    AND  f.id        > _cursor
    AND  f.id        <= v_range_end
    AND  f.parcel_id = p.id
    AND  p.year_built IS NULL
    AND  (f.properties->>'year_blt') IS NOT NULL
    AND  (f.properties->>'year_blt')::integer BETWEEN 1800 AND 2100;
  GET DIAGNOSTICS cnt = ROW_COUNT;

  RETURN jsonb_build_object(
    'updated',     cnt,
    'next_cursor', v_range_end,
    'done',        false
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.backfill_year_built_cursor(uuid, integer) TO service_role;
