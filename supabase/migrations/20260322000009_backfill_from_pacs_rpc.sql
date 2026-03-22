-- TerraFusion OS — PACS Direct-DB Enrichment RPC
-- =================================================
-- Bulk-updates parcels.neighborhood_code and parcels.tax_code_area
-- from data extracted directly from the PACS MSSQL database.
--
-- Called by scripts/backfill_from_pacs_db.py, which queries the live
-- tf-mssql container (pacs_oltp) and streams JSONB payloads here.
--
-- Depends on: 20260322000008_parcel_spatial_join_columns.sql
--   (adds tax_code_area column to parcels)
--
-- Input JSONB schema:
--   [{
--     "parcel_number":     "101040000000000",   -- 15-digit geo_id from PACS
--     "neighborhood_code": "540100",             -- hood_cd from property_val
--     "tax_code_area":     "1613"               -- tax_area_number from tax_area
--   }, ...]
--
-- Update rules:
--   neighborhood_code  — PACS value overwrites when non-null/non-empty and different
--   tax_code_area      — PACS value overwrites when non-null/non-empty and different

CREATE OR REPLACE FUNCTION public.backfill_parcels_from_pacs(
  p_data jsonb   -- array of {parcel_number, neighborhood_code, tax_code_area}
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cnt_hood integer := 0;
  cnt_tax  integer := 0;
BEGIN
  -- neighborhood_code: overwrite when PACS has a non-empty value and it differs
  UPDATE parcels p
  SET    neighborhood_code = d->>'neighborhood_code'
  FROM   jsonb_array_elements(p_data) AS d
  WHERE  p.parcel_number = d->>'parcel_number'
    AND  (d->>'neighborhood_code') IS NOT NULL
    AND  trim(d->>'neighborhood_code') <> ''
    AND  p.neighborhood_code IS DISTINCT FROM trim(d->>'neighborhood_code');
  GET DIAGNOSTICS cnt_hood = ROW_COUNT;

  -- tax_code_area: overwrite when PACS has a non-empty value and it differs
  UPDATE parcels p
  SET    tax_code_area = d->>'tax_code_area'
  FROM   jsonb_array_elements(p_data) AS d
  WHERE  p.parcel_number = d->>'parcel_number'
    AND  (d->>'tax_code_area') IS NOT NULL
    AND  trim(d->>'tax_code_area') <> ''
    AND  p.tax_code_area IS DISTINCT FROM trim(d->>'tax_code_area');
  GET DIAGNOSTICS cnt_tax = ROW_COUNT;

  RETURN jsonb_build_object(
    'neighborhood_code', cnt_hood,
    'tax_code_area',     cnt_tax
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.backfill_parcels_from_pacs(jsonb) TO service_role;
