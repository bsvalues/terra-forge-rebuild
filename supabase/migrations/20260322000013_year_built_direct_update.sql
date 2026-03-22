-- TerraFusion OS — Direct year_built backfill (avoids OFFSET pagination)
-- =======================================================================
-- The paginated function using OFFSET becomes slow at large offsets even
-- with indexes (PostgreSQL must skip N rows by scanning).
--
-- This approach: join parcels (year_built IS NULL) directly to gis_features
-- via the parcel_id index — no pagination needed, just a single hash join.
-- With gis_features_parcel_id_idx the optimizer drives from the 20k-row
-- parcels side and looks up each parcel_id in gis_features. Fast.
--
-- Splits into two small functions so each stays under 30 s:
--   backfill_year_built_from_gis()   — year_built
--   backfill_address_from_gis()      — address  (already done; safe to re-run)

CREATE OR REPLACE FUNCTION public.backfill_year_built_from_gis()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_layer_id uuid;
  cnt        integer := 0;
BEGIN
  SELECT id INTO v_layer_id
  FROM   gis_layers
  WHERE  name = 'Benton Parcels (ArcGIS)'
  LIMIT  1;

  IF v_layer_id IS NULL THEN
    RAISE EXCEPTION 'Layer "Benton Parcels (ArcGIS)" not found';
  END IF;

  UPDATE parcels p
  SET    year_built = (f.properties->>'year_blt')::integer
  FROM   gis_features f
  WHERE  f.layer_id  = v_layer_id
    AND  f.parcel_id = p.id
    AND  f.properties ? 'year_blt'
    AND  (f.properties->>'year_blt') ~ '^\d{1,4}$'
    AND  p.year_built IS NULL;
  GET DIAGNOSTICS cnt = ROW_COUNT;

  RETURN jsonb_build_object('year_built_filled', cnt);
END;
$$;

GRANT EXECUTE ON FUNCTION public.backfill_year_built_from_gis() TO service_role;

CREATE OR REPLACE FUNCTION public.backfill_address_from_gis()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_layer_id uuid;
  cnt        integer := 0;
BEGIN
  SELECT id INTO v_layer_id
  FROM   gis_layers
  WHERE  name = 'Benton Parcels (ArcGIS)'
  LIMIT  1;

  IF v_layer_id IS NULL THEN
    RAISE EXCEPTION 'Layer "Benton Parcels (ArcGIS)" not found';
  END IF;

  UPDATE parcels p
  SET    address = trim(f.properties->>'situs_address')
  FROM   gis_features f
  WHERE  f.layer_id  = v_layer_id
    AND  f.parcel_id = p.id
    AND  (f.properties->>'situs_address') IS NOT NULL
    AND  trim(f.properties->>'situs_address') <> ''
    AND  p.address IS NULL;
  GET DIAGNOSTICS cnt = ROW_COUNT;

  RETURN jsonb_build_object('address_filled', cnt);
END;
$$;

GRANT EXECUTE ON FUNCTION public.backfill_address_from_gis() TO service_role;
