-- Bulk spatial healing RPC: accepts JSONB array of parcel updates
-- and matches on parcel_number + county_id for upsert
CREATE OR REPLACE FUNCTION public.bulk_spatial_heal(
  p_county_id uuid,
  p_updates jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated int := 0;
BEGIN
  UPDATE parcels p
  SET
    latitude_wgs84  = COALESCE((u.val->>'lat')::double precision, p.latitude_wgs84),
    longitude_wgs84 = COALESCE((u.val->>'lng')::double precision, p.longitude_wgs84),
    coord_source    = COALESCE(u.val->>'coord_source', p.coord_source),
    city            = COALESCE(u.val->>'city', p.city),
    property_class  = COALESCE(u.val->>'property_class', p.property_class),
    building_area   = COALESCE((u.val->>'building_area')::numeric, p.building_area),
    year_built      = COALESCE((u.val->>'year_built')::int, p.year_built),
    lot_size        = COALESCE((u.val->>'lot_size')::numeric, p.lot_size),
    address         = COALESCE(u.val->>'address', p.address),
    updated_at      = now()
  FROM (
    SELECT jsonb_array_elements(p_updates) AS val
  ) u
  WHERE p.county_id = p_county_id
    AND p.parcel_number = u.val->>'parcel_number';

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  RETURN jsonb_build_object('updated', v_updated);
END;
$$;