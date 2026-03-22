-- TerraFusion OS — Paginated attribute backfill
-- ================================================
-- Replaces backfill_parcel_attributes_from_gis() with a paginated version
-- that accepts _limit / _offset so callers can stay within Supabase's 30 s
-- statement timeout by processing gis_features in small pages.
--
-- neighborhood_code and tax_code_area are already populated from PACS
-- (backfill_from_pacs_db.py).  This function now focuses on filling
-- address and year_built where NULL, which are NOT in PACS.

CREATE OR REPLACE FUNCTION public.backfill_parcel_attributes_from_gis(
  _limit  integer DEFAULT 2000,
  _offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_layer_id       uuid;
  cnt_address      integer := 0;
  cnt_year_built   integer := 0;
BEGIN
  SELECT id INTO v_layer_id
  FROM gis_layers
  WHERE name = 'Benton Parcels (ArcGIS)'
  LIMIT 1;

  IF v_layer_id IS NULL THEN
    RAISE EXCEPTION 'Layer "Benton Parcels (ArcGIS)" not found in gis_layers';
  END IF;

  -- address: fill-in only where parcels.address is currently NULL
  UPDATE parcels p
  SET    address = trim(f.properties->>'situs_address')
  FROM   (
    SELECT parcel_id, properties
    FROM   gis_features
    WHERE  layer_id = v_layer_id
    ORDER  BY id
    LIMIT  _limit OFFSET _offset
  ) f
  WHERE  f.parcel_id = p.id
    AND  (f.properties->>'situs_address') IS NOT NULL
    AND  trim(f.properties->>'situs_address') <> ''
    AND  p.address IS NULL;
  GET DIAGNOSTICS cnt_address = ROW_COUNT;

  -- year_built: fill-in only where parcels.year_built is currently NULL
  UPDATE parcels p
  SET    year_built = (f.properties->>'year_blt')::integer
  FROM   (
    SELECT parcel_id, properties
    FROM   gis_features
    WHERE  layer_id = v_layer_id
    ORDER  BY id
    LIMIT  _limit OFFSET _offset
  ) f
  WHERE  f.parcel_id = p.id
    AND  (f.properties->>'year_blt') IS NOT NULL
    AND  (f.properties->>'year_blt') ~ '^\d{4}$'
    AND  p.year_built IS NULL;
  GET DIAGNOSTICS cnt_year_built = ROW_COUNT;

  RETURN jsonb_build_object(
    'address',     cnt_address,
    'year_built',  cnt_year_built,
    'offset',      _offset,
    'limit',       _limit
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.backfill_parcel_attributes_from_gis(integer, integer) TO service_role;
