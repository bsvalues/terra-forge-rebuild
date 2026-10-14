CREATE OR REPLACE FUNCTION public.get_neighborhood_equity_overlays(p_study_period_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(neighborhood_code text, parcel_count bigint, avg_ratio numeric, median_ratio numeric, cod numeric, prd numeric, center_lat numeric, center_lng numeric, min_lat numeric, max_lat numeric, min_lng numeric, max_lng numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_county_id uuid := get_user_county_id();
BEGIN
  -- Geography comes only from derived WGS84 columns (raw PACS fields may be State Plane).
  -- Each parcel contributes its most recent qualified sale at most once.
  RETURN QUERY
  WITH parcel_ratios AS (
    SELECT p.neighborhood_code AS nbhd, p.latitude_wgs84 AS lat, p.longitude_wgs84 AS lng,
           p.assessed_value::numeric / ls.sale_price AS ratio, ls.sale_price
    FROM parcels p
    LEFT JOIN LATERAL (
      SELECT s.sale_price FROM sales s
      WHERE s.parcel_id = p.id AND s.is_qualified = true AND s.sale_price > 0
      ORDER BY s.sale_date DESC NULLS LAST LIMIT 1
    ) ls ON true
    WHERE p.county_id = v_county_id
      AND p.latitude_wgs84 BETWEEN -90 AND 90
      AND p.longitude_wgs84 BETWEEN -180 AND 180
      AND p.neighborhood_code IS NOT NULL AND p.neighborhood_code <> ''
  ), nbhd_stats AS (
    SELECT pr.nbhd,
      COUNT(*)::bigint AS parcel_count,
      AVG(pr.ratio) FILTER (WHERE pr.ratio BETWEEN 0.3 AND 2.5) AS avg_r,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY pr.ratio) FILTER (WHERE pr.ratio BETWEEN 0.3 AND 2.5) AS med_r,
      SUM(pr.ratio * pr.sale_price) FILTER (WHERE pr.ratio BETWEEN 0.3 AND 2.5)
        / NULLIF(SUM(pr.sale_price) FILTER (WHERE pr.ratio BETWEEN 0.3 AND 2.5), 0) AS w_r,
      AVG(pr.lat) AS c_lat, AVG(pr.lng) AS c_lng,
      MIN(pr.lat) AS mn_lat, MAX(pr.lat) AS mx_lat, MIN(pr.lng) AS mn_lng, MAX(pr.lng) AS mx_lng,
      ARRAY_AGG(pr.ratio) FILTER (WHERE pr.ratio BETWEEN 0.3 AND 2.5) AS ratios
    FROM parcel_ratios pr
    GROUP BY pr.nbhd
    HAVING COUNT(*) FILTER (WHERE pr.ratio BETWEEN 0.3 AND 2.5) >= 2
  )
  SELECT ns.nbhd, ns.parcel_count,
    ROUND(ns.avg_r, 4), ROUND(ns.med_r::numeric, 4),
    ROUND((SELECT AVG(ABS(u.v - ns.med_r)) FROM unnest(ns.ratios) AS u(v))::numeric / NULLIF(ns.med_r, 0)::numeric * 100, 1),
    -- PRD = mean ratio / sale-weighted mean ratio
    ROUND(ns.avg_r / NULLIF(ns.w_r, 0), 3),
    ROUND(ns.c_lat::numeric, 6), ROUND(ns.c_lng::numeric, 6),
    ROUND(ns.mn_lat::numeric, 6), ROUND(ns.mx_lat::numeric, 6),
    ROUND(ns.mn_lng::numeric, 6), ROUND(ns.mx_lng::numeric, 6)
  FROM nbhd_stats ns
  ORDER BY ns.parcel_count DESC;
END;
$function$;