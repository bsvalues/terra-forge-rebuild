
CREATE OR REPLACE FUNCTION public.bulk_update_parcel_centroids(
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
  SET latitude_wgs84 = (item->>'lat')::double precision,
      longitude_wgs84 = (item->>'lng')::double precision,
      latitude = (item->>'lat')::double precision,
      longitude = (item->>'lng')::double precision
  FROM jsonb_array_elements(p_data) AS item
  WHERE p.parcel_number = item->>'pid'
    AND p.county_id = p_county_id;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;
