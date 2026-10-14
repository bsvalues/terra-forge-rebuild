CREATE OR REPLACE FUNCTION public.county_neighborhood_codes(p_county_id uuid)
RETURNS TABLE(neighborhood_code text, parcel_count bigint)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$
  SELECT p.neighborhood_code, count(*) FROM parcels p
  WHERE p.county_id = p_county_id AND p.neighborhood_code IS NOT NULL AND p.neighborhood_code <> ''
  GROUP BY p.neighborhood_code ORDER BY p.neighborhood_code;
$$;
GRANT EXECUTE ON FUNCTION public.county_neighborhood_codes(uuid) TO authenticated;