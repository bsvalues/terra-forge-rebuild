-- TerraFusion OS — Parcel Attribute Backfill RPC
-- =================================================
-- Server-side bulk UPDATE: copies per-parcel attribute fields from
-- gis_features.properties (ArcGIS parcel layer) to the parcels table.
--
-- Attributes handled:
--   neighborhood_code  ← properties->>'neighborhood_code'
--   address            ← properties->>'situs_address'  (only if parcels.address IS NULL)
--   year_built         ← properties->>'year_blt'       (only if parcels.year_built IS NULL)
--
-- Returns jsonb: {"neighborhood_code": N, "address": N, "year_built": N}
--
-- Call: POST /rest/v1/rpc/backfill_parcel_attributes_from_gis (service role, no args)

CREATE OR REPLACE FUNCTION public.backfill_parcel_attributes_from_gis()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_layer_id         uuid;
  cnt_neighborhood   integer := 0;
  cnt_address        integer := 0;
  cnt_year_built     integer := 0;
BEGIN
  SELECT id INTO v_layer_id
  FROM gis_layers
  WHERE name = 'Benton Parcels (ArcGIS)'
  LIMIT 1;

  IF v_layer_id IS NULL THEN
    RAISE EXCEPTION 'Layer "Benton Parcels (ArcGIS)" not found in gis_layers';
  END IF;

  -- neighborhood_code: overwrite with ArcGIS value when present and non-empty
  UPDATE parcels p
  SET    neighborhood_code = trim(f.properties->>'neighborhood_code')
  FROM   gis_features f
  WHERE  f.layer_id   = v_layer_id
    AND  f.parcel_id  = p.id
    AND  (f.properties->>'neighborhood_code') IS NOT NULL
    AND  trim(f.properties->>'neighborhood_code') <> ''
    AND  p.neighborhood_code IS DISTINCT FROM trim(f.properties->>'neighborhood_code');
  GET DIAGNOSTICS cnt_neighborhood = ROW_COUNT;

  -- address: fill-in only where parcels.address is currently NULL
  UPDATE parcels p
  SET    address = trim(f.properties->>'situs_address')
  FROM   gis_features f
  WHERE  f.layer_id   = v_layer_id
    AND  f.parcel_id  = p.id
    AND  (f.properties->>'situs_address') IS NOT NULL
    AND  trim(f.properties->>'situs_address') <> ''
    AND  p.address IS NULL;
  GET DIAGNOSTICS cnt_address = ROW_COUNT;

  -- year_built: fill-in only where parcels.year_built is currently NULL
  UPDATE parcels p
  SET    year_built = (f.properties->>'year_blt')::integer
  FROM   gis_features f
  WHERE  f.layer_id   = v_layer_id
    AND  f.parcel_id  = p.id
    AND  (f.properties->>'year_blt') IS NOT NULL
    AND  (f.properties->>'year_blt') ~ '^\d{4}$'
    AND  p.year_built IS NULL;
  GET DIAGNOSTICS cnt_year_built = ROW_COUNT;

  RETURN jsonb_build_object(
    'neighborhood_code', cnt_neighborhood,
    'address',           cnt_address,
    'year_built',        cnt_year_built
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.backfill_parcel_attributes_from_gis() TO service_role;
