
CREATE OR REPLACE FUNCTION public.bulk_update_parcel_zip_city(
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
  SET zip_code = NULLIF(item->>'zip', ''),
      city = COALESCE(NULLIF(item->>'city', ''), p.city)
  FROM jsonb_array_elements(p_data) AS item
  WHERE p.parcel_number = item->>'pid'
    AND p.county_id = p_county_id
    AND (p.zip_code IS NULL OR p.city IS NULL);
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;
