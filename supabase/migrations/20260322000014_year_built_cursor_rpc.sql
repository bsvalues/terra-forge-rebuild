-- TerraFusion OS — Cursor-based year_built backfill
-- ===================================================
-- Replaces OFFSET-based pagination with a cursor approach.
-- Each call processes features WHERE gis_features.id > _cursor,
-- so the DB uses the (layer_id, id) index without scanning past rows.
-- Pre-filters parcel_id IS NOT NULL and properties ? 'year_blt' so
-- each 500-row batch only touches features that can actually yield updates.
--
-- Python caller loops: pass next_cursor from each response as the
-- _cursor for the next call; stop when done = true.

CREATE OR REPLACE FUNCTION public.backfill_year_built_cursor(
  _cursor  uuid    DEFAULT '00000000-0000-0000-0000-000000000000',
  _limit   integer DEFAULT 500
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_layer_id  uuid;
  cnt         integer := 0;
  v_next_cur  uuid;
BEGIN
  SELECT id INTO v_layer_id
  FROM   gis_layers
  WHERE  name = 'Benton Parcels (ArcGIS)'
  LIMIT  1;

  IF v_layer_id IS NULL THEN
    RAISE EXCEPTION 'Layer "Benton Parcels (ArcGIS)" not found';
  END IF;

  -- Grab the *last* id in this batch first so we can return it as next cursor.
  -- Using the (layer_id, id) index with the parcel_id pre-filter.
  WITH batch AS (
    SELECT f.id,
           f.parcel_id,
           (f.properties->>'year_blt')::integer AS yr
    FROM   gis_features f
    WHERE  f.layer_id  = v_layer_id
      AND  f.id        > _cursor
      AND  f.parcel_id IS NOT NULL
      AND  f.properties ? 'year_blt'
    ORDER  BY f.id
    LIMIT  _limit
  ),
  upd AS (
    UPDATE parcels p
    SET    year_built = b.yr
    FROM   batch b
    WHERE  b.parcel_id = p.id
      AND  p.year_built IS NULL
      AND  b.yr IS NOT NULL
      AND  b.yr BETWEEN 1800 AND 2100
    RETURNING p.id
  )
  SELECT count(*) INTO cnt FROM upd;

  -- Select the last feature id we would have processed — that's the next cursor.
  SELECT sub.id INTO v_next_cur
  FROM (
    SELECT f.id
    FROM   gis_features f
    WHERE  f.layer_id  = v_layer_id
      AND  f.id        > _cursor
      AND  f.parcel_id IS NOT NULL
      AND  f.properties ? 'year_blt'
    ORDER  BY f.id
    LIMIT  _limit
  ) sub
  ORDER BY sub.id DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'updated',     cnt,
    'next_cursor', v_next_cur,
    'done',        v_next_cur IS NULL
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.backfill_year_built_cursor(uuid, integer) TO service_role;
