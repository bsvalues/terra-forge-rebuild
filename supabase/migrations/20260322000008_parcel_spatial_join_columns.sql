-- TerraFusion OS — Spatial Join Target Columns
-- ===============================================
-- Adds columns to parcels that are populated by boundary polygon spatial joins
-- (assign_parcels_from_polygon_layer RPC) or by per-parcel ArcGIS attributes.
--
-- Columns:
--   tax_code_area    — levy code area (per-parcel ArcGIS attribute + future polygon join)
--   reval_zone       — revaluation cycle zone 1-7 (Reval Areas polygon layer)
--   school_district  — school district name (School Districts polygon layer)
--   fire_district    — fire district name (Fire District polygon layer)
--
-- After this migration:
-- 1. Re-push migration 20260322000007 (backfill_parcel_attributes_from_gis) which
--    will also be extended here to pick up tax_code_area.
-- 2. Update run_spatial_joins.py JOINS list to include these new target columns.

ALTER TABLE parcels
  ADD COLUMN IF NOT EXISTS tax_code_area   text,
  ADD COLUMN IF NOT EXISTS reval_zone      text,
  ADD COLUMN IF NOT EXISTS school_district text,
  ADD COLUMN IF NOT EXISTS fire_district   text;

COMMENT ON COLUMN parcels.tax_code_area   IS 'Levy code area — from ArcGIS per-parcel properties or TaxCodeArea polygon layer';
COMMENT ON COLUMN parcels.reval_zone      IS 'Revaluation cycle zone 1-7 — from Reval Areas polygon spatial join';
COMMENT ON COLUMN parcels.school_district IS 'School district name/number — from School Districts polygon spatial join';
COMMENT ON COLUMN parcels.fire_district   IS 'Fire district name — from Fire District polygon spatial join';

-- Extend backfill_parcel_attributes_from_gis to also populate tax_code_area
-- from the ArcGIS per-parcel properties field.
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
  cnt_tax_code_area  integer := 0;
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

  -- tax_code_area: overwrite with ArcGIS value (levy code area per parcel)
  UPDATE parcels p
  SET    tax_code_area = trim(f.properties->>'tax_code_area')
  FROM   gis_features f
  WHERE  f.layer_id   = v_layer_id
    AND  f.parcel_id  = p.id
    AND  (f.properties->>'tax_code_area') IS NOT NULL
    AND  trim(f.properties->>'tax_code_area') <> ''
    AND  p.tax_code_area IS DISTINCT FROM trim(f.properties->>'tax_code_area');
  GET DIAGNOSTICS cnt_tax_code_area = ROW_COUNT;

  RETURN jsonb_build_object(
    'neighborhood_code', cnt_neighborhood,
    'address',           cnt_address,
    'year_built',        cnt_year_built,
    'tax_code_area',     cnt_tax_code_area
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.backfill_parcel_attributes_from_gis() TO service_role;
