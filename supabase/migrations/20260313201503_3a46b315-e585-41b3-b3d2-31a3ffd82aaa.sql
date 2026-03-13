
-- RPC: Get parcel data quality stats (county-scoped)
CREATE OR REPLACE FUNCTION get_parcel_data_quality_stats()
RETURNS TABLE(
  total_parcels bigint,
  has_assessed_value bigint,
  has_building_area bigint,
  has_year_built bigint,
  has_bedrooms bigint,
  has_bathrooms bigint,
  has_coordinates bigint,
  has_neighborhood bigint,
  has_land_area bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_county_id uuid := get_user_county_id();
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint AS total_parcels,
    COUNT(*) FILTER (WHERE p.assessed_value > 0)::bigint AS has_assessed_value,
    COUNT(*) FILTER (WHERE p.building_area IS NOT NULL AND p.building_area > 0)::bigint AS has_building_area,
    COUNT(*) FILTER (WHERE p.year_built IS NOT NULL AND p.year_built > 0)::bigint AS has_year_built,
    COUNT(*) FILTER (WHERE p.bedrooms IS NOT NULL AND p.bedrooms > 0)::bigint AS has_bedrooms,
    COUNT(*) FILTER (WHERE p.bathrooms IS NOT NULL AND p.bathrooms > 0)::bigint AS has_bathrooms,
    COUNT(*) FILTER (WHERE p.latitude IS NOT NULL AND p.longitude IS NOT NULL)::bigint AS has_coordinates,
    COUNT(*) FILTER (WHERE p.neighborhood_code IS NOT NULL)::bigint AS has_neighborhood,
    COUNT(*) FILTER (WHERE p.land_area IS NOT NULL AND p.land_area > 0)::bigint AS has_land_area
  FROM parcels p
  WHERE p.county_id = v_county_id;
END;
$$;

-- RPC: Get neighborhood-level data quality breakdown (county-scoped)
CREATE OR REPLACE FUNCTION get_neighborhood_data_quality()
RETURNS TABLE(
  neighborhood_code text,
  total_parcels bigint,
  has_assessed_value bigint,
  has_building_area bigint,
  has_coordinates bigint,
  has_year_built bigint,
  overall_pct numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_county_id uuid := get_user_county_id();
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(p.neighborhood_code, 'Unknown') AS neighborhood_code,
    COUNT(*)::bigint AS total_parcels,
    COUNT(*) FILTER (WHERE p.assessed_value > 0)::bigint AS has_assessed_value,
    COUNT(*) FILTER (WHERE p.building_area IS NOT NULL AND p.building_area > 0)::bigint AS has_building_area,
    COUNT(*) FILTER (WHERE p.latitude IS NOT NULL AND p.longitude IS NOT NULL)::bigint AS has_coordinates,
    COUNT(*) FILTER (WHERE p.year_built IS NOT NULL AND p.year_built > 0)::bigint AS has_year_built,
    ROUND(
      (
        (COUNT(*) FILTER (WHERE p.assessed_value > 0)::numeric +
         COUNT(*) FILTER (WHERE p.building_area IS NOT NULL AND p.building_area > 0)::numeric +
         COUNT(*) FILTER (WHERE p.latitude IS NOT NULL AND p.longitude IS NOT NULL)::numeric +
         COUNT(*) FILTER (WHERE p.year_built IS NOT NULL AND p.year_built > 0)::numeric)
        / NULLIF(COUNT(*) * 4, 0)
      ) * 100, 1
    ) AS overall_pct
  FROM parcels p
  WHERE p.county_id = v_county_id
  GROUP BY COALESCE(p.neighborhood_code, 'Unknown')
  ORDER BY COUNT(*) DESC;
END;
$$;

-- RPC: Get neighborhood equity overlays (server-side ratio computation)
CREATE OR REPLACE FUNCTION get_neighborhood_equity_overlays(
  p_study_period_id uuid DEFAULT NULL
)
RETURNS TABLE(
  neighborhood_code text,
  parcel_count bigint,
  avg_ratio numeric,
  median_ratio numeric,
  cod numeric,
  prd numeric,
  center_lat numeric,
  center_lng numeric,
  min_lat numeric,
  max_lat numeric,
  min_lng numeric,
  max_lng numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_county_id uuid := get_user_county_id();
BEGIN
  RETURN QUERY
  WITH parcel_ratios AS (
    SELECT
      p.neighborhood_code AS nbhd,
      p.latitude,
      p.longitude,
      CASE WHEN s.sale_price > 0 THEN p.assessed_value::numeric / s.sale_price ELSE NULL END AS ratio
    FROM parcels p
    LEFT JOIN sales s ON s.parcel_id = p.id AND s.is_qualified = true AND s.sale_price > 0
    WHERE p.county_id = v_county_id
      AND p.latitude IS NOT NULL
      AND p.longitude IS NOT NULL
      AND p.neighborhood_code IS NOT NULL
  ),
  nbhd_stats AS (
    SELECT
      pr.nbhd,
      COUNT(DISTINCT CONCAT(pr.latitude::text, pr.longitude::text))::bigint AS parcel_count,
      AVG(pr.ratio) FILTER (WHERE pr.ratio BETWEEN 0.3 AND 2.5) AS avg_r,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY pr.ratio) FILTER (WHERE pr.ratio BETWEEN 0.3 AND 2.5) AS med_r,
      AVG(pr.latitude) AS c_lat,
      AVG(pr.longitude) AS c_lng,
      MIN(pr.latitude) AS mn_lat,
      MAX(pr.latitude) AS mx_lat,
      MIN(pr.longitude) AS mn_lng,
      MAX(pr.longitude) AS mx_lng,
      ARRAY_AGG(pr.ratio) FILTER (WHERE pr.ratio BETWEEN 0.3 AND 2.5) AS ratios
    FROM parcel_ratios pr
    GROUP BY pr.nbhd
    HAVING COUNT(*) FILTER (WHERE pr.ratio BETWEEN 0.3 AND 2.5) >= 2
  )
  SELECT
    ns.nbhd AS neighborhood_code,
    ns.parcel_count,
    ROUND(ns.avg_r, 4) AS avg_ratio,
    ROUND(ns.med_r::numeric, 4) AS median_ratio,
    ROUND(
      (SELECT AVG(ABS(u.v - ns.med_r)) FROM unnest(ns.ratios) AS u(v))::numeric
      / NULLIF(ns.med_r, 0) * 100, 1
    ) AS cod,
    ROUND(ns.avg_r / NULLIF(ns.med_r, 0), 3) AS prd,
    ROUND(ns.c_lat::numeric, 6) AS center_lat,
    ROUND(ns.c_lng::numeric, 6) AS center_lng,
    ROUND(ns.mn_lat::numeric, 6) AS min_lat,
    ROUND(ns.mx_lat::numeric, 6) AS max_lat,
    ROUND(ns.mn_lng::numeric, 6) AS min_lng,
    ROUND(ns.mx_lng::numeric, 6) AS max_lng
  FROM nbhd_stats ns
  ORDER BY ns.parcel_count DESC;
END;
$$;
