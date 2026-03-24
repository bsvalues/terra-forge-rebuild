-- TerraFusion OS — Cursor-based centroid backfill
-- =================================================
-- Replaces the single-shot backfill_parcel_centroids() RPC with a
-- cursor-based version that stays under Supabase's 8 s statement timeout.
-- Step 1: find the _limit-th feature id (range end).
-- Step 2: UPDATE parcels for features in [_cursor, range_end].
-- Tail: if fewer than _limit features remain, update them all and set done=true.
--
-- The trigger trg_sync_situs_point will auto-compute situs_point_wgs84
-- from latitude_wgs84 / longitude_wgs84 on each updated parcel.

CREATE OR REPLACE FUNCTION public.backfill_centroids_cursor(
  _cursor  uuid    DEFAULT '00000000-0000-0000-0000-000000000000',
  _limit   integer DEFAULT 200
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_range_end uuid;
  cnt         integer := 0;
BEGIN
  -- Step 1: id of the _limit-th feature after cursor (with parcel_id and centroid).
  -- No layer filter — any feature with a parcel_id and centroid is valid.
  SELECT f.id INTO v_range_end
  FROM   gis_features f
  WHERE  f.id           > _cursor
    AND  f.parcel_id    IS NOT NULL
    AND  f.centroid_lat IS NOT NULL
  ORDER  BY f.id
  LIMIT  1 OFFSET (_limit - 1);

  -- Tail branch: fewer than _limit features remain — update them all.
  IF v_range_end IS NULL THEN
    UPDATE parcels p
    SET    latitude_wgs84  = f.centroid_lat,
           longitude_wgs84 = f.centroid_lng,
           situs_source    = 'arcgis_centroid'
    FROM   gis_features f
    WHERE  f.id            > _cursor
      AND  f.parcel_id     = p.id
      AND  f.centroid_lat  IS NOT NULL
      AND  p.latitude_wgs84 IS NULL;
    GET DIAGNOSTICS cnt = ROW_COUNT;

    RETURN jsonb_build_object(
      'updated',     cnt,
      'next_cursor', NULL,
      'done',        true
    );
  END IF;

  -- Step 2: UPDATE parcels for features in (_cursor, v_range_end].
  UPDATE parcels p
  SET    latitude_wgs84  = f.centroid_lat,
         longitude_wgs84 = f.centroid_lng,
         situs_source    = 'arcgis_centroid'
  FROM   gis_features f
  WHERE  f.id            > _cursor
    AND  f.id            <= v_range_end
    AND  f.parcel_id     = p.id
    AND  f.centroid_lat  IS NOT NULL
    AND  p.latitude_wgs84 IS NULL;
  GET DIAGNOSTICS cnt = ROW_COUNT;

  RETURN jsonb_build_object(
    'updated',     cnt,
    'next_cursor', v_range_end,
    'done',        false
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.backfill_centroids_cursor(uuid, integer) TO service_role;
