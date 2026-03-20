
-- ============================================================
-- PostGIS KNN Neighborhood Backfill (uses GIST index)
-- Orders of magnitude faster than raw lat/lng math
-- ============================================================
CREATE OR REPLACE FUNCTION public.backfill_neighborhood_by_proximity(
  p_county_id uuid,
  p_limit integer DEFAULT 5000
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '55s'
AS $$
DECLARE
  v_updated integer := 0;
BEGIN
  WITH targets AS (
    SELECT id, situs_point_wgs84
    FROM parcels
    WHERE county_id = p_county_id
      AND (neighborhood_code IS NULL OR neighborhood_code = '')
      AND situs_point_wgs84 IS NOT NULL
    LIMIT p_limit
  ),
  nearest AS (
    SELECT DISTINCT ON (t.id)
      t.id AS target_id,
      ref.neighborhood_code AS nearest_nbhd
    FROM targets t
    CROSS JOIN LATERAL (
      SELECT p2.neighborhood_code
      FROM parcels p2
      WHERE p2.county_id = p_county_id
        AND p2.neighborhood_code IS NOT NULL
        AND p2.neighborhood_code != ''
        AND p2.situs_point_wgs84 IS NOT NULL
      ORDER BY p2.situs_point_wgs84 <-> t.situs_point_wgs84
      LIMIT 1
    ) ref
  )
  UPDATE parcels p
  SET neighborhood_code = n.nearest_nbhd
  FROM nearest n
  WHERE p.id = n.target_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  RETURN jsonb_build_object(
    'updated', v_updated,
    'county_id', p_county_id,
    'limit', p_limit
  );
END;
$$;
