CREATE OR REPLACE FUNCTION public.dq_parcel_counts(p_county_id uuid)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total_parcels', count(*),
    'missing_coords', count(*) FILTER (WHERE latitude IS NULL AND longitude IS NULL AND latitude_wgs84 IS NULL),
    'missing_geometry', count(*) FILTER (WHERE parcel_geom_wgs84 IS NULL),
    'out_of_bounds', count(*) FILTER (WHERE latitude_wgs84 IS NOT NULL AND (latitude_wgs84 < 24 OR latitude_wgs84 > 50 OR longitude_wgs84 < -125 OR longitude_wgs84 > -66)),
    'srid_mismatch', count(*) FILTER (WHERE latitude IS NOT NULL AND (latitude > 1000 OR latitude < -1000 OR longitude > 1000 OR longitude < -1000)),
    'zero_coords', count(*) FILTER (WHERE latitude = 0 AND longitude = 0),
    'missing_address', count(*) FILTER (WHERE address IS NULL OR address = ''),
    'missing_city', count(*) FILTER (WHERE city IS NULL),
    'missing_zip', count(*) FILTER (WHERE zip_code IS NULL),
    'missing_building_area', count(*) FILTER (WHERE building_area IS NULL),
    'missing_year_built', count(*) FILTER (WHERE year_built IS NULL),
    'missing_bedrooms', count(*) FILTER (WHERE bedrooms IS NULL),
    'missing_bathrooms', count(*) FILTER (WHERE bathrooms IS NULL),
    'missing_property_class', count(*) FILTER (WHERE property_class IS NULL),
    'zero_assessed_value', count(*) FILTER (WHERE assessed_value = 0),
    'missing_neighborhood', count(*) FILTER (WHERE neighborhood_code IS NULL),
    'missing_land_value', count(*) FILTER (WHERE land_value IS NULL OR land_value = 0),
    'zero_improvement_with_building', count(*) FILTER (WHERE (improvement_value IS NULL OR improvement_value = 0) AND building_area IS NOT NULL AND building_area > 0)
  )
  FROM parcels
  WHERE county_id = p_county_id;
$$;