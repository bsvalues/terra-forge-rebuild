
CREATE OR REPLACE FUNCTION public.bulk_update_parcel_lir(
  p_county_id uuid,
  p_data jsonb
)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE parcels p
  SET
    building_area = COALESCE(NULLIF((item->>'bldg_sqft')::numeric, 0), p.building_area),
    year_built = COALESCE(NULLIF((item->>'built_yr')::integer, 0), p.year_built),
    neighborhood_code = COALESCE(NULLIF(item->>'subdiv', ''), p.neighborhood_code),
    property_class = COALESCE(NULLIF(item->>'prop_class', ''), p.property_class)
  FROM jsonb_array_elements(p_data) AS item
  WHERE p.parcel_number = item->>'pid'
    AND p.county_id = p_county_id;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;
